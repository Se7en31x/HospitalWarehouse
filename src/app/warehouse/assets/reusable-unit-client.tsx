"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Package, Printer, Search } from "lucide-react";
import * as ItemSvc from "@/services/itemsService";
import type * as Item from "@/types/items_type";
import { socket } from "@/lib/socket";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printLabels, type LabelData } from "@/lib/printLabel";

const STATUS_OPTIONS = [
  { value: "ทั้งหมด",  label: "สถานะทั้งหมด" },
  { value: "ACTIVE",   label: "พร้อมใช้งาน"   },
  { value: "INACTIVE", label: "ระงับ"           },
] as const;

const REUSABLE_PAGE_LIMIT = 10;

export default function ReusableUnitClient() {
  const router = useRouter();

  const [items, setItems] = useState<Item.UiItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);
  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);
  const pageRef = useRef(1);
  const keywordRef = useRef("");
  const keywordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, LabelData>>(new Map());

  const toggleSelect = (item: Item.UiItem) =>
    setSelectedItems((prev) => {
      const s = new Map(prev);
      s.has(item.id) ? s.delete(item.id) : s.set(item.id, { name: item.name, code: item.code });
      return s;
    });

  const toggleSelectAll = () => {
    const allSel = paginatedItems.every((i) => selectedItems.has(i.id));
    setSelectedItems((prev) => {
      const s = new Map(prev);
      allSel
        ? paginatedItems.forEach((i) => s.delete(i.id))
        : paginatedItems.forEach((i) => s.set(i.id, { name: i.name, code: i.code }));
      return s;
    });
  };

  const fetchPage = useCallback(async (page: number, keyword: string) => {
    setIsFetching(true);
    try {
      const result = await ItemSvc.getInventoryItemsPage({
        type: "REUSABLE",
        page,
        limit: REUSABLE_PAGE_LIMIT,
        ...(keyword ? { keyword } : {}),
      });
      setItems(result.items || []);
      setServerTotal(result.meta.total);
      setServerTotalPages(result.meta.totalPages);
    } catch (error) {
      console.error("Fetch error:", error);
      SweetAlertUtils.error("เกิดข้อผิดพลาด", "โหลดข้อมูลของใช้ซ้ำไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    fetchPage(pageRef.current, keywordRef.current);
  }, [fetchPage]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current || isFetching || isRefreshingRef.current) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try { await refreshData(); }
        finally { isRefreshingRef.current = false; refreshTimerRef.current = null; }
      }, 220);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS" || message === "REUSABLE_UNITS") scheduleRefresh();
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    return () => {
      if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [refreshData, isFetching]);

  useEffect(() => {
    ItemSvc.getcategoriesOptions()
      .then(d => setCategories(d || []))
      .catch(err => console.error("Load categories options failed", err));
    fetchPage(1, "");
  }, [fetchPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
    };
    if (isCategoryOpen || isStatusOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    keywordRef.current = value;
    if (keywordTimerRef.current) clearTimeout(keywordTimerRef.current);
    keywordTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      pageRef.current = 1;
      fetchPage(1, value);
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    pageRef.current = newPage;
    fetchPage(newPage, keywordRef.current);
  };

  const filterCategories = ["หมวดหมู่ทั้งหมด", ...categories.map((c) => c.name)];

  // Client-side secondary filters on current page's items
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;
    return matchesCat && matchesStatus;
  });
  const paginatedItems = filteredItems;

  const goToRegistry = (itemId: string) => {
    router.push(`/warehouse/assets/reusable-registry?itemId=${itemId}`);
  };

  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      "ACTIVE": "พร้อมใช้งาน",
      "INACTIVE": "ระงับ",
      "LOW": "ต่ำ",
      "OUT_OF_STOCK": "หมด",
      "SUSPEND": "ระงับ",
      "SUSPENDED": "ระงับ",
    };
    return statusMap[status] || status;
  };

  const Badge = ({ status }: { status: string }) => {
    const thaiStatus = translateStatus(status);
    const styles: Record<string, string> = {
      "พร้อมใช้งาน": "bg-green-100 text-green-500",
      "ต่ำ": "bg-amber-100 text-amber-500",
      "หมด": "bg-red-100 text-red-500",
      "ระงับ": "bg-red-100 text-red-500",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${styles[thaiStatus] || "bg-slate-100 text-slate-700"}`}>
        {thaiStatus}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-gray-800">จัดการของใช้ซ้ำรายชิ้น</h2>
          {selectedItems.size > 0 && (
            <button
              onClick={() => printLabels(Array.from(selectedItems.values()))}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 text-sm font-semibold flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              พิมพ์สติกเกอร์ ({selectedItems.size})
            </button>
          )}
        </div>
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => router.push('/warehouse/assets?mode=reusable')}
            className="px-5 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-700 transition-colors"
          >
            ของใช้ซ้ำรายชิ้น (Reusable)
          </button>
          <button
            onClick={() => router.push('/warehouse/assets?mode=med-asset')}
            className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            ครุภัณฑ์ภายในองค์กร (Med Asset)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ / รหัส..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
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
                {filterCategories.map((c) => (
                  <li key={c}>
                    <button type="button" onClick={() => { setSelectedCategory(c); setIsCategoryOpen(false); setCurrentPage(1); pageRef.current = 1; }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >{c}</button>
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
            <span className="text-slate-800 font-medium">
              {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label ?? "สถานะทั้งหมด"}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {STATUS_OPTIONS.map((s) => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => { setSelectedStatus(s.value); setIsStatusOpen(false); setCurrentPage(1); pageRef.current = 1; }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        selectedStatus === s.value
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{s.label}</span>
                      {selectedStatus === s.value && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: "60vh" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        <div className="flex-1" style={{ overflowX: 'auto', overflowY: 'auto' } as React.CSSProperties}>
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-[44px] text-center">
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedItems.has(i.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                    title="เลือกทั้งหมดในหน้านี้"
                  />
                </th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[140px]">รหัส</th>
                <th className="px-6 py-4 w-[260px]">ชื่อรายการ</th>
                <th className="px-6 py-4 w-[180px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[130px]">คงเหลือ</th>
                <th className="px-6 py-4 w-[130px]">พร้อมใช้งาน</th>
                <th className="px-6 py-4 w-[120px]">หน่วย</th>
                <th className="px-6 py-4 w-[130px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 w-[44px] text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelect(item)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                      {item.imageUrl
                        ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                        : <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />}
                    </div>
                  </td>
                  <td className="px-6 py-3">{item.code}</td>
                  <td className="px-6 py-3">{item.name}</td>
                  <td className="px-6 py-3">{item.category}</td>
                  <td className="px-6 py-3">{item.stock}</td>
                  <td className="px-6 py-3 text-emerald-700 font-semibold">{item.availableStock ?? 0}</td>
                  <td className="px-6 py-3">{item.unit}</td>
                  <td className="px-6 py-3"><Badge status={item.status} /></td>
                  <td className="px-6 py-3 w-[100px] text-center">
                    <button onClick={() => goToRegistry(item.id)} className="text-blue-700 hover:bg-blue-50 rounded-lg">
                      <ClipboardList className="w-6 h-6 stroke-[2]" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={11}>
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
        <p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {serverTotal} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1 || isFetching} onClick={() => handlePageChange(currentPage - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {serverTotalPages || 1}</span>
          <button disabled={currentPage >= serverTotalPages || isFetching} onClick={() => handlePageChange(currentPage + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
