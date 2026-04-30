"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  X, FileText, Package,
  Loader2, Minus, Plus, CheckCircle, Clock, AlertCircle, ChevronDown, Eye,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getRequisitionById, verifyReturn } from "@/services/requisitionService";
import type { RequisitionHeader, RequisitionItem, IssuedUnit, PendingReturnItem } from "@/types/requisition_type";
import { fmtDate, fmtDateTime } from "@/utils/dateUtils";

const MySwal = withReactContent(Swal);
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseIdCardUrls = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean) as string[];
  } catch { /* not JSON */ }
  return [raw];
};

type UiStatus = "รอการคืน" | "คืนแล้ว" | "รออนุมัติ" | "รอตรวจรับคืน" | "ค้างคืน" | "ยกเลิก" | "ถูกปฏิเสธ";

const mapUiStatus = (header: RequisitionHeader): UiStatus => {
  if (header.status === "BORROWING") {
    if (header.due_date && new Date(header.due_date) < new Date()) return "ค้างคืน";
    return "รอการคืน";
  }
  if (header.status === "PENDING_RETURN_CHECK") return "รอตรวจรับคืน";
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
    case "รอตรวจรับคืน": return "bg-sky-50 text-sky-800 border-sky-200";
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
    case "รอตรวจรับคืน": return <Loader2 className="w-3 h-3 animate-spin" />;
    case "ยกเลิก":    return <X className="w-3 h-3" />;
    default:           return null;
  }
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

