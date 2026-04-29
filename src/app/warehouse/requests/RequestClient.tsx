"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, ChevronDown, X } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { getAllRequisitionsPages } from "../../../services/requisitionService";
import { RequisitionHeader } from "../../../types/requisition_type";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { SweetAlertUtils } from "@/utils/sweetAlert";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const PAGE_LIMIT = 10;
const ACTIVE_STATUSES = new Set(["PENDING", "APPROVED"]);

const RequestClient = () => {
  const [allRequests, setAllRequests] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);
  
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  // --- [Helper Functions] ---

  const displayRequesterName = (req: RequisitionHeader): string => {
    return req.requester || req.requester_id || "ไม่ระบุผู้ทำรายการ";
  };

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    try {
      const all = await getAllRequisitionsPages({});
      const sortedRows = [...all].sort((a, b) =>
        new Date(b.request_date).getTime() - new Date(a.request_date).getTime()
      );
      setAllRequests(sortedRows);
    } catch (err) {
      console.error("Fetch error:", err);
      SweetAlertUtils.error(getErrorMessage(err));
      setAllRequests([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    fetchAll();
  }, [fetchAll]);

  // --- [Effects] ---

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  useEffect(() => setCurrentPage(1), [
    activeTab,
    selectedType,
    startDate,
    endDate,
    searchTerm,
  ]);

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
  const filteredRequests = allRequests.filter(req => {
    if (searchTerm.trim()) {
      const kw = searchTerm.toLowerCase();
      const bn = req.borrower_details
        ? `${req.borrower_details.firstname ?? ""} ${req.borrower_details.lastname ?? ""}`.trim().toLowerCase()
        : "";
      const matchesKeyword =
        (req.doc_no || "").toLowerCase().includes(kw) ||
        (req.department_name || "").toLowerCase().includes(kw) ||
        (displayRequesterName(req).toLowerCase()).includes(kw) ||
        (req.requester_id || "").toLowerCase().includes(kw) ||
        bn.includes(kw);
      if (!matchesKeyword) return false;
    }
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
  const sortedFiltered = [...filteredRequests].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.has(a.status) ? 0 : 1;
    const bActive = ACTIVE_STATUSES.has(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
  });
  const totalPages = Math.ceil(sortedFiltered.length / PAGE_LIMIT) || 1;
  const paginatedItems = sortedFiltered.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT);
  const pagedCount = paginatedItems.length;
  const filteredCount = sortedFiltered.length;
  const allCount = allRequests.length;

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
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6 font-sans">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">รายการคำขอเบิก-ยืม</h2>
      </div>

      {/* Filters Area */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
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
        <div className="relative w-full sm:w-auto" data-type-dropdown>
          <button
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="flex items-center justify-between gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 w-full sm:w-[180px] shadow-sm"
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
                      onClick={() => { setSelectedType(t.v); setIsTypeDropdownOpen(false); }}
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
        <div className={`relative border rounded-lg px-4 shadow-sm w-full sm:w-[160px] h-[38px] flex items-center bg-white transition-colors ${
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
        <div className={`relative border rounded-lg px-4 shadow-sm w-full sm:w-[160px] h-[38px] flex items-center bg-white transition-colors ${
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
              setSelectedType("all");
              setStartDate("");
              setEndDate("");
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
            onClick={() => setActiveTab(tab.v)}
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
              style={{
                overflowX: 'auto',
                overflowY: 'auto',
                scrollbarWidth: 'auto',
                msOverflowStyle: 'auto',
              } as React.CSSProperties}
            >
              <style>{`
                div::-webkit-scrollbar { width: 0; height: 8px; }
                div::-webkit-scrollbar-track { background: #f1f5f9; }
                div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
              `}</style>
              <table className="w-full text-sm text-left table-fixed border-collapse">
                <colgroup>
                  <col className="w-10 min-w-[2rem]" />
                  <col className="min-w-[7rem]" />
                  <col className="min-w-[7rem]" />
                  <col className="min-w-[7rem]" />
                  <col className="min-w-[7rem]" />
                  <col className="min-w-[7rem]" />
                  <col className="w-[4.5rem] min-w-[4.5rem]" />
                  <col className="min-w-[1rem]" />
                </colgroup>
                <thead className="bg-slate-50 text-slate-700 text-base font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-4 whitespace-nowrap text-center">#</th>
                    <th className="px-2 py-4 whitespace-nowrap">เลขที่เอกสาร</th>
                    <th className="px-2 py-4 whitespace-nowrap">วันที่/เวลา</th>
                    <th className="px-2 py-4 whitespace-nowrap">ผู้ทำรายการ</th>
                    <th className="px-2 py-4 whitespace-nowrap">แผนก</th>
                    <th className="px-2 py-4 whitespace-nowrap">ประเภท</th>
                    <th className="px-2 py-4 whitespace-nowrap">สถานะ</th>
                    <th className="px-1 py-4 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {paginatedItems.map((req, idx) => {
                    const style = getRowStyle(req.request_date, req.status);
                    return (
                    <tr key={req.id} className={`bg-white transition-colors ${style.row}`}>
                      <td className="px-2 py-2.5 text-slate-600 text-center tabular-nums">{(currentPage - 1) * PAGE_LIMIT + idx + 1}</td>
                      <td className="px-2 py-2.5 font-mono text-slate-600">{req.doc_no}</td>
                      <td className={`px-2 py-2.5 whitespace-nowrap ${style.date}`}>
                        {new Date(req.request_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-2 py-2.5 truncate text-slate-600" title={displayRequesterName(req)}>
                        {displayRequesterName(req)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-600">
                        {req.department_name || "-"}
                      </td>
                      <td className="px-2 py-2.5 text-slate-600 text-sm">
                        {req.type === "WITHDRAW" ? "เบิก" : "ยืม"}
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-1 py-2.5 text-center">
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
                  {paginatedItems.length === 0 && (
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

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
              <p className="text-sm text-slate-500">
                แสดง {pagedCount} จาก {filteredCount} รายการ
                {filteredCount !== allCount && (
                  <span className="text-slate-400"> (ทั้งหมด {allCount} รายการ)</span>
                )}
              </p>
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
          </>
        )}
      </div>
    </div>
  );
};

export default RequestClient;