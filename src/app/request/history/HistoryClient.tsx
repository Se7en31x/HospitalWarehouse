"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, Eye, Package, Loader2, ChevronDown, Clock,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { getAllRequisitions, cancelRequisition } from "@/services/requisitionService";
import type { RequisitionHeader } from "@/types/requisition_type";
import { socket } from "@/lib/socket";
import { fmtDateTime } from "@/utils/dateUtils";
import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import { LIST_TABLE_HEAD_ROW, LIST_TABLE_TBODY, LIST_TABLE_TH, LIST_TABLE_TH_NUM } from "@/lib/tableUi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  BORROWING: "bg-green-100 text-green-700 border-green-200",
  APPROVED:  "bg-blue-100 text-blue-700 border-blue-200",
  PENDING:   "bg-amber-100 text-amber-700 border-amber-200",
  PENDING_RETURN_CHECK: "bg-sky-100 text-sky-800 border-sky-200",
  REJECTED:  "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:   "รออนุมัติ",
  APPROVED:  "อนุมัติแล้ว",
  COMPLETED: "เสร็จสิ้น",
  BORROWING: "กำลังยืม",
  PENDING_RETURN_CHECK: "รอตรวจรับคืน",
  REJECTED:  "ถูกปฏิเสธ",
  CANCELLED: "ยกเลิก",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS_BADGE[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
    {STATUS_LABEL[status] ?? status}
  </span>
);

