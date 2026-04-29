"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Plus, ShoppingCart, Package, ChevronLeft, ChevronRight, ChevronDown, X, Printer } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { useAuth } from "@/hooks/useAuth";
import { socket } from "@/lib/socket";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printLabels, type LabelData } from "@/lib/printLabel";
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

// For REUSABLE: available_stock (units ready to lend); for CONSUMABLE: current_stock
const getEffectiveStock = (item: Item.UiItem): number =>
  item.type === "REUSABLE"
    ? (typeof item.availableStock === "number" ? item.availableStock : 0)
    : item.stock;

// No stock override — item.stock stays as current_stock so ItemDetailModal
// and tooltip can show the raw total. Display always calls getEffectiveStock().
const mapRequestableStock = (rows: Item.UiItem[] = []): Item.UiItem[] => rows;

const PAGE_LIMIT = 10;

export default function WithdrawClient({ initialItems }: Props) {
  // ดึงข้อมูลแผนกและสถานะการโหลดจาก useAuth ที่แกะจาก Token จริง
  const { departments, isLoading: isAuthLoading } = useAuth();

  const [allItems, setAllItems] = useState<Item.UiItem[]>(mapRequestableStock(initialItems || []));
  
  // ✅ State สำหรับ Options (Dropdowns)
  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
  const [selectedLocation, setSelectedLocation] = useState("ตำแหน่งทั้งหมด");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [showCartModal, setShowCartModal] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item.UiItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const [selectedLabelRows, setSelectedLabelRows] = useState<Map<string, LabelData>>(new Map());

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await ItemSvc.getAllInventoryItems({ allowed_req: true });
      setAllItems(mapRequestableStock(result || []));
    } catch (error) {
      const msg = getErrorMessage(error);
      console.error("Fetch error:", msg);
      const status = (error as Record<string, unknown>)?.status;
      if (status !== 401) {
        SweetAlertUtils.error("เกิดข้อผิดพลาด", msg || "โหลดข้อมูลล้มเหลว");
      }
    } finally {
      setIsFetching(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    fetchAll();
  }, [fetchAll]);

  // --- [Real-time Socket.io Connection] ---
  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current || isFetching || isRefreshingRef.current) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try {
          await refreshData();
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 220);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS") scheduleRefresh();
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [refreshData, isFetching]);

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
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
      if (!target.closest("[data-filter-location]")) setIsLocationOpen(false);
    };

    if (isCategoryOpen || isStatusOpen || isLocationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen, isLocationOpen]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const filterCategories = ["หมวดหมู่ทั้งหมด", ...categories.map((c) => c.name)];
  const filterLocations = [
    "ตำแหน่งทั้งหมด",
    ...Array.from(new Set(allItems.map((item) => item.location).filter(Boolean))),
  ];

  const filteredItems = allItems.filter((item) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.code.toLowerCase().includes(keyword);
    const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "สถานะทั้งหมด" || item.status === selectedStatus;
    const matchesLocation = selectedLocation === "ตำแหน่งทั้งหมด" || item.location === selectedLocation;
    return matchesSearch && matchesCat && matchesStatus && matchesLocation;
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

  const toggleSelect = (item: Item.UiItem) =>
    setSelectedLabelRows((prev) => {
      const s = new Map(prev);
      s.has(item.id) ? s.delete(item.id) : s.set(item.id, { name: item.name, code: item.code });
      return s;
    });

  const toggleSelectAll = () => {
    const allSelected = paginatedItems.length > 0 && paginatedItems.every((i) => selectedLabelRows.has(i.id));
    setSelectedLabelRows((prev) => {
      const s = new Map(prev);
      allSelected
        ? paginatedItems.forEach((i) => s.delete(i.id))
        : paginatedItems.forEach((i) => s.set(i.id, { name: i.name, code: i.code }));
      return s;
    });
  };

  const handleBulkPrint = () => {
    printLabels(Array.from(selectedLabelRows.values()));
  };

  const Badge = ({ status }: { status: string }) => {
    const statusMap: Record<string, string> = {
      ACTIVE: "เปิดใช้งาน",
    };
    const displayStatus = statusMap[status] || status;

    const styles: Record<string, string> = {
      ปกติ: "bg-green-100 text-green-500",
      ต่ำ: "bg-amber-100 text-amber-500",
      หมด: "bg-red-100 text-red-500",
      ระงับ: "bg-red-100 text-red-500",
      เปิดใช้งาน: "bg-green-100 text-green-500",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${styles[displayStatus] || "bg-slate-100 text-slate-700"}`}
      >
        {displayStatus}
      </span>
    );
  };

  const getTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      MED_ASSET: "ครุภัณฑ์ภายในองค์กร",
      REUSABLE: "ของใช้ซ้ำรายชิ้น",
      CONSUMABLE: "วัสดุสิ้นเปลือง",
    };
    return typeMap[type] || type;
  };

  const openItemDetail = useCallback((item: Item.UiItem) => {
    // Override stock → effective stock so ItemDetailModal caps at the right max
    setSelectedItemForDetail({ ...item, stock: getEffectiveStock(item) });
    setShowItemDetailModal(true);
  }, []);

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
            const maxStock = origItem ? getEffectiveStock(origItem) : 0;
            if (n > 0 && n <= maxStock) return { ...i, quantity: n };
          }
          return i;
        })
      );
    },
    [allItems]
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">รายการพัสดุ</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedLabelRows.size > 0 && (
            <button
              type="button"
              onClick={handleBulkPrint}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์บาร์โค้ด ({selectedLabelRows.size})
            </button>
          )}
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
              setIsStatusOpen(false);
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

        <div className="relative w-full sm:w-auto" data-filter-status>
          <button
            type="button"
            onClick={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsCategoryOpen(false);
              setIsLocationOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus === "สถานะทั้งหมด" ? "สถานะทั้งหมด" : selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>

          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[
                  { value: "สถานะทั้งหมด", label: "สถานะทั้งหมด" },
                  { value: "ปกติ", label: "ปกติ" },
                  { value: "ต่ำ", label: "ต่ำ" },
                  { value: "หมด", label: "หมด" },
                  { value: "ระงับ", label: "ระงับ" },
                ].map((s) => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus(s.value);
                        setIsStatusOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedStatus === s.value
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
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
              setIsStatusOpen(false);
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
        {(searchTerm || selectedCategory !== "หมวดหมู่ทั้งหมด" || selectedStatus !== "สถานะทั้งหมด" || selectedLocation !== "ตำแหน่งทั้งหมด") && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("หมวดหมู่ทั้งหมด");
              setSelectedStatus("สถานะทั้งหมด");
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
          <div className="flex items-center justify-center py-16">
            <DotLottieReact
              src="https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie"
              loop
              autoplay
              style={{ width: 160, height: 160 }}
            />
          </div>
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
                  <col className="w-[13%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                  <col className="w-[8%]" />
                  <col className="w-[13%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedLabelRows.has(i.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                        title="เลือกทั้งหมดในหน้านี้"
                      />
                    </th>
                    <th className="px-6 py-4">รูป</th>
                    <th className="px-3 py-4 whitespace-nowrap">รหัสรายการ</th>
                    <th className="px-3 py-4 whitespace-nowrap">ชื่อพัสดุ</th>
                    <th className="px-6 py-4 whitespace-nowrap">หมวดหมู่</th>
                    <th className="px-6 py-4 whitespace-nowrap">ประเภท</th>
                    <th className="px-6 py-4 w-[120px] whitespace-nowrap">คงเหลือ</th>
                    <th className="px-6 py-4 w-[120px] whitespace-nowrap">ขั้นต่ำ</th>
                    <th className="px-6 py-4 whitespace-nowrap">หน่วย</th>
                    <th className="px-6 py-4 whitespace-nowrap">ตำแหน่งจัดเก็บ</th>
                    <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-6 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLabelRows.has(item.id)}
                          onChange={() => toggleSelect(item)}
                          className="w-6 h-4 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
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
                      <td className="px-3 py-3">{item.code}</td>
                      <td className="px-3 py-3">
                        <span className="block truncate" title={item.name}>
                          {item.name}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600 truncate">{item.category}</td>
                      <td className="px-6 py-3 text-sm truncate">{getTypeDisplay(item.type)}</td>
                      <td className="px-6 py-3 w-[120px]">
                        {item.type === "REUSABLE" ? (
                          <div className="relative group inline-block cursor-help">
                            <span
                              className={`font-bold text-base ${
                                getEffectiveStock(item) <= 0
                                  ? "text-red-500"
                                  : getEffectiveStock(item) <= item.minStock
                                    ? "text-orange-500"
                                    : "text-emerald-600"
                              }`}
                            >
                              {getEffectiveStock(item)}
                            </span>
                            <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                              ทั้งหมดในคลัง: {item.stock} {item.unit}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span
                              className={`font-bold ${
                                item.stock <= 0 ? "text-red-500" : item.stock <= item.minStock ? "text-orange-500" : "text-emerald-600"
                              }`}
                            >
                              {item.stock}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 w-[120px]">
                        {item.minStock > 0 ? (
                          <span className="text-black font-semibold">{item.minStock}</span>
                        ) : (
                          <span className="text-black">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3">{item.unit}</td>
                      <td className="px-6 py-3 text-slate-600 truncate">{item.location || "-"}</td>
                      <td className="px-6 py-3">
                        <Badge status={item.status} />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openItemDetail(item)}
                            disabled={getEffectiveStock(item) <= 0}
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
                      <td colSpan={12}>
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