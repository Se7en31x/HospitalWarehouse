"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronLeft, ChevronRight, ChevronDown,
  Clock, Eye,
  Phone, X,
} from "lucide-react";
import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import {
  LIST_TABLE_HEAD_ROW,
  LIST_TABLE_TH,
  LIST_TABLE_TH_NUM,
  LIST_TABLE_TBODY,
} from "@/lib/tableUi";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import toast, { Toaster } from "react-hot-toast";
import { getBorrowActive } from "@/services/requisitionService";
import type { RequisitionHeader, BorrowerDetails } from "@/types/requisition_type";
import { socket } from "@/lib/socket";
import { fmtDate } from "@/utils/dateUtils";

// === Helper Functions ===

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as Record<string, unknown>).message);
  return String(error);
};

const PAGE_LIMIT = 10;
// 

const isOverdue = (due?: string | null): boolean => {
  if (!due) return false;
  return new Date(due) < new Date();
};

// === Status Badge Component ===

const StatusBadge = ({ overdue }: { overdue: boolean }) => {
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold bg-red-50 text-red-700 border-red-200">
        <Clock className="w-3 h-3" /> ค้างคืน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200">
      <Clock className="w-3 h-3" /> อยู่ระหว่างยืม
    </span>
  );
};

const PendingCheckBadge = () => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold bg-sky-100 text-sky-800 border-sky-200">
    <Clock className="w-3 h-3" /> รอตรวจรับคืน
  </span>
);

// === Main Component ===

