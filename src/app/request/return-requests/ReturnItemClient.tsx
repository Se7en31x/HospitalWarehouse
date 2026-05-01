"use client";

import { useState, useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronLeft, ChevronRight, ChevronDown,
  Eye, X, Plus, RotateCcw,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import toast, { Toaster } from "react-hot-toast";
import * as reusableSvc from "@/services/reusableUnitService";
import { socket } from "@/lib/socket";
import { fmtDateTime } from "@/utils/dateUtils";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as Record<string, unknown>).message);
  return String(error);
};

const PAGE_LIMIT = 10;

interface ReturnRequest {
  id: number;
  doc_no: string;
  department_name: string | null;
  requested_by_name?: string | null;
  status: string;
  created_at: string;
  requester?: string;
  item_count?: number;
}
// 
const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
    PENDING: { label: "รออนุมัติ", bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-200" },
    APPROVED: { label: "อนุมัติแล้ว", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
    REJECTED: { label: "ถูกปฏิเสธ", bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
    COMPLETED: { label: "เสร็จสิ้น", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
    PENDING_RETURN_CHECK: { label: "รอตรวจรับคืน", bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  };
  const s = statusMap[status] || { label: status, bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
};

export default function ReturnItemClient() {
  const router = useRouter();

  const [records, setRecords] = useState<ReturnRequest[]>([]);

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

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await reusableSvc.getReusableReturnRequests();
      setRecords(res.items || []);
    } catch (error) {
      toast.error(getErrorMessage(error) || "โหลดข้อมูลไม่สำเร็จ");
      setRecords([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
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
          await fetchData();
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 220);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REQUISITIONS" || message === "RETURN_REQUESTS") {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-department]")) setIsDepartmentDropdownOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusDropdownOpen(false);
    };

    if (isDepartmentDropdownOpen || isStatusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDepartmentDropdownOpen, isStatusDropdownOpen]);

  const openDetail = useCallback(
    (id: number) => {
      router.push(`/request/return-requests/${id}`);
    },
    [router]
  );

  const filterDepartments = useMemo(() => {
    const depts = new Set(
      records.map((r) => r.department_name).filter((name): name is string => Boolean(name))
    );
    return ["แผนกทั้งหมด", ...Array.from(depts)];
  }, [records]);

  const filterStatuses = useMemo(() => {
    const statuses = new Set(records.map((r) => r.status).filter((s): s is string => Boolean(s)));
    return ["สถานะทั้งหมด", ...Array.from(statuses)];
  }, [records]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((r) => {
      if (
        term &&
        !(
          r.doc_no.toLowerCase().includes(term) ||
          (r.department_name ?? "").toLowerCase().includes(term) ||
          (r.requested_by_name ?? "").toLowerCase().includes(term) ||
          (r.requester ?? "").toLowerCase().includes(term)
        )
      ) {
        return false;
      }

      if (selectedDepartment !== "แผนกทั้งหมด" && r.department_name !== selectedDepartment) {
        return false;
      }

      if (selectedStatus !== "สถานะทั้งหมด" && r.status !== selectedStatus) {
        return false;
      }

      const d = new Date(r.created_at);
      if (Number.isNaN(d.getTime())) return false;
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      if (startDate && ymd < startDate) return false;
      if (endDate && ymd > endDate) return false;

      return true;
    });
  }, [records, searchTerm, selectedDepartment, selectedStatus, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_LIMIT));
  const paginatedItems = filtered.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filtered.length / PAGE_LIMIT));
    if (currentPage > tp) setCurrentPage(tp);
  }, [filtered.length, currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">
      <Toaster position="top-right" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-600 rounded-xl">
            <RotateCcw className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">รายการคำขอคืน</h2>
            <p className="text-sm text-slate-500 mt-0.5">รายการคำขอส่งคืนอุปกรณ์ทางการแพทย์</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/request/return-requests/create")}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" />
            สร้างคำขอคืนของ
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่คำขอ / แผนก / ผู้ทำรายการ..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
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
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isDepartmentDropdownOpen ? "rotate-180" : ""}`} />
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
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
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
          <div className="flex items-center justify-center py-16">
            <DotLottieReact
              src="https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie"
              loop
              autoplay
              style={{ width: 160, height: 160 }}
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
                } as CSSProperties
              }
            >
              <style>{`
            div::-webkit-scrollbar { width: 0; height: 8px; }
            div::-webkit-scrollbar-track { background: #f1f5f9; }
            div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          `}</style>
              <table className="w-full table-fixed text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 w-[52px] text-center whitespace-nowrap">#</th>
                    <th className="px-5 py-4 whitespace-nowrap">เลขที่คำขอ</th>
                    <th className="px-5 py-4 whitespace-nowrap">แผนก</th>
                    <th className="px-5 py-4 whitespace-nowrap">ผู้ทำรายการ</th>
                    <th className="px-5 py-4 whitespace-nowrap">สถานะ</th>
                    <th className="px-5 py-4 whitespace-nowrap">วันที่สร้าง</th>
                    <th className="px-5 py-4 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {paginatedItems.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3 text-center text-sm text-slate-500 tabular-nums">
                        {(currentPage - 1) * PAGE_LIMIT + idx + 1}
                      </td>
                      <td className="px-5 py-3 font-mono font-medium text-slate-800">{r.doc_no}</td>
                      <td className="px-5 py-3 text-slate-600 truncate" title={r.department_name ?? undefined}>
                        {r.department_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600 truncate" title={(r.requested_by_name || r.requester) ?? undefined}>
                        {r.requested_by_name || r.requester || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-600 tabular-nums">{fmtDateTime(r.created_at)}</td>
                      <td className="px-5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openDetail(r.id)}
                          className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 shadow-sm transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={7}>
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
