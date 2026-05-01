"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, FileText, Package, ScanLine } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Link from "next/link";

import * as reusableSvc from "@/services/reusableUnitService";
import { deptDisplayName } from "@/utils/departmentUtils";
import { fmtDateTime } from "@/utils/dateUtils";
import {
  type ProcessItemForm,
  type ProcessUnitForm,
  RETURN_REQUEST_STATUS_LABEL,
  showToast,
} from "../ReturnForms";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const LOTTIE_SRC = "https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie";

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
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanOk, setScanOk] = useState<boolean | null>(null);
  const [scanResolvedType, setScanResolvedType] = useState<"UNIT" | "LOT" | "ITEM" | null>(null);
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
            unit_id: unit.id ? String(unit.id) : `CODE:${unit.unit_code}`,
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

  const updateForm = useCallback((itemId: string, patch: Partial<ProcessItemForm>) => {
    setForms((prev) => prev.map((row) => (row.item_id === itemId ? { ...row, ...patch } : row)));
  }, []);

  const updateUnitForm = useCallback((unitId: string, patch: Partial<ProcessUnitForm>) => {
    setUnitForms((prev) => prev.map((row) => (row.unit_id === unitId ? { ...row, ...patch } : row)));
  }, []);

  const handleScanUnit = useCallback(() => {
    const run = async () => {
      const raw = scanInput.trim();
      if (!raw || !unitForms.length) return;

      const resolved = await reusableSvc.resolveReusableBarcode(raw, activeRequest?.department_id);
      setScanResolvedType(resolved?.type || null);

      if (resolved && resolved.type !== "UNIT") {
        setScanOk(false);
        setScanMessage(`สแกนได้เป็น ${resolved.type} แต่หน้านี้รองรับเฉพาะ UNIT`);
        return;
      }

      const resolvedUnitCode = resolved?.type === "UNIT" ? resolved.unit.unit_code.toLowerCase() : "";
      const resolvedSerial   = resolved?.type === "UNIT" ? (resolved.unit.serial_no || "").toLowerCase() : "";
      const key = raw.toLowerCase();

      const target = unitForms.find((row) =>
        row.unit_code.toLowerCase() === key ||
        row.serial_no.toLowerCase() === key ||
        (resolvedUnitCode && row.unit_code.toLowerCase() === resolvedUnitCode) ||
        (resolvedSerial && row.serial_no.toLowerCase() === resolvedSerial)
      );

      if (!target) {
        setScanOk(false);
        setScanMessage(`ไม่พบรหัส ${raw} ในใบคำขอนี้`);
        return;
      }

      setUnitForms((prev) =>
        prev.map((row) => {
          if (row.unit_id !== target.unit_id) return row;
          const marker = `[SCN:${raw}]`;
          const nextNote = row.note?.includes(marker) ? row.note : [row.note, marker].filter(Boolean).join(" ");
          return { ...row, condition: "GOOD", note: nextNote };
        })
      );

      setScanOk(true);
      setScanMessage(`พบ ${target.unit_code} และทำเครื่องหมายให้แล้ว`);
      setScanInput("");
    };

    void run();
  }, [scanInput, unitForms, activeRequest?.department_id]);

  const handleProcess = useCallback(async () => {
    if (!activeRequest) return;

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
        const validItems = forms.filter((row) => row.return_qty > 0);
        if (!validItems.length) {
          showToast.error("กรุณาระบุจำนวนรับคืนอย่างน้อย 1 รายการ");
          setIsSaving(false);
          return;
        }
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

      showToast.success(`ปิดงานใบ ${activeRequest.doc_no} สำเร็จ`);
      router.push("/warehouse/returns-department");
    } catch (error) {
      showToast.error(getErrorMessage(error) || "บันทึกผลตรวจรับไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }, [activeRequest, unitForms, forms, processNote, router]);

  if (isLoadingDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-[#fafafa] p-3 sm:p-4 md:p-6">
        <DotLottieReact src={LOTTIE_SRC} loop autoplay style={{ width: 160, height: 160 }} />
      </div>
    );
  }

  if (!activeRequest) return null;

  const isCompleted = activeRequest.status === "COMPLETED";

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <div className="w-full px-6 py-6 flex flex-col flex-1">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-600 rounded-lg shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 tracking-tight">
                ตรวจรับคืน
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">ตรวจสอบสภาพและบันทึกผลการรับคืนอุปกรณ์จากแผนก</p>
            </div>
          </div>
          <Link
            href="/warehouse/returns-department"
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors self-start sm:self-auto shrink-0"
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

          {/* ── สแกนบาร์โค้ด (เฉพาะเมื่อมี unitForms) ───────────────────── */}
          {unitForms.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">สแกนบาร์โค้ด</h2>
                <p className="text-xs text-slate-500 mt-0.5">ป้อน Unit Code หรือ Serial เพื่อทำเครื่องหมาย</p>
              </div>
              <div className="px-5 py-5 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScanUnit(); } }}
                    placeholder="เช่น UNT-000123 หรือ SN-ABC"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleScanUnit}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    <ScanLine className="w-4 h-4" />
                    สแกน
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {scanResolvedType && (
                    <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                      TYPE: {scanResolvedType}
                    </span>
                  )}
                  {scanMessage && (
                    <p className={`text-sm font-semibold ${scanOk ? "text-emerald-700" : "text-rose-600"}`}>
                      {scanMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── รายชิ้นอุปกรณ์ (Unit Forms) ──────────────────────────────── */}
          {unitForms.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">รายชิ้นอุปกรณ์</h2>
                <p className="text-xs text-slate-500 mt-0.5">{unitForms.length} รายการ</p>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "52px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "160px" }} />
                    <col />
                    <col style={{ width: "170px" }} />
                    <col style={{ width: "220px" }} />
                  </colgroup>
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">#</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 whitespace-nowrap">Unit Code</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700 whitespace-nowrap">Serial</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">ชื่อพัสดุ</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">ผลตรวจสภาพ</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unitForms.map((row, idx) => (
                      <tr key={row.unit_id} className="hover:bg-slate-50/50 transition-colors" style={{ height: "64px" }}>
                        <td className="px-4 py-4 text-center text-slate-400 text-sm align-middle">{idx + 1}</td>
                        <td className="px-4 py-4 align-middle">
                          <span className="font-mono text-sm font-semibold text-slate-800 truncate block">{row.unit_code}</span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className="text-sm text-slate-600 truncate block">{row.serial_no}</span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className="text-sm font-medium text-slate-700 line-clamp-2">{row.item_name}</span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <select
                            value={row.condition}
                            onChange={(e) => updateUnitForm(row.unit_id, { condition: e.target.value as ProcessUnitForm["condition"] })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
                          >
                            <option value="GOOD">สภาพดี</option>
                            <option value="DAMAGED">ชำรุด</option>
                            <option value="LOST">สูญหาย</option>
                            <option value="INCOMPLETE">คืนไม่ครบ</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => updateUnitForm(row.unit_id, { note: e.target.value })}
                            placeholder="หมายเหตุ"
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-slate-50"
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
              <div className="overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "52px" }} />
                    <col />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "170px" }} />
                    <col style={{ width: "220px" }} />
                  </colgroup>
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 text-center text-sm font-bold text-slate-700">#</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">รายการ</th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-slate-700 whitespace-nowrap">จำนวนขอคืน</th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-slate-700 whitespace-nowrap">รับคืนจริง</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">ผลตรวจสภาพ</th>
                      <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {forms.map((row, idx) => (
                      <tr key={row.item_id} className="hover:bg-slate-50/50 transition-colors" style={{ height: "64px" }}>
                        <td className="px-4 py-4 text-center text-slate-400 text-sm align-middle">{idx + 1}</td>
                        <td className="px-4 py-4 align-middle">
                          <span className="text-sm font-medium text-slate-700 line-clamp-2">{row.item_name}</span>
                        </td>
                        <td className="px-4 py-4 text-center align-middle">
                          <span className="text-sm text-slate-600">{row.requested_qty}</span>
                        </td>
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            type="number"
                            min={0}
                            max={row.requested_qty}
                            value={row.return_qty}
                            onChange={(e) => updateForm(row.item_id, { return_qty: Math.max(0, Math.min(row.requested_qty, Number(e.target.value || 0))) })}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-sm text-center focus:ring-2 focus:ring-indigo-300 outline-none bg-white mx-auto block"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <select
                            value={row.condition}
                            onChange={(e) => updateForm(row.item_id, { condition: e.target.value as ProcessItemForm["condition"] })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
                          >
                            <option value="GOOD">สภาพดี</option>
                            <option value="DAMAGED">ชำรุด</option>
                            <option value="LOST">สูญหาย</option>
                            <option value="INCOMPLETE">คืนไม่ครบ</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => updateForm(row.item_id, { note: e.target.value })}
                            placeholder="หมายเหตุ"
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-slate-50"
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

          {/* ── บันทึกการตรวจรับ + Action bar ────────────────────────────── */}
          {!isCompleted && (
            <div className="flex flex-col lg:flex-row gap-4">
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-gray-900">บันทึกการตรวจรับ</h2>
                </div>
                <div className="px-5 py-5">
                  <textarea
                    rows={3}
                    value={processNote}
                    onChange={(e) => setProcessNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-slate-50/50 resize-none"
                    placeholder="เช่น รับของครบตามนัด ไม่พบข้อผิดพลาด"
                  />
                </div>
              </section>

              <div className="flex items-stretch lg:w-72 shrink-0">
                <div className="flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl px-6 py-5 w-full">
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-800">บันทึกผลตรวจรับ</p>
                    <p className="text-xs text-slate-500 mt-0.5">ตรวจสอบรายการและสภาพครุภัณฑ์ก่อนกดยืนยัน</p>
                  </div>
                  <button
                    onClick={handleProcess}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 w-full shrink-0"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึกผลตรวจรับ
                  </button>
                </div>
              </div>
            </div>
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-slate-50/50 resize-none"
                  placeholder="เช่น รับของครบตามนัด ไม่พบข้อผิดพลาด"
                  disabled
                />
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
