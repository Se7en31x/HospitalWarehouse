"use client";

import { useState, useCallback, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  PackagePlus, Search, Edit, Package,
  ChevronLeft, ChevronRight,
  Trash2, ChevronDown
} from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "../../../lib/socket";
import ItemFormModal from "./ItemFormModal";



// Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export default function ItemsClient({ initialItems }: { initialItems: Item.UiItem[] }) {
  // ✅ State สำหรับรายการสินค้า
  const [items, setItems] = useState<Item.UiItem[]>(initialItems || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // ✅ State สำหรับ Options (Dropdowns)
  const [categories, setCategories] = useState<Item.categoryOptions>([]);
  // const [warehouses, setWarehouses] = useState<Item.warehouseOptions>([]);
  // const [units, setUnits] = useState<Item.unitOptions>([]);

  // --- [Data Fetching Logic] ---
  // ฟังก์ชันดึงข้อมูลใหม่ (ใช้ useCallback เพื่อให้เรียกซ้ำใน useEffect ได้โดยไม่ loop)
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems();
      setItems(data || []);
      // Optional: แจ้งเตือนเล็กๆ ว่าอัปเดตแล้ว (ถ้าต้องการ)
      // toast.success("อัปเดตข้อมูลล่าสุดแล้ว", { id: 'refresh-toast', duration: 2000 });
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Real-time Socket.io Connection (Updated)] ---
  useEffect(() => {
    // 1. เชื่อมต่อ Socket
    if (!socket.connected) socket.connect();

    // 2. ฟังก์ชันจัดการเมื่อได้รับสัญญาณ
    const handleRefreshSignal = (message: string) => {
      if (message === 'ITEMS') {
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

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const categoryData = await ItemSvc.getcategoriesOptions();
        setCategories(categoryData || []);
      } catch (err) {
        console.error("Load categories options failed", err);
      }
    };

    // const fetchWarehouses = async () => {
    //   try {
    //     const warehouseData = await ItemSvc.getWarehousesOptions();
    //     setWarehouses(warehouseData || []);
    //   } catch (err) {
    //     console.error("Load warehouses options failed", err);
    //   }
    // };

    // const fetchUnits = async () => {
    //   try {
    //     const unitData = await ItemSvc.getUnitsOptions();
    //     setUnits(unitData || []);
    //   } catch (err) {
    //     console.error("Load units options failed", err);
    //   }
    // };

    fetchOptions();
    // fetchWarehouses();
    // fetchUnits();

    // โหลดข้อมูลใหม่หากไม่มีข้อมูลเริ่มต้น
    if (!initialItems || initialItems.length === 0) {
      refreshData();
    }
  }, [initialItems, refreshData]);

  // --- [Search & Filter States] ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ประเภททั้งหมด");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item.UiItem | null>(null);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-category-dropdown]")) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryDropdownOpen]);

  // Logic การ Filter
  const filterCategories = ["ประเภททั้งหมด", ...categories.map(c => c.name)];

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.code || "").toLowerCase().includes(term) ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term);

    const matchesCat = selectedCategory === "ประเภททั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- [Handlers] ---
  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;
    try {
      await ItemSvc.deleteInventoryItem(id);
      toast.success("ลบรายการเรียบร้อย");
      // รอ Socket สั่ง Refresh
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openEditModal = (item: Item.UiItem) => {
    console.log("=== openEditModal ===");
    console.log("item:", item);
    console.log("item.id:", item.id);
    console.log("All item fields:", Object.keys(item).map(k => `${k}: ${(item as any)[k]}`));
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleModalSuccess = () => {
    // Modal will trigger Socket to refresh data
    handleModalClose();
  };

  // --- [UI Components] ---
  const Badge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      "ปกติ": "bg-green-100 text-green-800",
      "ต่ำ": "bg-yellow-100 text-yellow-800",
      "หมด": "bg-red-100 text-red-800",
      "ระงับ": "bg-gray-200 text-gray-500",
      "ACTIVE": "bg-green-100 text-green-800",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Package className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-indigo-600">สต็อกพัสดุ Real-time</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedItem(null); setIsAddModalOpen(true); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2 shadow-md">
            <PackagePlus className="w-4 h-4" /> เพิ่มพัสดุใหม่
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-center">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none" />
        </div>
        <div className="relative ml-auto" data-category-dropdown>
          <button
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {selectedCategory}
            <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
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
                <th className="px-6 py-4 w-[150px]">รหัส</th>
                <th className="px-6 py-4">ชื่อพัสดุ</th>
                <th className="px-6 py-4 w-[150px]">ประเภท</th>
                <th className="px-6 py-4 text-center w-[150px]">คงเหลือ</th>
                <th className="px-6 py-4 text-center text-orange-600 w-[150px]">ขั้นต่ำ</th>
                <th className="px-6 py-4 w-[150px]">ตำแหน่ง</th>
                <th className="px-6 py-4 w-[150px]">สถานะ</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[50px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4 w-[100px]">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 w-[150px] font-medium">{item.code}</td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4 w-[150px] text-slate-500">{item.category}</td>
                  <td className="px-6 py-4 w-[150px] text-center font-bold">{item.stock} {item.unit}</td>
                  <td className="px-6 py-4 w-[150px] text-center text-orange-600 bg-orange-50/30 font-bold">{item.minStock} {item.unit}</td>
                  <td className="px-6 py-4 w-[150px]">{item.location}</td>
                  <td className="px-6 py-4 w-[150px]"><Badge status={item.status} /></td>
                  <td className="px-6 py-4 w-[100px] text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEditModal(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-500">ไม่พบข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Item Form Modal */}
      <ItemFormModal
        isOpen={isAddModalOpen || isEditModalOpen}
        isEdit={isEditModalOpen}
        initialData={selectedItem}
        onCloseAction={handleModalClose}
        onSuccessAction={handleModalSuccess}
      />
    </div>
  );
}