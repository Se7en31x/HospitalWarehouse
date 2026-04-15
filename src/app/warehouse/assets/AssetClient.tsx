"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Edit, Package, ChevronLeft, ChevronRight,
  ChevronDown, ClipboardList, X
} from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "../../../lib/socket";
import ItemFormModal from "../items/ItemFormModal";
import { SweetAlertUtils } from "@/utils/sweetAlert";

export default function AssetClient({ initialItems }: { initialItems: Item.UiItem[] }) {
  const router = useRouter();

  // --- [States] ---
  const [items, setItems] = useState<Item.UiItem[]>(initialItems || []);
  const [isFetching, setIsFetching] = useState(false);
  const [categories, setCategories] = useState<Item.categoryOptions>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  // --- [Data Fetching] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems({ limit: 1000 });
      const assetOnly = (data || []).filter(i => i.type === "ASSET");
      setItems(assetOnly);
    } catch (error) {
      console.error("Fetch error:", error);
      SweetAlertUtils.error("เกิดข้อผิดพลาด", "โหลดข้อมูลพัสดุไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, []);

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
    if (!initialItems || initialItems.length === 0) refreshData();
  }, [initialItems, refreshData]);

  // --- [Search & Filter States] ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  // const [selectedLocation, setSelectedLocation] = useState("ที่ตั้งทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dropdown open states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  // const [isLocationOpen, setIsLocationOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
      // if (!target.closest("[data-filter-location]")) setIsLocationOpen(false);
    };
    if (isCategoryOpen || isStatusOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item.UiItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // --- [Filter Logic] ---
  const filterCategories = ["หมวดหมู่ทั้งหมด", ...categories.map(c => c.name)];
  // const filterLocations = ["ที่ตั้งทั้งหมด", ...Array.from(new Set(items.map(i => i.location).filter(Boolean)))];

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.code || "").toLowerCase().includes(term) ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term);
    const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;
    // const matchesLocation = selectedLocation === "ที่ตั้งทั้งหมด" || item.location === selectedLocation;

    return matchesSearch && matchesCat && matchesStatus; // && matchesLocation;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- [Handlers] ---
  const goToRegistry = (itemId: string) => {
    router.push(`/warehouse/assets/registry?itemId=${itemId}`);
  };

  const openEditModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
  };

  // --- [Status Translation] ---
  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      "ACTIVE": "ใช้งาน",
      "LOW": "ต่ำ",
      "OUT_OF_STOCK": "หมด",
      "SUSPEND": "ระงับ",
      "SUSPENDED": "ระงับ",
      "ใช้งาน": "ใช้งาน",
      "ต่ำ": "ต่ำ",
      "หมด": "หมด",
      "ระงับ": "ระงับ",
    };
    return statusMap[status] || status;
  };

  // --- [UI Components] ---
  const Badge = ({ status }: { status: string }) => {
    const thaiStatus = translateStatus(status);
    const styles: Record<string, string> = {
      "ใช้งาน": "bg-green-100 text-green-800",
      "ต่ำ": "bg-yellow-100 text-yellow-800",
      "หมด": "bg-red-100 text-red-800",
      "ระงับ": "bg-gray-200 text-gray-500",
    };
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${styles[thaiStatus] || "bg-gray-100"}`}>
        {thaiStatus}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">จัดการครุภัณฑ์</h2>
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => router.push('/warehouse/assets?mode=reusable')}
            className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            ของใช้ซ้ำรายชิ้น (Reusable)
          </button>
          <button
            onClick={() => router.push('/warehouse/assets?mode=med-asset')}
            className="px-5 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-700 transition-colors"
          >
            ครุภัณฑ์ภายในองค์กร (Med Asset)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหาชื่อ / รหัส..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
        </div>

        {/* Category Dropdown */}
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

        {/* Status Dropdown */}
        <div className="relative" data-filter-status>
          <button
            type="button"
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus === "ทั้งหมด" ? "สถานะทั้งหมด" : selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[{ value: "ทั้งหมด", label: "สถานะทั้งหมด" }, { value: "ปกติ", label: "ปกติ" }, { value: "ต่ำ", label: "ต่ำ" }, { value: "หมด", label: "หมด" }, { value: "ระงับ", label: "ระงับ" }].map(s => (
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

      {/* Table Content */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: '60vh' }}>
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
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[150px]">รหัส</th>
                <th className="px-6 py-4 w-[300px]">ชื่อครุภัณฑ์</th>
                <th className="px-6 py-4 w-[200px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[150px]">คงเหลือ</th>
                <th className="px-6 py-4 w-[120px]">หน่วย</th>
                <th className="px-6 py-4 w-[150px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-6 py-3 w-[50px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-3 w-[100px]">
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
                  <td className="px-6 py-3">{item.code}</td>
                  <td className="px-6 py-3">{item.name}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {item.category}
                  </td>
                  <td className="px-6 py-3">{item.stock}</td>
                   <td className="px-6 py-3">{item.unit}</td>
                  <td className="px-6 py-3 w-[150px]"><Badge status={item.status} /></td>
                  <td className="px-6 py-3 w-[100px] text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => goToRegistry(item.id)}
                        className="text-slate-700 hover:text-blue-600 transition-colors p-1"
                      >
                        <ClipboardList className="w-6 h-6 stroke-[2]" />
                      </button>
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

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Item Form Modal */}
      <ItemFormModal
        isOpen={isEditModalOpen}
        isEdit={true}
        initialData={selectedItem}
        onCloseAction={handleModalClose}
        onSuccessAction={handleModalSuccess}
      />

      {/* Image Lightbox */}
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