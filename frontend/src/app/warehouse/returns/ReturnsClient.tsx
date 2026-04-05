"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, Clock, X, Building2, User, Eye, FileText, MapPin, Phone,
  Calendar, Package, Loader2,
} from "lucide-react";
import { getAllRequisitions } from "@/services/requisitionService";
import type { RequisitionHeader } from "@/types/requisition_type";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UiStatus = "รอการคืน" | "คืนแล้ว" | "รออนุมัติ" | "ค้างคืน" | "ยกเลิก" | "ถูกปฏิเสธ";

const mapUiStatus = (header: RequisitionHeader): UiStatus => {
  if (header.status === "BORROWING") {
    if (header.due_date && new Date(header.due_date) < new Date()) return "ค้างคืน";
    return "รอการคืน";
  }
  if (header.status === "COMPLETED") return "คืนแล้ว";
  if (header.status === "PENDING") return "รออนุมัติ";
  if (header.status === "CANCELLED") return "ยกเลิก";
  if (header.status === "REJECTED") return "ถูกปฏิเสธ";
  return "รออนุมัติ";
};

const getDaysOverdue = (header: RequisitionHeader): number => {
  if (!header.due_date || header.status !== "BORROWING") return 0;
  const due = new Date(header.due_date);
  const today = new Date();
  if (due >= today) return 0;
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
};

const isExternal = (header: RequisitionHeader): boolean =>
  !!header.borrower_details;

const getBorrowerDisplay = (header: RequisitionHeader): string => {
  if (header.borrower_details) return header.borrower_details.fullname || "บุคคลภายนอก";
  return header.requester || "ไม่ระบุ";
};

const getStatusBadgeColor = (status: UiStatus) => {
  switch (status) {
    case "รอการคืน":  return "bg-amber-50 text-amber-700 border-amber-200";
    case "ค้างคืน":   return "bg-red-50 text-red-700 border-red-200";
    case "คืนแล้ว":   return "bg-green-50 text-green-700 border-green-200";
    case "รออนุมัติ": return "bg-blue-50 text-blue-700 border-blue-200";
    case "ยกเลิก":    return "bg-gray-50 text-gray-600 border-gray-200";
    case "ถูกปฏิเสธ": return "bg-rose-50 text-rose-700 border-rose-200";
    default:           return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const getStatusIcon = (status: UiStatus) => {
  switch (status) {
    case "รอการคืน":  return <Clock className="w-3 h-3" />;
    case "ค้างคืน":   return <AlertCircle className="w-3 h-3" />;
    case "คืนแล้ว":   return <CheckCircle className="w-3 h-3" />;
    case "รออนุมัติ": return <Loader2 className="w-3 h-3 animate-spin" />;
    case "ยกเลิก":    return <X className="w-3 h-3" />;
    default:           return null;
  }
};

const fmtDate = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

// ─── Return Action Modal ──────────────────────────────────────────────────────

type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

interface ReturnRowState {
  req_item_id: number;
  qty_returned: number;
  condition: ReturnCondition;
  note: string;
  max: number;
  name: string;
  code: string;
  issued: number;
  returned: number;
}

const conditionOptions: { value: ReturnCondition; label: string; color: string }[] = [
  { value: "GOOD",       label: "สภาพดี",       color: "text-green-700 bg-green-50" },
  { value: "DAMAGED",    label: "ชำรุด/เสียหาย", color: "text-amber-700 bg-amber-50" },
  { value: "LOST",       label: "สูญหาย",       color: "text-red-700 bg-red-50" },
  { value: "INCOMPLETE", label: "คืนไม่ครบ",    color: "text-purple-700 bg-purple-50" },
];

// ─── Helper sub-components ────────────────────────────────────────────────────

function InfoRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 flex-shrink-0 w-24">{label}</span>
      <span className={`font-medium flex-1 ${highlight ? "text-emerald-700" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}

function MiniCell({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${alert ? "text-red-600" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type StatusFilter = "สถานะทั้งหมด" | "รอการคืน" | "ค้างคืน" | "คืนแล้ว" | "รออนุมัติ" | "ยกเลิก";

const STATUS_FILTER_OPTIONS: StatusFilter[] = ["สถานะทั้งหมด", "รอการคืน", "ค้างคืน", "คืนแล้ว", "รออนุมัติ", "ยกเลิก"];

export default function ReturnsClient() {
  const router = useRouter();
  const [records, setRecords] = useState<RequisitionHeader[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("สถานะทั้งหมด");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const fetchRecords = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions({ type: "BORROW", limit: 500 });
      if (result && result.success !== false) {
        let data: RequisitionHeader[] = [];
        if (Array.isArray(result.data)) {
          data = result.data;
        } else if (Array.isArray((result as unknown as { items: RequisitionHeader[] }).items)) {
          data = (result as unknown as { items: RequisitionHeader[] }).items;
        }
        // แสดงเฉพาะรายการที่ผ่านการอนุมัติแล้ว (COMPLETED = รอคืน, RETURNED = คืนแล้ว)
        setRecords(data.filter(r => r.status === "BORROWING" || r.status === "COMPLETED"));
      }
    } catch (err) {
      console.error("fetch borrows failed", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) fetchRecords();
  }, [isMounted, fetchRecords]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-status-dd]")) setIsStatusDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDetail = useCallback((id: number) => {
    router.push(`/warehouse/returns/${id}`);
  }, [router]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter(r => {
      const uiStatus = mapUiStatus(r);
      const matchesSearch =
        r.doc_no.toLowerCase().includes(term) ||
        (r.requester || "").toLowerCase().includes(term) ||
        (r.borrower_details?.fullname || "").toLowerCase().includes(term);
      const matchesStatus = selectedStatus === "สถานะทั้งหมด" || uiStatus === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, selectedStatus]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const displayRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">จัดการรับคืนพัสดุ</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่ ชื่อผู้ยืม..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-status-dd="">
          <button
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {STATUS_FILTER_OPTIONS.map(s => (
                  <li key={s}>
                    <button
                      onClick={() => { setSelectedStatus(s); setIsStatusDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[150px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[120px]">ประเภท</th>
                <th className="px-6 py-4 w-[220px]">ผู้ยืม</th>
                <th className="px-6 py-4 w-[80px] text-center">รายการ</th>
                <th className="px-6 py-4 w-[120px]">กำหนดคืน</th>
                <th className="px-6 py-4 w-[120px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[110px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayRecords.map((r, idx) => {
                const uiStatus = mapUiStatus(r);
                const overdue = getDaysOverdue(r);
                const canReturn = r.status === "COMPLETED";
                const ext = isExternal(r);

                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-indigo-700">{r.doc_no}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${ext ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                        {ext ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {ext ? "ภายนอก" : "ภายใน"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800 text-sm truncate">{getBorrowerDisplay(r)}</div>
                      <div className="text-xs text-gray-400 truncate">{r.requester}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-600">{r.item_count ?? 0}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">{fmtDate(r.due_date)}</div>
                      {overdue > 0 && (
                        <div className="text-xs text-red-600 font-bold">ค้าง {overdue} วัน</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeColor(uiStatus)}`}>
                        {uiStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(r.id)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                          title="ดูรายละเอียดและรับคืน"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayRecords.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
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
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-600">
          แสดง {displayRecords.length} จาก {filteredRecords.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
