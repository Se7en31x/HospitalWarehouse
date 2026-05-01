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
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import * as reusableSvc from "@/services/reusableUnitService";
import { fmtDateTime } from "@/utils/dateUtils";

// ─── Status Badge ─────────────────────────────────────────────────────────────

const getStatusBadgeColor = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-900 border-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    PENDING_RETURN_CHECK: "bg-sky-100 text-sky-800 border-sky-200",
  };
  return map[status] || "bg-slate-100 text-slate-800 border-slate-200";
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "รออนุมัติ",
    APPROVED: "อนุมัติแล้ว",
    REJECTED: "ถูกปฏิเสธ",
    COMPLETED: "เสร็จสิ้น",
    PENDING_RETURN_CHECK: "รอตรวจรับคืน",
  };
  return map[status] || status;
};

const getStatusIcon = (status: string) => {
  switch (status) {
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[min(92vh,640px)]"
        role="dialog"
        aria-labelledby="units-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500">ตรวจสอบหน่วยที่ขอคืน</p>
            <h2 id="units-modal-title" className="text-lg font-bold text-gray-900 leading-snug mt-0.5">
              {title}
            </h2>
            <p className="text-sm font-mono font-medium text-slate-600 mt-1">{code}</p>
            <p className="text-xs text-slate-500 mt-2">
              รวม{" "}
              <span className="font-semibold text-slate-700">
                {rows.length > 0 ? rows.length : item.requested_qty ?? 0}
              </span>{" "}
              หน่วย
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/90 hover:bg-white hover:border-slate-300 text-slate-500 flex-shrink-0 transition-colors shadow-sm"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto min-h-0 px-5 sm:px-6 py-4">
          {rows.length > 0 ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm border-collapse min-w-[520px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left font-bold text-slate-800 px-3 py-2.5 w-12">#</th>
                    <th className="text-left font-bold text-slate-800 px-3 py-2.5 whitespace-nowrap">
                      รหัสหน่วย
                    </th>
                    <th className="text-left font-bold text-slate-800 px-3 py-2.5 whitespace-nowrap">
                      S/N
                    </th>
                    <th className="text-left font-bold text-slate-800 px-3 py-2.5 whitespace-nowrap">
                      สถานะ
                    </th>
                    <th className="text-left font-bold text-slate-800 px-3 py-2.5 whitespace-nowrap">
                      สภาพ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.unit_code}-${i}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-slate-500 tabular-nums align-middle">{i + 1}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800 align-middle whitespace-nowrap">
                        {row.unit_code}
                      </td>
                      <td className="px-3 py-2 text-slate-600 align-middle whitespace-nowrap">
                        {displayOrDash(row.serial_no)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 align-middle">
                        {displayOrDash(row.status)}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span className="text-slate-600">{displayOrDash(row.condition)}</span>
                        {typeof row.is_found === "boolean" ? (
                          <span
                            className={`ml-2 text-xs font-medium ${
                              row.is_found ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {row.is_found ? "พบ" : "ยังไม่พบ"}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">
                ระบบยังไม่ส่งรายการรหัสหน่วยทีละรายการ
              </p>
              <p className="text-xs text-slate-500 mt-1">
                จำนวนที่แจ้งคืนในแถวนี้:{" "}
                <span className="font-semibold text-slate-700">{item.requested_qty ?? 0}</span> หน่วย
              </p>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50/60 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            ปิด
          </button>
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
            <div className="p-2.5 bg-amber-600 rounded-lg shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
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
                  <col style={{ width: "52px" }} />
                  <col style={{ width: "150px" }} />
                  <col style={{ width: "400px" }} />
                  <col style={{ width: "160px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "100px" }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4">#</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4">รหัส</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4">รายการ</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4">หมวดหมู่</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4">จำนวน</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4">ตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items ?? []).map((item, idx) => {
                    const nUnits = unitCountForItem(item);
                    return (
                      <tr
                        key={`${item.item_id}-${idx}`}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                        style={{ height: "64px" }}
                      >
                        <td className="px-4 py-4 text-center text-sm text-slate-400 align-middle">{idx + 1}</td>
                        <td className="px-4 py-4 align-middle">
                          <span className="font-mono text-sm font-medium text-slate-800 truncate block">{item.item_code || "—"}</span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">{item.item_name || "—"}</p>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className="text-sm font-medium text-slate-600 truncate block">{item.category_name || "—"}</span>
                        </td>
                        <td className="px-4 py-4 text-center align-middle">
                          <span className="text-sm font-semibold text-blue-600">{item.requested_qty}</span>
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
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
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-500">ไม่พบรายการ</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
