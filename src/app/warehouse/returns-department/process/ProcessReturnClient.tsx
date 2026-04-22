"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Save, FileText, Package } from "lucide-react";
import Link from "next/link";

import * as reusableSvc from "@/services/reusableUnitService";
import { deptDisplayName } from "@/utils/departmentUtils";
import {
  type ProcessItemForm,
  type ProcessUnitForm,
  RETURN_REQUEST_STATUS_LABEL,
  showToast,
} from "../ReturnForms";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fmtDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("th-TH");
};

const getTotalItems = (items: reusableSvc.ReusableReturnRequestItem[]): number => {
  return items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0);
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const displayStatus = RETURN_REQUEST_STATUS_LABEL[status] || status;
  
  const getStatusColor = (s: string): string => {
    switch (s) {
      case "REQUESTED": return "bg-amber-100 text-amber-500 border border-amber-200";
      case "COMPLETED": return "bg-green-100 text-green-500 border border-green-200";
      case "CANCELLED": return "bg-red-100 text-red-500 border border-red-200";
      default: return "bg-slate-100 text-slate-500 border border-slate-200";
    }
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${getStatusColor(status)}`}>
      {displayStatus}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProcessReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  // State
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

  // Load request details
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

      const resolvedUnitCode = resolved && resolved.type === "UNIT"
        ? resolved.unit.unit_code.toLowerCase()
        : "";
      const resolvedSerial = resolved && resolved.type === "UNIT"
        ? (resolved.unit.serial_no || "").toLowerCase()
        : "";

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
          const nextNote = row.note?.includes(marker)
            ? row.note
            : [row.note, marker].filter(Boolean).join(" ");
          return {
            ...row,
            condition: "GOOD",
            note: nextNote,
          };
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!activeRequest) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">ตรวจรับคืน</h2>
        <Link
          href="/warehouse/returns-department"
          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
        >
          ย้อนกลับ
        </Link>
      </div>

      <div className="space-y-6 flex-1">
        {/* Document Info */}
        <section className="rounded-lg bg-white border border-slate-300 p-6">
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">ข้อมูลใบคำขอ</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-slate-500">เลขที่ใบขอ</p>
              <p className="font-mono text-base font-semibold text-slate-800">{activeRequest.doc_no}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">แผนก</p>
              <p className="text-base font-medium text-slate-800">{deptDisplayName(activeRequest.department_name || "") || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">สถานะ</p>
              <StatusBadge status={activeRequest.status || "REQUESTED"} />
            </div>
            <div>
              <p className="text-xs text-slate-500">วันที่ขอ</p>
              <p className="text-base text-slate-800">{fmtDateTime(activeRequest.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">นัดรับของ</p>
              <p className="text-base text-slate-800">{fmtDateTime(activeRequest.preferred_pickup_at)}</p>
            </div>
          </div>
        </section>

        {/* Requester Info */}
        <section className="rounded-lg bg-white border border-slate-300 p-6">
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">ข้อมูลผู้ขอ</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">ชื่อผู้ขอ</p>
              <p className="text-base text-slate-800">{activeRequest.requested_by_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">จำนวนรายการ</p>
              <p className="text-base font-semibold text-slate-800">{getTotalItems(activeRequest.items || [])} หน่วย</p>
            </div>
            {activeRequest.note && (
              <div>
                <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
                <p className="text-base text-slate-800">{activeRequest.note}</p>
              </div>
            )}
          </div>
        </section>

        {/* Unit Forms Section */}
        {unitForms.length > 0 && (
          <>
            {/* Scan Section */}
            <section className="rounded-lg bg-white border border-slate-300 p-6">
              <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">สแกนบาร์โค้ด</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">ป้อนรหัส (Unit Code / Serial)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleScanUnit();
                        }
                      }}
                      placeholder="เช่น UNT-000123 หรือ SN-ABC"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleScanUnit}
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
                    >
                      สแกน
                    </button>
                  </div>
                </div>

                {scanResolvedType && (
                  <div>
                    <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                      TYPE: {scanResolvedType}
                    </span>
                  </div>
                )}
                {scanMessage && (
                  <p className={`text-sm font-medium ${scanOk ? "text-emerald-700" : "text-rose-700"}`}>{scanMessage}</p>
                )}
              </div>
            </section>

            {/* Units Table */}
            <section className="rounded-lg bg-white border border-slate-300 p-6 overflow-hidden flex flex-col" style={{ height: "450px" }}>
              <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">รายชิ้นอุปกรณ์ ({unitForms.length} รายการ)</h2>
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
                <table className="w-full text-sm text-left table-fixed">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 w-[50px]">#</th>
                      <th className="px-6 py-4 w-[140px]">Unit Code</th>
                      <th className="px-6 py-4 w-[140px]">Serial</th>
                      <th className="px-6 py-4 w-[200px]">รายการ</th>
                      <th className="px-6 py-4 w-[160px]">ผลตรวจสภาพ</th>
                      <th className="px-6 py-4">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {unitForms.map((row, idx) => (
                      <tr key={row.unit_id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-6 py-3 text-slate-400 text-sm">{idx + 1}</td>
                        <td className="px-6 py-3 font-mono text-xs text-slate-700 font-semibold">{row.unit_code}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{row.serial_no}</td>
                        <td className="px-6 py-3 text-sm text-slate-700 font-medium">{row.item_name}</td>
                        <td className="px-6 py-3 w-[160px]">
                          <select
                            value={row.condition}
                            onChange={(e) => updateUnitForm(row.unit_id, { condition: e.target.value as any })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          >
                            <option value="GOOD">ปกติ</option>
                            <option value="DAMAGED">ชำรุด</option>
                            <option value="LOST">สูญหาย</option>
                            <option value="INCOMPLETE">คืนไม่ครบ</option>
                          </select>
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => updateUnitForm(row.unit_id, { note: e.target.value })}
                            placeholder="หมายเหตุ"
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {unitForms.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-16">
                    <Package className="w-12 h-12 text-slate-300" />
                    <p className="text-sm font-medium">ไม่พบรายการ</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Item Forms Section */}
        {unitForms.length === 0 && (
          <section className="rounded-lg bg-white border border-slate-300 p-6 overflow-hidden flex flex-col" style={{ height: "450px" }}>
            <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">รายการพัสดุ ({forms.length} รายการ)</h2>
            </div>

            <div
              className="flex-1"
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
              <table className="w-full text-sm text-left table-fixed">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 w-[50px]">#</th>
                    <th className="px-6 py-4 w-[200px]">รายการ</th>
                    <th className="px-6 py-4 w-[120px] text-center">จำนวนขอคืน</th>
                    <th className="px-6 py-4 w-[120px] text-center">รับคืนจริง</th>
                    <th className="px-6 py-4 w-[160px]">ผลตรวจสภาพ</th>
                    <th className="px-6 py-4">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {forms.map((row, idx) => (
                    <tr key={row.item_id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-6 py-3 text-slate-400 text-sm">{idx + 1}</td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-700">{row.item_name}</td>
                      <td className="px-6 py-3 text-center text-sm text-slate-700">{row.requested_qty}</td>
                      <td className="px-6 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={row.requested_qty}
                          value={row.return_qty}
                          onChange={(e) => updateForm(row.item_id, { return_qty: Math.max(0, Math.min(row.requested_qty, Number(e.target.value || 0))) })}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </td>
                      <td className="px-6 py-3 w-[160px]">
                        <select
                          value={row.condition}
                          onChange={(e) => updateForm(row.item_id, { condition: e.target.value as any })}
                          className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="GOOD">ปกติ</option>
                          <option value="DAMAGED">ชำรุด</option>
                          <option value="LOST">สูญหาย</option>
                          <option value="INCOMPLETE">คืนไม่ครบ</option>
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => updateForm(row.item_id, { note: e.target.value })}
                          placeholder="หมายเหตุ"
                          className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {forms.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-16">
                  <Package className="w-12 h-12 text-slate-300" />
                  <p className="text-sm font-medium">ไม่พบรายการ</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Process Note Section */}
        <section className="rounded-lg bg-white border border-slate-300 p-6">
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <FileText className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold">บันทึกการตรวจรับ</h2>
          </div>

          <textarea
            rows={3}
            value={processNote}
            onChange={(e) => setProcessNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            placeholder="เช่น รับของครบตามนัด ไม่พบข้อผิดพลาด"
          />
        </section>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-4">
          <Link
            href="/warehouse/returns-department"
            className="px-6 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ปิด
          </Link>
          {activeRequest.status !== "COMPLETED" && (
            <button
              onClick={handleProcess}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกผลตรวจรับ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
