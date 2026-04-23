"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, ChevronDown, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  getAllRequisitions,
} from "../../../services/requisitionService";
import { RequisitionHeader } from "../../../types/requisition_type";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const PAGE_LIMIT = 10;
const ACTIVE_STATUSES = new Set(["PENDING", "APPROVED"]);

const RequestClient = () => {
  const [requests, setRequests] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState<string | number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);
  
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);
  const pageRef = useRef(1);
  const keywordRef = useRef("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- [Helper Functions] ---

  const displayRequesterName = (req: RequisitionHeader): string => {
    return req.requester || req.requester_id || "ไม่ระบุผู้ทำรายการ";
  };

  const fetchPage = useCallback(async (page: number, keyword: string) => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions({
        page,
        limit: PAGE_LIMIT,
        ...(keyword ? { keyword } : {}),
      });
      
      if (result && result.success !== false) {
        setRequests(result.data || []);
        setServerTotal(result.total || 0);
        const totalPages = result.limit ? Math.ceil((result.total || 0) / result.limit) : 0;
        setServerTotalPages(totalPages);
      } else {
        throw new Error(result.message || "ไม่สามารถดึงข้อมูลได้");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error(getErrorMessage(err));
      setRequests([]);
      setServerTotal(0);
      setServerTotalPages(0);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    fetchPage(pageRef.current, keywordRef.current);
  }, [fetchPage]);

  // --- [Effects] ---

  useEffect(() => {
    fetchPage(1, "");
  }, [fetchPage]);

  // Click Outside เพื่อปิด Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-type-dropdown]")) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) refreshData();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refreshData]);

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
          await refreshData();
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 300);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REQUISITIONS" || message === "ITEMS") {
        scheduleRefresh();
      }
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [refreshData, isFetching]);

  // --- [Filter Logic] ---
  const filteredRequests = requests.filter(req => {
    const matchesStatus = activeTab === "all" || req.status === activeTab;
    const matchesType = selectedType === "all" || req.type === selectedType;
    const matchDate =
      !startDate && !endDate
        ? true
        : (() => {
            const d = new Date(req.request_date);
            const s = startDate ? new Date(startDate) : null;
            const e = endDate ? new Date(endDate) : null;
            return (!s || d >= s) && (!e || d <= e);
          })();
    return matchesStatus && matchesType && matchDate;
  });

  // Sort: active statuses first, then by request_date descending (most recent first) within each group
  const paginatedItems = [...filteredRequests].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.has(a.status) ? 0 : 1;
    const bActive = ACTIVE_STATUSES.has(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
  });
  const totalPages = serverTotalPages;

  // --- [Components] ---
  const statusLabels: Record<string, string> = {
    COMPLETED: "เสร็จสิ้น",
    APPROVED:  "รอนำส่ง",
    REJECTED:  "ปฏิเสธ",
    PENDING:   "รออนุมัติ",
    CANCELLED: "ยกเลิก",
    BORROWING: "อยู่ระหว่างการยืม",
    PENDING_RETURN_CHECK: "รอตรวจรับคืน",
  };

  const StatusBadge = ({ status }: { status: string }) => {
    let badgeClass = "px-2.5 py-1 rounded-full font-semibold whitespace-nowrap text-xs";
    
    const statusColorMap: Record<string, string> = {
      COMPLETED: "bg-green-100 text-green-500",
      BORROWING: "bg-green-100 text-green-500",
      APPROVED: "bg-blue-100 text-blue-500",
      PENDING: "bg-amber-100 text-amber-500",
      REJECTED: "bg-red-100 text-red-500",
      CANCELLED: "bg-red-100 text-red-500",
      PENDING_RETURN_CHECK: "bg-sky-100 text-sky-800",
    };
    
    badgeClass += " " + (statusColorMap[status] || "bg-slate-100 text-slate-700");
    
    return (
      <span className={badgeClass}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getDurationDays = (dateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const created = new Date(dateStr);
    created.setHours(0, 0, 0, 0);
    return Math.round((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRowStyle = (dateStr: string, status: string): { row: string; date: string } => {
    if (!ACTIVE_STATUSES.has(status)) return { row: "hover:bg-slate-50", date: "text-slate-600" };
    const days = getDurationDays(dateStr);
    if (days > 5) return { row: "bg-red-50/80 hover:bg-red-100/80", date: "text-red-600 font-semibold" };
    if (days > 2) return { row: "bg-orange-50/50 hover:bg-orange-100/50", date: "text-orange-600" };
    return { row: "hover:bg-slate-50", date: "text-slate-600" };
  };

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

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">รายการคำขอเบิก-ยืม</h2>
      </div>

      {/* Filters Area */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่, แผนก, ชื่อ..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
          />
        </div>

        {/* Type Dropdown */}
        <div className="relative" data-type-dropdown>
          <button
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="flex items-center justify-between gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 w-[180px] shadow-sm"
          >
            <span className="font-medium text-slate-700">
              {selectedType === "all" ? "ทุกประเภท" : selectedType === "WITHDRAW" ? "เบิก" : "ยืม"}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 w-full animate-in fade-in slide-in-from-top-1">
              <ul className="py-1">
                {[{ v: 'all', l: 'ทุกประเภท' }, { v: 'WITHDRAW', l: 'เบิก' }, { v: 'BORROW', l: 'ยืม' }].map(t => (
                  <li key={t.v}>
                    <button
                      onClick={() => { setSelectedType(t.v); setIsTypeDropdownOpen(false); setCurrentPage(1); pageRef.current = 1; }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedType === t.v ? "text-emerald-700 font-semibold bg-emerald-50" : "text-slate-600"}`}
                    >
                      {t.l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Date range */}
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
        {(searchTerm || selectedType !== "all" || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              keywordRef.current = "";
              setSelectedType("all");
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

      {/* Status Tab Bar */}
      <div className="flex flex-row gap-3 overflow-x-auto mb-4 pb-1">
        {[
          { v: 'all',       l: 'รวมทั้งหมด' },
          { v: 'PENDING',   l: 'รออนุมัติ' },
          { v: 'APPROVED',  l: 'รอนำส่ง' },
          { v: 'COMPLETED', l: 'เสร็จสิ้น' },
          { v: 'REJECTED',  l: 'ปฏิเสธ' },
          { v: 'CANCELLED', l: 'ยกเลิก' },
          { v: 'BORROWING', l: 'อยุ่ระหว่างการยืม' },
          { v: 'PENDING_RETURN_CHECK', l: 'รอตรวจรับคืน' },
        ].map(tab => (
          <button
            key={tab.v}
            onClick={() => { setActiveTab(tab.v); setCurrentPage(1); pageRef.current = 1; }}
            className={`whitespace-nowrap rounded-full border px-5 py-1.5 text-sm font-medium transition-colors
              ${activeTab === tab.v
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
              }`}
          >
            {tab.l}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col relative" style={{ height: '60vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        )}

        <div
          className="flex-1"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            msOverflowStyle: 'auto',
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
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[140px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[160px]">วันที่/เวลา</th>
                <th className="px-6 py-4 w-[180px]">ผู้ทำรายการ</th>
                <th className="px-6 py-4 w-[140px]">แผนก</th>
                <th className="px-6 py-4 w-[80px]">ประเภท</th>
                <th className="px-6 py-4 w-[120px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {paginatedItems.map((req, idx) => {
                const style = getRowStyle(req.request_date, req.status);
                return (
                <tr key={req.id} className={`transition-colors ${style.row}`}>
                  <td className="px-6 py-2.5 text-slate-600">{(currentPage - 1) * PAGE_LIMIT + idx + 1}</td>
                  <td className="px-6 py-2.5 font-mono text-slate-600">{req.doc_no}</td>
                  <td className={`px-6 py-2.5 whitespace-nowrap ${style.date}`}>
                    {new Date(req.request_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-2.5 truncate text-slate-600" title={displayRequesterName(req)}>
                    {displayRequesterName(req)}
                  </td>
                  <td className="px-6 py-2.5 text-slate-600">
                    {req.department_name || "-"}
                  </td>
                  <td className="px-6 py-2.5 text-slate-600 text-sm">
                    {req.type === "WITHDRAW" ? "เบิก" : "ยืม"}
                  </td>
                  <td className="px-6 py-2.5">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-2.5 text-center">
                    <button
                      onClick={() => router.push(`/warehouse/requests/${req.id}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="ดูรายละเอียด"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
                );
              })}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
                      <p className="text-sm font-medium">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Control */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {serverTotal} รายการ</p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestClient;