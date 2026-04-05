"use client";

import React, { useState, useEffect } from "react";
import {
  X, PackageCheck, Building2, User, Loader2, Minus, Plus
} from "lucide-react";
import toast from "react-hot-toast";
import {
  approveRequisition,
  rejectRequisition
} from "../../../services/requisitionService";
import { RequisitionHeader, RequisitionItem } from "../../../types/requisition_type";

interface RequisitionDetailsModalProps {
  isOpen: boolean;
  requisition: RequisitionHeader | null;
  onClose: () => void;
  onSuccess: () => void;
  displayDeptName: (req: RequisitionHeader) => string;
  displayRequesterName: (req: RequisitionHeader) => string;
}

const RequisitionDetailsModal: React.FC<RequisitionDetailsModalProps> = ({
  isOpen,
  requisition,
  onClose,
  onSuccess,
  displayDeptName,
  displayRequesterName
}) => {
  const [issuedQtys, setIssuedQtys] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // ✅ Initialize quantities: ใช้ค่าจาก DTO ที่ Flatten มาแล้ว
  useEffect(() => {
    if (isOpen && requisition && requisition.items) {
      const initialQtys: Record<number, number> = {};
      requisition.items.forEach((item: RequisitionItem) => {
        // ใช้ item.qty และ item.current_stock (ชื่อตาม DTO)
        const requested = item.qty || 0;
        const stock = item.current_stock || 0;
        
        // ค่าเริ่มต้นจ่ายจริง = เท่าที่ขอมา แต่ต้องไม่เกินสต็อกที่มี
        initialQtys[item.id] = Math.min(requested, stock);
      });
      setIssuedQtys(initialQtys);
    }
  }, [isOpen, requisition]);

  const updateQty = (id: number, delta: number, maxStock: number, reqQty: number) => {
    setIssuedQtys(prev => {
      const current = prev[id] || 0;
      const next = current + delta;
      // กรองค่า: ต้องไม่ติดลบ, ไม่เกินสต็อก, และไม่เกินยอดที่ขอมา
      if (next < 0 || next > maxStock || next > reqQty) return prev;
      return { ...prev, [id]: next };
    });
  };

  const handleApprove = async () => {
    if (!requisition) return;

    const loadId = toast.loading("กำลังบันทึกการอนุมัติและตัดสต็อก...");
    setIsLoading(true);
    try {
      const res = await approveRequisition(requisition.id, issuedQtys);
      if (res.success) {
        toast.success("อนุมัติรายการสำเร็จ", { id: loadId });
        onClose();
        onSuccess(); 
      } else {
        throw new Error(res.message || "เกิดข้อผิดพลาดจากระบบ");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอนุมัติ";
      toast.error(errMsg, { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requisition) return;

    const reason = window.prompt("ระบุเหตุผลที่ปฏิเสธการเบิก:");
    if (!reason?.trim()) return;

    const loadId = toast.loading("กำลังดำเนินการ...");
    setIsLoading(true);
    try {
      const res = await rejectRequisition(requisition.id, reason.trim());
      if (res.success) {
        toast.success("ปฏิเสธรายการแล้ว", { id: loadId });
        onClose();
        onSuccess();
      } else {
        throw new Error(res.message || "ไม่สามารถดำเนินการได้");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(errMsg, { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !requisition) return null;

  const isPending = requisition.status === 'PENDING';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <PackageCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{requisition.doc_no}</h2>
              <p className="text-xs text-slate-500">
                {isPending ? 'ตรวจสอบและยืนยันจำนวนการจ่ายพัสดุ' : requisition.status === 'COMPLETED' ? 'อนุมัติจ่ายพัสดุแล้ว' : 'ปฏิเสธคำขอเบิกแล้ว'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ข้อมูลพื้นฐาน */}
          <div className="grid grid-cols-2 gap-6 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm"><User size={20} className="text-indigo-600" /></div>
              <div>
                <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">ผู้ทำรายการ</p>
                <p className="text-lg font-bold text-indigo-900 leading-tight">{displayRequesterName(requisition)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm"><Building2 size={20} className="text-indigo-600" /></div>
              <div>
                <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">แผนกที่ร้องขอ</p>
                <p className="text-lg font-bold text-indigo-900 leading-tight">{displayDeptName(requisition)}</p>
              </div>
            </div>
          </div>

          {/* ตารางรายการ */}
          <div className="border rounded-2xl overflow-hidden shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase tracking-tighter">
                <tr>
                  <th className="px-6 py-4 text-center w-[80px]">รูป</th>
                  <th className="px-6 py-4 text-left">รายการพัสดุ</th>
                  <th className="px-4 py-4 text-center w-[110px]">ยอดที่ขอ</th>
                  {isPending ? (
                    <>
                      <th className="px-4 py-4 text-center w-[130px]">ในคลัง</th>
                      <th className="px-6 py-4 text-right w-[240px]">อนุมัติจ่ายจริง</th>
                    </>
                  ) : (
                    <th className="px-4 py-4 text-center w-[130px]">จ่ายจริง</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisition.items?.map((row: RequisitionItem) => {
                  const currentIssued = issuedQtys[row.id] || 0;
                  
                  // ✅ ดึงจาก DTO ที่ Flatten มาแล้ว (qty และ current_stock)
                  const dbStock = row.current_stock || 0;
                  const dbReq = row.qty || 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                          {row.image_url ? (
                            <button
                              onClick={() => setPreviewImage({ url: row.image_url!, name: row.name })}
                              className="w-full h-full"
                            >
                              <img src={row.image_url} className="w-full h-full object-cover" alt={row.name} />
                            </button>
                          ) : (
                            <PackageCheck className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6">
                        <p className="font-bold text-slate-800 text-base">{row.name}</p>
                        <p className="text-xs text-slate-400 font-mono">CODE: {row.code}</p>
                      </td>
                      <td className="px-4 text-center">
                        <span className="text-lg font-black text-slate-400">{dbReq}</span>
                      </td>
                      {isPending ? (
                        <>
                          <td className="px-4 text-center bg-slate-50/30">
                            <span className={`text-lg font-black ${dbStock === 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                              {dbStock}
                            </span>
                          </td>
                          <td className="px-6">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-200 shadow-sm focus-within:border-indigo-500 transition-all">
                                <button
                                  type="button"
                                  onClick={() => updateQty(row.id, -1, dbStock, dbReq)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                                >
                                  <Minus size={16} strokeWidth={3} />
                                </button>
                                <input
                                  type="number"
                                  value={currentIssued}
                                  readOnly
                                  className="w-16 bg-transparent text-center font-black text-xl outline-none text-indigo-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQty(row.id, 1, dbStock, dbReq)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors"
                                >
                                  <Plus size={16} strokeWidth={3} />
                                </button>
                              </div>
                              <p className={`text-[10px] font-bold uppercase tracking-tight ${dbStock - currentIssued < 5 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                                คลังหลังจ่าย: {dbStock - currentIssued}
                              </p>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td className="px-4 text-center">
                          <span className={`text-lg font-black ${row.issued > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {row.issued}
                          </span>
                          {row.issued < dbReq && row.issued > 0 && (
                            <p className="text-[10px] text-amber-500 font-bold mt-0.5">จ่ายไม่ครบ</p>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t bg-slate-50/50 flex justify-end items-center gap-3">
          {isPending ? (
            <p className="text-xs text-slate-400 mr-auto font-medium">* ตรวจสอบจำนวนก่อนยืนยัน ระบบจะตัดสต็อกทันทีหลังอนุมัติ</p>
          ) : (
            <p className="text-xs text-slate-400 mr-auto font-medium">
              {requisition.status === 'COMPLETED' ? '✓ ดำเนินการอนุมัติและตัดสต็อกเรียบร้อยแล้ว' : '✗ คำขอนี้ถูกปฏิเสธแล้ว'}
            </p>
          )}
          {isPending && (
            <>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="px-6 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                ปฏิเสธ
              </button>
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="px-10 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck size={18} />}
                ยืนยันอนุมัติจ่ายจริง
              </button>
            </>
          )}
        </div>
      </div>

      {/* Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold">
              ปิด <X size={24} />
            </button>
            <img src={previewImage.url} alt={previewImage.name} className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" />
            <p className="text-center text-white mt-4 font-bold text-lg">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionDetailsModal;