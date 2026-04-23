"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronLeft, ChevronRight, ChevronDown,
  X, Eye, Package,
} from "lucide-react";
import { getAllRequisitions } from "@/services/requisitionService";
import type { RequisitionHeader } from "@/types/requisition_type";
import toast from "react-hot-toast";

const PAGE_LIMIT = 10;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UiStatus = "รอการคืน" | "คืนแล้ว" | "รออนุมัติ" | "รอตรวจรับคืน" | "ค้างคืน" | "ยกเลิก" | "ถูกปฏิเสธ";

const mapUiStatus = (header: RequisitionHeader): UiStatus => {
  if (header.status === "BORROWING") {
    if (header.due_date && new Date(header.due_date) < new Date()) return "ค้างคืน";
    return "รอการคืน";
  }
  if (header.status === "PENDING_RETURN_CHECK") return "รอตรวจรับคืน";
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
  const bd = header.borrower_details;
  if (bd) return [bd.firstname, bd.lastname].filter(Boolean).join(" ") || "บุคคลภายนอก";
  return header.requester || "ไม่ระบุ";
};

const getStatusBadgeColor = (status: UiStatus) => {
  switch (status) {
    case "รอการคืน": return "bg-amber-100 text-amber-500";
    case "ค้างคืน": return "bg-red-100 text-red-500";
    case "คืนแล้ว": return "bg-green-100 text-green-500";
    case "รออนุมัติ": return "bg-blue-100 text-blue-500";
    case "รอตรวจรับคืน": return "bg-sky-100 text-sky-800";
    case "ยกเลิก": return "bg-slate-100 text-slate-500";
    case "ถูกปฏิเสธ": return "bg-red-100 text-red-500";
    default: return "bg-slate-100 text-slate-500";
  }
};