const conditionBadge = (condition: string) => {
  const opt = conditionOptions.find(o => o.value === condition);
  return opt
    ? <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${opt.color}`}>{opt.label}</span>
    : <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">{condition}</span>;
};

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

  // Build a map of submission data keyed by req_item_id
  const submissionMap = useMemo<Map<number, PendingReturnItem>>(() => {
    const items = header.pending_return_submission?.items ?? [];
    return new Map(items.map(i => [i.req_item_id, i]));
  }, [header.pending_return_submission]);

  // Modal state for return detail popup
  const [detailModal, setDetailModal] = useState<{ sub: PendingReturnItem; item: RequisitionItem } | null>(null);

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

  const idCardUrls = parseIdCardUrls(header.borrower_details?.id_card_url);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const overdue = getDaysOverdue(header);

  return (
    <div className="p-6 space-y-4">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-slate-800">{header.doc_no}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${getStatusBadgeColor(uiStatus)}`}>
                {getStatusIcon(uiStatus)}{uiStatus}
              </span>
              {overdue > 0 && (
                <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                  เกินกำหนด {overdue} วัน
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ทำรายการ {fmtDate(header.request_date)}
              {header.due_date && <> · กำหนดคืน <span className={overdue > 0 ? "text-red-500 font-semibold" : ""}>{fmtDate(header.due_date)}</span></>}
            </p>
          </div>
        </div>
        {canVerify && (
          <button
            onClick={handleVerifyReturn}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-60 flex-shrink-0"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            ยืนยันการรับคืน
          </button>
        )}
      </div>

      {/* ── Info row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Borrower card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ผู้ยืม</p>
          <div>
            <p className="font-bold text-slate-800">{getBorrowerDisplay(header)}</p>
            {ext && header.borrower_details?.id_card && (
              <p className="text-xs text-slate-500 font-mono">{header.borrower_details.id_card}</p>
            )}
            {!ext && (header.department_name || header.requester) && (
              <p className="text-xs text-slate-500">{header.department_name}{header.requester ? ` · ${header.requester}` : ""}</p>
            )}
          </div>
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {header.borrower_details?.phone && (
              <div className="flex gap-2 text-sm">
                <span className="text-slate-400 w-12 flex-shrink-0 text-xs pt-0.5">โทร</span>
                <span className="text-slate-700">{header.borrower_details.phone}</span>
              </div>
            )}
            {(header.borrower_details?.address || header.borrower_details?.province) && (
              <div className="flex gap-2 text-sm">
                <span className="text-slate-400 w-12 flex-shrink-0 text-xs pt-0.5">ที่อยู่</span>
                <span className="text-slate-600 text-xs leading-relaxed">
                  {[
                    header.borrower_details?.address,
                    header.borrower_details?.subdistrict ? `ต.${header.borrower_details.subdistrict}` : null,
                    header.borrower_details?.district ? `อ.${header.borrower_details.district}` : null,
                    header.borrower_details?.province ? `จ.${header.borrower_details.province}` : null,
                    header.borrower_details?.zipcode,
                  ].filter(Boolean).join(" ")}
                </span>
              </div>
            )}
            {(header.borrower_details?.notes || header.note) && (
              <div className="flex gap-2 text-sm">
                <span className="text-slate-400 w-12 flex-shrink-0 text-xs pt-0.5">หมายเหตุ</span>
                <span className="text-slate-600 text-xs">{header.borrower_details?.notes || header.note}</span>
              </div>
            )}
          </div>
          {canVerify && header.pending_return_submission?.submitted_by && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wide mb-0.5">ส่งคืนโดย</p>
              <p className="text-xs font-semibold text-sky-700">{header.pending_return_submission.submitted_by}</p>
              {header.pending_return_submission.submitted_at && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {fmtDateTime(header.pending_return_submission.submitted_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ID card images — only external borrowers */}
        {ext && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">รูปบัตรประชาชน</p>
            {idCardUrls.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {idCardUrls.map((url, i) => (
                  <button
                    key={i} type="button" onClick={() => setPreviewImg(url)}
                    className="relative rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-300 transition-colors group flex-shrink-0"
                    style={{ width: 200 }}
                  >
                    <img src={url} alt={`บัตรประชาชน ${i + 1}`} className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye size={22} className="text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-24 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                <p className="text-sm text-slate-300">ไม่มีรูปบัตรประชาชน</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Items table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Package size={14} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700">รายการพัสดุ</span>
          <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-bold ml-1">{header.items?.length || 0}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 w-8 text-center">#</th>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">รายการ</th>
                <th className="px-4 py-3 w-20 text-right">ยืม</th>
                <th className="px-4 py-3 w-20 text-right">จ่ายจริง</th>
                <th className="px-4 py-3 w-20 text-right">คืนแล้ว</th>
                <th className="px-4 py-3 w-24 text-right">ค้างคืน</th>
                {canReturn && (
                  <>
                    <th className="px-4 py-3 w-32 text-center">คืนครั้งนี้</th>
                    <th className="px-4 py-3 w-36 text-center">สภาพ</th>
                    <th className="px-4 py-3 w-36">หมายเหตุ</th>
                  </>
                )}
                {canVerify && <th className="px-4 py-3 w-28 text-center">รายละเอียด</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {canReturn ? (
                rows.map((row, idx) => {
                  if (row.max === 0) return null;
                  const img = header.items?.find(i => i.id === row.req_item_id)?.image_url;
                  return (
                    <tr key={row.req_item_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {img
                          ? <img src={img} alt={row.name} className="w-9 h-9 rounded-lg object-cover" />
                          : <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={14} className="text-slate-300" /></div>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 leading-tight">{row.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{row.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{header.items?.find(i => i.id === row.req_item_id)?.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600">{row.issued}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{row.returned}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-600">{row.max}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center bg-white rounded-lg border border-slate-200 focus-within:border-green-400">
                            <button type="button" onClick={() => adjustQty(idx, -1)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-l-lg hover:bg-slate-50">
                              <Minus size={11} strokeWidth={3} />
                            </button>
                            <input type="number" value={row.qty_returned} min={0} max={row.max}
                              onChange={e => updateRow(idx, { qty_returned: Math.max(0, Math.min(row.max, Number(e.target.value))) })}
                              className="w-8 bg-transparent text-center font-bold text-sm outline-none text-green-600" />
                            <button type="button" onClick={() => adjustQty(idx, 1)} className="p-1.5 text-green-500 hover:text-green-700 rounded-r-lg hover:bg-slate-50">
                              <Plus size={11} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button type="button" onClick={() => updateRow(idx, { isConditionOpen: !row.isConditionOpen })}
                            className="w-full flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white hover:border-slate-300 justify-between focus:outline-none focus:ring-1 focus:ring-green-400">
                            <span className="font-semibold text-slate-700">{conditionOptions.find(o => o.value === row.condition)?.label || "สภาพดี"}</span>
                            <ChevronDown size={12} className={`text-slate-400 transition-transform ${row.isConditionOpen ? "rotate-180" : ""}`} />
                          </button>
                          {row.isConditionOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30">
                              <ul className="py-1">
                                {conditionOptions.map(opt => (
                                  <li key={opt.value}>
                                    <button type="button" onClick={() => updateRow(idx, { condition: opt.value, isConditionOpen: false })}
                                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${row.condition === opt.value ? "bg-green-50 text-green-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}>
                                      {opt.label}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.note} onChange={e => updateRow(idx, { note: e.target.value })} placeholder="หมายเหตุ"
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400 bg-slate-50" />
                      </td>
                    </tr>
                  );
                })
              ) : (
                header.items.map((item, idx) => {
                  const pending = (item.issued || 0) - (item.returned || 0);
                  const sub = submissionMap.get(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-lg object-cover" />
                          : <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={14} className="text-slate-300" /></div>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 leading-tight">{item.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">{item.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{item.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600">{item.issued || 0}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{item.returned || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${pending > 0 ? "text-amber-600" : "text-slate-300"}`}>
                          {pending > 0 ? pending : "ครบ"}
                        </span>
                      </td>
                      {canVerify && (
                        <td className="px-4 py-3 text-center">
                          {sub
                            ? <button type="button" onClick={() => setDetailModal({ sub, item })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold hover:bg-indigo-100 transition-colors">
                                <Eye size={12} />รายละเอียด
                              </button>
                            : <span className="text-slate-300 text-xs">-</span>}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
              {(!header.items || header.items.length === 0) && (
                <tr>
                  <td colSpan={canReturn ? 10 : canVerify ? 8 : 7} className="py-16 text-center text-slate-400 text-sm">
                    ไม่พบรายการพัสดุ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image preview overlay */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImg(null)} className="absolute -top-10 right-0 text-white/60 hover:text-white">
              <X size={24} />
            </button>
            <img src={previewImg} alt="บัตรประชาชน" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {detailModal && (
        <ReturnDetailModal sub={detailModal.sub} item={detailModal.item} onClose={() => setDetailModal(null)} />
      )}
    </div>
  );
}

// ─── Return Detail Modal ──────────────────────────────────────────────────────

function ReturnDetailModal({
  sub,
  item,
  onClose,
}: {
  sub: PendingReturnItem;
  item: RequisitionItem;
  onClose: () => void;
}) {
  const isReusable = (item.itemType || "").toUpperCase() === "REUSABLE";

  // Build a map of unit_id → { unit_code, serial_no } from issued_units
  const issuedUnitMap = useMemo(() => {
    const map = new Map<string, IssuedUnit>();
    (item.issued_units ?? []).forEach(u => { if (u.id) map.set(u.id, u); });
    return map;
  }, [item.issued_units]);

  const unitRows = useMemo(() => {
    if (!sub.units || sub.units.length === 0) return [];
    return sub.units.map(u => {
      const info = issuedUnitMap.get(u.unit_id);
      return {
        unit_id: u.unit_id,
        unit_code: info?.unit_code ?? u.unit_code ?? null,
        serial_no: info?.serial_no ?? null,
        condition: u.condition ?? "GOOD",
        note: u.note ?? null,
      };
    });
  }, [sub.units, issuedUnitMap]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-400 font-medium">รายละเอียดการคืน</p>
            <p className="text-base font-bold text-slate-800">{item.name}</p>
            {item.code && <p className="text-xs font-mono text-slate-500">{item.code}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Summary row */}
        <div className="px-6 py-4 flex items-center gap-6 border-b border-slate-100 bg-slate-50">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">จำนวนคืน</p>
            <p className="text-2xl font-black text-indigo-600">{sub.qty_returned}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">สภาพ</p>
            {conditionBadge(sub.condition)}
          </div>
          {sub.note && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">หมายเหตุ</p>
              <p className="text-xs text-slate-600 truncate">{sub.note}</p>
            </div>
          )}
        </div>

        {/* Unit list for reusable */}
        {isReusable && (
          <div className="px-6 py-4 max-h-72 overflow-y-auto">
            {unitRows.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">ไม่มีข้อมูลครุภัณฑ์</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-slate-500 mb-1">รายการครุภัณฑ์ที่คืน</p>
                {unitRows.map((u, i) => (
                  <div key={u.unit_id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-slate-800">{u.unit_code ?? u.unit_id}</p>
                        {u.serial_no && <p className="text-[10px] text-slate-400">{u.serial_no}</p>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {conditionBadge(u.condition)}
                      {u.note && <p className="text-[10px] text-slate-400 mt-0.5 text-right">{u.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