const TypeBadge = ({ type }: { type: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${type === "WITHDRAW" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
    {type === "WITHDRAW" ? "เบิก" : "ยืม"}
  </span>
);

const STATUS_TABS = [
  { v: "all",       l: "รวมทั้งหมด" },
  { v: "PENDING",   l: "รออนุมัติ" },
  { v: "APPROVED",  l: "อนุมัติแล้ว" },
  { v: "PENDING_RETURN_CHECK", l: "รอตรวจรับคืน" },
  { v: "COMPLETED", l: "เสร็จสิ้น" },
  { v: "REJECTED",  l: "ถูกปฏิเสธ" },
  { v: "CANCELLED", l: "ยกเลิก" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HistoryClient() {
  const router = useRouter();
  const [records, setRecords] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-type-dd]")) setIsTypeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const result = await getAllRequisitions({ limit: 100 });
      let data: RequisitionHeader[] = [];
      if (Array.isArray(result.data)) {
        data = result.data;
      } else if (result.data && typeof result.data === "object" && "items" in result.data) {
        data = (result.data as { items: RequisitionHeader[] }).items;
      }
      setRecords(data);
    } catch {
      if (!silent) { toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล"); setRecords([]); }
    } finally {
      if (!silent) setIsFetching(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) fetchData(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchData]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current || isRefreshingRef.current) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try {
          await fetchData(true);
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 300);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REQUISITIONS") scheduleRefresh();
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchData]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((r) => {
      const matchStatus = activeTab === "all" || r.status === activeTab;
      const matchType = selectedType === "all" || r.type === selectedType;
      const matchSearch =
        !term ||
        r.doc_no.toLowerCase().includes(term) ||
        (r.requester ?? "").toLowerCase().includes(term) ||
        (r.department_name ?? "").toLowerCase().includes(term);
      return matchStatus && matchType && matchSearch;
    });
  }, [records, searchTerm, activeTab, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  return (
    <div className="flex flex-col min-h-screen bg-white p-4 sm:p-8 font-sans">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <PageHeadingIconBox icon={Clock} tone="slate" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">ประวัติการทำรายการ</h2>
            <p className="text-sm text-slate-500 mt-0.5">ดูรายการคำขอทั้งหมดและติดตามสถานะการดำเนินการ</p>
          </div>
        </div>
      </div>

      {/* Search + Type */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่, ผู้ทำรายการ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        <div className="relative" data-type-dd>
          <button
            onClick={() => setIsTypeOpen((p) => !p)}
            className="flex items-center justify-between gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 w-[150px] shadow-sm"
          >
            <span className="font-medium text-slate-700">
              {selectedType === "all" ? "ทุกประเภท" : selectedType === "WITHDRAW" ? "เบิก" : "ยืม"}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
          </button>
          {isTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 w-full">
              <ul className="py-1">
                {[{ v: "all", l: "ทุกประเภท" }, { v: "WITHDRAW", l: "เบิก" }, { v: "BORROW", l: "ยืม" }].map((t) => (
                  <li key={t.v}>
                    <button
                      onClick={() => { setSelectedType(t.v); setIsTypeOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedType === t.v ? "text-blue-700 font-semibold bg-blue-50" : "text-slate-600"}`}
                    >
                      {t.l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Status Tab Bar */}
      <div className="flex flex-row gap-3 overflow-x-auto mb-4 pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.v}
            onClick={() => { setActiveTab(tab.v); setCurrentPage(1); }}
            className={`whitespace-nowrap rounded-full border px-5 py-1.5 text-sm font-medium transition-colors
              ${activeTab === tab.v
                ? "bg-blue-50 border-blue-600 text-blue-600"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
              }`}
          >
            {tab.l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col relative" style={{ height: "65vh" }}>
        {isFetching ? (
          <DataTableSkeleton
            headers={["#", "เลขที่คำขอ", "ประเภท", "แผนก", "วันที่ทำรายการ", "จำนวนรายการ", "สถานะ", "จัดการ"]}
            rowCount={10}
            ariaLabel="กำลังโหลดประวัติคำขอ"
            className="h-full min-h-0"
            minHeight="min-h-0"
            tdClassName="px-4 py-3"
          />
        ) : (
        <div className="flex-1 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full table-fixed text-sm text-left">
            <thead className={LIST_TABLE_HEAD_ROW}>
              <tr>
                <th className={`${LIST_TABLE_TH_NUM} w-[48px]`}>#</th>
                <th className={`${LIST_TABLE_TH} w-[150px]`}>เลขที่คำขอ</th>
                <th className={`${LIST_TABLE_TH} w-[96px]`}>ประเภท</th>
                <th className={`${LIST_TABLE_TH} hidden sm:table-cell w-[180px]`}>แผนก</th>
                <th className={`${LIST_TABLE_TH} w-[220px]`}>วันที่ทำรายการ</th>
                <th className={`${LIST_TABLE_TH} w-[112px]`}>จำนวนรายการ</th>
                <th className={`${LIST_TABLE_TH} w-[148px]`}>สถานะ</th>
                <th className={`${LIST_TABLE_TH} w-[72px] text-center`}>จัดการ</th>
              </tr>
            </thead>
            <tbody className={LIST_TABLE_TBODY}>
              {displayed.map((r, idx) => (
                <tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 w-[48px] text-center text-sm text-slate-500 tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-5 py-3 w-[150px] truncate font-mono font-medium text-slate-800" title={r.doc_no}>{r.doc_no}</td>
                  <td className="px-5 py-3 w-[96px]"><TypeBadge type={r.type} /></td>
                  <td className="px-5 py-3 hidden sm:table-cell w-[180px] min-w-0">
                    <p className="truncate" title={r.department_name ?? ""}>{r.department_name ?? "-"}</p>
                  </td>
                  <td className="px-5 py-3 w-[220px] text-slate-600">
                    <span className="whitespace-nowrap">
                      {fmtDateTime(r.request_date)}
                    </span>
                  </td>
                  <td className="px-5 py-3 w-[112px] text-slate-600">{r.item_count ?? 0}</td>
                  <td className="px-5 py-3 w-[148px] text-slate-600"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 w-[72px] text-slate-600">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => router.push(`/request/history/${r.id}`)}
                        className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 shadow-sm transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>   
              ))}
              {displayed.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
                      <Package className="w-12 h-12 text-slate-400" />
                      <p className="text-sm">ไม่พบรายการ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-5">
        <p className="text-sm text-slate-500">แสดง {displayed.length} จาก {filtered.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition bg-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
