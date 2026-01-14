"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Eye, X, FileText, RefreshCw,
  Building2, PackageCheck, Minus, Plus, User
} from "lucide-react";
import {
  getRequisitionHistory,
  approveRequisition,
  rejectRequisition,
  RequisitionHeader
} from "@/services/requisitionService";
import { useAuth } from "../../hooks/useAuth"; // ✅ สำหรับดูข้อมูลผู้ใช้งานปัจจุบัน (ถ้าจำเป็น)
import toast, { Toaster } from "react-hot-toast";

const RequestClient = () => {
  const { departments } = useAuth(); // ดึงแผนกจาก Token มาสำรองไว้กรณีข้อมูลใน DB ว่าง
  const [activeTab, setActiveTab] = useState("PENDING");
  const [requests, setRequests] = useState<RequisitionHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState<RequisitionHeader | null>(null);
  const [issuedQtys, setIssuedQtys] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ ฟังก์ชันแสดงชื่อแผนก (เน้นดึงจาก Snapshot ใน DB ก่อน)
  const displayDeptName = (req: RequisitionHeader) => {
    // 1. ถ้ามีชื่อแผนกที่บันทึกไว้ตอนเบิก (Snapshot) ให้ใช้ชื่อนั้นเลย
    if (req.department_name) return req.department_name;

    // 2. ถ้าไม่มี (กรณีข้อมูลเก่า) ให้ลองหาจาก Token ของเจ้าหน้าที่ปัจจุบัน
    const deptInToken = departments.find(d => d.code === req.department_code);
    if (deptInToken) return deptInToken.name;

    // 3. ถ้าหาไม่เจอจริงๆ ให้แสดงรหัสแผนก
    return req.department_code ? `แผนก (${req.department_code})` : "ไม่ระบุแผนก";
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getRequisitionHistory();
      if (result.success) setRequests(result.data);
    } catch (err) {
      toast.error("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenDetails = (req: RequisitionHeader) => {
    const initialQtys: Record<number, number> = {};
    req.requisition_item.forEach(item => {
      // ตั้งค่าเริ่มต้นยอดจ่าย = ยอดที่ขอ (แต่ไม่เกินสต็อกที่มี)
      initialQtys[item.id] = Math.min(item.req_qty, item.item?.current_stock || 0);
    });
    setIssuedQtys(initialQtys);
    setShowDetailsModal(req);
  };

  const handleApprove = async (): Promise<void> => {
    if (!showDetailsModal) return;

    const loadId = toast.loading("กำลังบันทึกการอนุมัติและตัดสต็อก...");
    try {
      const res = await approveRequisition(showDetailsModal.id, issuedQtys);
      if (res.success) {
        toast.success("อนุมัติรายการสำเร็จ", { id: loadId });
        setShowDetailsModal(null);
        await fetchData();
      } else {
        throw new Error(res.message);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอนุมัติ";
      toast.error(errorMessage, { id: loadId });
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!showDetailsModal) return;

    const reason = window.prompt("ระบุเหตุผลที่ปฏิเสธการเบิก:");
    if (!reason?.trim()) return;

    const loadId = toast.loading("กำลังดำเนินการ...");
    try {
      const res = await rejectRequisition(showDetailsModal.id, reason.trim());
      if (res.success) {
        toast.success("ปฏิเสธรายการแล้ว", { id: loadId });
        setShowDetailsModal(null);
        await fetchData();
      } else {
        throw new Error(res.message);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการปฏิเสธ";
      toast.error(errorMessage, { id: loadId });
    }
  };

  const updateQty = (id: number, delta: number, maxStock: number, reqQty: number) => {
    setIssuedQtys(prev => {
      const current = prev[id] || 0;
      const next = current + delta;
      // กฎ: ไม่ต่ำกว่า 0, ไม่เกินสต็อกที่มี, ไม่เกินยอดที่ขอเบิกมา
      if (next < 0 || next > maxStock || next > reqQty) return prev;
      return { ...prev, [id]: next };
    });
  };

  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === "all" || req.status === activeTab;
    const searchLower = searchTerm.toLowerCase();
    return matchesTab && (
      req.doc_no?.toLowerCase().includes(searchLower) ||
      req.department_name?.toLowerCase().includes(searchLower)
    );
  });

  const paginatedItems = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen p-6 font-sans">
      <Toaster position="top-right" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-lg text-white shadow-lg"><FileText size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">ตรวจสอบรายการเบิกพัสดุ</h1>
            <p className="text-sm text-slate-500">จัดการคำขอและยืนยันการจ่ายพัสดุตามแผนก</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ค้นหาเลขที่หรือชื่อแผนก..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64 outline-none focus:ring-2 focus:ring-indigo-600"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex bg-slate-50 border-b border-slate-200">
          {[{ id: "PENDING", label: "รออนุมัติ" }, { id: "all", label: "ทั้งหมด" }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
              className={`py-4 px-8 text-sm font-bold transition-all ${activeTab === tab.id ? "bg-white text-indigo-600 border-t-2 border-t-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/80 text-slate-700 text-[11px] uppercase font-black border-b">
              <tr>
                <th className="px-6 py-4">เลขที่เอกสาร</th>
                <th className="px-6 py-4">วันที่เบิก</th>
                <th className="px-6 py-4">แผนกที่เบิก</th>
                <th className="px-4 py-4 text-center">ประเภท</th>
                <th className="px-6 py-4 text-center">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-medium italic">กำลังโหลดข้อมูลรายการเบิก...</td></tr>
              ) : paginatedItems.map((req) => (
                <tr key={req.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-3 font-bold text-slate-800">{req.doc_no}</td>
                  <td className="px-6 py-3 text-sm">{new Date(req.request_date).toLocaleString('th-TH')}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-indigo-900">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-400" />
                      {displayDeptName(req)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${req.type === 'WITHDRAW' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                      {req.type === 'WITHDRAW' ? 'เบิก' : 'ยืม'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        req.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleOpenDetails(req)} className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-all shadow-sm">
                      ตรวจสอบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail & Approval */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg"><PackageCheck size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{showDetailsModal.doc_no}</h2>
                  <p className="text-xs text-slate-500">ตรวจสอบและยืนยันจำนวนการจ่ายพัสดุ</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(null)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 transition-colors"><X size={20} /></button>
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
                    {showDetailsModal.requisition_item.map((row) => {
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
              <button onClick={handleReject} className="px-6 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all">ปฏิเสธการเบิก</button>
              <button onClick={() => setShowDetailsModal(null)} className="px-6 py-2.5 text-sm font-bold text-slate-500 bg-white border rounded-xl hover:bg-slate-50">ปิดหน้าต่าง</button>
              {showDetailsModal.status === 'PENDING' && (
                <button
                  onClick={handleApprove}
                  className="px-10 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-slate-900 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
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