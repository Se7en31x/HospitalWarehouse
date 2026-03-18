"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Search, Plus, ShoppingCart, PackagePlus, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import * as ItemSvc from "@/services/itemsService";
import { useAuth } from "@/lib/useAuth";
import { socket } from "@/lib/socket";
import CartModal from "./CartModal";
import ItemDetailModal from "./ItemDetailModal";

const MySwal = withReactContent(Swal);

// Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

interface Props {
  initialItems: ItemSvc.UiItem[];
}

interface CartItem extends ItemSvc.UiItem {
  quantity: number;
}

export default function WithdrawClient({ initialItems }: Props) {
  const { departments, isLoading: isAuthLoaded } = useAuth();

  // ✅ State สำหรับรายการ Items
  const [items, setItems] = useState<ItemSvc.UiItem[]>(initialItems || []);
  
  // ✅ State สำหรับ Options (Dropdowns)
  const [categories, setCategories] = useState<ItemSvc.categoryOptions>([]);
  const [units, setUnits] = useState<ItemSvc.unitOptions>([]);

  // ✅ State สำหรับ Cart และ Shopping
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  // ✅ State สำหรับ UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ประเภททั้งหมด");
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

  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ItemSvc.UiItem | null>(null);

  // --- [Data Fetching Logic] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems();
      setItems(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Real-time Socket.io Connection] ---
  useEffect(() => {
    // 1. เชื่อมต่อ Socket
    if (!socket.connected) socket.connect();

    // 2. ฟังก์ชันจัดการเมื่อได้รับสัญญาณ
    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS") {
        console.log("⚡ Socket: Received Refresh Signal -> Reloading Data...");
        refreshData();
      }
    };

    // 3. ฟัง Event ชื่อ 'REFRESH_DATA'
    socket.on("REFRESH_DATA", handleRefreshSignal);

    // 4. Cleanup function เมื่อ Component ถูกทำลาย
    return () => {
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

  // --- [Initialize Department Selection] ---
  useEffect(() => {
    if (isAuthLoaded && departments.length > 0 && !selectedDeptId) {
      const savedDept = localStorage.getItem("withdraw_dept");
      if (savedDept && departments.some((d) => d.code === savedDept)) {
        setSelectedDeptId(savedDept);
      } else if (departments.length === 1) {
        setSelectedDeptId(departments[0].code);
      }
    }
  }, [isAuthLoaded, departments, selectedDeptId]);

  // --- [Persist Cart & Department to LocalStorage] ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("withdraw_cart", JSON.stringify(selectedItems));
      localStorage.setItem("withdraw_dept", selectedDeptId);
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
  const filterCategories = ["ประเภททั้งหมด", ...(categories || []).map((c) => c.name)];
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

      const matchesCat = selectedCategory === "ประเภททั้งหมด" || item.category === selectedCategory;
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

  const openItemDetail = useCallback((item: ItemSvc.UiItem) => {
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
            const stock = items.find((orig) => orig.id === id)?.stock || 0;
            if (n > 0 && n <= stock) return { ...i, quantity: n };
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <PackagePlus className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-indigo-600">เบิกพัสดุ</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCartModal(true)}
            className={`px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2 shadow-md transition-transform active:scale-95 ${
              isCartBouncing ? "animate-bounce-custom" : ""
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            ตะกร้า ({selectedItems.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-center">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative ml-auto" data-category-dropdown>
          <button
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {selectedCategory}
            <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Category Dropdown Menu */}
          {isCategoryDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 min-w-[200px] max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedCategory === c
                          ? "bg-indigo-100 text-indigo-900 font-medium"
                          : "text-slate-900 hover:bg-slate-50"
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
            onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {selectedUnit}
            <ChevronDown className={`w-4 h-4 transition-transform ${isUnitDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Unit Dropdown Menu */}
          {isUnitDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 min-w-[200px] max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterUnits.map((u) => (
                  <li key={u}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUnit(u);
                        setIsUnitDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedUnit === u
                          ? "bg-indigo-100 text-indigo-900 font-medium"
                          : "text-slate-900 hover:bg-slate-50"
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
            onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {selectedLocation}
            <ChevronDown className={`w-4 h-4 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Location Dropdown Menu */}
          {isLocationDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 min-w-[200px] max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterLocations.map((loc) => (
                  <li key={loc}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsLocationDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedLocation === loc
                          ? "bg-indigo-100 text-indigo-900 font-medium"
                          : "text-slate-900 hover:bg-slate-50"
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
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[120px]">รหัสพัสดุ</th>
                <th className="px-6 py-4 w-[300px]">ชื่อรายการ</th>
                <th className="px-6 py-4 w-[140px]">ประเภท</th>
                <th className="px-6 py-4 w-[150px]">ตำแหน่ง</th>
                <th className="px-6 py-4 text-center w-[150px]">คงเหลือ</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[50px] text-slate-400 text-sm">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="px-6 py-4 w-[100px]">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                      ) : (
                        <PackagePlus className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 w-[120px] font-medium text-slate-800">
                    {item.code}
                  </td>
                  <td className="px-6 py-4 w-[300px] text-sm font-medium text-slate-800 truncate">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 w-[140px] text-sm text-slate-600">{item.category}</td>
                  <td className="px-6 py-4 w-[150px] text-sm text-slate-600">{item.location}</td>
                  <td className="px-6 py-4 text-center w-[150px] text-sm font-bold text-slate-800">
                    {item.stock} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right w-[100px]">
                    <button
                      onClick={() => openItemDetail(item)}
                      disabled={item.stock <= 0}
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="เพิ่มเข้าตะกร้า"
                    >
                      <Plus size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {displayItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-sm">
                    ไม่พบข้อมูล
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
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
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
    </div>
  );
}