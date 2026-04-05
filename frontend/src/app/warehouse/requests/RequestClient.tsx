"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, ChevronDown, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  getAllRequisitions,
  getRequisitionById,
  cancelRequisition,
} from "../../../services/requisitionService";
import { RequisitionHeader } from "../../../types/requisition_type"; // นำเข้า Type มาใช้
import { useAuth } from "@/lib/useAuth";
import toast, { Toaster } from "react-hot-toast";
import RequisitionDetailsModal from "./RequisitionDetailsModal";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const RequestClient = () => {
  const { departments } = useAuth();
  const [requests, setRequests] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<RequisitionHeader | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<number | null>(null);
  const [isCancelLoading, setIsCancelLoading] = useState<number | null>(null);

  // --- [Helper Functions] ---
  // ระบุ Type เป็น RequisitionHeader แทน any
  const displayDeptName = useCallback((req: RequisitionHeader): string => {
    const deptInAuth = departments?.find(d => d.id === req.department_id);
    if (deptInAuth) return deptInAuth.name;
    return req.department_id ? `แผนก (${req.department_id})` : "ไม่ระบุแผนก";
  }, [departments]);

  const displayRequesterName = (req: RequisitionHeader): string => {
    return req.requester || req.requester_id || "ไม่ระบุผู้ทำรายการ";
  };

  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions();
      if (result && (result.success !== false)) {
        let data: RequisitionHeader[] = [];

        if (Array.isArray(result.data)) {
          data = result.data;
        } else if (Array.isArray((result as any).items)) {
          data = (result as any).items;
        } else if (result.data && typeof result.data === 'object' && 'items' in result.data) {
          data = (result.data as any).items;
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

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // --- [Filter Logic] ---
  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === "all" || req.status === activeTab;
    const matchesType = selectedType === "all" || req.type === selectedType;
    const searchLower = searchTerm.toLowerCase();
    
    // ค้นหาแบบปลอดภัยจากฟิลด์ที่มี
    const matchesSearch =
      req.doc_no?.toLowerCase().includes(searchLower) ||
      String(req.department_id).includes(searchLower) ||
      req.requester?.toLowerCase().includes(searchLower);

    return matchesTab && matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedItems = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- [Sub-Components] ---
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      COMPLETED: "bg-emerald-50 text-emerald-700",
      APPROVED:  "bg-emerald-50 text-emerald-700",
      REJECTED:  "bg-rose-50 text-rose-700",
      PENDING:   "bg-amber-50 text-amber-700",
      DRAFT:     "bg-slate-100 text-slate-500",
      CANCELLED: "bg-slate-100 text-slate-400",
    };
    const labels: Record<string, string> = {
      COMPLETED: "อนุมัติแล้ว",
      APPROVED:  "อนุมัติแล้ว",
      REJECTED:  "ปฏิเสธแล้ว",
      PENDING:   "รออนุมัติ",
      DRAFT:     "ร่าง",
      CANCELLED: "ยกเลิก",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-500"}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">คำขอเบิก-ยืม</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Additional buttons can be added here */}
        </div>
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
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        {/* Type Dropdown */}
        <div className="relative" data-type-dropdown>
          <button
            type="button"
            onClick={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsStatusDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedType === "all" ? "ประเภททั้งหมด" : selectedType === "WITHDRAW" ? "เบิก" : "ยืม"}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {[{ v: 'all', l: 'ประเภททั้งหมด' }, { v: 'WITHDRAW', l: 'เบิก' }, { v: 'BORROW', l: 'ยืม' }].map(t => (
                  <li key={t.v}>
                    <button
                      type="button"
                      onClick={() => { setSelectedType(t.v); setIsTypeDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedType === t.v ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
            type="button"
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsTypeDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{activeTab === "all" ? "สถานะทั้งหมด" : activeTab === "PENDING" ? "รออนุมัติ" : activeTab === "COMPLETED" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {[{ v: 'all', l: 'สถานะทั้งหมด' }, { v: 'PENDING', l: 'รออนุมัติ' }, { v: 'COMPLETED', l: 'อนุมัติแล้ว' }, { v: 'REJECTED', l: 'ปฏิเสธแล้ว' }].map(s => (
                  <li key={s.v}>
                    <button
                      type="button"
                      onClick={() => { setActiveTab(s.v); setIsStatusDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${activeTab === s.v ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden flex flex-col relative" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
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
                <th className="px-6 py-4 w-[150px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[150px]">วันที่และเวลา</th>
                <th className="px-6 py-4 w-[200px]">ชื่อผู้ทำรายการ</th>
                <th className="px-6 py-4 w-[150px]">แผนก</th>
                <th className="px-6 py-4 w-[100px]">ประเภท</th>
                <th className="px-6 py-4 w-[150px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[80px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedItems.map((req, idx) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[50px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4 w-[150px] font-medium text-slate-800">{req.doc_no}</td>
                  <td className="px-6 py-4 w-[150px] text-slate-600">
                    {new Date(req.request_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 w-[200px] text-slate-700">{displayRequesterName(req)}</td>
                  <td className="px-6 py-4 w-[150px] text-slate-600">{displayDeptName(req)}</td>
                  <td className="px-6 py-4 w-[100px] text-slate-600">{req.type === "WITHDRAW" ? "เบิก" : "ยืม"}</td>
                  <td className="px-6 py-4 w-[150px]">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-4 w-[80px] text-center">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={async () => {
                          setIsDetailLoading(req.id);
                          try {
                            const res = await getRequisitionById(req.id);
                            if (res.success && res.data) {
                              setShowDetailsModal(res.data);
                            } else {
                              toast.error(res.message || "ไม่สามารถโหลดรายละเอียดได้");
                            }
                          } catch {
                            toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
                          } finally {
                            setIsDetailLoading(null);
                          }
                        }}
                        disabled={isDetailLoading === req.id}
                        title="ดูรายละเอียด"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        {isDetailLoading === req.id
                          ? <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
                          : <Eye className="w-5 h-5" />}
                      </button>

                      {req.status === "PENDING" && (
                        <button
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: "ยืนยันการยกเลิก",
                              text: `ต้องการยกเลิกใบเบิก "${req.doc_no}" ใช่หรือไม่?`,
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#ef4444",
                              cancelButtonColor: "#6b7280",
                              confirmButtonText: "ยืนยัน",
                              cancelButtonText: "ย้อนกลับ",
                            });
                            if (!result.isConfirmed) return;
                            setIsCancelLoading(req.id);
                            try {
                              const res = await cancelRequisition(req.id);
                              if (res.success) {
                                toast.success(res.message || "ยกเลิกใบเบิกสำเร็จ");
                                refreshData();
                              } else {
                                toast.error(res.message || "ไม่สามารถยกเลิกได้");
                              }
                            } catch {
                              toast.error("เกิดข้อผิดพลาดในการยกเลิก");
                            } finally {
                              setIsCancelLoading(null);
                            }
                          }}
                          disabled={isCancelLoading === req.id}
                          title="ยกเลิกใบเบิก"
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                        >
                          {isCancelLoading === req.id
                            ? <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
                            : <Trash2 className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
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

      {/* Pagination Control */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">
          แสดง {paginatedItems.length} จาก {filteredRequests.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"
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

      {/* Modal */}
      {showDetailsModal && (
        <RequisitionDetailsModal
          isOpen={!!showDetailsModal}
          requisition={showDetailsModal}
          onClose={() => setShowDetailsModal(null)}
          onSuccess={refreshData}
          displayDeptName={displayDeptName}
          displayRequesterName={displayRequesterName}
        />
      )}
    </div>
  );
};

export default RequestClient;