export default function ReturnItemClient() {
  const router = useRouter();

  // ✅ State สำหรับรายการ Records
  const [records, setRecords] = useState<RequisitionHeader[]>([]);

  // ✅ State สำหรับ UI
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState("แผนกทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);
  const [isFetching, setIsFetching] = useState(true);

  // --- [Data Fetching Logic] ---
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const result = await getBorrowActive(1, 200);
      if (result.success !== false) {
        let data: RequisitionHeader[] = [];
        if (Array.isArray(result.data)) {
          data = result.data;
        } else if (result.data && typeof result.data === "object" && "items" in result.data) {
          data = (result.data as { items: RequisitionHeader[] }).items;
        }
        setRecords(data);
      } else {
        if (!silent) { toast.error(result.message || "ไม่สามารถดึงข้อมูลได้"); setRecords([]); }
      }
    } catch (error) {
      if (!silent) { toast.error(getErrorMessage(error) || "เกิดข้อผิดพลาดในการเชื่อมต่อ"); setRecords([]); }
    } finally {
      if (!silent) setIsFetching(false);
    }
  }, []);

  // --- [Initialize Data] ---
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    isVisibleRef.current = document.visibilityState === "visible";
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) fetchData(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current || isFetching || isRefreshingRef.current) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try {
          await fetchData(true);
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 220);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REQUISITIONS") {
        scheduleRefresh();
      }
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchData, isFetching]);

  // --- [Close dropdowns when clicking outside] ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-department]")) {
        setIsDepartmentDropdownOpen(false);
      }
      if (!target.closest("[data-filter-status]")) {
        setIsStatusDropdownOpen(false);
      }
    };

    if (isDepartmentDropdownOpen || isStatusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDepartmentDropdownOpen, isStatusDropdownOpen]);

  // --- [Navigate to Detail Page] ---
  const openDetail = useCallback((id: number) => {
    router.push(`/request/returnitem/${id}`);
  }, [router]);

  // --- [Filter Options Logic] ---
  const filterDepartments = useMemo(() => {
    const depts = new Set(
      records
        .map((r) => r.department_name)
        .filter((name): name is string => Boolean(name))
    );
    return ["แผนกทั้งหมด", ...Array.from(depts)];
  }, [records]);

  const filterStatuses = ["สถานะทั้งหมด", "ค้างคืน", "อยู่ระหว่างยืม"];

  // --- [Filter & Search Logic] ---
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((r) => {
      if (!r.borrower_details) return false;

      const borrower = r.borrower_details as BorrowerDetails | undefined | null;
      
      // Search filter
      if (term && !(
        r.doc_no.toLowerCase().includes(term) ||
        (r.requester ?? "").toLowerCase().includes(term) ||
        (r.department_name ?? "").toLowerCase().includes(term) ||
        ([borrower?.firstname, borrower?.lastname].filter(Boolean).join(" ") ?? "").toLowerCase().includes(term) ||
        (borrower?.phone ?? "").toLowerCase().includes(term)
      )) {
        return false;
      }

      // Department filter
      if (selectedDepartment !== "แผนกทั้งหมด" && r.department_name !== selectedDepartment) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "สถานะทั้งหมด") {
        const overdue = isOverdue(r.due_date);
        const status = overdue ? "ค้างคืน" : "อยู่ระหว่างยืม";
        if (status !== selectedStatus) {
          return false;
        }
      }

      // Date range filter
      if (startDate || endDate) {
        const reqDate = r.request_date ? new Date(r.request_date) : null;
        if (startDate && reqDate && reqDate < new Date(startDate)) {
          return false;
        }
        if (endDate && reqDate && reqDate > new Date(endDate)) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchTerm, selectedDepartment, selectedStatus, startDate, endDate]);

  // --- [Pagination Logic] ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_LIMIT));
  const paginatedItems = filtered.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filtered.length / PAGE_LIMIT));
    if (currentPage > tp) setCurrentPage(tp);
  }, [filtered.length, currentPage]);

  // --- [Render JSX] ---
  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">
      <Toaster position="top-right" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-4">
          <PageHeadingIconBox icon={Clock} tone="violet" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">คืนพัสดุของบุคคลภายนอก</h2>
            <p className="text-sm text-slate-500 mt-0.5">ติดตามสถานะการคืนอุปกรณ์ที่ยืมออกไปภายนอก</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่คำขอ / ชื่อผู้ยืม..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        <div className="relative w-full sm:w-auto" data-filter-department>
          <button
            type="button"
            onClick={() => {
              setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen);
              setIsStatusDropdownOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">{selectedDepartment}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isDepartmentDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDepartmentDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterDepartments.map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDepartment(d);
                        setIsDepartmentDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedDepartment === d
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {d}
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
            onClick={() => {
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
              setIsDepartmentDropdownOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">{selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterStatuses.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus(s);
                        setIsStatusDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedStatus === s
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          className={`relative w-full sm:w-[160px] border rounded-lg px-4 shadow-sm h-[38px] flex items-center bg-white transition-colors ${
            startDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
          }`}
        >
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">
            วันที่เริ่มต้น
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>
        <div
          className={`relative w-full sm:w-[160px] border rounded-lg px-4 shadow-sm h-[38px] flex items-center bg-white transition-colors ${
            endDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
          }`}
        >
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">
            วันที่สิ้นสุด
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            onFocus={() => setEndDateFocused(true)}
            onBlur={() => setEndDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>

        {(searchTerm || selectedDepartment !== "แผนกทั้งหมด" || selectedStatus !== "สถานะทั้งหมด" || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedDepartment("แผนกทั้งหมด");
              setSelectedStatus("สถานะทั้งหมด");
              setStartDate("");
              setEndDate("");
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
        {isFetching ? (
          <div className="flex flex-col flex-1 min-h-[22rem]">
            <span className="sr-only">กำลังโหลดรายการคืนพัสดุ</span>
            <DataTableSkeleton
              headers={["#", "เลขที่คำขอ", "ชื่อผู้ยืม", "ช่องทางติดต่อ", "จำนวน", "วันที่ยืม", "กำหนดคืน", "สถานะ", "จัดการ"]}
              rowCount={10}
              showPaginationFooter
              ariaLabel="กำลังโหลดรายการคืนพัสดุ"
              tdClassName="px-4 py-3"
            />
          </div>
        ) : (
          <>
            <div
              className="flex-1"
              style={
                {
                  overflowX: "auto",
                  overflowY: "auto",
                  scrollbarWidth: "auto",
                  msOverflowStyle: "auto",
                } as React.CSSProperties
              }
            >
              <style>{`
            div::-webkit-scrollbar { width: 0; height: 8px; }
            div::-webkit-scrollbar-track { background: #f1f5f9; }
            div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          `}</style>
              <table className="w-full table-fixed text-sm text-left">
                <thead className={LIST_TABLE_HEAD_ROW}>
                  <tr>
                    <th className={`${LIST_TABLE_TH_NUM} w-12`}>#</th>
                    <th className={LIST_TABLE_TH}>เลขที่คำขอ</th>
                    <th className={LIST_TABLE_TH}>ชื่อผู้ยืม</th>
                    <th className={LIST_TABLE_TH}>ช่องทางติดต่อ</th>
                    <th className={`${LIST_TABLE_TH} text-center`}>จำนวน</th>
                    <th className={LIST_TABLE_TH}>วันที่ยืม</th>
                    <th className={LIST_TABLE_TH}>กำหนดคืน</th>
                    <th className={LIST_TABLE_TH}>สถานะ</th>
                    <th className={`${LIST_TABLE_TH} text-center`}>จัดการ</th>
                  </tr>
                </thead>
                <tbody className={LIST_TABLE_TBODY}>
                  {paginatedItems.map((r, idx) => {
                    const overdue = isOverdue(r.due_date);
                    const borrower = r.borrower_details as BorrowerDetails | undefined | null;
                    return (
                      <tr
                        key={r.id}
                        className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-4 py-3 text-center text-sm text-slate-500 tabular-nums">
                          {(currentPage - 1) * PAGE_LIMIT + idx + 1}
                        </td>
                        <td className="px-5 py-3 font-mono font-medium text-slate-800">{r.doc_no}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {[borrower?.firstname, borrower?.lastname].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                            {borrower?.phone || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center font-medium text-slate-700">{r.item_count ?? 0}</td>
                        <td className="px-5 py-3 text-slate-600">{fmtDate(r.request_date)}</td>
                        <td className="px-5 py-3">
                          <span className={overdue ? "text-red-600 font-semibold" : "text-slate-600"}>
                            {fmtDate(r.due_date)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {r.status === "PENDING_RETURN_CHECK" ? <PendingCheckBadge /> : <StatusBadge overdue={overdue} />}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => openDetail(r.id)}
                            className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 shadow-sm transition-colors"
                            title="ดูรายละเอียด / รับคืน"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={10}>
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-12 h-12 text-slate-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4"
                            />
                          </svg>
                          <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
              <p className="text-sm text-slate-500">
                แสดง {paginatedItems.length} จาก {filtered.length} รายการ
                {filtered.length !== records.length && (
                  <span className="text-slate-400"> (ทั้งหมด {records.length} รายการ)</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
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
