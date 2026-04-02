"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, Clock, X, Building2, User, Eye, FileText, MapPin, Phone,
  Calendar, Package, Loader2, Minus, Plus,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getAllRequisitions, getRequisitionById, processReturn, ReturnItemPayload } from "@/services/requisitionService";
import type { RequisitionHeader } from "@/types/requisition_type";

const MySwal = withReactContent(Swal);
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UiStatus = "รอการคืน" | "คืนแล้ว" | "รออนุมัติ" | "ค้างคืน" | "ยกเลิก" | "ถูกปฏิเสธ";

const mapUiStatus = (header: RequisitionHeader): UiStatus => {
  if (header.status === "BORROWING") {
    if (header.due_date && new Date(header.due_date) < new Date()) return "ค้างคืน";
    return "รอการคืน";
  }
  if (header.status === "COMPLETED") return "คืนแล้ว";
  if (header.status === "PENDING") return "รออนุมัติ";
  if (header.status === "CANCELLED") return "ยกเลิก";
  if (header.status === "REJECTED") return "ถูกปฏิเสธ";
  return "รออนุมัติ";
};

const getDaysOverdue = (header: RequisitionHeader): number => {
  if (!header.due_date || header.status !== "BORROWING") return 0;
  const due = new Date(header.due_date);
  const today = new Date();
  if (due >= today) return 0;
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
};

const isExternal = (header: RequisitionHeader): boolean =>
  !!header.borrower_details;

const getBorrowerDisplay = (header: RequisitionHeader): string => {
  if (header.borrower_details) return header.borrower_details.fullname || "บุคคลภายนอก";
  return header.requester || "ไม่ระบุ";
};

