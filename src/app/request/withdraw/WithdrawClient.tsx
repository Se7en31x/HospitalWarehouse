"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Plus, ShoppingCart, Package, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import {
  LIST_TABLE_HEAD_ROW,
  LIST_TABLE_TH_ICON,
  LIST_TABLE_TH_ROWNUM_TIGHT,
  LIST_TABLE_TBODY,
} from "@/lib/tableUi";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { getAssetCounts } from "@/services/assetService";
import {
  getEffectiveStockForUiItem as getEffectiveStock,
  getStockLevelLabelForUiItem as getStockLevelLabel,
} from "@/lib/itemStockUi";
import { useAuth } from "@/hooks/useAuth";
import { socket } from "@/lib/socket";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import CartModal from "./CartModal";
import ItemDetailModal from "./ItemDetailModal";

// Helper function เพื่อดึงข้อความ Error (รองรับทั้ง Error instance และ plain object จาก apiClient)
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as Record<string, unknown>).message);
  return String(error);
};

interface Props {
  initialItems: Item.UiItem[];
}

interface CartItem extends Item.UiItem {
  quantity: number;
}

const mapRequestableStock = (rows: Item.UiItem[] = []): Item.UiItem[] => rows;

const PAGE_LIMIT = 10;

/** หมวดที่ไม่ให้เลือกกรองในหน้าเบิก (ครุภัณฑ์ภายในองค์กรจัดการแยกจาก flow เบิกพัสดุทั่วไป) */
const WITHDRAW_FILTER_EXCLUDED_CATEGORY_NAMES = new Set(["ครุภัณฑ์ภายในองค์กร"]);

export default function WithdrawClient({ initialItems }: Props) {
  // ดึงข้อมูลแผนกและสถานะการโหลดจาก useAuth ที่แกะจาก Token จริง
  const { departments, isLoading: isAuthLoading } = useAuth();

  const [allItems, setAllItems] = useState<Item.UiItem[]>([]);
  const [registeredCounts, setRegisteredCounts] = useState<Record<string, number>>({});
  
  // ✅ State สำหรับ Options (Dropdowns)
  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
  const [selectedLocation, setSelectedLocation] = useState("ตำแหน่งทั้งหมด");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [showCartModal, setShowCartModal] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item.UiItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const result = await ItemSvc.getAllInventoryItems({ allowed_req: true });
      const rows = mapRequestableStock(result || []);
      setAllItems(rows);
      const medAssetIds = rows.filter((i) => i.type === "MED_ASSET").map((i) => i.id);
      if (medAssetIds.length > 0) {
        const counts = await getAssetCounts(medAssetIds);
        setRegisteredCounts(counts || {});
      } else {
        setRegisteredCounts({});
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      console.error("Fetch error:", msg);
      const status = (error as Record<string, unknown>)?.status;
      if (!silent && status !== 401) {
        SweetAlertUtils.error("เกิดข้อผิดพลาด", msg || "โหลดข้อมูลล้มเหลว");
      }
    } finally {
      if (!silent) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS") fetchAll(true);
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchAll]);

  // --- [Initialize Data & LocalStorage] ---
  useEffect(() => {
    setIsMounted(true);

    // โหลด Cart จาก LocalStorage
    const savedCart = localStorage.getItem("withdraw_cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error(e);
      }
    }

    // โหลด Options
    const fetchOptions = async () => {
      try {
        const categoryData = await ItemSvc.getcategoriesOptions();
        setCategories(categoryData || []);
      } catch (err) {
        console.error("Load options failed", err);
      }
    };
    fetchOptions();
    fetchAll();
  }, [fetchAll]);
