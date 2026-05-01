"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  X, FileText, Package,
  Loader2, CheckCircle, Clock, Eye,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getRequisitionById, verifyReturn } from "@/services/requisitionService";
import type { RequisitionHeader, RequisitionItem, IssuedUnit, PendingReturnItem } from "@/types/requisition_type";
import { fmtDate } from "@/utils/dateUtils";

const MySwal = withReactContent(Swal);
const getErr = (e: unknown) => (e instanceof Error ? e.message : String(e));
const LOTTIE_SRC = "https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie";

const parseIdCardUrls = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean) as string[];
  } catch { /* not JSON */ }
  return [raw];
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

interface ReturnDetailClientProps {
  returnId: string | number;
}

// ─── Condition config ─────────────────────────────────────────────────────────

const CONDITIONS: { value: ReturnCondition; label: string; badge: string }[] = [
  { value: "GOOD",       label: "สภาพดี",       badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "DAMAGED",    label: "ชำรุด",         badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "LOST",       label: "สูญหาย",       badge: "bg-red-50 text-red-700 border-red-200" },
  { value: "INCOMPLETE", label: "ไม่ครบ",        badge: "bg-purple-50 text-purple-700 border-purple-200" },
];

const condLabel = (c: string) => CONDITIONS.find(o => o.value === c)?.label ?? c;
const condBadge = (c: string) => CONDITIONS.find(o => o.value === c)?.badge ?? "bg-slate-100 text-slate-600 border-slate-200";

// ─── Status helpers ───────────────────────────────────────────────────────────

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

