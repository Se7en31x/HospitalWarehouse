"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, ChevronDown, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  getAllRequisitions,
  cancelRequisition,
} from "../../../services/requisitionService";
import { RequisitionHeader } from "../../../types/requisition_type";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const RequestClient = () => {
  const [requests, setRequests] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const router = useRouter();
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState<string | number | null>(null);
  
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  // --- [Helper Functions] ---

  const displayRequesterName = (req: RequisitionHeader): string => {
    return req.requester || req.requester_id || "ไม่ระบุผู้ทำรายการ";
  };

  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions();
      if (result && result.success !== false) {
        let data: RequisitionHeader[] = [];

        // รองรับโครงสร้างข้อมูลที่หลากหลายจาก API
        if (Array.isArray(result.data)) {
          data = result.data;
        } else if (Array.isArray((result as any).items)) {
          data = (result as any).items;
        } else if (result.data?.items && Array.isArray(result.data.items)) {
          data = result.data.items;
        }

        setRequests(data);
      } else {
        throw new Error(result.message || "ไม่สามารถดึงข้อมูลได้");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error(getErrorMessage(err));
      setRequests([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Effects] ---

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Click Outside เพื่อปิด Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-type-dropdown]") && !target.closest("[data-status-dropdown]")) {
        setIsTypeDropdownOpen(false);
        setIsStatusDropdownOpen(false);
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

    const handleRefreshSignal = (message: string) => {
      if (message === "REQUISITIONS" || message === "ITEMS") {
        if (isCancelLoading !== null || isRefreshingRef.current) return;

        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        
        refreshTimerRef.current = setTimeout(async () => {
          isRefreshingRef.current = true;
          try {
            await refreshData();
          } finally {
            isRefreshingRef.current = false;
            refreshTimerRef.current = null;
          }
        }, 300);
      }
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [refreshData, isCancelLoading]);

  // --- [Filter Logic] ---
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesTab = activeTab === "all" || req.status === activeTab;
      const matchesType = selectedType === "all" || req.type === selectedType;
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch =
        req.doc_no?.toLowerCase().includes(searchLower) ||
        (req.department_name ?? '').toLowerCase().includes(searchLower) ||
        req.requester?.toLowerCase().includes(searchLower);

      return matchesTab && matchesType && matchesSearch;
    });
  }, [requests, activeTab, selectedType, searchTerm]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedItems = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- [Components] ---
  const statusLabels: Record<string, string> = {
    COMPLETED: "เสร็จสิ้น",
    APPROVED:  "รอนำส่ง",
    REJECTED:  "ปฏิเสธ",
    PENDING:   "รออนุมัติ",
    CANCELLED: "ยกเลิก",
  };

  const StatusBadge = ({ status }: { status: string }) => {
    return (
      <span className="text-sm text-slate-600">
        {statusLabels[status] || status}
      </span>
    );
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
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
          />
        </div>

        {/* Type Dropdown */}
        <div className="relative" data-type-dropdown>
          <button
            onClick={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsStatusDropdownOpen(false); }}
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
                      onClick={() => { setSelectedType(t.v); setIsTypeDropdownOpen(false); setCurrentPage(1); }}
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

        {/* Status Dropdown */}
        <div className="relative" data-status-dropdown>
          <button
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsTypeDropdownOpen(false); }}
            className="flex items-center justify-between gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 w-[180px] shadow-sm"
          >
            <span className="font-medium text-slate-700">
              {activeTab === "all" ? "ทุกสถานะ" : statusLabels[activeTab] ?? activeTab}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 w-full">
              <ul className="py-1">
                {[
                  { v: 'all', l: 'ทุกสถานะ' },
                  { v: 'PENDING',   l: 'รออนุมัติ' },
                  { v: 'APPROVED',  l: 'รอนำส่ง' },
                  { v: 'COMPLETED', l: 'เสร็จสิ้น' },
                  { v: 'REJECTED',  l: 'ปฏิเสธ' },
                  { v: 'CANCELLED', l: 'ยกเลิก' },
                ].map(s => (
                  <li key={s.v}>
                    <button
                      onClick={() => { setActiveTab(s.v); setIsStatusDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${activeTab === s.v ? "text-emerald-700 font-semibold bg-emerald-50" : "text-slate-600"}`}
                    >
                      {s.l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col relative" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
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
              {paginatedItems.map((req, idx) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-2.5">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-2.5 font-mono text-slate-600">{req.doc_no}</td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-slate-600">
                    {new Date(req.request_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-2.5 truncate text-slate-600" title={displayRequesterName(req)}>
                    {displayRequesterName(req)}
                  </td>
                  <td className="px-6 py-2.5 text-slate-600">
                    {req.department_name ?? (req.department ? `แผนก ${req.department}` : "-")}
                  </td>
                  <td className="px-6 py-2.5 text-slate-600 text-sm">
                    {req.type === "WITHDRAW" ? "เบิก" : "ยืม"}
                  </td>
                  <td className="px-6 py-2.5">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-2.5 text-center">
                    {/* ปรับแก้: ลบ opacity-0 ออกเพื่อให้ปุ่มแสดงตลอดเวลา และใส่สีพื้นหลัง/ตัวอักษรให้ชัดเจน */}
                    <div className="flex items-center justify-between w-[72px] mx-auto transition-opacity">
                      <button
                        onClick={() => router.push(`/warehouse/requests/${req.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ดูรายละเอียด"
                      >
                        <Eye size={18} />
                      </button>

                      {req.status === "PENDING" ? (
                        <button
                          onClick={async () => {
                            const confirm = await Swal.fire({
                              title: "ยกเลิกคำขอ?",
                              text: `ยืนยันการยกเลิกใบเบิกเลขที่ ${req.doc_no}`,
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonText: "ใช่, ยกเลิก",
                              cancelButtonText: "ไม่",
                              confirmButtonColor: "#e11d48"
                            });
                            if (!confirm.isConfirmed) return;
                            
                            setIsCancelLoading(req.id);
                            try {
                              const res = await cancelRequisition(req.id);
                              if (res.success) {
                                toast.success("ยกเลิกใบเบิกสำเร็จ");
                                refreshData();
                              } else {
                                toast.error(res.message);
                              }
                            } catch {
                              toast.error("เกิดข้อผิดพลาด");
                            } finally {
                              setIsCancelLoading(null);
                            }
                          }}
                          disabled={isCancelLoading === req.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                          title="ยกเลิกใบเบิก"
                        >
                          {isCancelLoading === req.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      ) : (
                        <div className="w-[34px]" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
        <p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {filteredRequests.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
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