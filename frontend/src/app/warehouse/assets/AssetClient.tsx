"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Search, Edit, Package, ChevronLeft, ChevronRight, 
  ClipboardList, Image as ImageIcon, Loader2, Filter
} from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "../../../lib/socket";
import ItemFormModal from "../items/ItemFormModal"; 

export default function AssetClient({ initialItems }: { initialItems: Item.UiItem[] }) {
  const router = useRouter();

  // --- [States] ---
  const [items, setItems] = useState<Item.UiItem[]>(initialItems || []);
  const [isFetching, setIsFetching] = useState(false);
  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทุกหมวดหมู่");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item.UiItem | null>(null);

  // --- [Data Fetching] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      // ดึงข้อมูลไอเทมทั้งหมด
      const data = await ItemSvc.getInventoryItems();
      // 🟢 กรองเอาเฉพาะพัสดุประเภทครุภัณฑ์ (ASSET) ตามที่คุณต้องการ
      const assetOnly = (data || []).filter(i => i.type === "ASSET");
      setItems(assetOnly);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("โหลดข้อมูลพัสดุไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Socket Real-time
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleRefresh = (msg: string) => { if (msg === 'ITEMS') refreshData(); };
    socket.on("REFRESH_DATA", handleRefresh);
    return () => { socket.off("REFRESH_DATA", handleRefresh); };
  }, [refreshData]);

  // Load Categories & Initial Data
  useEffect(() => {
    ItemSvc.getcategoriesOptions().then(setCategories).catch(console.error);
    if (!initialItems || initialItems.length === 0) refreshData();
  }, [initialItems, refreshData]);

  // --- [Filter Logic] ---
  const filterCategories = ["ทุกหมวดหมู่", ...categories.map(c => c.name)];

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.code || "").toLowerCase().includes(term) ||
      (item.name || "").toLowerCase().includes(term);
    const matchesCat = selectedCategory === "ทุกหมวดหมู่" || item.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- [Handlers] ---
  const goToRegistry = (itemId: string) => {
    // 🟢 กดแล้วไปหน้า "ทะเบียนรายชิ้น" เพื่อดูว่าแต่ละชิ้นอยู่แผนกไหน
    router.push(`/warehouse/assets/registry?itemId=${itemId}`);
  };

  const openEditModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">จัดการครุภัณฑ์</h2>
        <p className="text-slate-500 mt-1 font-medium">ตรวจสอบยอดรวมและการกระจายตัวของครุภัณฑ์รายแผนก</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ รหัสพัสดุ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all font-medium bg-slate-50/50"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="py-2 text-sm outline-none bg-transparent font-bold text-slate-600 cursor-pointer min-w-[150px]"
          >
            {filterCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="ml-auto px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl text-xs font-black uppercase tracking-widest border border-blue-100">
          Total: {filteredItems.length} Types
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-[2rem] bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative flex flex-col flex-1" style={{ minHeight: '60vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        )}
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-5 w-[80px] text-center">#</th>
                <th className="px-6 py-5 w-[120px]">รูป</th>
                <th className="px-6 py-5 w-[180px]">รหัสพัสดุ</th>
                <th className="px-6 py-5">ชื่อครุภัณฑ์</th>
                <th className="px-6 py-5 w-[200px]">หมวดหมู่</th>
                <th className="px-6 py-5 text-center w-[160px]">จำนวนทั้งหมด</th>
                <th className="px-8 py-5 text-right w-[200px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-8 py-5 text-center text-slate-300 font-mono text-xs font-bold">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-mono font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-xs">
                        {item.code}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-800 text-base">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Hospital Asset Item</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">
                        {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="text-2xl font-black text-slate-800">{item.stock}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.unit}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                        title="แก้ไขข้อมูลพื้นฐาน"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => goToRegistry(item.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200"
                      >
                        <ClipboardList className="w-4 h-4" />
                        ติดตามรายชิ้น
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {paginatedItems.length === 0 && !isFetching && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
              <Package className="w-20 h-20 opacity-10 mb-4" />
              <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">No Assets Found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-8 px-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Page {currentPage} of {totalPages || 1}
        </p>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)} 
            className="p-3 border border-slate-200 bg-white rounded-2xl disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-black shadow-xl shadow-slate-200">
            {currentPage}
          </div>
          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => setCurrentPage(p => p + 1)} 
            className="p-3 border border-slate-200 bg-white rounded-2xl disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal แก้ไขข้อมูล (ชื่อ/รูป/หมวดหมู่) */}
      <ItemFormModal
        isOpen={isEditModalOpen}
        isEdit={true}
        initialData={selectedItem}
        onCloseAction={() => { setIsEditModalOpen(false); setSelectedItem(null); }}
        onSuccessAction={() => { setIsEditModalOpen(false); refreshData(); }}
      />
    </div>
  );
}