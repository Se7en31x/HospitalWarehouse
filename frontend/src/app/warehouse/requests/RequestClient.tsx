"use client";

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import {
  Search, X, PackageCheck,
  Building2, Minus, Plus, User, Loader2, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  getRequisitionHistory,
  approveRequisition,
  rejectRequisition,
  RequisitionHeader
} from "../../../services/requisitionService";
import { useAuth } from "@/lib/useAuth";
import toast, { Toaster } from "react-hot-toast";

// ✅ Mock Data สำหรับการทดสอบและตัวอย่าง
const MOCK_REQUESTS: RequisitionHeader[] = [
  {
    id: 1,
    doc_no: "REQ-2026-01-001",
    request_date: new Date("2026-03-08T14:30:00").toISOString(),
    department_code: "ICU",
    department_name: "หน่วยดูแลผู้ป่วยระดับวิกฤต",
    requester_id: "EMP001",
    status: "PENDING",
    type: "WITHDRAW",
    requisition_item: [
      {
        id: 101,
        req_qty: 50,
        item: { name: "ถุงมือการแพทย์ Nitrile", code: "ITEM-001", current_stock: 200 }
      },
      {
        id: 102,
        req_qty: 30,
        item: { name: "หน้ากากอนามัย N95", code: "ITEM-002", current_stock: 150 }
      },
      {
        id: 103,
        req_qty: 10,
        item: { name: "ถุงยาง latex สำหรับตรวจ", code: "ITEM-003", current_stock: 80 }
      }
    ]
  },
  {
    id: 2,
    doc_no: "REQ-2026-01-002",
    request_date: new Date("2026-03-07T10:15:00").toISOString(),
    department_code: "ER",
    department_name: "ห้องฉุกเฉินและอุบัติเหตุ",
    requester_id: "EMP002",
    status: "PENDING",
    type: "BORROW",
    requisition_item: [
      {
        id: 104,
        req_qty: 5,
        item: { name: "เครื่องมือตรวจสายตา Auto Refractor", code: "ITEM-004", current_stock: 8 }
      },
      {
        id: 105,
        req_qty: 20,
        item: { name: "แอลกอฮอล์ 70% ขนาด 500 มล.", code: "ITEM-005", current_stock: 120 }
      }
    ]
  },
  {
    id: 3,
    doc_no: "REQ-2026-01-003",
    request_date: new Date("2026-03-06T09:45:00").toISOString(),
    department_code: "OPD",
    department_name: "ห้องผู้ป่วยนอก",
    requester_id: "EMP003",
    status: "APPROVED",
    type: "WITHDRAW",
    requisition_item: [
      {
        id: 106,
        req_qty: 100,
        item: { name: "กระบอกฉีดยา 3 มล.", code: "ITEM-006", current_stock: 500 }
      },
      {
        id: 107,
        req_qty: 50,
        item: { name: "เข็มฉีดยา 25G", code: "ITEM-007", current_stock: 300 }
      }
    ]
  },
  {
    id: 4,
    doc_no: "REQ-2026-01-004",
    request_date: new Date("2026-03-05T15:20:00").toISOString(),
    department_code: "WARD-A",
    department_name: "病棟 A (หอผู้ป่วยทั่วไป)",
    requester_id: "EMP004",
    status: "PENDING",
    type: "BORROW",
    requisition_item: [
      {
        id: 108,
        req_qty: 3,
        item: { name: "เครื่องวัดความดันโลหิตอัตโนมัติ", code: "ITEM-008", current_stock: 10 }
      }
    ]
  },
  {
    id: 5,
    doc_no: "REQ-2026-01-005",
    request_date: new Date("2026-03-04T11:00:00").toISOString(),
    department_code: "LAB",
    department_name: "ห้องปฏิบัติการ",
    requester_id: "EMP005",
    status: "REJECTED",
    type: "WITHDRAW",
    requisition_item: [
      {
        id: 109,
        req_qty: 200,
        item: { name: "แพตต์ +/-", code: "ITEM-009", current_stock: 50 }
      }
    ]
  },
  {
    id: 6,
    doc_no: "REQ-2026-01-006",
    request_date: new Date("2026-03-08T13:30:00").toISOString(),
    department_code: "ICU",
    department_name: "หน่วยดูแลผู้ป่วยระดับวิกฤต",
    requester_id: "EMP006",
    status: "PENDING",
    type: "WITHDRAW",
    requisition_item: [
      {
        id: 110,
        req_qty: 40,
        item: { name: "กระสุนอาหาร IV", code: "ITEM-010", current_stock: 180 }
      },
      {
        id: 111,
        req_qty: 25,
        item: { name: "ผ้าปิดแผลปะดาษ", code: "ITEM-011", current_stock: 200 }
      }
    ]
  },
  {
    id: 7,
    doc_no: "REQ-2026-01-007",
    request_date: new Date("2026-03-08T16:45:00").toISOString(),
    department_code: "PHAR",
    department_name: "ห้องเภสัชกรรม",
    requester_id: "EMP007",
    status: "PENDING",
    type: "BORROW",
    requisition_item: [
      {
        id: 112,
        req_qty: 2,
        item: { name: "ตูดาปฏิบัติการ", code: "ITEM-012", current_stock: 5 }
      }
    ]
  }
];