// 
  // --- [Initialize Department Selection from Auth Hook] ---
  useEffect(() => {
    if (!isAuthLoading && departments.length > 0) {
      const savedDept = localStorage.getItem("withdraw_dept");
      const savedDeptId = savedDept ? Number(savedDept) : null;
      const isValid = savedDeptId !== null && departments.some((d) => d.id === savedDeptId);

      if (isValid && savedDeptId !== null) {
        setSelectedDeptId(savedDeptId);
      } else {
        setSelectedDeptId(departments[0].id);
      }
    }
  }, [isAuthLoading, departments.length]);

  // --- [Persist Cart & Department to LocalStorage] ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("withdraw_cart", JSON.stringify(cartItems));
      if (selectedDeptId !== null) {
        localStorage.setItem("withdraw_dept", String(selectedDeptId));
      }
    }
  }, [cartItems, selectedDeptId, isMounted]);

  // --- [Close dropdowns when clicking outside] ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
      if (!target.closest("[data-filter-location]")) setIsLocationOpen(false);
    };

    if (isCategoryOpen || isLocationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isLocationOpen]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const filterCategories = [
    "หมวดหมู่ทั้งหมด",
    ...categories.map((c) => c.name).filter((name) => !WITHDRAW_FILTER_EXCLUDED_CATEGORY_NAMES.has(name)),
  ];
  const filterLocations = [
    "ตำแหน่งทั้งหมด",
    ...Array.from(new Set(allItems.map((item) => item.location).filter(Boolean))),
  ];

  const filteredItems = allItems
    .filter((item) => {
      const keyword = searchTerm.toLowerCase();
      const matchesSearch =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword);
      const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
      const matchesLocation = selectedLocation === "ตำแหน่งทั้งหมด" || item.location === selectedLocation;
      return matchesSearch && matchesCat && matchesLocation;
    })
    .sort((a, b) => {
      const sa = getEffectiveStock(a, registeredCounts);
      const sb = getEffectiveStock(b, registeredCounts);
      if (sa > 0 && sb <= 0) return -1;
      if (sa <= 0 && sb > 0) return 1;
      return 0;
    });

  const totalPages = Math.ceil(filteredItems.length / PAGE_LIMIT);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_LIMIT,
    currentPage * PAGE_LIMIT
  );

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredItems.length / PAGE_LIMIT));
    if (currentPage > tp) setCurrentPage(tp);
  }, [filteredItems.length, currentPage]);

  useEffect(() => {
    if (WITHDRAW_FILTER_EXCLUDED_CATEGORY_NAMES.has(selectedCategory)) {
      setSelectedCategory("หมวดหมู่ทั้งหมด");
      setCurrentPage(1);
    }
  }, [selectedCategory, categories]);

  const StockStatusBadge = ({ label }: { label: string }) => {
    const styles: Record<string, string> = {
      ปกติ: "bg-green-100 text-green-500",
      ต่ำ: "bg-amber-100 text-amber-500",
      หมด: "bg-red-100 text-red-500",
      ระงับ: "bg-red-100 text-red-500",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${styles[label] || "bg-slate-100 text-slate-700"}`}
      >
        {label}
      </span>
    );
  };

  const openItemDetail = useCallback((item: Item.UiItem) => {
    // Override stock → effective stock so ItemDetailModal caps at the right max
    setSelectedItemForDetail({ ...item, stock: getEffectiveStock(item, registeredCounts) });
    setShowItemDetailModal(true);
  }, [registeredCounts]);

  const handleItemDetailConfirm = useCallback((quantity: number) => {
    if (!selectedItemForDetail) return;

    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 300);

    setCartItems((prev) => {
      const exist = prev.find((i) => i.id === selectedItemForDetail.id);
      if (exist) {
        const newQty = exist.quantity + quantity;
        return newQty > selectedItemForDetail.stock
          ? prev
          : prev.map((i) =>
              i.id === selectedItemForDetail.id ? { ...i, quantity: newQty } : i
            );
      }
      return [...prev, { ...selectedItemForDetail, quantity }];
    });
  }, [selectedItemForDetail]);

  const removeItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback(
    (id: string, delta: number) => {
      setCartItems((prev) =>
        prev.map((i) => {
          if (i.id === id) {
            const n = i.quantity + delta;
            const origItem = allItems.find((orig) => orig.id === id);
            const maxStock = origItem ? getEffectiveStock(origItem, registeredCounts) : 0;
            if (n > 0 && n <= maxStock) return { ...i, quantity: n };
          }
          return i;
        })
      );
    },
    [allItems, registeredCounts]
  );

  const handleCartSuccess = () => {
    setCartItems([]);
    localStorage.removeItem("withdraw_cart");
    setShowCartModal(false);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes cart-bounce { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } .animate-bounce-custom { animation: cart-bounce 0.3s ease-in-out; }`,
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-4">
          <PageHeadingIconBox icon={ShoppingCart} tone="blue" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">เบิกใช้พัสดุ</h2>
            <p className="text-sm text-slate-500 mt-0.5">ค้นหาพัสดุและยื่นคำขอเบิก-ยืมจากคลังสินค้า</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCartModal(true)}
            className={`px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md transition-transform active:scale-95 ${
              isCartBouncing ? "animate-bounce-custom" : ""
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            ตะกร้า ({cartItems.length})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ / รหัส..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        <div className="relative w-full sm:w-auto" data-filter-category>
          <button
            type="button"
            onClick={() => {
              setIsCategoryOpen(!isCategoryOpen);
              setIsLocationOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>

          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c);
                        setIsCategoryOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedCategory === c
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-auto" data-filter-location>
          <button
            type="button"
            onClick={() => {
              setIsLocationOpen(!isLocationOpen);
              setIsCategoryOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedLocation}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLocationOpen ? "rotate-180" : ""}`} />
          </button>

          {isLocationOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterLocations.map((loc) => (
                  <li key={loc}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsLocationOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedLocation === loc
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {loc}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Clear filters */}
        {(searchTerm || selectedCategory !== "หมวดหมู่ทั้งหมด" || selectedLocation !== "ตำแหน่งทั้งหมด") && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("หมวดหมู่ทั้งหมด");
              setSelectedLocation("ตำแหน่งทั้งหมด");
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
        {isFetching ? (
          <DataTableSkeleton
            headers={["#", "รูป", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "คงเหลือ", "หน่วย", "ตำแหน่งจัดเก็บ", "สถานะ", "จัดการ"]}
            rowCount={10}
            ariaLabel="กำลังโหลดรายการพัสดุ"
            minHeight="min-h-[22rem]"
            thClassName="px-2 py-4 whitespace-nowrap"
            tdClassName="px-2 py-3"
          />
        ) : (
          <>
            <div
              className="flex-1"
              style={
                {
                  overflowX: "auto",
                  overflowY: "auto",
                  scrollbarWidth: "auto",
                  msOverflowStyle: "auto",
                } as React.CSSProperties
              }
            >
              <style>{`
            div::-webkit-scrollbar {
              width: 0;
              height: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            div::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
              <table className="w-full table-fixed text-sm text-left">
                <colgroup>
                  <col className="w-[44px]" />
                  <col className="w-[80px]" />
                  <col className="w-[12%]" />
                  <col className="w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[9%]" />
                  <col className="w-[7%]" />
                  <col className="w-[13%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className={LIST_TABLE_HEAD_ROW}>
                  <tr>
                    <th className={LIST_TABLE_TH_ROWNUM_TIGHT}>#</th>
                    <th className={LIST_TABLE_TH_ICON}>รูป</th>
                    <th className="px-3 pr-2 py-3.5 text-left whitespace-nowrap">รหัสรายการ</th>
                    <th className="pl-2 pr-3 py-3.5 text-left">ชื่อพัสดุ</th>
                    <th className="px-3 py-3.5 text-left whitespace-nowrap">หมวดหมู่</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap w-[100px]">คงเหลือ</th>
                    <th className="px-3 py-3.5 text-left whitespace-nowrap">หน่วย</th>
                    <th className="px-3 py-3.5 text-left whitespace-nowrap">ตำแหน่งจัดเก็บ</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">สถานะ</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className={LIST_TABLE_TBODY}>
                  {paginatedItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-2 py-3 text-center text-slate-500 text-sm font-semibold">
                        {(currentPage - 1) * PAGE_LIMIT + index + 1}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden mx-auto">
                          {item.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => setLightboxImage({ url: item.imageUrl!, name: item.name })}
                              className="w-full h-full focus:outline-none"
                            >
                              <img src={item.imageUrl} className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-zoom-in" alt={item.name} />
                            </button>
                          ) : (
                            <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 pr-2 text-left align-top">{item.code}</td>
                      <td className="pl-2 pr-3 py-3 text-left align-top">
                        <span className="block min-w-0 truncate" title={item.name}>
                          {item.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-left text-slate-600 truncate align-top" title={item.category}>{item.category}</td>
                      <td className="px-3 py-3 w-[100px] text-center align-top">
                        <div className="flex justify-center">
                          {(() => {
                            const eff = getEffectiveStock(item, registeredCounts);
                            const colorCls =
                              eff <= 0
                                ? "text-red-500"
                                : eff <= item.minStock
                                  ? "text-orange-500"
                                  : "text-emerald-600";
                            if (item.type === "REUSABLE") {
                              return (
                                <div className="relative group inline-block cursor-help">
                                  <span className={`font-bold text-base ${colorCls}`}>{eff}</span>
                                  <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    ทั้งหมดในคลัง: {item.stock} {item.unit}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <span className={`font-bold ${colorCls}`}>{eff}</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-left text-slate-600 align-top">
                        <span className="block min-w-0 whitespace-normal break-words leading-snug" title={item.unit}>
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-left text-slate-600 truncate align-top" title={item.location || undefined}>{item.location || "-"}</td>
                      <td className="px-3 py-3 text-center align-top">
                        <div className="flex justify-center">
                          <StockStatusBadge label={getStockLevelLabel(item, registeredCounts)} />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openItemDetail(item)}
                            disabled={getEffectiveStock(item, registeredCounts) <= 0}
                            className="p-1.5 bg-blue-700 text-white rounded-md border border-blue-700/90 shadow-sm hover:bg-blue-800 hover:border-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="เพิ่มเข้าตะกร้า"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={10}>
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-12 h-12 text-slate-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4"
                            />
                          </svg>
                          <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
              <p className="text-sm text-slate-500">
                แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
                {filteredItems.length !== allItems.length && (
                  <span className="text-slate-400"> (ทั้งหมด {allItems.length} รายการ)</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={showItemDetailModal}
        item={selectedItemForDetail}
        onClose={() => setShowItemDetailModal(false)}
        onConfirm={handleItemDetailConfirm}
      />

      {/* Cart Modal */}
      <CartModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        selectedItems={cartItems}
        selectedDeptId={selectedDeptId}
        departments={departments}
        onDeptChange={setSelectedDeptId}
        onRemoveItem={removeItem}
        onUpdateQty={updateQty}
        onSuccess={handleCartSuccess}
      />

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-lg shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="w-[350px] h-[280px] object-contain rounded-lg"
            />
            <p className="text-center text-sm text-slate-600 mt-2 pb-1">{lightboxImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}