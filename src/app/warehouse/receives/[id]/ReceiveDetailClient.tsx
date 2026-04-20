"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Layers, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import * as receiveService from "@/services/receiveService";
import type { ReceiveBatch, ReceiveBatchHeader, ReceiveStatus, ReceiveType } from "@/services/receiveService";

const MySwal = withReactContent(Swal);
const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ReceiveType, string> = {
  PURCHASE:       "จัดซื้อ (สิ้นเปลือง)",
  DONATION:       "บริจาค",
  PURCHASE_ASSET: "ครุภัณฑ์",
  REUSABLE_UNIT:  "ของใช้ซ้ำรายชิ้น",
};

const TYPE_BADGE: Record<ReceiveType, string> = {
  PURCHASE:       "bg-emerald-100 text-emerald-700",
  DONATION:       "bg-purple-100 text-purple-700",
  PURCHASE_ASSET: "bg-orange-100 text-orange-700",
  REUSABLE_UNIT:  "bg-sky-100 text-sky-700",
};

const STATUS_LABEL: Record<ReceiveStatus, string> = {
  PENDING:   "รอดำเนินการ",
  COMPLETED: "เสร็จสมบูรณ์",
  CANCELLED: "ยกเลิก",
};

const STATUS_CLS: Record<ReceiveStatus, string> = {
  PENDING:   "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDT(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtD(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ─── DocSection ───────────────────────────────────────────────────────────────

interface DocSectionProps {
  doc: ReceiveBatchHeader;
  onRefresh: () => void;
}

type ItemInput = { qty: number; lot_code: string; expired_at: string };

function DocSection({ doc, onRefresh }: DocSectionProps) {
  const isAsset    = doc.type === "PURCHASE_ASSET";
  const isReusable = doc.type === "REUSABLE_UNIT";
  const isPending  = doc.status === "PENDING";
  const showLot    = !isAsset && !isReusable;

  const [busy, setBusy] = useState(false);
  const [inputs, setInputs] = useState<Record<number, ItemInput>>(() => {
    const init: Record<number, ItemInput> = {};
    if (isPending) {
      doc.receive_item?.forEach(item => {
        init[item.id] = {
          qty: item.qty ?? item.expected_qty ?? 0,
          lot_code: item.lot_code || "",
          expired_at: item.expired_at ? item.expired_at.split("T")[0] : "",
        };
      });
    }
    return init;
  });

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
        expired_at: showLot ? (d.expired_at ? new Date(d.expired_at).toISOString() : undefined) : undefined,
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_BADGE[doc.type] ?? "bg-slate-100 text-slate-600"}`}>
            {TYPE_LABEL[doc.type] ?? doc.type}
          </span>
          <span className="font-mono text-sm font-semibold text-slate-700">{doc.doc_no}</span>
          <span className="text-xs text-slate-400">{doc.receive_item?.length ?? 0} รายการ</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_CLS[doc.status] ?? "bg-slate-100 text-slate-600"}`}>
          {STATUS_LABEL[doc.status] ?? doc.status}
        </span>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-400 text-xs uppercase border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3 w-28">รหัสสินค้า</th>
              <th className="px-4 py-3">ชื่อสินค้า</th>
              <th className="px-4 py-3 w-20 text-center">สั่ง</th>
              <th className="px-4 py-3 w-24 text-center">รับ</th>
              {showLot && (
                <>
                  <th className="px-4 py-3 w-32">Lot Code</th>
                  <th className="px-4 py-3 w-32">วันหมดอายุ</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {(doc.receive_item ?? []).map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.item_code ?? item.item_id}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{item.item_name ?? "-"}</td>
                <td className="px-4 py-3 text-center">{item.expected_qty ?? 0}</td>
                {isPending ? (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <input
                          type="number" min="0" max={item.expected_qty ?? 0}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none"
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
                        <td className="px-4 py-3">
                          <input
                            title="Lot Code" type="text" placeholder="Lot Code"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                            value={inputs[item.id]?.lot_code ?? ""}
                            onChange={e => patch(item.id, { lot_code: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            title="Expiry date" type="date"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                            value={inputs[item.id]?.expired_at ?? ""}
                            onChange={e => patch(item.id, { expired_at: e.target.value })}
                          />
                        </td>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-center">{item.qty ?? 0}</td>
                    {showLot && (
                      <>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.lot_code ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{fmtD(item.expired_at)}</td>
                      </>
                    )}
                  </>
                )}
              </tr>
            ))}
            {(!doc.receive_item || doc.receive_item.length === 0) && (
              <tr>
                <td colSpan={showLot ? 7 : 5} className="px-4 py-10 text-center text-slate-400 text-sm">
                  ไม่พบรายการสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PENDING actions */}
      {isPending && (doc.receive_item?.length ?? 0) > 0 && (
        <div className="flex gap-3 justify-end px-5 py-4 bg-amber-50 border-t border-amber-100">
          <button
            onClick={handleCancel} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 active:scale-95 transition-all"
          >
            ยกเลิกเอกสารนี้
          </button>
          <button
            onClick={handleConfirm} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 active:scale-95 transition-all"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันการรับเข้า"}
          </button>
        </div>
      )}
    </div>
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!batch) return null;

  const uniqueTypes  = [...new Set(batch.headers.map(h => h.type))];
  const totalItems   = batch.headers.reduce((s, h) => s + (h.receive_item?.length ?? 0), 0);
  const hasPending   = batch.headers.some(h => h.status === "PENDING");
  const isMixedBatch = batch.headers.length > 1;

  return (
    <div className="flex flex-col min-h-screen bg-white p-6 gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">รายละเอียดการรับเข้า</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
        >
          ย้อนกลับ
        </button>
      </div>

      {/* Batch banner */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-5 py-4 flex flex-wrap items-center gap-3">
        <Layers className="h-5 w-5 text-indigo-500 shrink-0" />
        <span className="font-mono text-sm font-bold text-indigo-700">{batch.batch_no}</span>
        <span className="text-sm text-indigo-600">
          {batch.headers.length} เอกสาร · {totalItems} รายการ
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {uniqueTypes.map(t => (
            <span key={t} className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[t] ?? "bg-slate-100 text-slate-600"}`}>
              {TYPE_LABEL[t] ?? t}
            </span>
          ))}
        </div>
        {hasPending && (
          <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
            มีเอกสารรอยืนยัน
          </span>
        )}
      </div>

      {/* Batch metadata */}
      <section className="rounded-xl bg-white border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <FileText className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-700">ข้อมูล Batch</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Batch No.</p>
            <p className="font-mono text-sm font-bold text-indigo-700">{batch.batch_no}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">วันที่รับ</p>
            <p className="text-sm text-slate-700">{fmtDT(batch.receive_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้จำหน่าย / ผู้บริจาค</p>
            <p className="text-sm text-slate-700">{batch.supplier_name ?? batch.donor_name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้บันทึก</p>
            <p className="text-sm text-slate-700">{batch.created_by ?? "-"}</p>
          </div>
          {!isMixedBatch && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">เลขที่เอกสาร</p>
              <p className="font-mono text-sm text-slate-700">{batch.headers[0]?.doc_no ?? "-"}</p>
            </div>
          )}
          <div className="col-span-2 md:col-span-4">
            <p className="text-xs text-slate-400 mb-0.5">หมายเหตุ</p>
            <p className="text-sm text-slate-700">{batch.note ?? "-"}</p>
          </div>
        </div>
      </section>

      {/* One DocSection per header in the batch */}
      <div className="space-y-4">
        {batch.headers.map(header => (
          <DocSection key={header.id} doc={header} onRefresh={loadData} />
        ))}
        {batch.headers.length === 0 && (
          <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-slate-400 text-sm">
            ไม่พบเอกสารใน Batch นี้
          </div>
        )}
      </div>
    </div>
  );
}
