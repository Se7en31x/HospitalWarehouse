"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Search, Plus, ShoppingCart, PackagePlus, ChevronLeft, ChevronRight, ChevronDown, X, Package, RefreshCw } from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { useAuth } from "@/hooks/useAuth"; 
import { socket } from "@/lib/socket";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import CartModal from "./CartModal";
import ItemDetailModal from "./ItemDetailModal";

// Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
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

export default function WithdrawClient({ initialItems }: Props) {
  // ดึงข้อมูลแผนกและสถานะการโหลดจาก useAuth ที่แกะจาก Token จริง
  const { departments, isLoading: isAuthLoading } = useAuth();

  // ✅ State สำหรับรายการ Items
  const [items, setItems] = useState<Item.UiItem[]>(mapRequestableStock(initialItems || []));
  
  // ✅ State สำหรับ Options (Dropdowns)
  const [categories, setCategories] = useState<Item.categoryOptions>([]);
  const [units, setUnits] = useState<Item.unitOptions>([]);

  // ✅ State สำหรับ Cart และ Shopping
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  // ✅ State สำหรับ UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
  const [selectedUnit, setSelectedUnit] = useState("หน่วยทั้งหมด");
  const [selectedLocation, setSelectedLocation] = useState("ตำแหน่งทั้งหมด");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showCartModal, setShowCartModal] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);
  const showCartModalRef = useRef(false);
  const showItemDetailModalRef = useRef(false);

  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item.UiItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // --- [Data Fetching Logic] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems({ allowed_req: true });
      setItems(mapRequestableStock(data || []));
    } catch (error) {
      console.error("Fetch error:", error);
      SweetAlertUtils.error("เกิดข้อผิดพลาด", "โหลดข้อมูลล้มเหลว");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Keep refs in sync so the stable socket listener can read current modal state
  useEffect(() => { showCartModalRef.current = showCartModal; }, [showCartModal]);
  useEffect(() => { showItemDetailModalRef.current = showItemDetailModal; }, [showItemDetailModal]);

  // --- [Real-time Socket.io Connection] ---
  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current) return;
      if (isRefreshingRef.current) return;
      if (showCartModalRef.current || showItemDetailModalRef.current) return;

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
      console.log("[Socket] REFRESH_DATA received, type:", message);
      if (message === "ITEMS") {
        scheduleRefresh();
      }
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
  }, [refreshData]);

  // --- [Initialize Data & LocalStorage] ---
  useEffect(() => {
    setIsMounted(true);

    // โหลด Cart จาก LocalStorage
    const savedCart = localStorage.getItem("withdraw_cart");
    if (savedCart) {
      try {
        setSelectedItems(JSON.parse(savedCart));
      } catch (e) {
        console.error(e);
      }
    }

    // โหลด Options
    const fetchOptions = async () => {
      try {
        const categoryData = await ItemSvc.getcategoriesOptions();
        setCategories(categoryData || []);
        const unitData = await ItemSvc.getUnitsOptions();
        setUnits(unitData || []);
      } catch (err) {
        console.error("Load options failed", err);
      }
    };
    fetchOptions();

    // โหลดข้อมูล Items หากไม่มีข้อมูลเริ่มต้น
    if (!initialItems || initialItems.length === 0) {
      refreshData();
    }
  }, [initialItems, refreshData]);

  // --- [Initialize Department Selection from Auth Hook] ---
  useEffect(() => {
    if (!isAuthLoading && departments.length > 0) {
      const savedDept = localStorage.getItem("withdraw_dept");
      const savedDeptId = savedDept ? Number(savedDept) : null;
      const isValid = savedDeptId !== null && departments.some((d) => d.id === savedDeptId);

      if (isValid && savedDeptId !== null) {
        setSelectedDeptId(savedDeptId);
      } else {
        // Default เป็นแผนกแรกที่ได้รับสิทธิ์
        setSelectedDeptId(departments[0].id);
      }
    }
  }, [isAuthLoading, departments]);

  // --- [Persist Cart & Department to LocalStorage] ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("withdraw_cart", JSON.stringify(selectedItems));
      if (selectedDeptId !== null) {
        localStorage.setItem("withdraw_dept", String(selectedDeptId));
      }
    }
  }, [selectedItems, selectedDeptId, isMounted]);

  // --- [Close dropdowns when clicking outside] ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-category-dropdown]")) {
        setIsCategoryDropdownOpen(false);
      }
      if (!target.closest("[data-unit-dropdown]")) {
        setIsUnitDropdownOpen(false);
      }
      if (!target.closest("[data-location-dropdown]")) {
        setIsLocationDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen || isUnitDropdownOpen || isLocationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryDropdownOpen, isUnitDropdownOpen, isLocationDropdownOpen]);

  // --- [Filter Logic] ---
  const filterCategories = ["หมวดหมู่ทั้งหมด", ...(categories || []).map((c) => c.name)];
  const filterUnits = ["หน่วยทั้งหมด", ...(units || []).map((u) => u.name)];
  const filterLocations = useMemo(() => {
    const locations = new Set(items.map((item) => item.location).filter(Boolean));
    return ["ตำแหน่งทั้งหมด", ...Array.from(locations)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (item.code || "").toLowerCase().includes(term) ||
        (item.name || "").toLowerCase().includes(term);

      const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
      const matchesUnit = selectedUnit === "หน่วยทั้งหมด" || item.unit === selectedUnit;
      const matchesLocation = selectedLocation === "ตำแหน่งทั้งหมด" || item.location === selectedLocation;

      return matchesSearch && matchesCat && matchesUnit && matchesLocation;
    });
  }, [items, selectedCategory, selectedUnit, selectedLocation, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const displayItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const openItemDetail = useCallback((item: Item.UiItem) => {
    // Override stock → effective stock so ItemDetailModal caps at the right max
    setSelectedItemForDetail({ ...item, stock: getEffectiveStock(item) });
    setShowItemDetailModal(true);
  }, []);

  const handleItemDetailConfirm = useCallback((quantity: number) => {
    if (!selectedItemForDetail) return;

    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 300);

    setSelectedItems((prev) => {
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
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback(
    (id: string, delta: number) => {
      setSelectedItems((prev) =>
        prev.map((i) => {
          if (i.id === id) {
            const n = i.quantity + delta;
            const origItem = items.find((orig) => orig.id === id);
            const maxStock = origItem ? getEffectiveStock(origItem) : 0;
            if (n > 0 && n <= maxStock) return { ...i, quantity: n };
          }
          return i;
        })
      );
    },
    [items]
  );

  const handleCartSuccess = () => {
    setSelectedItems([]);
    localStorage.removeItem("withdraw_cart");
    setShowCartModal(false);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes cart-bounce { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } .animate-bounce-custom { animation: cart-bounce 0.3s ease-in-out; }`,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">เบิกพัสดุ</h2>
          <div className="flex flex-col">
             <span className="text-xs text-slate-500 font-medium">แผนกที่เลือกเบิก:</span>
             <span className="text-sm font-bold text-blue-600">
               {isAuthLoading
                 ? "กำลังโหลดข้อมูล..."
                 : (departments.find((d) => d.id === selectedDeptId)?.name || "โปรดเลือกแผนกในตะกร้า")}
             </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCartModal(true)}
            className={`px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md transition-transform active:scale-95 ${
              isCartBouncing ? "animate-bounce-custom" : ""
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            ตะกร้า ({selectedItems.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative" data-category-dropdown>
          <button
            onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsUnitDropdownOpen(false); setIsLocationDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isCategoryDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c);
                        setIsCategoryDropdownOpen(false);
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

        {/* Unit Dropdown */}
        <div className="relative" data-unit-dropdown>
          <button
            onClick={() => { setIsUnitDropdownOpen(!isUnitDropdownOpen); setIsCategoryDropdownOpen(false); setIsLocationDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedUnit}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUnitDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isUnitDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterUnits.map((u) => (
                  <li key={u}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUnit(u);
                        setIsUnitDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedUnit === u
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {u}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Location Dropdown */}
        <div className="relative" data-location-dropdown>
          <button
            onClick={() => { setIsLocationDropdownOpen(!isLocationDropdownOpen); setIsCategoryDropdownOpen(false); setIsUnitDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedLocation}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLocationDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isLocationDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterLocations.map((loc) => (
                  <li key={loc}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsLocationDropdownOpen(false);
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
      </div>

      {/* Table Content */}
      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div 
          className="flex-1 overflow-x-auto overflow-y-auto"
          style={{ scrollbarWidth: 'auto', msOverflowStyle: 'auto' }}
        >
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[120px]">รหัสพัสดุ</th>
                <th className="px-6 py-4 w-[260px]">ชื่อรายการ</th>
                <th className="px-3 py-4 w-[56px] text-center">ประเภท</th>
                <th className="px-6 py-4 w-[140px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[150px]">ตำแหน่ง</th>
                <th className="px-6 py-4 w-[130px]">สต็อก</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                      {item.imageUrl ? (
                        <button
                          onClick={() => setLightboxImage({ url: item.imageUrl!, name: item.name })}
                          className="w-full h-full focus:outline-none"
                        >
                          <img src={item.imageUrl} className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-zoom-in" alt={item.name} />
                        </button>
                      ) : (
                        <PackagePlus className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.code}</td>
                  <td className="px-6 py-4 truncate" title={item.name}>{item.name}</td>
                  <td className="px-3 py-4 text-center">
                    {item.type === "REUSABLE" ? (
                      <span title="วัสดุถาวร / ครุภัณฑ์" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 cursor-help">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                    ) : (
                      <span title="วัสดุสิ้นเปลือง" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 cursor-help">
                        <Package className="w-3.5 h-3.5 text-blue-600" />
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.category}</td>
                  <td className="px-6 py-4">{item.location}</td>
                  <td className="px-6 py-4">
                    {item.type === "REUSABLE" ? (
                      <div className="relative group inline-block cursor-help">
                        <span className={`font-bold text-base ${
                          getEffectiveStock(item) <= 0 ? "text-red-500" :
                          getEffectiveStock(item) <= item.minStock ? "text-orange-500" :
                          "text-emerald-600"
                        }`}>
                          {getEffectiveStock(item)}
                          <span className="text-xs font-normal ml-0.5">{item.unit}</span>
                        </span>
                        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          ทั้งหมดในคลัง: {item.stock} {item.unit}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className={`font-bold ${
                          item.stock <= 0 ? "text-red-500" :
                          item.stock <= item.minStock ? "text-orange-500" :
                          "text-blue-600"
                        }`}>
                          {item.stock}
                          <span className="text-xs font-normal ml-0.5">{item.unit}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">คงเหลือ</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openItemDetail(item)}
                      disabled={getEffectiveStock(item) <= 0}
                      className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="เพิ่มเข้าตะกร้า"
                    >
                      <Plus size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {displayItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <Search className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-medium">ไม่พบข้อมูลพัสดุ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-600">
          แสดง {displayItems.length} จาก {filteredItems.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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
        selectedItems={selectedItems}
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
            className="relative bg-white rounded-lg shadow-2xl p-2 max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-lg shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-center text-sm font-bold text-slate-800 mt-2 pb-1">{lightboxImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}