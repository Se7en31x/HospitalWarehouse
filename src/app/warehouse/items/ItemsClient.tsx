"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  PackagePlus, Search, Edit, Package,
  ChevronLeft, ChevronRight, ChevronDown,
  Trash2, X
} from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "../../../lib/socket";
import ItemFormModal from "./ItemFormModal";
import { SweetAlertUtils } from "@/utils/sweetAlert";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export default function ItemsClient({ initialItems }: { initialItems: Item.UiItem[] }) {
  const [items, setItems] = useState<Item.UiItem[]>(initialItems || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems({ limit: 1000 });
      setItems(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      SweetAlertUtils.error("เกิดข้อผิดพลาด", "โหลดข้อมูลล้มเหลว");
    } finally {
      setIsFetching(false);
    }
  }, []);

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

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const categoryData = await ItemSvc.getcategoriesOptions();
        setCategories(categoryData || []);
      } catch (err) {
        console.error("Load categories options failed", err);
      }
    };

    fetchOptions();
    refreshData();
  }, [refreshData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
  // const [selectedLocation, setSelectedLocation] = useState("ที่ตั้งทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  // const [isLocationOpen, setIsLocationOpen] = useState(false);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
      // if (!target.closest("[data-filter-location]")) setIsLocationOpen(false);
    };
    if (isCategoryOpen || isStatusOpen /* || isLocationOpen */) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item.UiItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const filterCategories = ["หมวดหมู่ทั้งหมด", ...categories.map(c => c.name)];
  // const filterLocations = ["ที่ตั้งทั้งหมด", ...Array.from(new Set(items.map(i => i.location).filter(Boolean)))];

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.code || "").toLowerCase().includes(term) ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term);

    const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "สถานะทั้งหมด" || item.status === selectedStatus;
    // const matchesLocation = selectedLocation === "ที่ตั้งทั้งหมด" || item.location === selectedLocation;

    return matchesSearch && matchesCat && matchesStatus; // && matchesLocation;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (id: string) => {
    const result = await SweetAlertUtils.delete("ลบพัสดุ", "คุณต้องการลบรายการนี้ใช่หรือไม่?");
    if (!result.isConfirmed) return;
    try {
      await ItemSvc.deleteInventoryItem(id);
      SweetAlertUtils.success("สำเร็จ", "ลบรายการเรียบร้อย");
    } catch (error) {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", getErrorMessage(error));
    }
  };

  const openEditModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
  };

  const Badge = ({ status }: { status: string }) => {
    const statusMap: Record<string, string> = {
      "ACTIVE": "เปิดใช้งาน",
    };
    const displayStatus = statusMap[status] || status;
    
    const styles: Record<string, string> = {
      "ปกติ": "bg-green-100 text-green-800",
      "ต่ำ": "bg-yellow-100 text-yellow-800",
      "หมด": "bg-red-100 text-red-800",
      "ระงับ": "bg-gray-200 text-gray-500",
      "เปิดใช้งาน": "bg-green-100 text-green-800",
    };
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${styles[displayStatus] || "bg-gray-100"}`}>
        {displayStatus}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">รายการพัสดุ</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedItem(null); setIsAddModalOpen(true); }} className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md">
            <PackagePlus className="w-4 h-4" /> เพิ่มพัสดุใหม่
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหาชื่อ / รหัส..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
        </div>

        <div className="relative" data-filter-category>
          <button
            type="button"
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map(c => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(c); setIsCategoryOpen(false); setCurrentPage(1); }}
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

        <div className="relative" data-filter-status>
          <button
            type="button"
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus === "สถานะทั้งหมด" ? "สถานะทั้งหมด" : selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[{ value: "สถานะทั้งหมด", label: "สถานะทั้งหมด" }, { value: "ปกติ", label: "ปกติ" }, { value: "ต่ำ", label: "ต่ำ" }, { value: "หมด", label: "หมด" }, { value: "ระงับ", label: "ระงับ" }].map(s => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => { setSelectedStatus(s.value); setIsStatusOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
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

        {/* Location Dropdown - Disabled */}
        {/* <div className="relative" data-filter-location>
          <button
            type="button"
            onClick={() => { setIsLocationOpen(!isLocationOpen); setIsCategoryOpen(false); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedLocation}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLocationOpen ? "rotate-180" : ""}`} />
          </button>
          {isLocationOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterLocations.map(l => (
                  <li key={l}>
                    <button
                      type="button"
                      onClick={() => { setSelectedLocation(l); setIsLocationOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedLocation === l ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div> */}
      </div>

      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
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
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[150px]">รหัส</th>
                <th className="px-6 py-4 w-[300px]">ชื่อพัสดุ</th>
                <th className="px-6 py-4 w-[200px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[150px]">คงเหลือ</th>
                <th className="px-6 py-4 w-[150px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[50px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
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
                        <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.code}</td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.category}
                  </td>
                  <td className="px-6 py-4">{item.stock} {item.unit}</td>
                  <td className="px-6 py-4 w-[150px]"><Badge status={item.status} /></td>
                  <td className="px-6 py-4 w-[100px] text-center">
                    <div className="flex justify-between gap-1">
                      <button onClick={() => openEditModal(item)} className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg"><Edit className="w-5 h-5"/></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
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

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <ItemFormModal
        isOpen={isAddModalOpen || isEditModalOpen}
        isEdit={isEditModalOpen}
        initialData={selectedItem}
        onCloseAction={handleModalClose}
        onSuccessAction={handleModalSuccess}
      />

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