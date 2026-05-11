"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  FileText,
  ScanLine,
  HelpCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import * as reusableSvc from "@/services/reusableUnitService";
import {
  REUSABLE_RETURN_STATUS_BADGES,
  getReturnRequestListStatusLabel,
  getReusableUnitStatusLabel,
  getReusableUnitConditionLabel,
  getReusableUnitStatusBadgeClasses,
  getReusableUnitConditionBadgeClasses,
} from "@/constants/labels";
import { fmtDateTime } from "@/utils/dateUtils";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import { ReturnAttachmentViewer } from "@/components/returns/ReturnAttachmentUploader";

// ─── Status Badge ─────────────────────────────────────────────────────────────

const getStatusBadgeColor = (status: string) => {
  const reusable = REUSABLE_RETURN_STATUS_BADGES[status];
  if (reusable) return `${reusable.bg} ${reusable.text} ${reusable.border}`;

  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-900 border-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    PENDING_RETURN_CHECK: "bg-sky-100 text-sky-800 border-sky-200",
    CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
    BORROWING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  };
  return map[status] || "bg-slate-100 text-slate-800 border-slate-200";
};

const getStatusLabel = (status: string) => getReturnRequestListStatusLabel(status);

const getStatusIcon = (status: string) => {
  switch (status) {
    case "REQUESTED":
      return <Clock className="w-3 h-3" />;
    case "PROCESSING":
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case "PENDING":
      return <Clock className="w-3 h-3" />;
    case "APPROVED":
      return <CheckCircle className="w-3 h-3" />;
    case "REJECTED":
      return <AlertCircle className="w-3 h-3" />;
    case "COMPLETED":
      return <CheckCircle className="w-3 h-3" />;
    case "PENDING_RETURN_CHECK":
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case "CANCELLED":
      return <AlertCircle className="w-3 h-3" />;
    case "BORROWING":
      return <Package className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

// ─── Field row (โทนเดียวกับ returnitem / BorrowerFieldRow) ───────────────────

function DetailFieldRow({
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
      <p
        className={`text-sm text-gray-600 whitespace-pre-wrap break-words ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

const displayOrDash = (v: string | null | undefined): string =>
  v != null && String(v).trim() !== "" ? String(v).trim() : "—";

type UnitRow = {
  unit_code: string;
  serial_no: string | null;
  status: string | null;
  condition: string | null;
  is_found?: boolean;
};

function buildUnitRows(item: reusableSvc.ReusableReturnRequestItem): UnitRow[] {
  if (item.requested_units?.length) {
    return item.requested_units.map((u) => ({
      unit_code: u.unit_code,
      serial_no: u.serial_no,
      status: u.status,
      condition: u.condition,
      is_found: u.is_found,
    }));
  }
  if (item.requested_unit_codes?.length) {
    return item.requested_unit_codes.map((code) => ({
      unit_code: code,
      serial_no: null,
      status: null,
      condition: null,
    }));
  }
  return [];
}

function unitCountForItem(item: reusableSvc.ReusableReturnRequestItem): number {
  const rows = buildUnitRows(item);
  if (rows.length > 0) return rows.length;
  return item.requested_qty ?? 0;
}

function UnitStatusChip({ code }: { code: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-normal break-words text-left leading-snug sm:whitespace-nowrap ${getReusableUnitStatusBadgeClasses(code)}`}
    >
      {getReusableUnitStatusLabel(code)}
    </span>
  );
}

function UnitConditionChip({ code }: { code: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-normal break-words text-left leading-snug sm:whitespace-nowrap ${getReusableUnitConditionBadgeClasses(code)}`}
    >
      {getReusableUnitConditionLabel(code)}
    </span>
  );
}

function RequestedUnitsModal({
  item,
  onClose,
}: {
  item: reusableSvc.ReusableReturnRequestItem;
  onClose: () => void;
}) {
  const rows = buildUnitRows(item);
  const title = item.item_name || "รายการ";
  const code = item.item_code || "—";
  const unitTotal = rows.length > 0 ? rows.length : item.requested_qty ?? 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 w-full max-w-3xl flex flex-col overflow-hidden max-h-[min(90vh,680px)] sm:max-h-[min(85vh,640px)] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="units-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex-shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-indigo-500 sm:top-5 sm:bottom-5" aria-hidden />
          <div className="flex gap-3 sm:gap-4 pl-3 sm:pl-4">
            <PageHeadingIconBox icon={ScanLine} tone="indigo" className="hidden sm:flex shrink-0" />
            <div className="min-w-0 flex-1 pr-10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600/90">
                ตรวจสอบหน่วยที่ขอคืน
              </p>
              <h2 id="units-modal-title" className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">
                {title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 shadow-sm">
                  {code}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100">
                  <Package className="h-3.5 w-3.5 opacity-80" />
                  {unitTotal} หน่วย
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-800 sm:right-4 sm:top-4"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {rows.length > 0 ? (
            <>
              <div className="hidden sm:block rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="whitespace-nowrap px-4 py-3 w-12">#</th>
                        <th className="whitespace-nowrap px-4 py-3">Unit Code</th>
                        <th className="whitespace-nowrap px-4 py-3">S/N</th>
                        <th className="whitespace-nowrap px-4 py-3">สถานะพัสดุ</th>
                        <th className="whitespace-nowrap px-4 py-3">สภาพ</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right">ตรวจพบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, i) => (
                        <tr
                          key={`${row.unit_code}-${i}`}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3 align-middle tabular-nums text-slate-400 text-xs font-medium">
                            {i + 1}
                          </td>
                          <td className="px-4 py-3 align-middle font-mono text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {row.unit_code}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-600 whitespace-nowrap text-sm">
                            {displayOrDash(row.serial_no)}
                          </td>
                          <td className="px-4 py-3 align-middle text-sm">
                            <UnitStatusChip code={row.status} />
                          </td>
                          <td className="px-4 py-3 align-middle text-sm">
                            <UnitConditionChip code={row.condition} />
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            {typeof row.is_found === "boolean" ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                                  row.is_found
                                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                                    : "bg-amber-50 text-amber-900 ring-amber-200/80"
                                }`}
                              >
                                {row.is_found ? (
                                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {row.is_found ? "พบในระบบ" : "ยังไม่พบ"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <ul className="sm:hidden space-y-3">
                {rows.map((row, i) => (
                  <li
                    key={`${row.unit_code}-${i}-m`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          หน่วยที่ {i + 1}
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 break-all">
                          {row.unit_code}
                        </p>
                      </div>
                      {typeof row.is_found === "boolean" ? (
                        <span
                          className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                            row.is_found
                              ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                              : "bg-amber-50 text-amber-900 ring-amber-200/80"
                          }`}
                        >
                          {row.is_found ? "พบ" : "ไม่พบ"}
                        </span>
                      ) : null}
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">S/N</dt>
                        <dd className="text-right font-medium text-slate-800 break-all">
                          {displayOrDash(row.serial_no)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">สถานะพัสดุ</dt>
                        <dd className="text-right">
                          <UnitStatusChip code={row.status} />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 shrink-0">สภาพ</dt>
                        <dd className="text-right">
                          <UnitConditionChip code={row.condition} />
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-800">ยังไม่มีรายการ Unit Code แยกรายตัว</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                ขณะนี้แสดงเฉพาะจำนวนรวมจากคำขอ หากระบบส่ง Unit Code มาครบ รายการจะแสดงที่นี่
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm">
                จำนวนที่แจ้งคืน:{" "}
                <span className="tabular-nums text-indigo-600">{item.requested_qty ?? 0}</span> หน่วย
              </p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[100px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnItemDetailClient() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [detail, setDetail] = useState<reusableSvc.ReusableReturnRequest | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [unitsModalItem, setUnitsModalItem] =
    useState<reusableSvc.ReusableReturnRequestItem | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    reusableSvc
      .getReusableReturnRequestById(Number(id))
      .then(setDetail)
      .catch(() => toast.error("โหลดรายละเอียดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#fafafa]">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!id || !detail) {
    return (
      <div className="flex flex-col min-h-screen bg-[#fafafa]">
        <div className="flex flex-1 items-center justify-center text-slate-500 text-sm font-medium">
          ไม่พบข้อมูล
        </div>
      </div>
    );
  }

  const itemCount = detail.items?.length ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <Toaster position="top-right" />
      {unitsModalItem ? (
        <RequestedUnitsModal item={unitsModalItem} onClose={() => setUnitsModalItem(null)} />
      ) : null}

      <div className="w-full px-6 py-6 flex flex-col flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <PageHeadingIconBox icon={FileText} tone="amber" className="shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 tracking-tight">
                รายละเอียดคำขอคืน
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">ดูรายละเอียดและติดตามสถานะคำขอคืนอุปกรณ์</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/request/return-requests")}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors self-start sm:self-auto shrink-0"
          >
            ย้อนกลับ
          </button>
        </div>

        <div className="space-y-4 flex-1">
          {/* ข้อมูลคำขอคืน */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-gray-900">ข้อมูลคำขอคืน</h2>
              <p className="text-xs text-slate-500 mt-0.5">ผู้ดำเนินเรื่อง: {displayOrDash(detail.requested_by_name ?? detail.requested_by)}</p>
            </div>
            <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5">
              <DetailFieldRow
                label="เลขที่คำขอ"
                value={detail.doc_no}
                valueClassName="font-mono font-medium text-slate-800"
              />
              <DetailFieldRow label="แผนก" value={displayOrDash(detail.department_name)} />
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">สถานะ</p>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold items-center gap-1 ${getStatusBadgeColor(detail.status)}`}>
                  {getStatusIcon(detail.status)}
                  {getStatusLabel(detail.status)}
                </span>
              </div>
              <DetailFieldRow label="วันที่สร้าง" value={fmtDateTime(detail.created_at)} />
              {(detail.requested_by_name || detail.requested_by) && (
                <DetailFieldRow label="ผู้แจ้งคำขอ" value={displayOrDash(detail.requested_by_name ?? detail.requested_by)} />
              )}
              {detail.preferred_pickup_at && (
                <DetailFieldRow label="วันเวลานัดรับของ" value={fmtDateTime(detail.preferred_pickup_at)} />
              )}
            </div>
            {detail.note && (
              <div className="px-5 py-4 border-t border-slate-100">
                <DetailFieldRow label="หมายเหตุ" value={detail.note} />
              </div>
            )}
          </section>

          {/* รายการครุภัณฑ์ */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-gray-900">รายการครุภัณฑ์</h2>
              <p className="text-xs text-slate-500 mt-0.5">ทั้งหมด {itemCount} รายการ</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "70px" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center text-sm font-bold text-slate-700 px-3 py-3">#</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-3 py-3">รูป</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-3 py-3">รหัส</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-3 py-3">รายการ</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-3 py-3">หมวดหมู่</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-3 py-3">จำนวน</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-3 py-3">ตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items ?? []).map((item, idx) => {
                    const nUnits = unitCountForItem(item);
                    return (
                      <tr
                        key={`${item.item_id}-${idx}`}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-3 text-center text-sm text-slate-400 align-middle">{idx + 1}</td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex justify-center">
                            {item.item_image_url ? (
                              <img
                                src={item.item_image_url}
                                alt={item.item_name || ""}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-300" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="font-mono text-sm font-medium text-slate-800 truncate block">{item.item_code || "—"}</span>
                        </td>
                        <td className="px-3 py-3 align-middle min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">{item.item_name || "—"}</p>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <span className="text-sm font-medium text-slate-600 line-clamp-2 break-words">{item.category_name || "—"}</span>
                        </td>
                        <td className="px-3 py-3 text-center align-middle">
                          <span className="inline-flex items-baseline gap-1 tabular-nums">
                            <span className="text-sm font-semibold text-blue-600">{item.requested_qty}</span>
                            {item.item_unit_name && (
                              <span className="text-xs font-medium text-slate-500">{item.item_unit_name}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle text-center">
                          {nUnits <= 0 ? (
                            <span className="text-sm text-slate-300">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUnitsModalItem(item)}
                              className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 shadow-sm transition-colors"
                              title={nUnits > 1 ? `ดูหน่วยทั้งหมด (${nUnits} หน่วย)` : "ดูหน่วย"}
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {itemCount === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-500">ไม่พบรายการ</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* เอกสาร/รูปที่แนบตอนสร้างคำขอคืน */}
          {(detail.submit_attachments?.length ?? 0) > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl px-5 py-4">
              <ReturnAttachmentViewer
                attachments={detail.submit_attachments ?? []}
                label="ภาพ/เอกสารที่แนบตอนส่งคำขอคืน"
              />
            </section>
          )}

          {/* เอกสาร/รูปจากคลังตอนตรวจรับ */}
          {(detail.process_attachments?.length ?? 0) > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl px-5 py-4">
              <ReturnAttachmentViewer
                attachments={detail.process_attachments ?? []}
                label="ภาพ/เอกสารจากคลัง (ตอนตรวจรับ)"
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
