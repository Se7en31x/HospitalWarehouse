"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, FileText, Package } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

import * as reusableSvc from "@/services/reusableUnitService";
import { deptDisplayName } from "@/utils/departmentUtils";
import { fmtDateTime } from "@/utils/dateUtils";
import {
  type ProcessItemForm,
  type ProcessUnitForm,
  RETURN_REQUEST_STATUS_LABEL,
  showToast,
} from "../ReturnForms";
import { ProcessReturnPageSkeleton } from "@/components/skeletons/ProcessReturnPageSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getTotalItems = (items: reusableSvc.ReusableReturnRequestItem[]): number =>
  items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0);

// ─── Shared UI ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-900 mb-1">{label}</p>
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  );
}

const displayOrDash = (v: string | null | undefined): string =>
  v != null && String(v).trim() !== "" ? String(v).trim() : "—";

function StatusBadge({ status }: { status: string }) {
  const displayStatus = RETURN_REQUEST_STATUS_LABEL[status] || status;
  const getColor = (s: string): string => {
    switch (s) {
      case "REQUESTED": return "bg-amber-50 text-amber-700 border-amber-200";
      case "COMPLETED": return "bg-green-50 text-green-700 border-green-200";
      case "CANCELLED": return "bg-red-50 text-red-700 border-red-200";
      default:          return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border whitespace-nowrap ${getColor(status)}`}>
      {displayStatus}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProcessReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  const [activeRequest, setActiveRequest] = useState<reusableSvc.ReusableReturnRequest | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [forms, setForms] = useState<ProcessItemForm[]>([]);
  const [unitForms, setUnitForms] = useState<ProcessUnitForm[]>([]);
  const [processNote, setProcessNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!requestId) {
      router.push("/warehouse/returns-department");
      return;
    }

    const loadDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const detail = await reusableSvc.getReusableReturnRequestById(Number(requestId));
        setActiveRequest(detail);

        const unitRows: ProcessUnitForm[] = (detail.items || []).flatMap((item) =>
          (item.requested_units || []).map((unit) => ({
            unit_id: unit.id ? String(unit.id).trim().toLowerCase() : `CODE:${(unit.unit_code || "").trim()}`,
            unit_code: unit.unit_code || "-",
            serial_no: unit.serial_no || "-",
            item_id: item.item_id,
            item_name: item.item_name || "-",
            condition: "GOOD" as const,
            note: "",
          }))
        );

        if (unitRows.length) {
          setUnitForms(unitRows);
          setForms([]);
        } else {
          setForms(
            (detail.items || []).map((item) => ({
              item_id: item.item_id,
              item_name: item.item_name || "-",
              requested_qty: item.requested_qty,
              return_qty: item.requested_qty,
              condition: "GOOD" as const,
              note: "",
            }))
          );
        }
      } catch (error) {
        showToast.error(getErrorMessage(error) || "ดึงรายละเอียดใบคำขอไม่สำเร็จ");
        router.push("/warehouse/returns-department");
      } finally {
        setIsLoadingDetail(false);
      }
    };

    loadDetail();
  }, [requestId, router]);

  useEffect(() => {
    if (!isSaving) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isSaving]);

  const updateForm = useCallback((itemId: string, patch: Partial<ProcessItemForm>) => {
    setForms((prev) => prev.map((row) => (row.item_id === itemId ? { ...row, ...patch } : row)));
  }, []);

  const updateUnitForm = useCallback((unitId: string, patch: Partial<ProcessUnitForm>) => {
    setUnitForms((prev) => prev.map((row) => (row.unit_id === unitId ? { ...row, ...patch } : row)));
  }, []);

  const handleProcess = useCallback(async () => {
    if (!activeRequest) return;

    let validItems: ProcessItemForm[] = [];
    if (!unitForms.length) {
      validItems = forms.filter((row) => row.return_qty > 0);
      if (!validItems.length) {
        await Swal.fire({
          title: "ตรวจสอบข้อมูล",
          text: "กรุณาระบุจำนวนรับคืนอย่างน้อย 1 รายการ",
          icon: "warning",
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      if (unitForms.length) {
        await reusableSvc.processReusableReturnRequest(activeRequest.id, {
          units: unitForms.map((row) => ({
            unit_id: row.unit_id,
            condition: row.condition,
            note: row.note || undefined,
          })),
          complete: true,
          note: processNote || undefined,
        });
      } else {
        await reusableSvc.processReusableReturnRequest(activeRequest.id, {
          items: validItems.map((row) => ({
            item_id: row.item_id,
            return_qty: Math.min(row.return_qty, row.requested_qty),
            condition: row.condition,
            note: row.note || undefined,
          })),
          complete: true,
          note: processNote || undefined,
        });
      }

      setIsSaving(false);

      await Swal.fire({
        title: "สำเร็จ!",
        text: `ปิดงานใบ ${activeRequest.doc_no} เรียบร้อย`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });

      router.push("/warehouse/returns-department");
    } catch (error) {
      setIsSaving(false);
      await Swal.fire({
        title: "บันทึกไม่สำเร็จ",
        text: getErrorMessage(error) || "บันทึกผลตรวจรับไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setIsSaving(false);
    }
  }, [activeRequest, unitForms, forms, processNote, router]);

  if (isLoadingDetail) {
    return <ProcessReturnPageSkeleton />;
  }

  if (!activeRequest) return null;

  const isCompleted = activeRequest.status === "COMPLETED";

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <div className="w-full px-6 py-6 flex flex-col flex-1">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <PageHeadingIconBox icon={FileText} tone="sky" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 tracking-tight">
                ตรวจรับคืน
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">ตรวจสอบสภาพและบันทึกผลการรับคืนอุปกรณ์จากแผนก</p>
            </div>
          </div>
          <Link
            href="/warehouse/returns-department"
            className={`px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors self-start sm:self-auto shrink-0 ${isSaving ? "pointer-events-none opacity-60" : ""}`}
            onClick={(e) => {
              if (isSaving) e.preventDefault();
            }}
          >
            ย้อนกลับ
          </Link>
        </div>

        <div className="space-y-4 flex-1">

          {/* ── ข้อมูลใบคำขอ ──────────────────────────────────────────────── */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-gray-900">ข้อมูลใบคำขอ</h2>
              <p className="text-xs text-slate-500 mt-0.5">ผู้ขอ: {displayOrDash(activeRequest.requested_by_name)}</p>
            </div>
            <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-5">
              <FieldRow label="เลขที่ใบขอ">
                <span className="font-mono font-medium text-slate-800">{activeRequest.doc_no}</span>
              </FieldRow>
              <FieldRow label="แผนก">
                {displayOrDash(deptDisplayName(activeRequest.department_name || ""))}
              </FieldRow>
              <FieldRow label="สถานะ">
                <StatusBadge status={activeRequest.status || "REQUESTED"} />
              </FieldRow>
              <FieldRow label="จำนวนรายการ">
                <span className="font-semibold text-slate-800">{getTotalItems(activeRequest.items || [])} หน่วย</span>
              </FieldRow>
              <FieldRow label="วันที่ขอ">
                {fmtDateTime(activeRequest.created_at)}
              </FieldRow>
              <FieldRow label="นัดรับของ">
                {fmtDateTime(activeRequest.preferred_pickup_at)}
              </FieldRow>
              <FieldRow label="ผู้ขอ">
                {displayOrDash(activeRequest.requested_by_name)}
              </FieldRow>
            </div>
            {activeRequest.note && (
              <div className="px-5 py-4 border-t border-slate-100">
                <FieldRow label="หมายเหตุ">{activeRequest.note}</FieldRow>
              </div>
            )}
          </section>

          {/* ── รายชิ้นอุปกรณ์ (Unit Forms) ──────────────────────────────── */}
          {unitForms.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">รายชิ้นอุปกรณ์</h2>
                <p className="text-xs text-slate-500 mt-0.5">{unitForms.length} รายการ</p>
              </div>
              <div className="max-h-[min(60vh,28rem)] overflow-x-auto overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col style={{ width: "44px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "120px" }} />
                    <col />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "26%" }} />
                  </colgroup>
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-600">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">Unit Code</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">Serial</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600">ชื่อพัสดุ</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600">ผลตรวจสภาพ</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600">หมายเหตุรายชิ้น</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unitForms.map((row, idx) => (
                      <tr key={row.unit_id} className="hover:bg-slate-50/60 transition-colors align-top">
                        <td className="px-3 py-2 text-center text-slate-400 tabular-nums align-middle">{idx + 1}</td>
                        <td className="px-3 py-2 align-middle">
                          <span className="font-mono text-xs font-semibold text-slate-800 truncate block" title={row.unit_code}>
                            {row.unit_code}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="text-xs text-slate-600 truncate block" title={row.serial_no}>
                            {row.serial_no}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">{row.item_name}</span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <select
                            value={row.condition}
                            onChange={(e) => updateUnitForm(row.unit_id, { condition: e.target.value as ProcessUnitForm["condition"] })}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none bg-white"
                          >
                            <option value="GOOD">สภาพดี</option>
                            <option value="DAMAGED">ชำรุด</option>
                            <option value="LOST">สูญหาย</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <textarea
                            rows={2}
                            value={row.note}
                            onChange={(e) => updateUnitForm(row.unit_id, { note: e.target.value })}
                            placeholder="เพิ่มเติมรายชิ้น (ไม่บังคับ)"
                            className="w-full min-h-[2.75rem] max-h-24 resize-y rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm leading-snug focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none bg-white placeholder:text-slate-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {unitForms.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-16">
                    <Package className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-500">ไม่พบรายการ</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── รายการพัสดุ (Item Forms) ───────────────────────────────────── */}
          {unitForms.length === 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">รายการพัสดุ</h2>
                <p className="text-xs text-slate-500 mt-0.5">{forms.length} รายการ</p>
              </div>
              <div className="max-h-[min(60vh,28rem)] overflow-x-auto overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col style={{ width: "44px" }} />
                    <col />
                    <col style={{ width: "100px" }} />
                    <col style={{ width: "100px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "26%" }} />
                  </colgroup>
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-600">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600">รายการ</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">ขอคืน</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">รับจริง</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600">ผลตรวจสภาพ</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600">หมายเหตุรายการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {forms.map((row, idx) => (
                      <tr key={row.item_id} className="hover:bg-slate-50/60 transition-colors align-top">
                        <td className="px-3 py-2 text-center text-slate-400 tabular-nums align-middle">{idx + 1}</td>
                        <td className="px-3 py-2 align-middle">
                          <span className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">{row.item_name}</span>
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <span className="text-sm text-slate-600 tabular-nums">{row.requested_qty}</span>
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <input
                            type="number"
                            min={0}
                            max={row.requested_qty}
                            value={row.return_qty}
                            onChange={(e) => updateForm(row.item_id, { return_qty: Math.max(0, Math.min(row.requested_qty, Number(e.target.value || 0))) })}
                            className="w-14 rounded-lg border border-slate-200 px-1.5 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none bg-white mx-auto block"
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <select
                            value={row.condition}
                            onChange={(e) => updateForm(row.item_id, { condition: e.target.value as ProcessItemForm["condition"] })}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none bg-white"
                          >
                            <option value="GOOD">สภาพดี</option>
                            <option value="DAMAGED">ชำรุด</option>
                            <option value="LOST">สูญหาย</option>
                            <option value="INCOMPLETE">คืนไม่ครบ</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <textarea
                            rows={2}
                            value={row.note}
                            onChange={(e) => updateForm(row.item_id, { note: e.target.value })}
                            placeholder="เพิ่มเติมต่อรายการ (ไม่บังคับ)"
                            className="w-full min-h-[2.75rem] max-h-24 resize-y rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm leading-snug focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none bg-white placeholder:text-slate-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {forms.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-16">
                    <Package className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-500">ไม่พบรายการ</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── บันทึกการตรวจรับ (รวมหมายเหตุ + ปุ่มแบบหน้าอื่น) ─────────── */}
          {!isCompleted && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">บันทึกการตรวจรับ</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  หมายเหตุรวมสำหรับทั้งใบ (ไม่บังคับ) — ตรวจรายการและผลตรวจสภาพข้างบนก่อนยืนยัน
                </p>
              </div>
              <div className="px-5 py-4 space-y-4">
                <textarea
                  rows={3}
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none bg-white resize-y min-h-[5rem]"
                  placeholder="เช่น รับของครบตามนัด ไม่พบข้อผิดพลาด"
                />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 sm:max-w-md">
                    เมื่อกดบันทึก ระบบจะปิดใบคำขอและอัปเดตสถานะหน่วยในคลังตามผลตรวจแต่ละรายการ
                  </p>
                  <button
                    type="button"
                    onClick={handleProcess}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-800 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed disabled:pointer-events-none"
                  >
                    <Save className="h-4 w-4" />
                    บันทึกผลตรวจรับ
                  </button>
                </div>
              </div>
            </section>
          )}

          {isCompleted && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">บันทึกการตรวจรับ</h2>
              </div>
              <div className="px-5 py-5">
                <textarea
                  rows={3}
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 text-slate-600 resize-none"
                  placeholder="เช่น รับของครบตามนัด ไม่พบข้อผิดพลาด"
                  disabled
                />
              </div>
            </section>
          )}

        </div>
      </div>

      {isSaving ? (
        <>
          <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm" aria-hidden />
          <div
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="pointer-events-auto flex flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white/85 px-10 py-9 shadow-xl backdrop-blur-sm min-w-[260px]">
              <Loader2 className="h-10 w-10 animate-spin text-[#0055FF]" strokeWidth={2.25} />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">กำลังบันทึก...</p>
                <p className="mt-1 text-xs text-slate-500">กรุณารอสักครู่</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
