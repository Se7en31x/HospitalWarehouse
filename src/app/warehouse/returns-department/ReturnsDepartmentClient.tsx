"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Trash2, X, Package, Search, Eye } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import { fmtDateTime } from "@/utils/dateUtils";
import type { DepartmentOption } from "@/services/departmentService";
import { deptDisplayName } from "@/utils/departmentUtils";
import { socket } from "@/lib/socket";
import {
  type ProcessItemForm,
  type ProcessUnitForm,
  RETURN_REQUEST_STATUS_LABEL,
  showToast,
} from "./ReturnForms";
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const PAGE_LIMIT = 10;


const getTotalItems = (items: reusableSvc.ReusableReturnRequestItem[]): number => {
  return items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0);
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const displayStatus = RETURN_REQUEST_STATUS_LABEL[status] || status;
  
  const getStatusColor = (s: string): string => {
    switch (s) {
      case "REQUESTED": return "bg-amber-100 text-amber-500";
      case "COMPLETED": return "bg-green-100 text-green-500";
      case "CANCELLED": return "bg-red-100 text-red-500";
      default: return "bg-slate-100 text-slate-500";
    }
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${getStatusColor(status)}`}>
      {displayStatus}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnsDepartmentClient() {
  const router = useRouter();
  
  // State - Data & Fetch
  const [records, setRecords] = useState<reusableSvc.ReusableReturnRequest[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [serverTotalPages, setServerTotalPages] = useState(0);

  // State - Filters & UI
  const [activeTab, setActiveTab] = useState<"REQUESTED" | "COMPLETED">("REQUESTED");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRef = useRef(1);

  // State - Delete
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  // Fetch Data
  const fetchData = useCallback(async (page: number = 1, tabStatus?: "REQUESTED" | "COMPLETED") => {
    setIsFetching(true);
    try {
      const response = await reusableSvc.getReusableReturnRequests({
        page,
        limit: PAGE_LIMIT,
        department_id: departmentFilter || undefined,
        status: tabStatus ?? activeTab,
      });
      setRecords(response.items || []);
      setServerTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error("fetch return requests failed", err);
      showToast.error("ดึงใบคำขอคืนจากแผนกไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, [departmentFilter, activeTab]);

  // Initialize & Load Options
  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
    fetchData(1);
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
      if (!isVisibleRef.current) return;
      if (deletingRequestId !== null) return;
      if (isRefreshingRef.current) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try {
          await fetchData(pageRef.current);
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 200);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REUSABLE_RETURN_REQUESTS") {
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
  }, [fetchData, deletingRequestId]);

  // Handle click outside dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filter-dept]")) setIsDeptOpen(false);
    };
    if (isDeptOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isDeptOpen]);

  // Computed Values
  const selectedDeptLabel = useMemo(() => {
    if (!departmentFilter) return "แผนกทั้งหมด";
    const d = departments.find((dept) => String(dept.id) === departmentFilter);
    return d ? deptDisplayName(d.name || "") : "แผนกทั้งหมด";
  }, [departmentFilter, departments]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((rec) => {
      const matchesSearch =
        (rec.doc_no || "").toLowerCase().includes(term) ||
        (rec.department_name || "").toLowerCase().includes(term) ||
        (rec.requested_by_name || "").toLowerCase().includes(term);
      const matchDate =
        !startDate && !endDate
          ? true
          : (() => {
              const d = new Date(rec.preferred_pickup_at ?? "");
              const s = startDate ? new Date(startDate) : null;
              const e = endDate ? new Date(endDate) : null;
              return (!s || d >= s) && (!e || d <= e);
            })();
      return matchesSearch && matchDate;
    });
  }, [records, searchTerm, startDate, endDate]);

  // Event Handlers
  const openProcessPage = useCallback((request: reusableSvc.ReusableReturnRequest) => {
    router.push(`/warehouse/returns-department/process?id=${request.id}`);
  }, [router]);

  const handleDeleteRequest = useCallback(async (request: reusableSvc.ReusableReturnRequest) => {
    const confirmed = window.confirm(`ยืนยันลบคำขอ ${request.doc_no} ?`);
    if (!confirmed) return;

    setDeletingRequestId(request.id);
    try {
      await reusableSvc.deleteReusableReturnRequest(request.id);
      showToast.success(`ลบคำขอ ${request.doc_no} เรียบร้อย`);
      fetchData(pageRef.current);
    } catch (error) {
      showToast.error(getErrorMessage(error) || "ลบคำขอไม่สำเร็จ");
    } finally {
      setDeletingRequestId(null);
    }
  }, [fetchData]);

  // Switch tab handler
  const handleTabChange = useCallback((tab: "REQUESTED" | "COMPLETED") => {
    setActiveTab(tab);
    setCurrentPage(1);
    pageRef.current = 1;
    setSearchTerm("");
    fetchData(1, tab);
  }, [fetchData]);

  // Render
  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6 font-sans">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">รับคืนจากแผนก</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {(["REQUESTED", "COMPLETED"] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? tab === "REQUESTED"
                  ? "border-amber-500 text-amber-600 bg-amber-50"
                  : "border-green-500 text-green-600 bg-green-50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab === "REQUESTED" ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                รอดำเนินการ
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                ประวัติการรับคืน
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่ / แผนก / ผู้ขอ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        <div className="relative w-full sm:w-auto" data-filter-dept>
          <button
            type="button"
            onClick={() => setIsDeptOpen((prev) => !prev)}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[220px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">{selectedDeptLabel}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDeptOpen ? "rotate-180" : ""}`} />
          </button>
          {isDeptOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentFilter("");
                      setIsDeptOpen(false);
                      setCurrentPage(1);
                      pageRef.current = 1;
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!departmentFilter ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    แผนกทั้งหมด
                  </button>
                </li>
                {departments.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDepartmentFilter(String(d.id));
                        setIsDeptOpen(false);
                        setCurrentPage(1);
                        pageRef.current = 1;
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${departmentFilter === String(d.id) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {deptDisplayName(d.name || "")}
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
        {(searchTerm || departmentFilter || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setDepartmentFilter("");
              setStartDate("");
              setEndDate("");
              setCurrentPage(1);
              pageRef.current = 1;
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table Container */}
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
              data-returns-dept-scroll
              className="flex-1 min-h-0"
              style={{
                overflowX: "auto",
                overflowY: "auto",
                scrollbarWidth: "auto",
                msOverflowStyle: "auto",
              } as CSSProperties}
            >
              <style>{`
            div[data-returns-dept-scroll]::-webkit-scrollbar {
              width: 0;
              height: 8px;
            }
            div[data-returns-dept-scroll]::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            div[data-returns-dept-scroll]::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            div[data-returns-dept-scroll]::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <table className="w-full table-fixed text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap w-[50px]">#</th>
                <th className="px-3 py-4 whitespace-nowrap">เลขที่คำขอ</th>
                <th className="px-6 py-4 whitespace-nowrap">แผนก</th>
                <th className="px-6 py-4 whitespace-nowrap">ผู้ขอ</th>
                <th className="px-6 py-4 whitespace-nowrap">เวลาคำขอ</th>
                <th className="px-6 py-4 whitespace-nowrap">นัดรับของ</th>
                <th className="px-6 py-4 whitespace-nowrap w-[90px]">รายการ</th>
                <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">ตรวจสอบ</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {filteredRecords.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 text-slate-700 text-xs">{(currentPage - 1) * PAGE_LIMIT + idx + 1}</td>
                  <td className="px-3 py-3 font-mono text-sm text-black">{rec.doc_no}</td>
                  <td className="px-6 py-3 text-slate-700 text-sm">{deptDisplayName(rec.department_name || "")}</td>
                  <td className="px-6 py-3 text-slate-700 text-sm">{rec.requested_by_name || "-"}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">{fmtDateTime(rec.created_at)}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">{fmtDateTime(rec.preferred_pickup_at)}</td>
                  <td className="px-6 py-3 text-slate-700 text-sm text-left">{getTotalItems(rec.items)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openProcessPage(rec)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="ดู"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {activeTab === "REQUESTED" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(rec)}
                          disabled={deletingRequestId === rec.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="ลบ"
                        >
                          {deletingRequestId === rec.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <Package className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-medium">
                        {searchTerm || startDate || endDate
                          ? "ไม่พบผลการค้นหา"
                          : activeTab === "REQUESTED"
                            ? "ไม่พบใบคำขอคืน"
                            : "ไม่พบประวัติการรับคืน"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
          <p className="text-sm text-slate-500">
            {records.length === 0
              ? "แสดง 0 รายการ"
              : `แสดง ${filteredRecords.length} จาก ${records.length} รายการ`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                pageRef.current = newPage;
                fetchData(newPage);
              }}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">หน้า {currentPage} / {serverTotalPages || 1}</span>
            <button
              type="button"
              disabled={currentPage >= serverTotalPages}
              onClick={() => {
                const newPage = currentPage + 1;
                setCurrentPage(newPage);
                pageRef.current = newPage;
                fetchData(newPage);
              }}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors bg-white"
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
