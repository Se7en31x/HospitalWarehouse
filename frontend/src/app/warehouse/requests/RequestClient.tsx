"use client";

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import {
  Search, X, PackageCheck,
  Building2, ChevronLeft, ChevronRight, Eye, ChevronDown
} from "lucide-react";
import {
  getRequisitionHistory,
  RequisitionHeader
} from "../../../services/requisitionService";
import { useAuth } from "@/lib/useAuth";
import toast, { Toaster } from "react-hot-toast";
import RequisitionDetailsModal from "./RequisitionDetailsModal";


// ✅ Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const RequestClient = () => {
  // ✅ State สำหรับรายการเบิก
  const { departments } = useAuth();
  const [requests, setRequests] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // ✅ State สำหรับ Filtering & Pagination
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-type-dropdown]")) setIsTypeDropdownOpen(false);
      if (!target.closest("[data-status-dropdown]")) setIsStatusDropdownOpen(false);
    };
    if (isTypeDropdownOpen || isStatusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isTypeDropdownOpen, isStatusDropdownOpen]);

  // ✅ State สำหรับ Modal & Form
  const [showDetailsModal, setShowDetailsModal] = useState<RequisitionHeader | null>(null);

  // --- [Data Fetching Logic] ---
  // ฟังก์ชันดึงข้อมูลใหม่ (ใช้ useCallback เพื่อให้เรียกซ้ำใน useEffect ได้โดยไม่ loop)
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      // โหลดจาก API จริง
      const result = await getRequisitionHistory();
      if (result.success) {
        setRequests(result.data);
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

  // โหลดข้อมูลเมื่อ Component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // --- [Helper Functions] ---
  // ฟังก์ชันแสดงชื่อแผนก (เน้นดึงจาก Snapshot ใน DB ก่อน)
  const displayDeptName = (req: any): string => {
    if (req.department_name) return req.department_name;
    const deptInToken = departments.find((d: any) => d.code === req.department_code);
    if (deptInToken) return deptInToken.name;
    return req.department_code ? `แผนก (${req.department_code})` : "ไม่ระบุแผนก";
  };

  // ฟังก์ชันแสดงชื่อผู้ทำรายการ
  const displayRequesterName = (req: any): string => {
    if (req.requester_name) return req.requester_name;
    return req.requester_id || "ไม่ระบุผู้ทำรายการ";
  };

  // --- [Modal Handlers] ---
  const handleOpenDetails = (req: any) => {
    setShowDetailsModal(req);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(null);
  };

  // --- [Search & Filter Logic] ---
  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === "all" || req.status === activeTab;
    const matchesType = selectedType === "all" || req.type === selectedType;
    const searchLower = searchTerm.toLowerCase();
    return matchesTab && matchesType && (
      req.doc_no?.toLowerCase().includes(searchLower) ||
      req.department_name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedItems = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- [UI Components] ---
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
          อนุมัติแล้ว
        </span>
      );
    }
    if (status === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
          ปฏิเสธแล้ว
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
        รออนุมัติ
      </span>
    );
  };

  const TypeBadge = ({ type }: { type: string }): React.ReactNode => {
    return (
      <span className="text-slate-600 text-sm">
        {type === "WITHDRAW" ? "เบิก" : "ยืม"}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">คำขอเบิก-ยืม</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่หรือแผนก..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>
        <div className="relative" data-type-dropdown>
          <button
            onClick={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsStatusDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[160px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedType === "all" ? "ทุกประเภท" : selectedType === "WITHDRAW" ? "เบิก" : "ยืม"}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[
                  { value: 'all', label: 'ทุกประเภท' },
                  { value: 'WITHDRAW', label: 'เบิก' },
                  { value: 'BORROW', label: 'ยืม' }
                ].map((t) => (
                  <li key={t.value}>
                    <button
                      onClick={() => {
                        setSelectedType(t.value);
                        setIsTypeDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedType === t.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative" data-status-dropdown>
          <button
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsTypeDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[160px] justify-between"
          >
            <span className="text-slate-800 font-medium">{activeTab === "all" ? "ทุกสถานะ" : activeTab === "PENDING" ? "รออนุมัติ" : activeTab === "APPROVED" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[
                  { value: 'all', label: 'ทุกสถานะ' },
                  { value: 'PENDING', label: 'รออนุมัติ' },
                  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                  { value: 'REJECTED', label: 'ปฏิเสธแล้ว' }
                ].map((s) => (
                  <li key={s.value}>
                    <button
                      onClick={() => {
                        setActiveTab(s.value);
                        setIsStatusDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        activeTab === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto flex-shrink-0">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[130px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[130px]">วันที่</th>
                <th className="px-6 py-4 w-[160px]">ชื่อผู้ทำรายการ</th>
                <th className="px-6 py-4 w-[140px]">แผนก</th>
                <th className="px-6 py-4 w-[90px] text-center">ประเภท</th>
                <th className="px-6 py-4 w-[110px] text-center">สถานะ</th>
                <th className="px-6 py-4 text-center w-[90px]">จัดการ</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[130px] text-slate-800">{req.doc_no}</td>
                  <td className="px-6 py-4 w-[130px] text-slate-600">
                    {new Date(req.request_date).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 w-[160px] font-medium text-slate-700">
                    {(req as any).requester_name || req.requester_id}
                  </td>
                  <td className="px-6 py-4 w-[140px] text-slate-600">
                    {displayDeptName(req)}
                  </td>
                  <td className="px-6 py-4 w-[90px] text-center">
                    <TypeBadge type={req.type} />
                  </td>
                  <td className="px-6 py-4 w-[110px] text-center">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-4 text-center w-[90px]">
                    <button
                      onClick={() => handleOpenDetails(req)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center justify-center"
                      title="ตรวจสอบรายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
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
        <p className="text-sm text-slate-500">
          แสดง {paginatedItems.length} จาก {filteredRequests.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Requisition Details Modal */}
      <RequisitionDetailsModal
        isOpen={showDetailsModal !== null}
        requisition={showDetailsModal}
        onClose={handleCloseModal}
        onSuccess={refreshData}
        displayDeptName={displayDeptName}
        displayRequesterName={displayRequesterName}
      />
    </div>
  );
};

export default RequestClient;