const StatusBadge = ({ status }: { status: UiStatus }) => {
  const color = getStatusBadgeColor(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${color}`}>
      {status}
    </span>
  );
};

const fmtDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

// ─── Main Component ───────────────────────────────────────────────────────────

type StatusFilter = "สถานะทั้งหมด" | "รอการคืน" | "ค้างคืน" | "คืนแล้ว" | "รออนุมัติ" | "รอตรวจรับคืน" | "ยกเลิก";

const STATUS_FILTER_OPTIONS: StatusFilter[] = ["สถานะทั้งหมด", "รอการคืน", "ค้างคืน", "คืนแล้ว", "รออนุมัติ", "รอตรวจรับคืน", "ยกเลิก"];

type ReturnsTab = "PENDING" | "HISTORY";

export default function ReturnsClient() {
  const router = useRouter();
  const [records, setRecords] = useState<RequisitionHeader[]>([]);
  const [activeTab, setActiveTab] = useState<ReturnsTab>("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("สถานะทั้งหมด");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const pageRef = useRef(1);
  const keywordRef = useRef("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const fetchPage = useCallback(async (page: number, keyword: string) => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions({
        type: "BORROW",
        page,
        limit: PAGE_LIMIT,
        ...(keyword ? { keyword } : {}),
      });

      if (result && result.success !== false) {
        let data: RequisitionHeader[] = [];
        if (Array.isArray(result.data)) {
          data = result.data;
        } else if (Array.isArray((result as unknown as { items: RequisitionHeader[] }).items)) {
          data = (result as unknown as { items: RequisitionHeader[] }).items;
        }
        // เก็บรายการทั้งหมด แล้วค่อยกรองตาม Tab ฝั่ง client
        setRecords(data);
        setServerTotal(result.total || 0);
        const totalPages = result.limit ? Math.ceil((result.total || 0) / result.limit) : 0;
        setServerTotalPages(totalPages);
      } else {
        throw new Error(result.message || "ไม่สามารถดึงข้อมูลได้");
      }
    } catch (err) {
      console.error("fetch borrows failed", err);
      toast.error(getErrorMessage(err));
      setRecords([]);
      setServerTotal(0);
      setServerTotalPages(0);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) fetchPage(1, "");
  }, [isMounted, fetchPage]);

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    keywordRef.current = value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
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

  const tabbedRecords = records.filter((r) => {
    if (activeTab === "PENDING") return r.status === "PENDING_RETURN_CHECK";
    // History per requirement: completed + borrowing (ย้อนหลัง)
    return r.status === "COMPLETED" || r.status === "BORROWING";
  });

  // Client-side secondary filters (status/date) applied to current page's items
  const filteredRecords = tabbedRecords.filter(r => {
    const uiStatus = mapUiStatus(r);
    const matchesStatus = selectedStatus === "สถานะทั้งหมด" || uiStatus === selectedStatus;
    const matchDate =
      !startDate && !endDate
        ? true
        : (() => {
          const d = new Date(r.due_date ?? "");
          const s = startDate ? new Date(startDate) : null;
          const e = endDate ? new Date(endDate) : null;
          return (!s || d >= s) && (!e || d <= e);
        })();
    return matchesStatus && matchDate;
  });

  // paginatedItems = filteredRecords (server already paged by keyword)
  const displayRecords = filteredRecords;
  const totalPages = serverTotalPages;

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">จัดการรับคืนพัสดุ</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["PENDING", "HISTORY"] as const).map((tab) => {
          const tabLabel = tab === "PENDING" ? "รอดำเนินการ" : "ประวัติการคืน";
          const isActive = activeTab === tab;
          const isPending = tab === "PENDING";
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); pageRef.current = 1; }}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                isActive
                  ? isPending
                    ? "border-amber-500 text-amber-600 bg-amber-50"
                    : "border-green-500 text-green-600 bg-green-50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isPending ? "bg-amber-400" : "bg-green-400"}`} />
                {tabLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่ ชื่อผู้ยืม..."
            value={searchTerm}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-status-dd="">
          <button
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {STATUS_FILTER_OPTIONS.map(s => (
                  <li key={s}>
                    <button
                      onClick={() => { setSelectedStatus(s); setIsStatusDropdownOpen(false); setCurrentPage(1); pageRef.current = 1; }}
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

        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          startDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันที่เริ่มต้น</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>
        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          endDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onFocus={() => setEndDateFocused(true)}
            onBlur={() => setEndDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>

        {/* Clear filters */}
        {(searchTerm || selectedStatus !== "สถานะทั้งหมด" || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              keywordRef.current = "";
              setSelectedStatus("สถานะทั้งหมด");
              setStartDate("");
              setEndDate("");
              setCurrentPage(1);
              pageRef.current = 1;
              fetchPage(1, "");
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: "65vh" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-[50px]">#</th>
                <th className="px-4 py-4 w-[150px]">เลขที่เอกสาร</th>
                <th className="px-4 py-4 w-[120px]">ประเภท</th>
                <th className="px-4 py-4 w-[160px]">ผู้ดำเนินเรื่องยืม</th>
                <th className="px-4 py-4 w-[160px]">ผู้ยืม</th>
                <th className="px-4 py-4 w-[150px]">เบอร์ติดต่อ</th>
                <th className="px-4 py-4 w-[80px]">รายการ</th>
                <th className="px-4 py-4 w-[170px]">วันที่ทำรายการ</th>
                <th className="px-4 py-4 w-[120px]">กำหนดคืน</th>
                <th className="px-4 py-4 w-[170px]">วันที่คืนสำเร็จ</th>
                <th className="px-4 py-4 w-[120px]">สถานะ</th>
                <th className="px-4 py-4 text-center w-[110px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {displayRecords.map((r, idx) => {
                const uiStatus = mapUiStatus(r);
                const overdue = getDaysOverdue(r);
                const ext = isExternal(r);

                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-2.5 text-slate-700">{(currentPage - 1) * PAGE_LIMIT + idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-sm text-black">{r.doc_no}</td>
                    <td className="px-4 py-2.5 text-slate-600 text-sm">
                      {ext ? "ภายนอก" : "ภายใน"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-700 truncate">{r.requester || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-700 truncate">
                          {getBorrowerDisplay(r)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.borrower_details?.phone ? (
                        <a
                          href={`tel:${r.borrower_details.phone}`}
                          className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors w-fit"
                        >
                          <span className="text-sm">{r.borrower_details.phone}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.item_count ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-sm text-slate-700">{fmtDateTime(r.request_date)}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-sm text-slate-700">{fmtDateOnly(r.due_date)}</div>
                      {overdue > 0 && (
                        <div className="text-xs text-red-600 font-bold">ค้าง {overdue} วัน</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-sm text-slate-700">{fmtDateTime(r.return_date ?? null)}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={uiStatus} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(r.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
                  <td colSpan={12}>
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
          แสดง {displayRecords.length} จาก {serverTotal} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
