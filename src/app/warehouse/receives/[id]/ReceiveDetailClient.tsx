"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Layers, Loader2, Package, CheckCircle, Clock, X, Printer, ChevronDown, ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import * as receiveService from "@/services/receiveService";
import { fmtDate, fmtDateTime } from "@/utils/dateUtils";
import type {
  AcquisitionType,
  ReceiveBatch,
  ReceiveBatchHeader,
  ReceiveItem as ReceiveItemType,
  ReceiveItemUnit,
  ReceiveStatus,
} from "@/services/receiveService";
import { WarehouseDetailPageSkeleton } from "@/components/skeletons/WarehouseDetailPageSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import { printLabels, type LabelData } from "@/lib/printLabel";

const MySwal = withReactContent(Swal);
const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ─── Constants ────────────────────────────────────────────────────────────────

const ACQUISITION_LABEL: Record<AcquisitionType, string> = {
  PURCHASE: "จัดซื้อ",
  DONATION: "บริจาค",
  TRANSFER: "โอนย้าย",
};

const STATUS_LABEL: Record<ReceiveStatus, string> = {
  PENDING:   "รอดำเนินการ",
  COMPLETED: "เสร็จสมบูรณ์",
  CANCELLED: "ยกเลิก",
};

const STATUS_CLS: Record<ReceiveStatus, string> = {
  PENDING:   "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const getReceiveStatusIcon = (s: ReceiveStatus) => {
  switch (s) {
    case "PENDING":   return <Clock className="w-3 h-3" />;
    case "COMPLETED": return <CheckCircle className="w-3 h-3" />;
    case "CANCELLED": return <X className="w-3 h-3" />;
    default:          return null;
  }
};

// ─── DocSection ───────────────────────────────────────────────────────────────

interface DocSectionProps {
  doc: ReceiveBatchHeader;
  onRefresh: () => void;
}

type ItemInput = { qty: number; lot_code: string; expired_at: string; mfg_at: string };

