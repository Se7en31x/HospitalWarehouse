"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Package, Printer, Search, X, Stethoscope } from "lucide-react";

import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import {
  LIST_TABLE_HEAD_ROW,
  LIST_TABLE_TH_COMPACT,
  LIST_TABLE_TH_ICON,
  LIST_TABLE_TH_WIDE,
  LIST_TABLE_TBODY,
} from "@/lib/tableUi";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
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

  const [allItems, setAllItems] = useState<Item.UiItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

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

  const handleBulkPrint = () => {
    printLabels(Array.from(selectedItems.values()));
  };

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const result = await ItemSvc.getAllInventoryItems({ type: "REUSABLE" });
      setAllItems(result || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      if (!silent) setIsFetching(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    fetchAll(true);
  }, [fetchAll]);

  useEffect(() => {
    isVisibleRef.current = document.visibilityState === "visible";
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) refreshData();
    };
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
    fetchAll();
  }, [fetchAll]);

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
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const filterCategories = ["หมวดหมู่ทั้งหมด", ...categories.map((c) => c.name)];

  const filteredItems = allItems.filter((item) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch = !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.code.toLowerCase().includes(keyword);
    const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / REUSABLE_PAGE_LIMIT);
  const paginatedItems = filteredItems.slice((currentPage - 1) * REUSABLE_PAGE_LIMIT, currentPage * REUSABLE_PAGE_LIMIT);

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
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4 mb-1">
            <PageHeadingIconBox icon={Stethoscope} tone="teal" />
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">จัดการอุปกรณ์ทางการแพทย์</h2>
              <p className="text-sm text-slate-500 mt-0.5">ลงทะเบียนและจัดการอุปกรณ์ทางการแพทย์แบบยืม-คืน</p>
            </div>
          </div>
          <div className="flex border-b border-slate-200 mt-2">
            <button
              onClick={() => router.push('/warehouse/assets?mode=reusable')}
              className="px-5 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-700 transition-colors"
            >
              อุปกรณ์ทางการแพทย์
            </button>
            <button
              onClick={() => router.push('/warehouse/assets?mode=med-asset')}
              className="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
            >
              ครุภัณฑ์ภายในองค์กร
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkPrint}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์บาร์โค้ด ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ / รหัส..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        <div className="relative w-full sm:w-auto" data-filter-category>
          <button
            type="button"
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(c); setIsCategoryOpen(false); setCurrentPage(1); }}
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

        <div className="relative w-full sm:w-auto" data-filter-status>
          <button
            type="button"
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
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
                      onClick={() => { setSelectedStatus(s.value); setIsStatusOpen(false); setCurrentPage(1); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        selectedStatus === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
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

        {/* Clear filters */}
        {(searchTerm || selectedCategory !== "หมวดหมู่ทั้งหมด" || selectedStatus !== "ทั้งหมด") && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("หมวดหมู่ทั้งหมด");
              setSelectedStatus("ทั้งหมด");
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
        {isFetching ? (
          <div className="flex flex-col flex-1 min-h-[22rem]">
            <span className="sr-only">กำลังโหลดหน่วย Reusable</span>
            <DataTableSkeleton
              headers={["", "รูป", "รหัส", "ชื่อพัสดุ", "หมวดหมู่", "คงเหลือ", "พร้อมใช้งาน", "หน่วย", "สถานะ", "จัดการ"]}
              rowCount={10}
              showPaginationFooter
              ariaLabel="กำลังโหลดหน่วย Reusable"
              thClassName="px-3 py-4 whitespace-nowrap text-base font-semibold"
              tdClassName="px-3 py-3"
            />
          </div>
        ) : (
          <>
            <div
              className="flex-1"
              style={{ overflowX: "auto", overflowY: "auto", scrollbarWidth: "auto", msOverflowStyle: "auto" } as React.CSSProperties}
            >
              <style>{`
                div::-webkit-scrollbar { width: 0; height: 8px; }
                div::-webkit-scrollbar-track { background: #f1f5f9; }
                div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
              `}</style>
              <table className="w-full text-sm text-left table-fixed">
                <colgroup>
                  <col className="w-[44px]" />
                  <col className="w-[80px]" />
                  <col className="w-[13%]" />
                  <col className="w-[22%]" />
                  <col className="w-[15%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className={LIST_TABLE_HEAD_ROW}>
                  <tr>
                    <th className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedItems.has(i.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                        title="เลือกทั้งหมดในหน้านี้"
                      />
                    </th>
                    <th className={`${LIST_TABLE_TH_ICON} px-6`}>รูป</th>
                    <th className={LIST_TABLE_TH_COMPACT}>รหัส</th>
                    <th className={LIST_TABLE_TH_COMPACT}>ชื่อพัสดุ</th>
                    <th className={LIST_TABLE_TH_WIDE}>หมวดหมู่</th>
                    <th className={LIST_TABLE_TH_WIDE}>คงเหลือ</th>
                    <th className={LIST_TABLE_TH_WIDE}>พร้อมใช้งาน</th>
                    <th className={LIST_TABLE_TH_WIDE}>หน่วย</th>
                    <th className={LIST_TABLE_TH_WIDE}>สถานะ</th>
                    <th className={`${LIST_TABLE_TH_WIDE} text-center`}>จัดการ</th>
                  </tr>
                </thead>
                <tbody className={LIST_TABLE_TBODY}>
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3 text-center">
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
                      <td className="px-3 py-3">{item.code}</td>
                      <td className="px-3 py-3">
                        <span className="block truncate" title={item.name}>{item.name}</span>
                      </td>
                      <td className="px-6 py-3 truncate">{item.category}</td>
                      <td className="px-6 py-3">{item.stock}</td>
                      <td className="px-6 py-3 text-emerald-700 font-semibold">{item.availableStock ?? 0}</td>
                      <td className="px-6 py-3 truncate max-w-0" title={item.unit}>{item.unit}</td>
                      <td className="px-6 py-3"><Badge status={item.status} /></td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => goToRegistry(item.id)}
                          className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg"
                        >
                          <ClipboardList className="w-5 h-5 stroke-[2]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedItems.length === 0 && !isFetching && (
                    <tr>
                      <td colSpan={10}>
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                          </svg>
                          <p className="text-sm font-medium">ไม่พบรายการของใช้ซ้ำ</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
              <p className="text-sm text-slate-500">
                แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
                {filteredItems.length !== allItems.length && (
                  <span className="text-slate-400"> (ทั้งหมด {allItems.length} รายการ)</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
