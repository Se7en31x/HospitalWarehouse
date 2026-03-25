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
import { RequisitionHeader } from "../../../types/requisition_type";

interface RequisitionDetailsModalProps {
  isOpen: boolean;
  requisition: RequisitionHeader | null;
  onClose: () => void;
  onSuccess: () => void;
  displayDeptName: (req: any) => string;
  displayRequesterName?: (req: any) => string;
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

  // Initialize quantities when modal opens
  useEffect(() => {
    if (isOpen && requisition) {
      const initialQtys: Record<number, number> = {};
      requisition.requisition_item.forEach((item: any) => {
        initialQtys[item.id] = Math.min(item.req_qty, item.items?.current_stock || 0);
      });
      setIssuedQtys(initialQtys);
    }
  }, [isOpen, requisition]);

  const updateQty = (id: number, delta: number, maxStock: number, reqQty: number) => {
    setIssuedQtys(prev => {
      const current = prev[id] || 0;
      const next = current + delta;
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
        throw new Error(res.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
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
        throw new Error(res.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(errMsg, { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !requisition) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <PackageCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{requisition.doc_no}</h2>
              <p className="text-xs text-slate-500">ตรวจสอบและยืนยันจำนวนการจ่ายพัสดุ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Department Info */}
          <div className="grid grid-cols-2 gap-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-3">
              <User size={24} className="text-indigo-600" />
              <div>
                <p className="text-xs text-indigo-400 uppercase font-bold">ชื่อผู้ทำรายการ</p>
                <p className="text-2lg font-bold text-indigo-900">
                  {displayRequesterName ? displayRequesterName(requisition) : requisition.requester_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 size={24} className="text-indigo-600" />
              <div>
                <p className="text-xs text-indigo-400 uppercase font-bold">แผนกที่ร้องขอ</p>
                <p className="text-2lg font-bold text-indigo-900">{displayDeptName(requisition)}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-sm font-black text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-center w-[80px]">รูป</th>
                  <th className="px-6 py-4 text-left">รายการพัสดุ</th>
                  <th className="px-4 py-4 text-center w-[120px]">ยอดที่ขอ</th>
                  <th className="px-4 py-4 text-center w-[150px]">คงเหลือในคลัง</th>
                  <th className="px-6 py-4 text-right w-[240px]">อนุมัติจ่ายจริง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisition.requisition_item.map((row: any) => {
                  const currentIssued = issuedQtys[row.id] || 0;
                  const dbStock = row.items?.current_stock || 0;
                  const dbReq = row.req_qty || 0;

                  return (
                    <tr key={row.id} className="h-[80px]">
                      <td className="px-6 py-2">
                        <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          {row.items?.image_url ? (
                            <button
                              onClick={() => setPreviewImage({ url: row.items.image_url, name: row.items?.name || "รายการพัสดุ" })}
                              className="w-full h-full focus:outline-none"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={row.items.image_url} className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-zoom-in" alt={row.items?.name || "Item"} />
                            </button>
                          ) : (
                            <PackageCheck className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6">
                        <p className="font-bold text-slate-800">{row.items?.name}</p>
                        <p className="text-xs text-slate-400 font-mono italic">Code: {row.items?.code}</p>
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
                          <span className={`text-xs font-bold pr-1 ${dbStock - currentIssued < 5 ? 'text-rose-500' : 'text-slate-400'}`}>
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

        {/* Footer */}
        <div className="px-8 py-6 border-t bg-slate-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-500 bg-white border rounded-xl hover:bg-slate-50"
          >
            ปิดหน้าต่าง
          </button>
          <button
            onClick={handleReject}
            disabled={isLoading || requisition.status !== 'PENDING'}
            className="px-6 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50"
          >
            ปฏิเสธการเบิก
          </button>
          {requisition.status === 'PENDING' && (
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            <p className="text-center text-sm text-slate-600 mt-2 pb-1">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionDetailsModal;
