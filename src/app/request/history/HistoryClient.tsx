"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, X, ChevronLeft, ChevronRight,
  Eye, ChevronDown, Package,
  Loader2, Clock, CheckCircle,
  XCircle, AlertCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getAllRequisitions, getRequisitionById } from "@/services/requisitionService";
import { DetailModal } from "./DetailModal";
import type { RequisitionHeader } from "@/types/requisition_type";

// ─── Helpers for List ─────────────────────────────────────────────────────────

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

const fmtTime = (d?: string | null) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
};

const TYPE_LABEL: Record<string, string> = {
  WITHDRAW: "เบิก",
  BORROW: "ยืม",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รออนุมัติ",
  COMPLETED: "อนุมัติแล้ว",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  CANCELLED: "ยกเลิก",
  DRAFT: "ร่าง",
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
      return <CheckCircle className="w-3 h-3" />;
    case "PENDING":
      return <Clock className="w-3 h-3" />;
    case "REJECTED":
      return <XCircle className="w-3 h-3" />;
    case "CANCELLED":
      return <X className="w-3 h-3" />;
    default:
      return <AlertCircle className="w-3 h-3" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusStyle(status)}`}>
    <StatusIcon status={status} />
    {STATUS_LABEL[status] ?? status}
  </span>
);

const TypeBadge = ({ type }: { type: string }) => {
  const isWithdraw = type === "WITHDRAW";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isWithdraw ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HistoryClient() {
  const [records, setRecords] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [viewingDetail, setViewingDetail] = useState<RequisitionHeader | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const itemsPerPage = 10;

  const typeOptions = ["ทั้งหมด", "เบิก", "ยืม"];
  const statusOptions = ["ทั้งหมด", "รออนุมัติ", "อนุมัติแล้ว", "ปฏิเสธ", "ยกเลิก"];

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-type-dd]")) setIsTypeOpen(false);
      if (!t.closest("[data-status-dd]")) setIsStatusOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions({ limit: 10 });
      let data: RequisitionHeader[] = [];
      if (Array.isArray(result.data)) {
        data = result.data;
      } else if (result.data && typeof result.data === "object" && "items" in result.data) {
        data = (result.data as { items: RequisitionHeader[] }).items;
      }
      setRecords(data);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
      setRecords([]);
    } finally {
      setIsFetching(false);                                                 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = useCallback(async (id: number) => {
    setDetailLoading(id);
    try {
      const result = await getRequisitionById(id);
      if (result.success && result.data) {
        setViewingDetail(result.data);
      } else {
        toast.error(result.message ?? "ไม่สามารถโหลดรายละเอียดได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDetailLoading(null);
    }
  }, []);

  // Map filter label → status code
  const statusCodeMap: Record<string, string | null> = {
    ทั้งหมด: null,
    รออนุมัติ: "PENDING",
    อนุมัติแล้ว: "COMPLETED",
    ปฏิเสธ: "REJECTED",
    ยกเลิก: "CANCELLED",
  };
  const typeCodeMap: Record<string, string | null> = {
    ทั้งหมด: null,
    เบิก: "WITHDRAW",
    ยืม: "BORROW",
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const statusCode = statusCodeMap[selectedStatus];
    const typeCode = typeCodeMap[selectedType];

    return records.filter((r) => {
      const matchType = !typeCode || r.type === typeCode;
      const matchStatus = !statusCode || r.status === statusCode;
      const matchSearch =
        !term ||
        r.doc_no.toLowerCase().includes(term) ||
        (r.requester ?? "").toLowerCase().includes(term) ||
        (r.department_name ?? "").toLowerCase().includes(term);

      const matchDate =
        !startDate && !endDate
          ? true
          : (() => {
              const d = new Date(r.request_date ?? "");
              const s = startDate ? new Date(startDate) : null;
              const e = endDate ? new Date(endDate) : null;
              return (!s || d >= s) && (!e || d <= e);
            })();

      return matchType && matchStatus && matchSearch && matchDate;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, searchTerm, selectedType, selectedStatus, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const hasFilters = searchTerm || selectedType !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || startDate || endDate;
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("ทั้งหมด");
    setSelectedStatus("ทั้งหมด");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">ประวัติการทำรายการ</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่, ผู้ทำรายการ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        {/* Type dropdown */}
        <div className="relative" data-type-dd>
          <button
            onClick={() => { setIsTypeOpen((p) => !p); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:bg-slate-50 transition shadow-sm w-[170px] justify-between"
          >
            <span className="font-medium text-slate-700">{selectedType}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
          </button>
          {isTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {typeOptions.map((t) => (
                  <li key={t}>
                    <button onClick={() => { setSelectedType(t); setIsTypeOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedType === t ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Status dropdown */}
        <div className="relative" data-status-dd>
          <button
            onClick={() => { setIsStatusOpen((p) => !p); setIsTypeOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:bg-slate-50 transition shadow-sm w-[170px] justify-between"
          >
            <span className="font-medium text-slate-700">{selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {statusOptions.map((s) => (
                  <li key={s}>
                    <button onClick={() => { setSelectedStatus(s); setIsStatusOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">วันที่เริ่มต้น</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
        <div
          className="flex-1"
          style={{
            overflowX: "auto",
            overflowY: "auto",
            scrollbarWidth: "auto",
            msOverflowStyle: "auto",
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
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-4 w-12">#</th>
                <th className="px-5 py-4">เลขที่เอกสาร</th>
                <th className="px-5 py-4">ประเภท</th>
                <th className="px-5 py-4">ผู้ทำรายการ</th>
                <th className="px-5 py-4">วันที่</th>
                <th className="px-5 py-4 text-center">จำนวนรายการ</th>
                <th className="px-5 py-4">สถานะ</th>
                <th className="px-5 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayed.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-5 py-4 font-mono font-medium text-indigo-700">{r.doc_no}</td>
                  <td className="px-5 py-4"><TypeBadge type={r.type} /></td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-800">{r.requester ?? "-"}</p>
                    <p className="text-xs text-gray-400">{r.department_name ?? `แผนก ${r.department_id}`}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-gray-700">{fmtDate(r.request_date)}</p>
                    <p className="text-xs text-gray-400">{fmtTime(r.request_date)}</p>
                  </td>
                  <td className="px-5 py-4 text-center font-medium text-gray-700">{r.item_count ?? 0}</td>
                  <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => openDetail(r.id)}
                      disabled={detailLoading === r.id}
                      className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-40"
                      title="ดูรายละเอียด"
                    >
                      {detailLoading === r.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Eye className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                      <Package className="w-12 h-12 text-slate-300" />
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
      <div className="flex items-center justify-between mt-5">
        <p className="text-sm text-slate-500">แสดง {displayed.length} จาก {filtered.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">หน้า {currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {viewingDetail && (
        <DetailModal record={viewingDetail} onClose={() => setViewingDetail(null)} />
      )}
    </div>
  );
}