function DocSection({ doc, onRefresh }: DocSectionProps) {
  const isAsset    = doc.type === "PURCHASE_ASSET";
  const isReusable = doc.type === "REUSABLE_UNIT";
  const isPending  = doc.status === "PENDING";
  const isCompleted = doc.status === "COMPLETED";
  const showLot    = !isAsset && !isReusable;
  /** ครุภัณฑ์: วันหมดประกันเก็บที่ receive_item.expired_at (ไม่ใช่ล็อต) */
  const showAssetWarranty = isAsset;
  /** เอกสารชนิดที่มีบาร์โค้ดต่อชิ้น (ครุภัณฑ์ / reusable) */
  const supportsUnitBarcode = (isAsset || isReusable) && isCompleted;
  /** เอกสาร consumable ที่ COMPLETED → พิมพ์บาร์โค้ดล็อตได้ */
  const supportsLotBarcode = !isAsset && !isReusable && isCompleted;
  const supportsBarcode = supportsUnitBarcode || supportsLotBarcode;

  const [busy, setBusy] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [inputs, setInputs] = useState<Record<number, ItemInput>>(() => {
    const init: Record<number, ItemInput> = {};
    if (isPending) {
      doc.receive_item?.forEach(item => {
        init[item.id] = {
          qty: item.qty ?? item.expected_qty ?? 0,
          lot_code: item.lot_code || "",
          expired_at: item.expired_at ? item.expired_at.split("T")[0] : "",
          mfg_at: "",
        };
      });
    }
    return init;
  });

  /** เปิด/ปิดรายการ unit codes ของแต่ละ row */
  const toggleExpand = (rowId: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  /** สร้าง LabelData ของ unit (asset/reusable) */
  const buildUnitLabels = (
    units: ReceiveItemUnit[] | undefined,
    itemName: string | null,
  ): LabelData[] => {
    if (!units || units.length === 0) return [];
    return units
      .filter(u => Boolean(u.code))
      .map(u => ({
        name: itemName ?? u.code,
        code: u.code,
        subLabel: u.serial_no ? `S/N: ${u.serial_no}` : undefined,
      }));
  };

  /** สร้าง LabelData ของล็อต (consumable) — 1 ดวง / lot */
  const buildLotLabel = (item: ReceiveItemType): LabelData | null => {
    const code = item.lot?.lot_code || item.lot_code;
    if (!code) return null;
    const expISO = item.lot?.expired_at || item.expired_at;
    const expDate = expISO ? fmtDate(expISO) : "";
    return {
      name: item.item_name ?? code,
      code,
      subLabel: expDate ? `EXP: ${expDate}` : undefined,
    };
  };

  /** จำนวน label ที่พิมพ์ได้ในแต่ละ row */
  const countRowLabels = (item: ReceiveItemType): number => {
    if (supportsUnitBarcode) return item.units?.length ?? 0;
    if (supportsLotBarcode) return (item.lot?.lot_code || item.lot_code) ? 1 : 0;
    return 0;
  };

  /** พิมพ์บาร์โค้ดทั้งใบเอกสาร */
  const handlePrintAll = () => {
    const labels: LabelData[] = [];
    (doc.receive_item ?? []).forEach(it => {
      if (supportsUnitBarcode) {
        labels.push(...buildUnitLabels(it.units, it.item_name));
      } else if (supportsLotBarcode) {
        const lotLabel = buildLotLabel(it);
        if (lotLabel) labels.push(lotLabel);
      }
    });
    if (labels.length === 0) {
      MySwal.fire({ title: "ไม่มีรายการ", text: "ไม่มีบาร์โค้ดที่พิมพ์ได้ในเอกสารนี้", icon: "info" });
      return;
    }
    printLabels(labels);
  };

  /** พิมพ์บาร์โค้ดเฉพาะแถว (units หรือ lot ตามชนิดเอกสาร) */
  const handlePrintRow = (item: ReceiveItemType) => {
    let labels: LabelData[] = [];
    if (supportsUnitBarcode) {
      labels = buildUnitLabels(item.units, item.item_name);
    } else if (supportsLotBarcode) {
      const lotLabel = buildLotLabel(item);
      labels = lotLabel ? [lotLabel] : [];
    }
    if (labels.length === 0) {
      MySwal.fire({ title: "ไม่มีรายการ", text: "ไม่มีบาร์โค้ดที่พิมพ์ได้สำหรับรายการนี้", icon: "info" });
      return;
    }
    printLabels(labels);
  };

  const totalUnits = (doc.receive_item ?? []).reduce(
    (sum, it) => sum + countRowLabels(it),
    0,
  );

  const patch = (id: number, p: Partial<ItemInput>) =>
    setInputs(prev => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const handleCancel = async () => {
    const { value: reason, isConfirmed } = await MySwal.fire({
      title: `ยกเลิกเอกสาร ${doc.doc_no}`,
      text: "กรุณาระบุเหตุผลการยกเลิก:",
      input: "text",
      inputPlaceholder: "ระบุเหตุผล...",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ปิด",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    setBusy(true);
    try {
      await receiveService.cancelReceive(doc.id, reason || "");
      await MySwal.fire({ title: "สำเร็จ", text: `ยกเลิก ${doc.doc_no} สำเร็จ`, icon: "success", timer: 1500, showConfirmButton: false });
      onRefresh();
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const payload = Object.entries(inputs).map(([idStr, d]) => ({
        receive_item_id: Number(idStr),
        qty: d.qty,
        lot_code:   showLot ? (d.lot_code || undefined) : undefined,
        expired_at: showLot
          ? (d.expired_at ? new Date(d.expired_at).toISOString() : undefined)
          : showAssetWarranty
            ? (d.expired_at ? new Date(d.expired_at).toISOString() : null)
            : undefined,
        mfg_at: showLot && d.mfg_at
          ? new Date(d.mfg_at).toISOString()
          : undefined,
        assets: isAsset && d.qty > 0 ? Array(d.qty).fill({}) : undefined,
      }));
      await receiveService.confirmReceive(doc.id, payload);
      await MySwal.fire({ title: "สำเร็จ", text: `ยืนยัน ${doc.doc_no} สำเร็จ`, icon: "success", timer: 1500, showConfirmButton: false });
      onRefresh();
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setBusy(false);
    }
  };

  const colSpan = showLot ? 9 : showAssetWarranty ? 7 : 6;

  /** ความกว้างคอลัมน์รวม 100% ต่อโหมด — #, รหัส, ชื่อ, หมวด, สั่ง, รับ, (+ lot/mfg/exp หรือ หมดประกัน) */
  const tableColWidths = showLot
    ? ["4%", "10%", "22%", "14%", "7%", "7%", "12%", "11%", "13%"]
    : showAssetWarranty
      ? ["5%", "12%", "30%", "18%", "9%", "9%", "17%"]
      : ["5%", "12%", "38%", "22%", "8%", "8%"];

  const itemCategory = (row: { category?: string | null; category_name?: string | null }) =>
    row.category_name?.trim() || row.category?.trim() || "—";

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
          <h2 className="text-base font-semibold text-slate-900">เอกสารรับเข้า</h2>
          <span className="text-xs font-mono text-slate-500">{doc.doc_no}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {supportsBarcode && totalUnits > 0 && (
            <button
              type="button"
              onClick={handlePrintAll}
              title={`พิมพ์บาร์โค้ดทั้งหมด ${totalUnits} ดวง`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์บาร์โค้ด ({totalUnits})
            </button>
          )}
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_CLS[doc.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
          >
            {getReceiveStatusIcon(doc.status)}
            {STATUS_LABEL[doc.status] ?? doc.status}
          </span>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5">
      <div
        className="receive-doc-scroll flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col"
        style={{
          maxHeight: "400px",
          overflowX: "auto",
          overflowY: "auto",
          scrollbarWidth: "auto",
          msOverflowStyle: "auto",
        } as React.CSSProperties}
      >
        <style>{`
          .receive-doc-scroll::-webkit-scrollbar { width: 0; height: 8px; }
          .receive-doc-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
          .receive-doc-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          .receive-doc-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
        <table
          className={`w-full text-left text-sm leading-normal table-fixed ${
            showLot ? "min-w-[1040px]" : showAssetWarranty ? "min-w-[880px]" : "min-w-[760px]"
          }`}
        >
            <colgroup>
              {tableColWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead className="bg-slate-50 text-slate-700 text-sm font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-center whitespace-nowrap">#</th>
                <th className="px-4 py-3 whitespace-nowrap">รหัสรายการ</th>
                <th className="px-4 py-3 whitespace-nowrap">ชื่อพัสดุ</th>
                <th className="px-4 py-3 whitespace-nowrap">หมวดหมู่</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">สั่ง</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">รับ</th>
                {showLot && (
                  <>
                    <th className="px-4 py-3 whitespace-nowrap">Lot Code</th>
                    <th className="px-4 py-3 whitespace-nowrap">วันที่ผลิต</th>
                    <th className="px-4 py-3 whitespace-nowrap">วันหมดอายุ</th>
                  </>
                )}
                {showAssetWarranty && (
                  <th className="px-4 py-3 whitespace-nowrap">วันหมดประกัน</th>
                )}
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {(doc.receive_item ?? []).map((item, idx) => {
                const rowUnits = item.units ?? [];
                const hasUnits = supportsUnitBarcode && rowUnits.length > 0;
                const hasLotBarcode = supportsLotBarcode && Boolean(item.lot?.lot_code || item.lot_code);
                const isExpanded = expandedRows.has(item.id);
                return (
                <React.Fragment key={item.id}>
                <tr className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 text-center text-slate-500 tabular-nums align-middle">{idx + 1}</td>
                  <td className="px-4 py-3 align-middle min-w-0">
                    <p className="text-sm text-slate-800 leading-snug truncate" title={item.item_code ?? String(item.item_id)}>
                      {item.item_code ?? String(item.item_id)}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-middle min-w-0">
                    <p className="text-sm text-slate-800 leading-snug truncate" title={item.item_name ?? ""}>
                      {item.item_name ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-middle min-w-0">
                    <p className="text-sm text-slate-700 leading-snug truncate" title={itemCategory(item)}>
                      {itemCategory(item)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700 tabular-nums align-middle">
                    {item.expected_qty ?? 0}
                  </td>
                  {isPending ? (
                    <>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex justify-center">
                          <input
                            type="number" min="0" max={item.expected_qty ?? 0}
                            className="w-20 rounded border border-slate-200 px-2 py-2 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                            value={inputs[item.id]?.qty?.toString() ?? "0"}
                            onChange={e => {
                              let v = Number(e.target.value.replace(/^0+/, "") || "0");
                              if (v > (item.expected_qty ?? 0)) v = item.expected_qty ?? 0;
                              patch(item.id, { qty: v });
                            }}
                          />
                        </div>
                      </td>
                      {showLot && (
                        <>
                          <td className="px-4 py-3 align-middle">
                            <input
                              title="Lot Code" type="text" placeholder="Lot Code"
                              className="w-full max-w-[132px] rounded border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                              value={inputs[item.id]?.lot_code ?? ""}
                              onChange={e => patch(item.id, { lot_code: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <input
                              title="วันที่ผลิต" type="date"
                              max={new Date().toISOString().split("T")[0]}
                              className="w-full min-w-0 rounded border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                              value={inputs[item.id]?.mfg_at ?? ""}
                              onChange={e => patch(item.id, { mfg_at: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <input
                              title="Expiry date" type="date"
                              min={inputs[item.id]?.mfg_at || undefined}
                              className="w-full min-w-0 rounded border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                              value={inputs[item.id]?.expired_at ?? ""}
                              onChange={e => patch(item.id, { expired_at: e.target.value })}
                            />
                          </td>
                        </>
                      )}
                      {showAssetWarranty && (
                        <td className="px-4 py-3 align-middle">
                          <input
                            title="วันหมดประกัน" type="date"
                            className="w-full min-w-0 rounded border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                            value={inputs[item.id]?.expired_at ?? ""}
                            onChange={e => patch(item.id, { expired_at: e.target.value })}
                          />
                        </td>
                      )}
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-center align-middle">
                        {hasUnits ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            title={isExpanded ? "ซ่อนรหัสบาร์โค้ด" : "ดูรหัสบาร์โค้ด"}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold tabular-nums transition-colors ${
                              isExpanded
                                ? "bg-blue-100 text-blue-700 border border-blue-300"
                                : "text-indigo-600 hover:bg-indigo-50 border border-transparent"
                            }`}
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {item.qty ?? 0}
                          </button>
                        ) : (
                          <span className="text-indigo-600 tabular-nums">{item.qty ?? 0}</span>
                        )}
                      </td>
                      {showLot && (
                        <>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-mono text-slate-800 truncate whitespace-nowrap" title={item.lot?.lot_code ?? item.lot_code ?? ""}>
                                {item.lot?.lot_code ?? item.lot_code ?? "—"}
                              </p>
                              {hasLotBarcode && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintRow(item)}
                                  title="พิมพ์บาร์โค้ดล็อตนี้"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors flex-shrink-0"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 tabular-nums align-middle whitespace-nowrap">
                            {fmtDate(item.lot?.mfg_at)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 tabular-nums align-middle whitespace-nowrap">
                            {fmtDate(item.lot?.expired_at ?? item.expired_at)}
                          </td>
                        </>
                      )}
                      {showAssetWarranty && (
                        <td className="px-4 py-3 text-sm text-slate-800 tabular-nums align-middle whitespace-nowrap">
                          {fmtDate(item.expired_at)}
                        </td>
                      )}
                    </>
                  )}
                </tr>
                {hasUnits && isExpanded && (
                  <tr className="bg-slate-50/60 border-b border-slate-100 last:border-b-0">
                    <td colSpan={colSpan} className="px-4 py-3">
                      <div className="flex flex-col gap-2.5 ml-12">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-xs font-bold text-slate-600">
                            รหัสบาร์โค้ด ({rowUnits.length} ดวง)
                          </p>
                          <button
                            type="button"
                            onClick={() => handlePrintRow(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            พิมพ์เฉพาะรายการนี้
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rowUnits.map(u => (
                            <span
                              key={u.id}
                              title={u.serial_no ? `S/N: ${u.serial_no}` : undefined}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-700"
                            >
                              {u.code}
                              {u.serial_no && (
                                <span className="text-[9px] text-slate-400">· {u.serial_no}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
              {(!doc.receive_item || doc.receive_item.length === 0) && (
                <tr>
                  <td colSpan={colSpan} className="p-0">
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                      <Package className="w-16 h-16 text-slate-300" strokeWidth={1.25} />
                      <p className="text-sm font-medium text-slate-500">ไม่พบรายการสินค้า</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
      </div>

      {isPending && (doc.receive_item?.length ?? 0) > 0 && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex gap-3 justify-end">
          <button
            onClick={handleCancel} disabled={busy}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm shadow-red-200/60 disabled:opacity-60"
          >
            ยกเลิกเอกสารนี้
          </button>
          <button
            onClick={handleConfirm} disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            ยืนยันการรับเข้า
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReceiveDetailClient({ batchId }: { batchId: string | number }) {
  const router = useRouter();

  const [batch,   setBatch]   = useState<ReceiveBatch | null>(null);
  const [loading, setLoading] = useState(true);

  const parsedId = useMemo(() => {
    if (typeof batchId === "number" && Number.isFinite(batchId)) return batchId;
    const n = Number(batchId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [batchId]);

  const loadData = async () => {
    if (!parsedId) return;
    setLoading(true);
    try {
      const data = await receiveService.getBatchById(parsedId);
      setBatch(data);
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" }).then(() => router.back());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!parsedId) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: "รหัส Batch ไม่ถูกต้อง", icon: "error" }).then(() => router.back());
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedId]);

  if (loading) {
    return <WarehouseDetailPageSkeleton ariaLabel="กำลังโหลดรายละเอียดการรับเข้า" />;
  }

  if (!batch) return null;

  const hasPending   = batch.headers.some(h => h.status === "PENDING");

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <div className="w-full px-6 py-6 flex flex-col flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <PageHeadingIconBox icon={FileText} tone="inbound" className="shrink-0" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">รายละเอียดการรับเข้า</h2>
              <p className="text-sm text-slate-600 mt-1">ดูรายละเอียดใบรับสินค้า ล็อต และสถานะการตรวจรับ</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors self-start sm:self-auto shrink-0"
          >
            ย้อนกลับ
          </button>
        </div>

        <div className="space-y-4 flex-1">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center gap-2 text-slate-800">
            <Layers className="h-5 w-5 text-indigo-600 shrink-0" />
            <h2 className="text-base font-semibold text-slate-900">ข้อมูลเลขที่นำเข้า</h2>
            {hasPending && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800">
                <Clock className="w-3 h-3" />
                มีเอกสารรอยืนยัน
              </span>
            )}
          </div>
          <div className="px-5 sm:px-6 py-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">เลขที่นำเข้า</p>
              <p className="text-sm font-mono font-semibold text-slate-900">{batch.batch_no}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">ประเภทการรับเข้า</p>
              <p className="text-sm text-slate-900">
                {batch.acquisition_type
                  ? (ACQUISITION_LABEL[batch.acquisition_type] ?? String(batch.acquisition_type))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">วันที่รับเข้า</p>
              <p className="text-sm text-slate-900">{fmtDateTime(batch.receive_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">ผู้จำหน่าย / ผู้บริจาค</p>
              <p className="text-sm text-slate-900">{batch.supplier_name ?? batch.donor_name ?? "-"}</p>
            </div>
            {batch.acquisition_type === "PURCHASE" && (
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">ใบส่งสินค้า / เอกสารนำส่ง</p>
                <p className="text-sm text-slate-900 font-mono">{batch.delivery_doc_no?.trim() || "—"}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">ผู้บันทึก</p>
              <p className="text-sm text-slate-900">
                {batch.created_by_name?.trim() || "—"}
              </p>
            </div>
            <div className="md:col-span-3">
              <p className="text-sm font-medium text-slate-600 mb-1">หมายเหตุ</p>
              <p className="text-sm text-slate-900">{batch.note ?? "-"}</p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {batch.headers.map(header => (
            <DocSection key={header.id} doc={header} onRefresh={loadData} />
          ))}
          {batch.headers.length === 0 && (
            <section className="bg-white border border-slate-200 rounded-xl px-5 sm:px-6 py-6 text-center text-slate-500">
              <p className="text-sm text-slate-600">ไม่พบเอกสารใน Batch นี้</p>
            </section>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