// ✅ Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const RequestClient = () => {
  // ✅ State สำหรับรายการเบิก
  const { departments } = useAuth();
  const [requests, setRequests] = useState<RequisitionHeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [useMockData, setUseMockData] = useState(
    typeof window !== 'undefined' && localStorage.getItem('SHOW_MOCK_DATA') === 'true'
  );

  // ✅ State สำหรับ Filtering & Pagination
  const [activeTab, setActiveTab] = useState("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ State สำหรับ Modal & Form
  const [showDetailsModal, setShowDetailsModal] = useState<RequisitionHeader | null>(null);
  const [issuedQtys, setIssuedQtys] = useState<Record<number, number>>({});

  // --- [Data Fetching Logic] ---
  // ฟังก์ชันดึงข้อมูลใหม่ (ใช้ useCallback เพื่อให้เรียกซ้ำใน useEffect ได้โดยไม่ loop)
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      let dataToSet: RequisitionHeader[] = [];

      // ถ้าเปิดใช้ Mock Data โหลดจาก Mock แทน
      if (useMockData) {
        dataToSet = MOCK_REQUESTS;
        setTimeout(() => {
          setRequests(dataToSet);
          toast.success("โหลดข้อมูลตัวอย่างแล้ว (Dev Mode)", { id: 'refresh-toast', duration: 2000 });
          setIsFetching(false);
        }, 800);
        return;
      }

      // โหลดจาก API จริง
      const result = await getRequisitionHistory();
      if (result.success) {
        dataToSet = result.data;
        setRequests(dataToSet);
        toast.success("อัปเดตข้อมูลล่าสุดแล้ว", { id: 'refresh-toast', duration: 2000 });
      } else {
        throw new Error(result.message || "ไม่สามารถดึงข้อมูลได้");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error(getErrorMessage(err));
      // ใช้ Mock Data เป็นค่า Default เมื่อ API ล้มเหลว
      setRequests(MOCK_REQUESTS);
      toast.success("แสดงข้อมูลตัวอย่างแทน", { id: 'fallback-toast' });
    } finally {
      setIsFetching(false);
    }
  }, [useMockData]);

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

  // --- [Modal Handlers] ---
  const handleOpenDetails = (req: any) => {
    const initialQtys: Record<number, number> = {};
    req.requisition_item.forEach((item: any) => {
      initialQtys[item.id] = Math.min(item.req_qty, item.item?.current_stock || 0);
    });
    setIssuedQtys(initialQtys);
    setShowDetailsModal(req);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(null);
    setIssuedQtys({});
  };

  const updateQty = (id: number, delta: number, maxStock: number, reqQty: number) => {
    setIssuedQtys(prev => {
      const current = prev[id] || 0;
      const next = current + delta;
      if (next < 0 || next > maxStock || next > reqQty) return prev;
      return { ...prev, [id]: next };
    });
  };

  const handleApprove = async (): Promise<void> => {
    if (!showDetailsModal) return;

    const loadId = toast.loading("กำลังบันทึกการอนุมัติและตัดสต็อก...");
    setIsLoading(true);
    try {
      const res = await approveRequisition(showDetailsModal.id, issuedQtys);
      if (res.success) {
        toast.success("อนุมัติรายการสำเร็จ", { id: loadId });
        handleCloseModal();
        await refreshData();
      } else {
        throw new Error(res.message);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!showDetailsModal) return;

    const reason = window.prompt("ระบุเหตุผลที่ปฏิเสธการเบิก:");
    if (!reason?.trim()) return;

    const loadId = toast.loading("กำลังดำเนินการ...");
    setIsLoading(true);
    try {
      const res = await rejectRequisition(showDetailsModal.id, reason.trim());
      if (res.success) {
        toast.success("ปฏิเสธรายการแล้ว", { id: loadId });
        handleCloseModal();
        await refreshData();
      } else {
        throw new Error(res.message);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err), { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  // --- [Search & Filter Logic] ---
  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === "all" || req.status === activeTab;
    const searchLower = searchTerm.toLowerCase();
    return matchesTab && (
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
    const styles: Record<string, string> = {
      "PENDING": "bg-amber-50 text-amber-600 border-amber-100",
      "APPROVED": "bg-emerald-50 text-emerald-600 border-emerald-100",
      "REJECTED": "bg-rose-50 text-rose-600 border-rose-100"
    };
    const labels: Record<string, string> = {
      "PENDING": "รออนุมัติ",
      "APPROVED": "อนุมัติแล้ว",
      "REJECTED": "ปฏิเสธแล้ว"
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[status] || "bg-slate-50"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const TypeBadge = ({ type }: { type: string }): React.ReactNode => {
    const styles: Record<string, string> = {
      "WITHDRAW": "bg-blue-50 border-blue-200 text-blue-600",
      "BORROW": "bg-orange-50 border-orange-200 text-orange-600"
    };
    const labels: Record<string, string> = {
      "WITHDRAW": "เบิก",
      "BORROW": "ยืม"
    };
    const styleClass = styles[type] || "bg-slate-50";
    const labelText = labels[type] || type;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${styleClass}`}>
        {labelText}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <PackageCheck className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-indigo-600">ตรวจสอบรายการเบิกพัสดุ</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-center">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่หรือแผนก..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>
        <div className="flex gap-3 md:ml-auto">
          <select
            value={activeTab}
            onChange={(e) => {
              setActiveTab(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="PENDING">รออนุมัติ</option>
            <option value="all">ทั้งหมด</option>
          </select>
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
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[150px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[150px]">วันที่เบิก</th>
                <th className="px-6 py-4 w-[180px]">แผนกที่เบิก</th>
                <th className="px-6 py-4 w-[100px] text-center">ประเภท</th>
                <th className="px-6 py-4 w-[120px] text-center">สถานะ</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left">
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[150px] text-slate-800">{req.doc_no}</td>
                  <td className="px-6 py-4 w-[150px] text-slate-600">
                    {new Date(req.request_date).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 w-[180px] font-medium text-indigo-900">
                    {displayDeptName(req)}
                  </td>
                  <td className="px-6 py-4 w-[100px] text-center">
                    <TypeBadge type={req.type} />
                  </td>
                  <td className="px-6 py-4 w-[120px] text-center">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-4 text-right w-[100px]">
                    <button
                      onClick={() => handleOpenDetails(req)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      ตรวจสอบ
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">ไม่พบข้อมูล</td>
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
      {showDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{showDetailsModal.doc_no}</h2>
                  <p className="text-xs text-slate-500">ตรวจสอบและยืนยันจำนวนการจ่ายพัสดุ</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <Building2 size={18} className="text-indigo-600" />
                  <div>
                    <p className="text-[10px] text-indigo-400 uppercase font-bold">แผนกที่ร้องขอ</p>
                    <p className="text-sm font-bold text-indigo-900">{displayDeptName(showDetailsModal)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User size={18} className="text-indigo-600" />
                  <div>
                    <p className="text-[10px] text-indigo-400 uppercase font-bold">ID ผู้เบิก</p>
                    <p className="text-sm font-bold text-indigo-900">{showDetailsModal.requester_id}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">รายการพัสดุ</th>
                      <th className="px-4 py-4 text-center w-[120px]">ยอดที่ขอ</th>
                      <th className="px-4 py-4 text-center w-[120px]">คงเหลือในคลัง</th>
                      <th className="px-6 py-4 text-right w-[240px]">อนุมัติจ่ายจริง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {showDetailsModal.requisition_item.map((row: any) => {
                      const currentIssued = issuedQtys[row.id] || 0;
                      const dbStock = row.item?.current_stock || 0;
                      const dbReq = row.req_qty || 0;

                      return (
                        <tr key={row.id} className="h-[80px]">
                          <td className="px-6">
                            <p className="font-bold text-slate-800">{row.item?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono italic">Code: {row.item?.code}</p>
                          </td>
                          <td className="px-4 text-center font-bold text-slate-400 text-lg">{dbReq}</td>
                          <td className="px-4 text-center font-bold text-slate-800 text-lg bg-slate-50/50">{dbStock}</td>
                          <td className="px-6">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-200 shadow-sm focus-within:border-indigo-500 transition-all">
                                <button
                                  type="button"
                                  onClick={() => updateQty(row.id, -1, dbStock, dbReq)}
                                  className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500"
                                >
                                  <Minus size={14} strokeWidth={3} />
                                </button>
                                <input
                                  type="number"
                                  value={currentIssued}
                                  readOnly
                                  className="w-14 bg-transparent text-center font-black text-lg outline-none text-indigo-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQty(row.id, 1, dbStock, dbReq)}
                                  className="p-1.5 hover:bg-slate-50 rounded-lg text-indigo-600"
                                >
                                  <Plus size={14} strokeWidth={3} />
                                </button>
                              </div>
                              <span className={`text-[10px] font-bold pr-1 ${dbStock - currentIssued < 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                                คงเหลือหลังจ่าย: {dbStock - currentIssued}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-8 py-6 border-t bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 bg-white border rounded-xl hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading || showDetailsModal.status !== 'PENDING'}
                className="px-6 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                ปฏิเสธการเบิก
              </button>
              {showDetailsModal.status === 'PENDING' && (
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="px-10 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-slate-900 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  ยืนยันการอนุมัติ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestClient;