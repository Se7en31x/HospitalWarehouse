"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Search, Plus, ShoppingCart, PackagePlus, ChevronLeft, ChevronRight, ChevronDown, X, RefreshCw, Package } from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import BorrowCartModal from "./BorrowCartModal";
import ItemDetailModal from "./ItemDetailModal";

// Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const DEPT_TH: Record<string, string> = {
  "Emergency":      "แผนกฉุกเฉิน",
  "Dental":         "แผนกทันตกรรม",
  "Palliative":     "ศูนย์ชีวาภิบาล",
  "OPD":            "แผนกผู้ป่วยนอก",
  "IPD":            "แผนกผู้ป่วยใน",
  "MedicalRecords": "แผนกเวชระเบียน",
  "Pharmacy":       "ห้องจ่ายยา",
  "Warehouse":      "คลังหลัก",
};
/** Returns Thai name or null if the department is not in the clinical mapping. */
const deptTh = (name?: string | null): string | null => (name ? (DEPT_TH[name] ?? null) : null);

interface Props {
  initialItems: Item.UiItem[];
}

interface CartItem extends Item.UiItem {
  quantity: number;
  returnDate?: string;
}

interface BorrowHistory {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: 'BORROWED' | 'RETURNED' | 'PARTIAL';
}

// For REUSABLE: available_stock (units ready to lend); for CONSUMABLE: current_stock
const getEffectiveStock = (item: Item.UiItem): number =>
  item.type === "REUSABLE"
    ? (typeof item.availableStock === "number" ? item.availableStock : 0)
    : item.stock;

// No stock override — item.stock stays as current_stock so ItemDetailModal
// and tooltip can show the raw total. Display always calls getEffectiveStock().
const mapBorrowableStock = (rows: Item.UiItem[] = []): Item.UiItem[] => rows;

const getTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    "MED_ASSET": "ครุภัณฑ์ภายในองค์กร",
    "REUSABLE": "ของใช้ซ้ำรายชิ้น",
    "CONSUMABLE": "วัสดุสิ้นเปลือง",
  };
  return typeMap[type] || type;
};

