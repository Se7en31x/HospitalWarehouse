"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, History, X, ChevronLeft, ChevronRight,
  Eye, Calendar, ChevronDown, RefreshCw, Package,
  Loader2, Building2, User, FileText, Clock, CheckCircle,
  XCircle, AlertCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getAllRequisitions, getRequisitionById } from "@/services/requisitionService";
import type { RequisitionHeader, RequisitionItem, BorrowerDetails } from "@/types/requisition_type";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  record,
  onClose,
}: {
  record: RequisitionHeader;
  onClose: () => void;
}) {
  const isExternal = !!record.borrower_details;
  const borrower = record.borrower_details as BorrowerDetails | null | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold">{record.doc_no}</p>
              <p className="text-white/70 text-xs">{TYPE_LABEL[record.type] ?? record.type} — {STATUS_LABEL[record.status] ?? record.status}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoCard label="เลขที่เอกสาร" value={record.doc_no} color="indigo" mono />
            <InfoCard label="วันที่ยื่น" value={fmtDate(record.request_date)} sub={fmtTime(record.request_date)} color="blue" />
            <InfoCard label="สถานะ" color="slate">
              <StatusBadge status={record.status} />
            </InfoCard>
            <InfoCard label="ประเภท" color="slate">
              <TypeBadge type={record.type} />
            </InfoCard>
            {record.due_date && (
              <InfoCard label="กำหนดคืน" value={fmtDate(record.due_date)} color="amber" />
            )}
            <InfoCard label="จำนวนรายการ" value={`${record.items?.length ?? 0} รายการ`} color="slate" />
          </div>

          {/* Requester / Dept */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <User className="w-4 h-4 text-indigo-500 mt-0.5" />
              <div>
                <p className="text-xs text-indigo-500 font-bold uppercase">ผู้ทำรายการ</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{record.requester ?? "-"}</p>
              </div>
            </div>
            {isExternal && borrower ? (
              <div className="flex items-start gap-3 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <User className="w-4 h-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-xs text-emerald-500 font-bold uppercase">ผู้ยืม (บุคคลภายนอก)</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{borrower.fullname}</p>
                  {borrower.phone && <p className="text-xs text-gray-500">{borrower.phone}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">แผนก</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {record.department_name ?? `แผนก ${record.department_id}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          {record.note && (
            <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4 border border-amber-100">
              <FileText className="w-4 h-4 text-amber-500 mt-0.5" />
              <div>
                <p className="text-xs text-amber-600 font-bold uppercase">หมายเหตุ</p>
                <p className="text-sm text-gray-700 mt-0.5">{record.note}</p>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
              รายการสินค้า ({record.items?.length ?? 0} รายการ)
            </h3>
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">สินค้า</th>
                    <th className="px-4 py-3 text-center font-semibold">ขอ</th>
                    <th className="px-4 py-3 text-center font-semibold">อนุมัติ</th>
                    <th className="px-4 py-3 text-center font-semibold">จ่าย</th>
                    {record.type === "BORROW" && (
                      <th className="px-4 py-3 text-center font-semibold">คืน</th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(record.items ?? []).map((item: RequisitionItem) => (
                    <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.code}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{item.qty}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-indigo-700 font-medium">{item.approved}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-blue-700 font-medium">{item.issued}</span>
                      </td>
                      {record.type === "BORROW" && (
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${item.returned >= item.issued && item.issued > 0 ? "text-green-600" : "text-gray-500"}`}>
                            {item.returned}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-gray-500">{item.note ?? "-"}</td>
                    </tr>
                  ))}
                  {!record.items?.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-xs">ไม่มีรายการ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-5 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 font-semibold transition text-sm active:scale-95"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
  color,
  mono,
  children,
}: {
  label: string;
  value?: string;
  sub?: string;
  color?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  const bgMap: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-100",
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100",
    slate: "bg-slate-50 border-slate-100",
    green: "bg-green-50 border-green-100",
  };
  const lblMap: Record<string, string> = {
    indigo: "text-indigo-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    slate: "text-slate-500",
    green: "text-green-600",
  };
  const bg = bgMap[color ?? "slate"] ?? bgMap.slate;
  const lbl = lblMap[color ?? "slate"] ?? lblMap.slate;
  return (
    <div className={`rounded-xl p-4 border ${bg}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${lbl}`}>{label}</p>
      {children ? (
        children
      ) : (
        <>
          <p className={`text-sm font-semibold text-gray-800 ${mono ? "font-mono" : ""}`}>{value ?? "-"}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
}

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
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const itemsPerPage = 10;

  const typeOptions = ["ทั้งหมด", "เบิก", "ยืม"];
  const statusOptions = ["ทั้งหมด", "รออนุมัติ", "อนุมัติแล้ว", "ปฏิเสธ", "ยกเลิก"];

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-type-dd]")) setIsTypeOpen(false);
      if (!t.closest("[data-status-dd]")) setIsStatusOpen(false);
      if (!t.closest("[data-date-dd]")) setIsDateOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions({ limit: 500 });
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
      const matchDate =
        (!dateRange.start || r.request_date >= dateRange.start) &&
        (!dateRange.end || r.request_date.slice(0, 10) <= dateRange.end);
      const matchSearch =
        !term ||
        r.doc_no.toLowerCase().includes(term) ||
        (r.requester ?? "").toLowerCase().includes(term) ||
        (r.department_name ?? "").toLowerCase().includes(term);
      return matchType && matchStatus && matchDate && matchSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, searchTerm, selectedType, selectedStatus, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const hasFilters = searchTerm || selectedType !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || dateRange.start || dateRange.end;
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("ทั้งหมด");
    setSelectedStatus("ทั้งหมด");
    setDateRange({ start: "", end: "" });
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <History className="w-8 h-8 text-indigo-600" />
          <div>
            <h2 className="text-3xl font-bold text-indigo-600">ประวัติการทำรายการ</h2>
            <p className="text-sm text-gray-500 mt-0.5">เบิก และยืมพัสดุ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button onClick={clearFilters} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-semibold transition active:scale-95">
              ล้างตัวกรอง
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่, ผู้ทำรายการ, แผนก..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        {/* Type dropdown */}
        <div className="relative" data-type-dd>
          <button
            onClick={() => { setIsTypeOpen((p) => !p); setIsStatusOpen(false); setIsDateOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:bg-slate-50 transition shadow-sm min-w-[130px] justify-between"
          >
            <span className="font-medium text-slate-700">ประเภท: {selectedType}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
          </button>
          {isTypeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
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
            onClick={() => { setIsStatusOpen((p) => !p); setIsTypeOpen(false); setIsDateOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:bg-slate-50 transition shadow-sm min-w-[160px] justify-between"
          >
            <span className="font-medium text-slate-700">สถานะ: {selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
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

        {/* Date range */}
        <div className="relative" data-date-dd>
          <button
            onClick={() => { setIsDateOpen((p) => !p); setIsTypeOpen(false); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:bg-slate-50 transition shadow-sm"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700">วันที่</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDateOpen ? "rotate-180" : ""}`} />
          </button>
          {isDateOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-4 w-64 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ตั้งแต่</label>
                <input type="date" value={dateRange.start}
                  onChange={(e) => { setDateRange((p) => ({ ...p, start: e.target.value })); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ถึง</label>
                <input type="date" value={dateRange.end}
                  onChange={(e) => { setDateRange((p) => ({ ...p, end: e.target.value })); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          )}
        </div>

        <span className="text-sm text-slate-400 ml-auto">ทั้งหมด {filtered.length} รายการ</span>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative" style={{ minHeight: "400px" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs border-b border-slate-200 sticky top-0 z-10">
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