const getStatusBadgeColor = (status: UiStatus) => {
  switch (status) {
    case "รอการคืน":  return "bg-amber-50 text-amber-700 border-amber-200";
    case "ค้างคืน":   return "bg-red-50 text-red-700 border-red-200";
    case "คืนแล้ว":   return "bg-green-50 text-green-700 border-green-200";
    case "รออนุมัติ": return "bg-blue-50 text-blue-700 border-blue-200";
    case "ยกเลิก":    return "bg-gray-50 text-gray-600 border-gray-200";
    case "ถูกปฏิเสธ": return "bg-rose-50 text-rose-700 border-rose-200";
    default:           return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const getStatusIcon = (status: UiStatus) => {
  switch (status) {
    case "รอการคืน":  return <Clock className="w-3 h-3" />;
    case "ค้างคืน":   return <AlertCircle className="w-3 h-3" />;
    case "คืนแล้ว":   return <CheckCircle className="w-3 h-3" />;
    case "รออนุมัติ": return <Loader2 className="w-3 h-3 animate-spin" />;
    case "ยกเลิก":    return <X className="w-3 h-3" />;
    default:           return null;
  }
};

const fmtDate = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  header,
  onClose,
  onReturn,
}: {
  header: RequisitionHeader;
  onClose: () => void;
  onReturn?: (h: RequisitionHeader) => void;
}) {
  const ext = isExternal(header);
  const uiStatus = mapUiStatus(header);
  const canReturn = header.status === "BORROWING";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between flex-shrink-0 ${ext ? "bg-emerald-600" : "bg-indigo-600"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              {ext ? <User className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-white font-bold text-sm">รายละเอียดการยืม — {header.doc_no}</p>
              <p className="text-white/70 text-xs">{ext ? "ยืมสำหรับบุคคลภายนอก" : "ยืมภายในแผนก"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Type Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${ext ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
            {ext ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            {ext ? "บุคคลภายนอก" : `แผนก ID: ${header.department_id}`}
          </div>

          {/* Borrower Info */}
          {ext && header.borrower_details ? (
            <>
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">เจ้าหน้าที่ผู้ทำรายการ</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-indigo-800 text-sm">{header.requester}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-700">ข้อมูลผู้ยืม (บุคคลภายนอก)</span>
                </div>
                <div className="p-4 space-y-2">
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="ชื่อ-นามสกุล" value={header.borrower_details.fullname} />
                  {header.borrower_details.phone && (
                    <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="เบอร์โทร" value={header.borrower_details.phone} />
                  )}
                  {header.borrower_details.address && (
                    <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="ที่อยู่" value={header.borrower_details.address} />
                  )}
                  {header.borrower_details.notes && (
                    <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="หมายเหตุ" value={header.borrower_details.notes} highlight />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-gray-700">ข้อมูลผู้ยืม</span>
              </div>
              <div className="p-4 space-y-2">
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="ผู้ทำรายการ" value={header.requester || "-"} />
                <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="แผนก ID" value={String(header.department_id || "-")} />
              </div>
            </div>
          )}

          {/* Items Table */}
          {header.items && header.items.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <Package className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-bold text-gray-700">รายการพัสดุที่ยืมไป</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-[80px] text-center">รูป</th>
                      <th className="px-4 py-3">รายการพัสดุ</th>
                      <th className="px-4 py-3 w-[100px] text-center">จำนวนยืม</th>
                      <th className="px-4 py-3 w-[100px] text-center">จ่ายจริง</th>
                      <th className="px-4 py-3 w-[100px] text-center">คืนแล้ว</th>
                      <th className="px-4 py-3 w-[110px] text-center">คงค้าง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {header.items.map((item) => {
                      const pending = (item.issued || 0) - (item.returned || 0);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover mx-auto" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{item.code}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-600">{item.qty}</td>
                          <td className="px-4 py-3 text-center font-semibold text-indigo-600">{item.issued || 0}</td>
                          <td className="px-4 py-3 text-center font-semibold text-green-600">{item.returned || 0}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-sm ${pending > 0 ? "text-amber-600" : "text-slate-400"}`}>
                              {pending > 0 ? pending : "ครบแล้ว"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">วันที่</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              <MiniCell label="วันที่ทำรายการ" value={fmtDate(header.request_date)} />
              <MiniCell label="กำหนดคืน" value={fmtDate(header.due_date)} alert={getDaysOverdue(header) > 0} />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm text-gray-500 font-medium">สถานะ</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(uiStatus)}`}>
              {getStatusIcon(uiStatus)} {uiStatus}
            </span>
          </div>

          {header.note && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-800">
              <span className="font-bold">หมายเหตุ:</span> {header.note}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            ปิดหน้าต่าง
          </button>
          {onReturn && canReturn && (
            <button
              onClick={() => onReturn(header)}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              ทำรายการรับคืน
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Return Action Modal ──────────────────────────────────────────────────────

type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

interface ReturnRowState {
  req_item_id: number;
  qty_returned: number;
  condition: ReturnCondition;
  note: string;
  max: number;
  name: string;
  code: string;
  issued: number;
  returned: number;
}

const conditionOptions: { value: ReturnCondition; label: string; color: string }[] = [
  { value: "GOOD",       label: "สภาพดี",       color: "text-green-700 bg-green-50" },
  { value: "DAMAGED",    label: "ชำรุด/เสียหาย", color: "text-amber-700 bg-amber-50" },
  { value: "LOST",       label: "สูญหาย",       color: "text-red-700 bg-red-50" },
  { value: "INCOMPLETE", label: "คืนไม่ครบ",    color: "text-purple-700 bg-purple-50" },
];

function ReturnActionModal({
  header,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  header: RequisitionHeader;
  onClose: () => void;
  onConfirm: (rows: ReturnItemPayload[]) => void;
  isSubmitting: boolean;
}) {
  const returnable = useMemo<ReturnRowState[]>(() =>
    (header.items || [])
      .filter(item => (item.issued || 0) > (item.returned || 0))
      .map(item => ({
        req_item_id: item.id,
        qty_returned: (item.issued || 0) - (item.returned || 0),
        condition: "GOOD" as ReturnCondition,
        note: "",
        max: (item.issued || 0) - (item.returned || 0),
        name: item.name,
        code: item.code,
        issued: item.issued || 0,
        returned: item.returned || 0,
      })),
  [header.items]);

  const [rows, setRows] = useState<ReturnRowState[]>(returnable);

  const updateRow = (idx: number, patch: Partial<ReturnRowState>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const adjustQty = (idx: number, delta: number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const next = r.qty_returned + delta;
      if (next < 0 || next > r.max) return r;
      return { ...r, qty_returned: next };
    }));
  };

  const handleSubmit = () => {
    const payload: ReturnItemPayload[] = rows
      .filter(r => r.qty_returned > 0)
      .map(r => ({
        req_item_id: r.req_item_id,
        qty_returned: r.qty_returned,
        condition: r.condition,
        note: r.note || undefined,
      }));

    if (payload.length === 0) {
      MySwal.fire({ title: "กรุณาระบุจำนวนที่คืน", icon: "warning", timer: 2000, showConfirmButton: false });
      return;
    }
    onConfirm(payload);
  };

  const ext = isExternal(header);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-600 shadow-lg">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{header.doc_no}</h2>
              <p className="text-xs text-slate-500">บันทึกการรับคืนพัสดุ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Borrower summary */}
          <div className="grid grid-cols-2 gap-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-3">
              <User size={22} className="text-indigo-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-indigo-400 uppercase font-bold">ผู้ทำรายการ</p>
                <p className="font-bold text-indigo-900 text-sm">{header.requester || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {ext ? <User size={22} className="text-emerald-600 flex-shrink-0" /> : <Building2 size={22} className="text-indigo-600 flex-shrink-0" />}
              <div>
                <p className="text-xs text-indigo-400 uppercase font-bold">ผู้ยืม</p>
                <p className="font-bold text-indigo-900 text-sm">{getBorrowerDisplay(header)}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <CheckCircle className="w-10 h-10 text-green-300" />
              <p className="text-sm font-medium">คืนพัสดุครบทุกรายการแล้ว</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">รายการพัสดุ</th>
                    <th className="px-4 py-3 text-center w-[90px]">จ่ายจริง</th>
                    <th className="px-4 py-3 text-center w-[90px]">คืนแล้ว</th>
                    <th className="px-4 py-3 text-center w-[160px]">จำนวนที่คืนครั้งนี้</th>
                    <th className="px-4 py-3 text-center w-[170px]">สภาพ</th>
                    <th className="px-4 py-3 text-left w-[200px]">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <tr key={row.req_item_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 text-sm">{row.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{row.code}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-indigo-600">{row.issued}</td>
                      <td className="px-4 py-3 text-center font-semibold text-green-600">{row.returned}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-200 shadow-sm focus-within:border-green-500 transition-all">
                            <button type="button" onClick={() => adjustQty(idx, -1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500">
                              <Minus size={13} strokeWidth={3} />
                            </button>
                            <input
                              type="number"
                              value={row.qty_returned}
                              min={0}
                              max={row.max}
                              onChange={e => {
                                const v = Math.max(0, Math.min(row.max, Number(e.target.value)));
                                updateRow(idx, { qty_returned: v });
                              }}
                              className="w-12 bg-transparent text-center font-black text-base outline-none text-green-600"
                            />
                            <button type="button" onClick={() => adjustQty(idx, 1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-green-600">
                              <Plus size={13} strokeWidth={3} />
                            </button>
                          </div>
                          {row.max - row.qty_returned > 0 && (
                            <span className="text-[10px] text-amber-500 font-bold">ค้างอีก {row.max - row.qty_returned}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.condition}
                          onChange={e => updateRow(idx, { condition: e.target.value as ReturnCondition })}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        >
                          {conditionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${conditionOptions.find(o => o.value === row.condition)?.color}`}>
                          {conditionOptions.find(o => o.value === row.condition)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.note}
                          onChange={e => updateRow(idx, { note: e.target.value })}
                          placeholder="หมายเหตุ (ถ้ามี)"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Condition info */}
          <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
            <p><span className="font-bold text-green-700">สภาพดี</span> — จะนำพัสดุกลับเข้าสต็อกโดยอัตโนมัติ</p>
            <p><span className="font-bold text-amber-700">ชำรุด / คืนไม่ครบ</span> — บันทึกการคืนโดยไม่นำกลับเข้าสต็อก</p>
            <p><span className="font-bold text-red-700">สูญหาย</span> — บันทึกว่าสูญหาย ไม่นำกลับเข้าสต็อก</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t bg-slate-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 bg-white border rounded-xl hover:bg-slate-50 transition-colors">
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || rows.every(r => r.qty_returned === 0)}
            className="px-10 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            ยืนยันการรับคืน
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function InfoRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 flex-shrink-0 w-24">{label}</span>
      <span className={`font-medium flex-1 ${highlight ? "text-emerald-700" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}

function MiniCell({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${alert ? "text-red-600" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type StatusFilter = "ทั้งหมด" | "รอการคืน" | "ค้างคืน" | "คืนแล้ว" | "รออนุมัติ" | "ยกเลิก";
type TypeFilter = "ทั้งหมด" | "INTERNAL" | "EXTERNAL";

const STATUS_FILTER_OPTIONS: StatusFilter[] = ["ทั้งหมด", "รอการคืน", "ค้างคืน", "คืนแล้ว", "รออนุมัติ", "ยกเลิก"];
const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "ทั้งหมด",  label: "ทุกประเภท" },
  { value: "INTERNAL", label: "ยืมภายในแผนก" },
  { value: "EXTERNAL", label: "ยืมบุคคลภายนอก" },
];

export default function ReturnsClient() {
  const [records, setRecords] = useState<RequisitionHeader[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ทั้งหมด");
  const [selectedType, setSelectedType] = useState<TypeFilter>("ทั้งหมด");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingRecord, setViewingRecord] = useState<RequisitionHeader | null>(null);
  const [returningRecord, setReturningRecord] = useState<RequisitionHeader | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const fetchRecords = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await getAllRequisitions({ type: "BORROW", limit: 500 });
      if (result && result.success !== false) {
        let data: RequisitionHeader[] = [];
        if (Array.isArray(result.data)) {
          data = result.data;
        } else if (Array.isArray((result as unknown as { items: RequisitionHeader[] }).items)) {
          data = (result as unknown as { items: RequisitionHeader[] }).items;
        }
        // แสดงเฉพาะรายการที่ผ่านการอนุมัติแล้ว (COMPLETED = รอคืน, RETURNED = คืนแล้ว)
        setRecords(data.filter(r => r.status === "BORROWING" || r.status === "COMPLETED"));
      }
    } catch (err) {
      console.error("fetch borrows failed", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) fetchRecords();
  }, [isMounted, fetchRecords]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-status-dd]")) setIsStatusDropdownOpen(false);
      if (!target.closest("[data-type-dd]")) setIsTypeDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDetail = useCallback(async (id: number) => {
    setIsLoadingDetail(true);
    try {
      const res = await getRequisitionById(id);
      if (res.success && res.data) setViewingRecord(res.data);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const openReturn = useCallback(async (id: number) => {
    setIsLoadingDetail(true);
    try {
      const res = await getRequisitionById(id);
      if (res.success && res.data) setReturningRecord(res.data);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleConfirmReturn = useCallback(async (items: ReturnItemPayload[]) => {
    if (!returningRecord) return;
    setIsSubmitting(true);
    try {
      const result = await processReturn(returningRecord.id, items);
      if (!result.success) throw new Error(result.message);

      await MySwal.fire({
        title: "บันทึกสำเร็จ",
        text: "รับคืนพัสดุเรียบร้อยแล้ว",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      setReturningRecord(null);
      await fetchRecords();
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }, [returningRecord, fetchRecords]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter(r => {
      const uiStatus = mapUiStatus(r);
      const matchesSearch =
        r.doc_no.toLowerCase().includes(term) ||
        (r.requester || "").toLowerCase().includes(term) ||
        (r.borrower_details?.fullname || "").toLowerCase().includes(term);
      const matchesStatus = selectedStatus === "ทั้งหมด" || uiStatus === selectedStatus;
      const matchesType =
        selectedType === "ทั้งหมด"
          ? true
          : selectedType === "EXTERNAL"
          ? isExternal(r)
          : !isExternal(r);
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [records, searchTerm, selectedStatus, selectedType]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const displayRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">จัดการรับคืนพัสดุ</h2>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบและจัดการการคืนพัสดุจากใบยืม</p>
        </div>
        <button
          onClick={fetchRecords}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่ ชื่อผู้ยืม..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        {/* Type Dropdown */}
        <div className="relative" data-type-dd="">
          <button
            onClick={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsStatusDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">
              {TYPE_FILTER_OPTIONS.find(t => t.value === selectedType)?.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {TYPE_FILTER_OPTIONS.map(t => (
                  <li key={t.value}>
                    <button
                      onClick={() => { setSelectedType(t.value); setIsTypeDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedType === t.value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-status-dd="">
          <button
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsTypeDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">สถานะ: {selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {STATUS_FILTER_OPTIONS.map(s => (
                  <li key={s}>
                    <button
                      onClick={() => { setSelectedStatus(s); setIsStatusDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
        {(isFetching || isLoadingDetail) && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[150px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[120px]">ประเภท</th>
                <th className="px-6 py-4 w-[220px]">ผู้ยืม</th>
                <th className="px-6 py-4 w-[80px] text-center">รายการ</th>
                <th className="px-6 py-4 w-[120px]">กำหนดคืน</th>
                <th className="px-6 py-4 w-[120px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[110px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayRecords.map((r, idx) => {
                const uiStatus = mapUiStatus(r);
                const overdue = getDaysOverdue(r);
                const canReturn = r.status === "COMPLETED";
                const ext = isExternal(r);

                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-indigo-700">{r.doc_no}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${ext ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                        {ext ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {ext ? "ภายนอก" : "ภายใน"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800 text-sm truncate">{getBorrowerDisplay(r)}</div>
                      <div className="text-xs text-gray-400 truncate">{r.requester}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-600">{r.item_count ?? 0}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">{fmtDate(r.due_date)}</div>
                      {overdue > 0 && (
                        <div className="text-xs text-red-600 font-bold">ค้าง {overdue} วัน</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeColor(uiStatus)}`}>
                        {getStatusIcon(uiStatus)} {uiStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(r.id)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canReturn && (
                          <button
                            onClick={() => openReturn(r.id)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="รับคืนพัสดุ"
                          >
                            <RefreshCw className="w-3 h-3" />
                            คืน
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayRecords.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <Package className="w-12 h-12 text-slate-300" />
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
        <p className="text-sm text-slate-600">
          แสดง {displayRecords.length} จาก {filteredRecords.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {viewingRecord && (
        <DetailModal
          header={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onReturn={(h) => {
            setViewingRecord(null);
            setReturningRecord(h);
          }}
        />
      )}

      {/* Return Action Modal */}
      {returningRecord && (
        <ReturnActionModal
          header={returningRecord}
          onClose={() => setReturningRecord(null)}
          onConfirm={handleConfirmReturn}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
