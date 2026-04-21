"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  X, FileText, Package,
  Loader2, Minus, Plus, CheckCircle, Clock, AlertCircle, ChevronDown,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getRequisitionById, verifyReturn } from "@/services/requisitionService";
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
  if (header.status === "PENDING_RETURN_CHECK") return "รออนุมัติ";
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
  const bd = header.borrower_details;
  if (bd) return [bd.firstname, bd.lastname].filter(Boolean).join(" ") || "บุคคลภายนอก";
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

// ─── Return Condition ─────────────────────────────────────────────────────────

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
  isConditionOpen?: boolean;
}

const conditionOptions: { value: ReturnCondition; label: string; color: string }[] = [
  { value: "GOOD",       label: "สภาพดี",       color: "text-green-700 bg-green-50" },
  { value: "DAMAGED",    label: "ชำรุด/เสียหาย", color: "text-amber-700 bg-amber-50" },
  { value: "LOST",       label: "สูญหาย",       color: "text-red-700 bg-red-50" },
  { value: "INCOMPLETE", label: "คืนไม่ครบ",    color: "text-purple-700 bg-purple-50" },
];

interface ReturnDetailClientProps {
  returnId: string | number;
}

export default function ReturnDetailClient({ returnId }: ReturnDetailClientProps) {
  const router = useRouter();

  const [header, setHeader] = useState<RequisitionHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse ID robustly
  const parsedId = useMemo(() => {
    if (typeof returnId === "number" && Number.isFinite(returnId)) return returnId;
    if (typeof returnId === "string" && returnId.trim() !== "") {
      const n = Number(returnId);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }, [returnId]);

  useEffect(() => {
    if (!parsedId) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: "รหัสการยืมไม่ถูกต้อง",
        icon: "error",
      }).then(() => router.back());
      return;
    }

    const loadData = async () => {
      try {
        const res = await getRequisitionById(parsedId);
        if (res.success && res.data) {
          setHeader(res.data);
        } else {
          MySwal.fire({
            title: "ข้อผิดพลาด",
            text: "ไม่พบข้อมูลการยืม",
            icon: "error",
          }).then(() => router.back());
        }
      } catch (err) {
        MySwal.fire({
          title: "ข้อผิดพลาด",
          text: getErrorMessage(err),
          icon: "error",
        }).then(() => router.back());
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [parsedId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!header) {
    return null;
  }

  return <DetailContent header={header} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />;
}

// ─── Detail Content ──────────────────────────────────────────────────────────

function DetailContent({
  header,
  isSubmitting,
  setIsSubmitting,
}: {
  header: RequisitionHeader;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}) {
  const router = useRouter();
  const ext = isExternal(header);
  const uiStatus = mapUiStatus(header);
  const canReturn = header.status === "BORROWING";
  const canVerify = header.status === "PENDING_RETURN_CHECK";

  const returnable = useMemo<ReturnRowState[]>(() =>
    (header.items || [])
      .filter(item => (item.issued || 0) > (item.returned || 0))
      .map(item => ({
        req_item_id: item.id,
        qty_returned: 0,
        condition: "GOOD" as ReturnCondition,
        note: "",
        max: (item.issued || 0) - (item.returned || 0),
        name: item.name,
        code: item.code,
        issued: item.issued || 0,
        returned: item.returned || 0,
      })),
    [header.items],
  );

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

  const handleVerifyReturn = async () => {
    const confirmed = await MySwal.fire({
      title: "ยืนยันการรับคืน",
      text: `ยืนยันการรับคืนเอกสาร ${header.doc_no} ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirmed.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const result = await verifyReturn(header.id);
      if (!result.success) throw new Error(result.message);

      await MySwal.fire({
        title: "สำเร็จ",
        text: "ยืนยันการรับคืนเรียบร้อย",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      router.back();
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">รายละเอียดการยืม</h2>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
        >
          ย้อนกลับ
        </button>
      </div>

      <div className="space-y-6 flex-1">
        {/* Document Info */}
        <section className="rounded-lg bg-white border border-slate-300 p-6">
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">ข้อมูลการยืม</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-slate-500">หมายเลขการยืม</p>
              <p className="font-mono text-base font-semibold text-slate-800">{header.doc_no}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ประเภท</p>
              <p className="text-base font-medium text-slate-800">{ext ? "บุคคลภายนอก" : "ภายในแผนก"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">สถานะ</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold items-center ${getStatusBadgeColor(uiStatus)}`}>
                {uiStatus}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">วันที่ทำรายการ</p>
              <p className="text-base text-slate-800">{fmtDate(header.request_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">กำหนดคืน</p>
              <p className={`text-base font-medium ${getDaysOverdue(header) > 0 ? "text-red-600" : "text-slate-800"}`}>
                {fmtDate(header.due_date)}
              </p>
            </div>
          </div>
        </section>

        {/* Borrower Info */}
        <section className="rounded-lg bg-white border border-slate-300 p-6">
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">ข้อมูลผู้ยืม</h2>
          </div>

          <div className="space-y-5">
            {/* Row 1: ชื่อผู้ยืม, เบอร์โทร, ที่อยู่ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">ชื่อผู้ยืม</p>
                <p className="text-base text-slate-800">{getBorrowerDisplay(header)}</p>
              </div>

              {header.borrower_details?.phone && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">เบอร์โทร</p>
                  <p className="text-base text-slate-800">{header.borrower_details.phone}</p>
                </div>
              )}

              {header.borrower_details?.address && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">ที่อยู่</p>
                  <p className="text-base text-slate-800">
                    {header.borrower_details.address}
                    {header.borrower_details.subdistrict && `, ${header.borrower_details.subdistrict}`}
                    {header.borrower_details.district && ` อำเภอ${header.borrower_details.district}`}
                    {header.borrower_details.province && `, จังหวัด${header.borrower_details.province}`}
                    {header.borrower_details.zipcode && `, ${header.borrower_details.zipcode}`}
                  </p>
                </div>
              )}
            </div>

            {/* หมายเหตุ */}
            {header.borrower_details?.notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
                <p className="text-base text-slate-800">{header.borrower_details.notes}</p>
              </div>
            )}
            {header.note && !header.borrower_details?.notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
                <p className="text-base text-slate-800">{header.note}</p>
              </div>
            )}
          </div>
        </section>

        {/* Items Table */}
        <section className="rounded-lg bg-white border border-slate-300 p-6 overflow-hidden flex flex-col" style={{ height: "400px" }}>
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">รายการพัสดุ ({header.items?.length || 0} รายการ)</h2>
          </div>

          <div
            className="flex-1 border border-slate-200 rounded-lg overflow-hidden"
            style={{
              overflowX: "auto",
              overflowY: "auto",
              scrollbarWidth: "auto",
              msOverflowStyle: "auto",
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
            <table className="w-full text-base text-left table-fixed">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10 tracking-wide text-sm">
                <tr>
                  <th className="px-6 py-5 w-[60px] text-center">#</th>
                  <th className="px-6 py-5 w-[70px] text-center">รูป</th>
                  <th className="px-6 py-5 w-[140px]">รหัสพัสดุ</th>
                  <th className="px-6 py-5 w-[200px]">รายการพัสดุ</th>
                  <th className="px-6 py-5 w-[120px]">จำนวนยืม</th>
                  <th className="px-6 py-5 w-[120px]">จ่ายจริง</th>
                  <th className="px-6 py-5 w-[120px]">คืนแล้ว</th>
                  <th className="px-6 py-5 w-[70px]">สถานะ</th>
                  {canReturn && (
                    <>
                      <th className="px-6 py-5 w-[110px] text-center">คืนครั้งนี้</th>
                      <th className="px-6 py-5 w-[200px] text-center">สภาพ</th>
                      <th className="px-6 py-5 w-[140px]">หมายเหตุ</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {canReturn ? (
                  rows.map((row, idx) => {
                    if (row.max === 0) return null;
                    return (
                      <tr key={row.req_item_id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 w-[50px] text-center text-slate-500 font-medium text-sm">{idx + 1}</td>
                        <td className="px-6 py-5 w-[70px]">
                          {header.items?.find(i => i.id === row.req_item_id)?.image_url ? (
                            <img src={header.items.find(i => i.id === row.req_item_id)?.image_url || ""} alt={row.name} className="w-16 h-16 rounded-lg object-cover mx-auto" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center mx-auto">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 w-[140px]">
                          <p className="text-xs text-black font-mono">{row.code}</p>
                        </td>
                        <td className="px-6 py-5 w-[200px]">
                          <p className="text-slate-800 text-sm">{row.name}</p>
                        </td>
                        <td className="px-6 py-5 w-[80px] font-medium text-slate-600 text-base">{header.items?.find(i => i.id === row.req_item_id)?.qty}</td>
                        <td className="px-6 py-5 w-[90px] font-medium text-indigo-600 text-base">{row.issued}</td>
                        <td className="px-6 py-5 w-[80px] font-medium text-green-600 text-base">{row.returned}</td>
                        <td className="px-6 py-5 w-[70px]">
                          <span className={`font-bold text-sm ${row.max > 0 ? "text-amber-600" : "text-slate-400"}`}>
                            {row.max}
                          </span>
                        </td>
                        <td className="px-6 py-5 w-[110px]">
                          <div className="flex items-center justify-center">
                            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm focus-within:border-green-500">
                              <button type="button" onClick={() => adjustQty(idx, -1)} className="p-1 hover:bg-slate-50 rounded text-slate-500">
                                <Minus size={12} strokeWidth={3} />
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
                                className="w-9 bg-transparent text-center font-bold text-sm outline-none text-green-600"
                              />
                              <button type="button" onClick={() => adjustQty(idx, 1)} className="p-1 hover:bg-slate-50 rounded text-green-600">
                                <Plus size={12} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 w-[110px]">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => updateRow(idx, { isConditionOpen: !row.isConditionOpen })}
                              className="w-full flex items-center gap-2 border border-slate-200 rounded px-3 py-2.5 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm justify-between focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                              <span className="font-semibold text-slate-800">
                                {conditionOptions.find(opt => opt.value === row.condition)?.label || 'สภาพดี'}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${row.isConditionOpen ? "rotate-180" : ""}`} />
                            </button>
                            {row.isConditionOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
                                <ul className="py-1">
                                  {conditionOptions.map(opt => (
                                    <li key={opt.value}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateRow(idx, { condition: opt.value, isConditionOpen: false });
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                          row.condition === opt.value 
                                            ? "bg-green-50 text-green-700 font-medium" 
                                            : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="text"
                            value={row.note}
                            onChange={e => updateRow(idx, { note: e.target.value })}
                            placeholder="หมายเหตุ"
                            className="w-full border border-slate-200 rounded px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-slate-50"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  header.items.map((item, idx) => {
                    const pending = (item.issued || 0) - (item.returned || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-5 w-[50px] text-center text-slate-500 font-medium text-sm">{idx + 1}</td>
                        <td className="px-6 py-5 w-[70px]">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover mx-auto" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 w-[140px]">
                          <p className="text-xs text-black font-mono">{item.code}</p>
                        </td>
                        <td className="px-6 py-5 w-[200px]">
                          <p className="text-slate-800 text-sm">{item.name}</p>
                        </td>
                        <td className="px-6 py-5 w-[80px] font-medium text-slate-600 text-base">{item.qty}</td>
                        <td className="px-6 py-5 w-[90px] font-medium text-indigo-600 text-base">{item.issued || 0}</td>
                        <td className="px-6 py-5 w-[80px] font-medium text-green-600 text-base">{item.returned || 0}</td>
                        <td className="px-6 py-5 w-[70px]">
                          <span className={`font-bold text-sm ${pending > 0 ? "text-amber-600" : "text-slate-400"}`}>
                            {pending > 0 ? pending : "ครบแล้ว"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {(!header.items || header.items.length === 0) && (
              <tbody>
                <tr>
                  <td colSpan={canReturn ? 10 : 7}>
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
                      <p className="text-base font-medium">ไม่พบรายการพัสดุ</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        {canVerify && (
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ปิด
            </button>
            <button
              onClick={handleVerifyReturn}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              ยืนยันการรับคืน
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