const getStatusBadgeColor = (status: UiStatus) => {
  switch (status) {
    case "รอการคืน":     return "bg-amber-50 text-amber-700 border-amber-200";
    case "ค้างคืน":      return "bg-red-50 text-red-700 border-red-200";
    case "คืนแล้ว":      return "bg-green-50 text-green-700 border-green-200";
    case "รออนุมัติ":    return "bg-blue-50 text-blue-700 border-blue-200";
    case "รอตรวจรับคืน": return "bg-sky-50 text-sky-800 border-sky-200";
    case "ยกเลิก":       return "bg-gray-50 text-gray-600 border-gray-200";
    case "ถูกปฏิเสธ":    return "bg-rose-50 text-rose-700 border-rose-200";
    default:              return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const daysOverdue = (h: RequisitionHeader) => {
  if (!h.due_date || h.status !== "BORROWING") return 0;
  const diff = Date.now() - new Date(h.due_date).getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0;
};

// ─── Shared UI components ─────────────────────────────────────────────────────

function BorrowerFieldRow({
  label,
  value,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm font-bold text-gray-900 mb-1">{label}</p>
      <p className={`text-sm text-gray-600 whitespace-pre-wrap break-words ${valueClassName}`}>{value}</p>
    </div>
  );
}

const displayOrDash = (v: string | null | undefined): string =>
  v != null && String(v).trim() !== "" ? String(v).trim() : "—";

function ItemThumb({
  url,
  size = "md",
  onImageClick,
}: {
  url?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "60";
  onImageClick?: () => void;
}) {
  const cls =
    size === "xs" ? "w-8 h-8 rounded-md"
    : size === "sm" ? "w-10 h-10 rounded-lg"
    : size === "md" ? "w-12 h-12 rounded-xl"
    : size === "60" ? "w-[60px] h-[60px] rounded-xl"
    : "w-14 h-14 rounded-xl ring-2 ring-white shadow-md border border-slate-200/90";
  const iconCls = size === "xs" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : size === "60" ? "w-6 h-6" : "w-5 h-5";
  const baseBorder = size === "lg" ? "" : "border border-slate-100";
  const imgClass = `${cls} object-cover ${baseBorder} flex-shrink-0 block ${
    onImageClick ? "cursor-zoom-in hover:opacity-90 transition-opacity" : ""
  }`.replace(/\s+/g, " ").trim();

  if (url && onImageClick) {
    const round = size === "xs" ? "rounded-md" : size === "sm" ? "rounded-lg" : "rounded-xl";
    return (
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onImageClick(); }}
        className={`p-0 border-0 bg-transparent ${round} focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1`}
        aria-label="ดูรูปสินค้า"
      >
        <img src={url} alt="" className={imgClass} />
      </button>
    );
  }

  return url ? (
    <img src={url} alt="" className={`${cls} object-cover ${baseBorder} flex-shrink-0`} />
  ) : (
    <div className={`${cls} ${size === "lg" ? "bg-white" : "bg-slate-50"} ${baseBorder || "border border-slate-100"} flex items-center justify-center flex-shrink-0`}>
      <Package className={`${iconCls} text-slate-300`} />
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function ReturnDetailClient({ returnId }: ReturnDetailClientProps) {
  const router = useRouter();

  const [header, setHeader] = useState<RequisitionHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      MySwal.fire({ title: "ข้อผิดพลาด", text: "รหัสการยืมไม่ถูกต้อง", icon: "error" }).then(() => router.back());
      return;
    }
    const loadData = async () => {
      try {
        const res = await getRequisitionById(parsedId);
        if (res.success && res.data) {
          setHeader(res.data);
        } else {
          MySwal.fire({ title: "ข้อผิดพลาด", text: "ไม่พบข้อมูลการยืม", icon: "error" }).then(() => router.back());
        }
      } catch (err) {
        MySwal.fire({ title: "ข้อผิดพลาด", text: getErr(err), icon: "error" }).then(() => router.back());
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [parsedId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-[#fafafa] p-3 sm:p-4 md:p-6">
        <DotLottieReact src={LOTTIE_SRC} loop autoplay style={{ width: 160, height: 160 }} />
      </div>
    );
  }

  if (!header) return null;

  return <DetailContent header={header} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />;
}

// ─── Detail Content ───────────────────────────────────────────────────────────

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
  const uiStatus = mapUiStatus(header);
  const overdue = daysOverdue(header);
  const canVerify = header.status === "PENDING_RETURN_CHECK";
  const ext = !!header.borrower_details;
  const bd = header.borrower_details;

  const [attachmentLightbox, setAttachmentLightbox] = useState<{ url: string; name: string } | null>(null);
  const [detailModal, setDetailModal] = useState<{ sub: PendingReturnItem; item: RequisitionItem } | null>(null);

  const borrowerName = bd
    ? [bd.firstname, bd.lastname].filter(Boolean).join(" ") || "บุคคลภายนอก"
    : header.requester || "ไม่ระบุ";

  const borrowerNameWithTitle = useMemo(() => {
    if (!bd) return null;
    const fromLookup = bd.lookup_titles?.short_name?.trim() || bd.lookup_titles?.name?.trim() || null;
    const prefix = fromLookup || bd.title_code?.trim() || null;
    const rest = [bd.firstname?.trim(), bd.lastname?.trim()].filter(Boolean).join(" ");
    return [prefix, rest].filter(Boolean).join(" ").trim() || borrowerName;
  }, [bd, borrowerName]);

  const borrowerAddressLine = useMemo(() => {
    if (!bd) return null;
    const parts: string[] = [];
    if (bd.address?.trim()) parts.push(bd.address.trim());
    if (bd.subdistrict?.trim()) parts.push(`ต.${bd.subdistrict.trim()}`);
    if (bd.district?.trim()) parts.push(`อ.${bd.district.trim()}`);
    if (bd.province?.trim()) parts.push(`จ.${bd.province.trim()}`);
    if (bd.zipcode?.trim()) parts.push(bd.zipcode.trim());
    return parts.length ? parts.join(" ") : null;
  }, [bd]);

  const attachmentThumbs = useMemo((): Array<{ url: string; filename?: string; name?: string }> => {
    const fromHeader = (header.attachments ?? []).filter(
      (a): a is { url: string; filename?: string; name?: string } => Boolean(a?.url)
    );
    const idUrls = parseIdCardUrls(bd?.id_card_url);
    const fromBorrower = idUrls
      .map((url, i) => ({ url, filename: i === 0 ? "บัตรประชาชน" : `เอกสารแนบ ${i + 1}` }))
      .filter(e => !fromHeader.some(a => a.url === e.url));
    return [...fromBorrower, ...fromHeader];
  }, [header.attachments, bd?.id_card_url]);

  const submissionMap = useMemo<Map<number, PendingReturnItem>>(() => {
    const items = header.pending_return_submission?.items ?? [];
    return new Map(items.map(i => [i.req_item_id, i]));
  }, [header.pending_return_submission]);

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
      await MySwal.fire({ title: "สำเร็จ", text: "ยืนยันการรับคืนเรียบร้อย", icon: "success", timer: 2000, showConfirmButton: false });
      router.back();
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErr(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <div className="w-full px-6 py-6 flex flex-col flex-1">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-600 rounded-lg shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 tracking-tight">
                รายละเอียดการรับคืน
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">ตรวจสอบและบันทึกผลการรับคืนพัสดุจากผู้ยืม</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>

        <div className="space-y-4 flex-1">

          {/* ── ข้อมูลเอกสาร + ข้อมูลผู้ยืม (2 คอลัมน์) ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* ข้อมูลเอกสาร */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">ข้อมูลเอกสาร</h2>
                <p className="text-xs text-slate-500 mt-0.5">ผู้ดำเนินเรื่อง</p>
              </div>
              <div className="px-5 py-5 flex-1 grid grid-cols-2 gap-x-6 gap-y-5">
                <BorrowerFieldRow label="เลขที่เอกสาร" value={header.doc_no} valueClassName="font-mono font-medium" />
                <BorrowerFieldRow label="แผนก" value={displayOrDash(header.department_name ?? (header.department_id ? `แผนก ${header.department_id}` : null))} />
                <BorrowerFieldRow label="ผู้ทำคำขอ" value={displayOrDash(header.requester)} />
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">สถานะ</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${getStatusBadgeColor(uiStatus)}`}>
                      {uiStatus}
                    </span>
                    {overdue > 0 && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                        เกิน {overdue} วัน
                      </span>
                    )}
                  </div>
                </div>
                <BorrowerFieldRow label="วันที่ยืม" value={fmtDate(header.request_date)} />
                <BorrowerFieldRow
                  label="กำหนดคืน"
                  value={fmtDate(header.due_date)}
                  valueClassName={overdue > 0 ? "text-red-600 font-medium" : ""}
                />
              </div>
              {header.note && (
                <div className="px-5 py-4 border-t border-slate-100">
                  <BorrowerFieldRow label="หมายเหตุ (เอกสาร)" value={header.note} />
                </div>
              )}
            </section>

            {/* ข้อมูลผู้ยืม + เอกสารแนบ */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">ข้อมูลผู้ยืม</h2>
                <p className="text-xs text-slate-500 mt-0.5">{ext ? "บุคคลภายนอก" : "ผู้ยืมภายในองค์กร"}</p>
              </div>
              <div className="px-5 py-5 flex-1 flex flex-col gap-5">
                {ext && bd ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <BorrowerFieldRow label="ชื่อ-นามสกุล" value={displayOrDash(borrowerNameWithTitle)} />
                    <BorrowerFieldRow label="บัตรประชาชน" value={displayOrDash(bd.id_card)} valueClassName="font-mono tracking-wide" />
                    <BorrowerFieldRow label="เบอร์โทรศัพท์" value={displayOrDash(bd.phone)} />
                    <BorrowerFieldRow label="ที่อยู่" value={displayOrDash(borrowerAddressLine)} />
                    {bd.notes && <BorrowerFieldRow label="หมายเหตุ" value={displayOrDash(bd.notes)} className="col-span-2" />}
                  </div>
                ) : (
                  <BorrowerFieldRow label="ชื่อผู้ยืม (พนักงาน)" value={displayOrDash(header.requester)} />
                )}

                {attachmentThumbs.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-sm font-bold text-gray-900 mb-3">
                      เอกสารแนบ
                      <span className="ml-2 text-xs font-normal text-slate-400">{attachmentThumbs.length} ไฟล์</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {attachmentThumbs.map((att, i) => {
                        const fname = att.filename || att.name || `ไฟล์ ${i + 1}`;
                        const isImg = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(att.url) || att.url.includes("image");
                        const wrapClass = "flex flex-col w-[90px] shrink-0 group";
                        const thumbBoxClass = "aspect-square rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center group-hover:border-blue-300 transition-colors";

                        if (isImg) {
                          return (
                            <div key={`${att.url}-${i}`} className={wrapClass}>
                              <button
                                type="button"
                                aria-label={`ขยายรูป ${fname}`}
                                onClick={() => setAttachmentLightbox({ url: att.url, name: fname })}
                                className="w-full text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                              >
                                <div className={thumbBoxClass}>
                                  <img src={att.url} alt={fname} className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-zoom-in" />
                                </div>
                              </button>
                              <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 break-all text-center leading-tight" title={fname}>{fname}</p>
                            </div>
                          );
                        }
                        return (
                          <a key={`${att.url}-${i}`} href={att.url} target="_blank" rel="noopener noreferrer" className={wrapClass}>
                            <div className={thumbBoxClass}>
                              <FileText className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 break-all text-center leading-tight" title={fname}>{fname}</p>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* ── รายการพัสดุ ──────────────────────────────────────────────── */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-gray-900">รายการพัสดุ</h2>
              <p className="text-xs text-slate-500 mt-0.5">{header.items?.length || 0} รายการ</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "140px" }} />
                  <col style={{ width: "140px" }} />
                  <col style={{ width: "400px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "90px" }} />
                  {canVerify && <col style={{ width: "120px" }} />}
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4">รูป</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4 whitespace-nowrap">รหัสรายการ</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4">ชื่อพัสดุ</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4 whitespace-nowrap">ยืม</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4 whitespace-nowrap">จ่ายจริง</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4 whitespace-nowrap">คืนแล้ว</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4 whitespace-nowrap">ค้างคืน</th>
                    {canVerify && (
                      <th className="text-center text-sm font-bold text-slate-700 px-4 py-4 whitespace-nowrap">รายละเอียดคืน</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(header.items || []).map(item => {
                    const pending = (item.issued || 0) - (item.returned || 0);
                    const sub = submissionMap.get(item.id);
                    return (
                      <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors" style={{ height: "64px" }}>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex justify-center">
                            <ItemThumb
                              url={item.image_url}
                              size="60"
                              onImageClick={item.image_url ? () => setAttachmentLightbox({ url: item.image_url!, name: item.name }) : undefined}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className="font-mono text-sm font-medium text-slate-800 truncate block">{item.code || "—"}</span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">{item.name}</p>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span className="text-sm font-medium text-slate-600">{item.qty}</span>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span className="text-sm font-semibold text-indigo-600">{item.issued || 0}</span>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span className="text-sm font-semibold text-emerald-600">{item.returned || 0}</span>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          <span className={`text-sm font-bold ${pending > 0 ? "text-amber-600" : "text-slate-300"}`}>
                            {pending > 0 ? pending : "ครบ"}
                          </span>
                        </td>
                        {canVerify && (
                          <td className="px-4 py-4 align-middle text-center">
                            {sub
                              ? (
                                <button
                                  type="button"
                                  onClick={() => setDetailModal({ sub, item })}
                                  className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 shadow-sm transition-colors"
                                  title="รายละเอียด"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                              )
                              : <span className="text-slate-300 text-sm">—</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {(!header.items || header.items.length === 0) && (
                    <tr>
                      <td colSpan={canVerify ? 8 : 7} className="px-6 py-14 text-center">
                        <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">ไม่พบรายการพัสดุ</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Action bar ──────────────────────────────────────────────── */}
          {canVerify && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-sky-800">รอตรวจรับคืน</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ผู้ยืมส่งคืนแล้ว ตรวจสอบรายละเอียดและกดยืนยันเพื่อรับสินค้าเข้าคลัง
                  </p>
                </div>
              </div>
              <button
                onClick={handleVerifyReturn}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 w-full sm:w-auto shrink-0"
              >
                {isSubmitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                ยืนยันการรับคืน
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ─ Lightbox ─ */}
      {attachmentLightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setAttachmentLightbox(null)}
          role="presentation"
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl p-2 max-w-[min(90vw,520px)]"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="ดูภาพเอกสารแนบ"
          >
            <button
              type="button"
              onClick={() => setAttachmentLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-lg shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={attachmentLightbox.url}
              alt={attachmentLightbox.name}
              className="w-[min(90vw,480px)] h-[min(70vh,400px)] object-contain rounded-lg mx-auto block"
            />
            <p className="text-center text-sm text-slate-600 mt-2 pb-1 px-2 truncate" title={attachmentLightbox.name}>
              {attachmentLightbox.name}
            </p>
          </div>
        </div>
      )}

      {/* ─ Return Detail Modal ─ */}
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — รูป + ข้อมูล + summary */}
        <div className="flex items-start gap-5 px-6 py-5 border-b border-slate-100">
          {/* รูปสินค้า */}
          <div className="flex-shrink-0">
            <ItemThumb url={item.image_url} size="60" />
          </div>

          {/* ชื่อ + รหัส + จำนวน + สภาพ */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 font-medium mb-0.5">รายละเอียดการคืน</p>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{item.name}</h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5 mb-3">{item.code || "—"}</p>

            <div className="flex items-center gap-5">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">จำนวนคืน</p>
                <p className="text-2xl font-black text-indigo-600 leading-none">{sub.qty_returned}</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">สภาพโดยรวม</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${condBadge(sub.condition)}`}>
                  {condLabel(sub.condition)}
                </span>
              </div>
              {sub.note && (
                <>
                  <div className="w-px h-8 bg-slate-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">หมายเหตุ</p>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{sub.note}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ปุ่มปิด */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reusable unit list */}
        {isReusable && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {unitRows.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">ไม่มีข้อมูลครุภัณฑ์</p>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-500 mb-3">รายการครุภัณฑ์ที่คืน ({unitRows.length} รายการ)</p>
                <div className="flex flex-col gap-2">
                  {unitRows.map((u, i) => (
                    <div key={u.unit_id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-mono font-semibold text-slate-800 truncate">{u.unit_code ?? u.unit_id}</p>
                          {u.serial_no && <p className="text-[11px] text-slate-400 mt-0.5">{u.serial_no}</p>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-3 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${condBadge(u.condition)}`}>
                          {condLabel(u.condition)}
                        </span>
                        {u.note && <p className="text-[11px] text-slate-400 mt-1">{u.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end flex-shrink-0">
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
