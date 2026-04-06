"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Search, Plus, ShoppingCart, PackagePlus, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "@/lib/socket";
import { useAuth } from "@/lib/useAuth";
import BorrowCartModal from "./BorrowCartModal";
import ItemDetailModal from "./ItemDetailModal";

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

const mapBorrowableStock = (rows: Item.UiItem[] = []): Item.UiItem[] => {
  return rows.map((item) => ({
    ...item,
    stock: typeof item.availableStock === "number" ? item.availableStock : item.stock,
  }));
};

export default function BorrowClient({ initialItems }: Props) {

  const { departments, isLoading: isAuthLoaded } = useAuth();
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  
  // ✅ State สำหรับรายการ Items
  const [items, setItems] = useState<Item.UiItem[]>(mapBorrowableStock(initialItems || []));

  // ✅ State สำหรับ Options (Dropdowns)
  const [categories, setCategories] = useState<Item.categoryOptions>([]);
  const [units, setUnits] = useState<Item.unitOptions>([]);

  // ✅ State สำหรับ Cart และ Shopping
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);

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

  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item.UiItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // State ยืม/คืน
  const [globalReturnDate, setGlobalReturnDate] = useState('');

  // Mock Data ประวัติการยืม (สำหรับการคืน)
  const [history, setHistory] = useState<BorrowHistory[]>([
    { id: 'REQ-001', itemId: '1', itemName: 'เครื่องวัดความดัน', quantity: 1, borrowDate: '2025-12-20', returnDate: '2025-12-25', status: 'BORROWED' }
  ]);


  // --- [Data Fetching Logic] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems({ allowed_borrow: true, type: 'REUSABLE' });
      setItems(mapBorrowableStock(data || []));
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Auto-select first department from mock useAuth] ---
  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(String(departments[0].id));
    }
  }, [departments, selectedDeptId]);

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
      if (isFetching || isRefreshingRef.current) return;
      if (showCartModal || showItemDetailModal) return;

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
  }, [refreshData, isFetching, showCartModal, showItemDetailModal]);

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

    // โหลดข้อมูล Items หากไม่มีข้อมูลเริ่มต้น
    if (!initialItems || initialItems.length === 0) {
      refreshData();
    }
  }, [initialItems, refreshData]);

  // --- [Persist Cart & Return Date to LocalStorage] ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("borrow_cart", JSON.stringify(selectedItems));
      localStorage.setItem("borrow_return_date", globalReturnDate);
    }
  }, [selectedItems, globalReturnDate, isMounted]);

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

  // --- [Helper Actions] ---
  const openItemDetail = useCallback((item: Item.UiItem) => {
    setSelectedItemForDetail(item);
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
      return [...prev, { ...selectedItemForDetail, quantity, returnDate: globalReturnDate }];
    });
  }, [selectedItemForDetail, globalReturnDate]);

  const addToCart = useCallback((item: Item.UiItem) => {
    if (item.stock <= 0) {
      return;
    }
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
          <h2 className="text-3xl font-bold text-gray-800">ยืม-คืน ครุภัณฑ์</h2>
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

          {/* Category Dropdown Menu */}
          {isCategoryDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => {
                        setSelectedCategory(c);
                        setIsCategoryDropdownOpen(false);
                        setCurrentPage(1);
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
                        setIsUnitDropdownOpen(false);
                        setCurrentPage(1);
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
                        setIsLocationDropdownOpen(false);
                        setCurrentPage(1);
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
      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
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
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[120px]">รหัสพัสดุ</th>
                <th className="px-6 py-4 w-[300px]">ชื่อรายการ</th>
                <th className="px-6 py-4 w-[140px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[150px]">ตำแหน่ง</th>
                <th className="px-6 py-4 w-[150px]">คงเหลือ</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[50px]">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="px-6 py-4 w-[100px]">
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
                  <td className="px-6 py-4 w-[120px]">
                    {item.code || '-'}
                  </td>
                  <td className="px-6 py-4 w-[300px]">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 w-[140px] text-slate-600">{item.category}</td>
                  <td className="px-6 py-4 w-[150px]">{item.location || '-'}</td>
                  <td className="px-6 py-4 w-[150px]">
                    {item.stock} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right w-[100px]">
                    <button
                      onClick={() => addToCart(item)}
                      disabled={item.stock <= 0}
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
                  <td colSpan={8}>
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
            className="relative bg-white rounded-lg shadow-2xl p-2"
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
              className="w-[350px] h-[280px] object-contain rounded-lg"
            />
            <p className="text-center text-sm text-slate-600 mt-2 pb-1">{lightboxImage.name}</p>
          </div>
        </div>
      )}

    </div>
  );
}