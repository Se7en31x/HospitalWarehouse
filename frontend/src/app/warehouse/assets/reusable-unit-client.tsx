"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Package, Search } from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "@/lib/socket";

export default function ReusableUnitClient() {
  const router = useRouter();

  const [items, setItems] = useState<Item.UiItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทุกประเภท");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [selectedLocation, setSelectedLocation] = useState("ที่ตั้งทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems({ type: "REUSABLE" });
      const reusableOnly = (data || []).filter((i) => (i.type || "").toUpperCase() === "REUSABLE");
      setItems(reusableOnly);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("โหลดข้อมูลของใช้ซ้ำไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS" || message === "REUSABLE_UNITS") refreshData();
    };
    socket.on("REFRESH_DATA", handleRefreshSignal);
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

    fetchOptions();
    refreshData();
  }, [refreshData]);

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

  const filterCategories = ["ทุกประเภท", ...categories.map((c) => c.name)];
  const filterLocations = ["ที่ตั้งทั้งหมด", ...Array.from(new Set(items.map((i) => i.location).filter(Boolean)))];

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.code || "").toLowerCase().includes(term) ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term);

    const matchesCat = selectedCategory === "ทุกประเภท" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;
    const matchesLocation = selectedLocation === "ที่ตั้งทั้งหมด" || item.location === selectedLocation;

    return matchesSearch && matchesCat && matchesStatus && matchesLocation;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToRegistry = (itemId: string) => {
    router.push(`/warehouse/assets/reusable-registry?itemId=${itemId}`);
  };

  const Badge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      INACTIVE: "bg-gray-200 text-gray-500",
      "ปกติ": "bg-green-100 text-green-800",
      "ต่ำ": "bg-yellow-100 text-yellow-800",
      "หมด": "bg-red-100 text-red-800",
      "ระงับ": "bg-gray-200 text-gray-500",
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

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">จัดการของใช้ซ้ำรายชิ้น</h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ / รหัส..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        <div className="relative" data-filter-category>
          <button
            type="button"
            onClick={() => {
              setIsCategoryOpen(!isCategoryOpen);
              setIsStatusOpen(false);
              setIsLocationOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
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
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
            onClick={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsCategoryOpen(false);
              setIsLocationOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus === "ทั้งหมด" ? "ทุกสถานะ" : selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[{ value: "ทั้งหมด", label: "ทุกสถานะ" }, { value: "ACTIVE", label: "พร้อมใช้งาน" }, { value: "INACTIVE", label: "ระงับ" }].map((s) => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus(s.value);
                        setIsStatusOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative" data-filter-location>
          <button
            type="button"
            onClick={() => {
              setIsLocationOpen(!isLocationOpen);
              setIsCategoryOpen(false);
              setIsStatusOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedLocation}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLocationOpen ? "rotate-180" : ""}`} />
          </button>
          {isLocationOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterLocations.map((l) => (
                  <li key={l}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(l);
                        setIsLocationOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedLocation === l ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[60px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[140px]">รหัส</th>
                <th className="px-6 py-4 w-[260px]">ชื่อรายการ</th>
                <th className="px-6 py-4 w-[180px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[130px] text-center">คงเหลือรวม</th>
                <th className="px-6 py-4 w-[130px] text-center">พร้อมใช้งาน</th>
                <th className="px-6 py-4 w-[130px]">สถานะ</th>
                <th className="px-6 py-4 text-right w-[200px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                      ) : (
                        <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.code}</td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4 text-center">{item.stock} {item.unit}</td>
                  <td className="px-6 py-4 text-center text-emerald-700 font-semibold">
                    {(item.availableStock ?? 0)} {item.unit}
                  </td>
                  <td className="px-6 py-4"><Badge status={item.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => goToRegistry(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white hover:bg-blue-600 rounded-lg transition-colors text-xs font-semibold ml-auto"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      ดูทะเบียนรายชิ้น
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <p className="text-sm font-medium">ไม่พบรายการของใช้ซ้ำ</p>
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
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="p-2 border rounded-lg disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="p-2 border rounded-lg disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