export default function BorrowClient({ initialItems }: Props) {
  // ดึงข้อมูลแผนกและสถานะการโหลดจาก useAuth ที่แกะจาก Token จริง
  const { departments, user, isLoading: isAuthLoading } = useAuth();

  // ✅ State สำหรับรายการ Items
  const [items, setItems] = useState<Item.UiItem[]>(mapBorrowableStock(initialItems || []));
  
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
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);

  // State ยืม/คืน
  const [globalReturnDate, setGlobalReturnDate] = useState('');

  // Mock Data ประวัติการยืม (สำหรับการคืน)
  const [history, setHistory] = useState<BorrowHistory[]>([
    { id: 'REQ-001', itemId: '1', itemName: 'เครื่องวัดความดัน', quantity: 1, borrowDate: '2025-12-20', returnDate: '2025-12-25', status: 'BORROWED' }
  ]);

  // Refs to track current state for socket refresh
  const pageRef = useRef(1);
  const categoryRef = useRef("หมวดหมู่ทั้งหมด");
  const unitRef = useRef("หน่วยทั้งหมด");
  const locationRef = useRef("ตำแหน่งทั้งหมด");
  const searchRef = useRef("");


  // --- [Data Fetching Logic] ---
  const fetchPage = useCallback(async (
    page: number,
    category: string,
    unit: string,
    location: string,
    search: string
  ) => {
    setIsFetching(true);
    try {
      // Build filter params based on selections
      const filters: Record<string, unknown> = {
        page,
        limit: itemsPerPage,
        allowed_borrow: true,
        type: 'REUSABLE'
      };
      
      if (category !== "หมวดหมู่ทั้งหมด") {
        filters.category = category;
      }
      if (unit !== "หน่วยทั้งหมด") {
        filters.unit = unit;
      }
      if (location !== "ตำแหน่งทั้งหมด") {
        filters.location = location;
      }
      if (search) {
        filters.keyword = search;
      }

      const result = await ItemSvc.getInventoryItemsPage(filters);
      setItems(mapBorrowableStock(result.items || []));
      setServerTotal(result.meta.total);
      setServerTotalPages(result.meta.totalPages);

      console.log(`[BorrowClient] Fetched page ${page}, total items: ${result.meta.total}`);
    } catch (error) {
      console.error("Fetch error:", error);
      SweetAlertUtils.error("เกิดข้อผิดพลาด", "โหลดข้อมูลล้มเหลว");
    } finally {
      setIsFetching(false);
    }
  }, [itemsPerPage]);

  const refreshData = useCallback(async () => {
    await fetchPage(
      pageRef.current,
      categoryRef.current,
      unitRef.current,
      locationRef.current,
      searchRef.current
    );
  }, [fetchPage]);

  // Keep refs in sync so the stable socket listener can read current state
  useEffect(() => { showCartModalRef.current = showCartModal; }, [showCartModal]);
  useEffect(() => { showItemDetailModalRef.current = showItemDetailModal; }, [showItemDetailModal]);
  useEffect(() => { categoryRef.current = selectedCategory; }, [selectedCategory]);
  useEffect(() => { unitRef.current = selectedUnit; }, [selectedUnit]);
  useEffect(() => { locationRef.current = selectedLocation; }, [selectedLocation]);
  useEffect(() => { searchRef.current = searchTerm; }, [searchTerm]);

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
    const savedCart = localStorage.getItem("borrow_cart");
    if (savedCart) {
      try {
        setSelectedItems(JSON.parse(savedCart));
      } catch (e) {
        console.error(e);
      }
    }

    // โหลด Return Date
    const savedReturnDate = localStorage.getItem("borrow_return_date");
    if (savedReturnDate) {
      setGlobalReturnDate(savedReturnDate);
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

    // โหลดข้อมูล Items (page 1)
    fetchPage(1, "หมวดหมู่ทั้งหมด", "หน่วยทั้งหมด", "ตำแหน่งทั้งหมด", "");
  }, [fetchPage]);

  // --- [Initialize Department Selection from Auth Hook] ---
  useEffect(() => {
    if (!isAuthLoading && departments.length > 0) {
      const clinicalDepts = departments.filter((d) => DEPT_TH[d.name] !== undefined);
      if (!clinicalDepts.length) return;

      const savedDept = localStorage.getItem("borrow_dept");
      const savedDeptId = savedDept ? Number(savedDept) : null;
      const isValid = savedDeptId !== null && clinicalDepts.some((d) => d.id === savedDeptId);

      if (isValid && savedDeptId !== null) {
        setSelectedDeptId(savedDeptId);
      } else {
        const metaDept = user?.app_metadata?.department as string | undefined;
        const metaMatch = metaDept ? clinicalDepts.find((d) => d.name === metaDept || d.code === metaDept) : null;
        setSelectedDeptId(metaMatch ? metaMatch.id : clinicalDepts[0].id);
      }
    }
  }, [isAuthLoading, departments, user]);

  // --- [Persist Cart, Return Date & Department to LocalStorage] ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("borrow_cart", JSON.stringify(selectedItems));
      localStorage.setItem("borrow_return_date", globalReturnDate);
      if (selectedDeptId !== null) {
        localStorage.setItem("borrow_dept", String(selectedDeptId));
      }
    }
  }, [selectedItems, globalReturnDate, selectedDeptId, isMounted]);

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

  // Server-side pagination (no client-side filtering needed)
  const totalPages = serverTotalPages;
  const displayItems = items;

  const openItemDetail = useCallback((item: Item.UiItem) => {
    // Override stock → effective stock so ItemDetailModal caps at the right max
    setSelectedItemForDetail({ ...item, stock: getEffectiveStock(item) });
    setShowItemDetailModal(true);
  }, []);

  // --- [Helper Actions] ---
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
      return [...prev, { ...selectedItemForDetail, quantity, returnDate: globalReturnDate }];
    });
  }, [selectedItemForDetail, globalReturnDate]);

  const addToCart = useCallback((item: Item.UiItem) => {
    if (getEffectiveStock(item) <= 0) return;
    // Pass item with stock = effective stock so ItemDetailModal caps at the right max
    openItemDetail(item);
  }, [openItemDetail]);

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
          <h2 className="text-3xl font-bold text-gray-800">ยืม ครุภัณฑ์</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCartModal(true)}
            className={`px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md transition-transform active:scale-95 ${isCartBouncing ? "animate-bounce-custom" : ""
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
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);
              searchRef.current = value;
              setCurrentPage(1);
              pageRef.current = 1;
              fetchPage(1, categoryRef.current, unitRef.current, locationRef.current, value);
            }}
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

          {/* Category Dropdown Menu */}
          {isCategoryDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c);
                        categoryRef.current = c;
                        setIsCategoryDropdownOpen(false);
                        setCurrentPage(1);
                        pageRef.current = 1;
                        fetchPage(1, c, unitRef.current, locationRef.current, searchRef.current);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
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

          {/* Unit Dropdown Menu */}
          {isUnitDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterUnits.map((u) => (
                  <li key={u}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUnit(u);
                        unitRef.current = u;
                        setIsUnitDropdownOpen(false);
                        setCurrentPage(1);
                        pageRef.current = 1;
                        fetchPage(1, categoryRef.current, u, locationRef.current, searchRef.current);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedUnit === u
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

          {/* Location Dropdown Menu */}
          {isLocationDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterLocations.map((loc) => (
                  <li key={loc}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        locationRef.current = loc;
                        setIsLocationDropdownOpen(false);
                        setCurrentPage(1);
                        pageRef.current = 1;
                        fetchPage(1, categoryRef.current, unitRef.current, loc, searchRef.current);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedLocation === loc
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
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div 
          className="flex-1" 
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            msOverflowStyle: 'auto',
          } as React.CSSProperties}
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
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[20px]">#</th>
                <th className="px-6 py-4 w-[50px]">รูป</th>
                <th className="px-6 py-4 w-[100px]">รหัส</th>
                <th className="px-6 py-4 w-[180px]">ชื่อรายการ</th>
                <th className="px-6 py-4 w-[100px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[110px]">ประเภท</th>
                <th className="px-6 py-4 w-[100px]">ตำแหน่ง</th>
                <th className="px-6 py-4 w-[100px]">คงเหลือ</th>
                <th className="px-6 py-4 w-[80px]">หน่วย</th>
                <th className="px-6 py-4 text-right w-[80px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-6 py-2 w-[20px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-2 w-[50px]">
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
                  <td className="px-6 py-2 w-[100px]">{item.code}</td>
                  <td className="px-6 py-2 w-[180px]">{item.name}</td>
                  <td className="px-6 py-2 w-[100px]">{item.category}</td>
                  <td className="px-6 py-2 w-[110px]">
                    {getTypeDisplay(item.type)}
                  </td>
                  <td className="px-6 py-2 w-[100px]">{item.location}</td>
                  <td className="px-6 py-2 w-[100px]">
                    {item.type === "REUSABLE" ? (
                      <div className="relative group inline-block cursor-help">
                        <span className={`font-bold text-base ${
                          getEffectiveStock(item) <= 0 ? "text-red-500" :
                          getEffectiveStock(item) <= item.minStock ? "text-orange-500" :
                          "text-emerald-600"
                        }`}>
                          {getEffectiveStock(item)}
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
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-2 w-[80px]">{item.unit}</td>
                  <td className="px-6 py-2 w-[80px] text-right">
                    <button
                      onClick={() => addToCart(item)}
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
                  <td colSpan={10}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
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
          แสดง {displayItems.length} จาก {serverTotal} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => {
              const newPage = currentPage - 1;
              setCurrentPage(newPage);
              pageRef.current = newPage;
              fetchPage(newPage, categoryRef.current, unitRef.current, locationRef.current, searchRef.current);
            }}
            className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => {
              const newPage = currentPage + 1;
              setCurrentPage(newPage);
              pageRef.current = newPage;
              fetchPage(newPage, categoryRef.current, unitRef.current, locationRef.current, searchRef.current);
            }}
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

      {/* Modal: ยืม / คืน */}
      <BorrowCartModal
        showCartModal={showCartModal}
        setShowCartModal={setShowCartModal}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        globalReturnDate={globalReturnDate}
        setGlobalReturnDate={setGlobalReturnDate}
        history={history}
        setHistory={setHistory}
        selectedDeptId={selectedDeptId}
        departments={departments}
        onDeptChange={setSelectedDeptId}
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