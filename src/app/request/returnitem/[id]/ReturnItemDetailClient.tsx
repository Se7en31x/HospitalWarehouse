"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  FileText, Package, Loader2, CheckCircle, X, RotateCcw,
  ChevronRight, AlertTriangle, Clock,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getRequisitionById, submitReturn, ReturnItemPayload } from "@/services/requisitionService";
import type {
  RequisitionHeader, RequisitionItem, OutstandingUnit, AllocatedLot,
} from "@/types/requisition_type";

const MySwal = withReactContent(Swal);
const getErr = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ─── Types ────────────────────────────────────────────────────────────────────

type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

interface UnitSelection {
  unit_id: string;
  unit_code: string;
  serial_no: string | null;
  condition: ReturnCondition;
  note: string;
}

interface ConsumableReturn {
  qty_returned: number;
  condition: ReturnCondition;
  note: string;
}

// ─── Condition config ─────────────────────────────────────────────────────────

const CONDITIONS: {
  value: ReturnCondition;
  label: string;
  pill: string;
  badge: string;
}[] = [
  {
    value: "GOOD",
    label: "สภาพดี",
    pill: "bg-emerald-500 text-white border-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "DAMAGED",
    label: "ชำรุด",
    pill: "bg-amber-500 text-white border-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "LOST",
    label: "สูญหาย",
    pill: "bg-red-500 text-white border-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  {
    value: "INCOMPLETE",
    label: "ไม่ครบ",
    pill: "bg-purple-500 text-white border-purple-500",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

const condLabel = (c: ReturnCondition) =>
  CONDITIONS.find(o => o.value === c)?.label ?? c;
const condBadge = (c: ReturnCondition) =>
  CONDITIONS.find(o => o.value === c)?.badge ?? "bg-slate-100 text-slate-600 border-slate-200";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UiStatus = "รอการคืน" | "คืนแล้ว" | "รออนุมัติ" | "รอตรวจรับคืน" | "ค้างคืน" | "ยกเลิก" | "ถูกปฏิเสธ";

const daysOverdue = (h: RequisitionHeader) => {
  if (!h.due_date || h.status !== "BORROWING") return 0;
  const diff = Date.now() - new Date(h.due_date).getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0;
};

const uiStatus = (h: RequisitionHeader) => {
  const overdue = daysOverdue(h);
  if (h.status === "BORROWING")
    return overdue > 0
      ? { label: "ค้างคืน", cls: "bg-red-50 text-red-700 border-red-200" }
      : { label: "รอการคืน", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  if (h.status === "PENDING_RETURN_CHECK")
    return { label: "รอตรวจรับคืน", cls: "bg-sky-50 text-sky-700 border-sky-200" };
  if (h.status === "COMPLETED")
    return { label: "คืนแล้ว", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (h.status === "PENDING")
    return { label: "รออนุมัติ", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  return { label: h.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
};

// ─── Condition Pill Group ─────────────────────────────────────────────────────

function ConditionPills({
  value,
  onChange,
}: {
  value: ReturnCondition;
  onChange: (c: ReturnCondition) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CONDITIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
            value === opt.value
              ? opt.pill
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Item thumbnail ───────────────────────────────────────────────────────────

function ItemThumb({
  url,
  size = "md",
}: {
  url?: string | null;
  size?: "sm" | "md";
}) {
  const cls =
    size === "sm"
      ? "w-10 h-10 rounded-lg"
      : "w-12 h-12 rounded-xl";
  return url ? (
    <img
      src={url}
      alt=""
      className={`${cls} object-cover border border-slate-100 flex-shrink-0`}
    />
  ) : (
    <div
      className={`${cls} bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0`}
    >
      <Package className="w-5 h-5 text-slate-300" />
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Consumable Return Modal ──────────────────────────────────────────────────

function ConsumableModal({
  item,
  initial,
  onConfirm,
  onClose,
}: {
  item: RequisitionItem;
  initial: ConsumableReturn | null;
  onConfirm: (r: ConsumableReturn) => void;
  onClose: () => void;
}) {
  const max = (item.issued || 0) - (item.returned || 0);
  const [qty, setQty] = useState(initial?.qty_returned ?? max);
  const [cond, setCond] = useState<ReturnCondition>(initial?.condition ?? "GOOD");
  const [note, setNote] = useState(initial?.note ?? "");

  const lots: AllocatedLot[] = item.allocated_lots ?? [];

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
        <ItemThumb url={item.image_url} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ส่งคืนวัสดุ</p>
          <p className="font-bold text-slate-800 leading-snug">{item.name}</p>
          <p className="text-xs font-mono text-slate-400">{item.code}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Lots reference */}
        {lots.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              ล็อตที่ได้รับจากคลัง
            </p>
            <div className="flex flex-wrap gap-2">
              {lots.map((lot, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                >
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {lot.lot_code || "-"}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm text-slate-600">{lot.qty} ชิ้น</span>
                  {lot.expired_at && (
                    <span className="text-xs text-rose-400">
                      หมด {fmtDate(lot.expired_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qty */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            จำนวนที่คืน{" "}
            <span className="normal-case font-normal text-slate-400">
              (คงค้าง {max} ชิ้น)
            </span>
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setQty(q => Math.max(0, q - 1))}
                className="w-11 h-11 text-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
              >
                −
              </button>
              <span className="w-14 text-center text-xl font-bold text-blue-600">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(q => Math.min(max, q + 1))}
                className="w-11 h-11 text-xl font-bold text-blue-400 hover:bg-blue-50 transition-colors"
              >
                +
              </button>
            </div>
            {qty < max && (
              <button
                type="button"
                onClick={() => setQty(max)}
                className="text-xs text-blue-500 hover:text-blue-700 font-semibold underline underline-offset-2"
              >
                คืนทั้งหมด ({max})
              </button>
            )}
          </div>
        </div>

        {/* Condition */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            สภาพสินค้าที่คืน
          </p>
          <ConditionPills value={cond} onChange={setCond} />
        </div>

        {/* Note */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            หมายเหตุ
          </p>
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={
              cond === "LOST"
                ? "อธิบายสาเหตุการสูญหาย..."
                : "ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
            }
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex-shrink-0">
        <p className="text-sm text-slate-500">
          คืน{" "}
          <span className="font-bold text-blue-600 text-base">{qty}</span>
          {" "}ชิ้น
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm({ qty_returned: qty, condition: cond, note })}
            disabled={qty === 0}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Reusable Return Modal ────────────────────────────────────────────────────

function ReusableModal({
  item,
  initial,
  onConfirm,
  onClose,
}: {
  item: RequisitionItem;
  initial: UnitSelection[];
  onConfirm: (s: UnitSelection[]) => void;
  onClose: () => void;
}) {
  const outstanding: OutstandingUnit[] = item.outstanding_units ?? [];

  const [draft, setDraft] = useState<Map<string, UnitSelection>>(() => {
    const m = new Map<string, UnitSelection>();
    initial.forEach(s => m.set(s.unit_id, { ...s }));
    return m;
  });

  const toggle = (u: OutstandingUnit) =>
    setDraft(prev => {
      const next = new Map(prev);
      if (next.has(u.id)) {
        next.delete(u.id);
      } else {
        next.set(u.id, {
          unit_id: u.id,
          unit_code: u.unit_code,
          serial_no: u.serial_no,
          condition: "GOOD",
          note: "",
        });
      }
      return next;
    });

  const patch = (id: string, update: Partial<UnitSelection>) =>
    setDraft(prev => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (cur) next.set(id, { ...cur, ...update });
      return next;
    });

  const selectAll = () =>
    setDraft(() => {
      const m = new Map<string, UnitSelection>();
      outstanding.forEach(u =>
        m.set(u.id, {
          unit_id: u.id,
          unit_code: u.unit_code,
          serial_no: u.serial_no,
          condition: "GOOD",
          note: "",
        })
      );
      return m;
    });

  const selCount = draft.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <ItemThumb url={item.image_url} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              เลือกครุภัณฑ์ที่คืน
            </p>
            <p className="font-bold text-slate-800 leading-snug">{item.name}</p>
            <p className="text-xs font-mono text-slate-400">{item.code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        {outstanding.length > 0 && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs text-slate-500">
              เลือก{" "}
              <span className="font-bold text-blue-600">{selCount}</span>
              {" "}/{" "}{outstanding.length} ชิ้น
            </p>
            {selCount < outstanding.length ? (
              <button
                onClick={selectAll}
                className="text-xs font-semibold text-blue-500 hover:text-blue-700"
              >
                เลือกทั้งหมด
              </button>
            ) : (
              <button
                onClick={() => setDraft(new Map())}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                ยกเลิกทั้งหมด
              </button>
            )}
          </div>
        )}

        {/* Unit list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {outstanding.length === 0 && (
            <div className="py-14 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">ไม่มีครุภัณฑ์ค้างคืน</p>
              <p className="text-xs mt-1 text-slate-300">อาจถูกคืนไปแล้วทั้งหมด</p>
            </div>
          )}

          {outstanding.map(unit => {
            const sel = draft.get(unit.id);
            const isSel = !!sel;
            return (
              <div
                key={unit.id}
                className={`rounded-xl border-2 transition-all overflow-hidden ${
                  isSel
                    ? "border-blue-300 bg-blue-50/30"
                    : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(unit)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSel ? "bg-blue-500 border-blue-500" : "border-slate-300"
                    }`}
                  >
                    {isSel && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold text-slate-700">
                      {unit.unit_code}
                    </span>
                    {unit.serial_no && (
                      <span className="ml-2 text-xs text-slate-400">
                        S/N: {unit.serial_no}
                      </span>
                    )}
                  </div>

                  {isSel && sel!.condition !== "GOOD" && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${condBadge(sel!.condition)}`}
                    >
                      {condLabel(sel!.condition)}
                    </span>
                  )}
                </button>

                {/* Expanded section when selected */}
                {isSel && (
                  <div className="px-4 pb-4 pt-2 border-t border-blue-100/70 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        สภาพ
                      </p>
                      <ConditionPills
                        value={sel!.condition}
                        onChange={c => patch(unit.id, { condition: c })}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        หมายเหตุ
                      </p>
                      <input
                        type="text"
                        value={sel!.note}
                        onChange={e => patch(unit.id, { note: e.target.value })}
                        placeholder={
                          sel!.condition === "LOST"
                            ? "อธิบายสาเหตุการสูญหาย..."
                            : "หมายเหตุ (ถ้ามี)"
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex-shrink-0">
          <p className="text-sm text-slate-500">
            คืน{" "}
            <span className="font-bold text-blue-600 text-base">{selCount}</span>
            {" "}จาก{" "}
            <span className="font-semibold text-slate-700">{outstanding.length}</span>
            {" "}ชิ้น
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => onConfirm(Array.from(draft.values()))}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              ยืนยัน{selCount > 0 ? ` (${selCount})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Item Card (BORROWING) ────────────────────────────────────────────────────

function ConsumableCard({
  item,
  value,
  onOpenModal,
}: {
  item: RequisitionItem;
  value: ConsumableReturn | null;
  onOpenModal: () => void;
}) {
  const max = (item.issued || 0) - (item.returned || 0);
  const lots: AllocatedLot[] = item.allocated_lots ?? [];
  const hasValue = value && value.qty_returned > 0;

  return (
    <div className="p-5 flex gap-4">
      <ItemThumb url={item.image_url} />

      <div className="flex-1 min-w-0">
        {/* Name + type */}
        <div className="flex items-start gap-2 mb-0.5">
          <p className="font-bold text-slate-800 leading-snug">{item.name}</p>
          <span className="flex-shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
            วัสดุ
          </span>
        </div>
        <p className="text-xs font-mono text-slate-400">{item.code}</p>

        {/* Lots info */}
        {lots.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {lots.map((lot, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600"
              >
                <span className="font-mono font-semibold">{lot.lot_code || "-"}</span>
                <span className="text-slate-300">·</span>
                <span>{lot.qty} ชิ้น</span>
              </span>
            ))}
          </div>
        )}

        {/* Status / summary */}
        <div className="mt-3 flex items-center gap-3">
          {hasValue ? (
            <>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${condBadge(value!.condition)}`}>
                {condLabel(value!.condition)}
              </span>
              <span className="text-sm text-slate-600">
                คืน{" "}
                <span className="font-bold text-blue-600">{value!.qty_returned}</span>
                {" "}จาก{" "}{max} ชิ้น
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-400">
              คงค้าง{" "}
              <span className="font-bold text-slate-600">{max}</span>
              {" "}ชิ้น · ยังไม่ได้ระบุ
            </span>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0 flex items-center">
        <button
          type="button"
          onClick={onOpenModal}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all ${
            hasValue
              ? "bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
              : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
          }`}
        >
          {hasValue ? (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              แก้ไข
            </>
          ) : (
            <>
              ส่งคืน
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ReusableCard({
  item,
  selections,
  onOpenModal,
}: {
  item: RequisitionItem;
  selections: UnitSelection[];
  onOpenModal: () => void;
}) {
  const outstanding: OutstandingUnit[] = item.outstanding_units ?? [];
  const hasSelections = selections.length > 0;

  return (
    <div className="p-5 flex gap-4">
      <ItemThumb url={item.image_url} />

      <div className="flex-1 min-w-0">
        {/* Name + type */}
        <div className="flex items-start gap-2 mb-0.5">
          <p className="font-bold text-slate-800 leading-snug">{item.name}</p>
          <span className="flex-shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
            ครุภัณฑ์
          </span>
        </div>
        <p className="text-xs font-mono text-slate-400">{item.code}</p>

        {/* Outstanding units preview */}
        {outstanding.length > 0 && (
          <div className="mt-2.5">
            <p className="text-[10px] text-slate-400 mb-1.5">
              ค้างคืน {outstanding.length} ชิ้น
            </p>
            <div className="flex flex-wrap gap-1.5">
              {outstanding.map(u => {
                const selected = selections.find(s => s.unit_id === u.id);
                return (
                  <span
                    key={u.id}
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                      selected
                        ? condBadge(selected.condition)
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {u.unit_code}
                    {selected && selected.condition !== "GOOD" && (
                      <span className="ml-1 font-normal opacity-70">
                        · {condLabel(selected.condition)}
                      </span>
                    )}
                    {selected && (
                      <span className="ml-1 text-emerald-500">✓</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {outstanding.length === 0 && (
          <p className="mt-2 text-xs text-slate-400 italic">ไม่มีครุภัณฑ์ค้างคืน</p>
        )}

        {/* Summary */}
        {hasSelections && (
          <p className="mt-2.5 text-sm text-slate-600">
            เลือกคืน{" "}
            <span className="font-bold text-blue-600">{selections.length}</span>
            {" "}จาก{" "}{outstanding.length} ชิ้น
          </p>
        )}
      </div>

      {/* Action */}
      <div className="flex-shrink-0 flex items-center">
        {outstanding.length > 0 && (
          <button
            type="button"
            onClick={onOpenModal}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all ${
              hasSelections
                ? "bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
            }`}
          >
            {hasSelections ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                แก้ไข
              </>
            ) : (
              <>
                เลือกรายการ
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReturnItemDetailClient({ returnId }: ReturnItemDetailClientProps) {
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
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: "รหัสการยืมไม่ถูกต้อง",
        icon: "error",
      }).then(() => router.push("/request/returnitem"));
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
          }).then(() => router.push("/request/returnitem"));
        }
      } catch (err) {
        MySwal.fire({
          title: "ข้อผิดพลาด",
          text: getErrorMessage(err),
          icon: "error",
        }).then(() => router.push("/request/returnitem"));
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
  const bd = header.borrower_details;
  const borrowerName = bd
    ? [bd.firstname, bd.lastname].filter(Boolean).join(" ") || "บุคคลภายนอก"
    : header.requester || "ไม่ระบุ";

  // ── Consumable state ──
  const [consumableReturns, setConsumableReturns] = useState<
    Map<number, ConsumableReturn>
  >(new Map());
  const [openConsumable, setOpenConsumable] = useState<number | null>(null);

  // ── Reusable state ──
  const [reusableSelections, setReusableSelections] = useState<
    Map<number, UnitSelection[]>
  >(new Map());
  const [openReusable, setOpenReusable] = useState<number | null>(null);

  const consumableItems = useMemo(
    () =>
      (header.items ?? []).filter(
        it => it.itemType !== "REUSABLE" && (it.issued || 0) > (it.returned || 0)
      ),
    [header.items]
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

  const handleSubmitReturn = async () => {
    const payload: ReturnItemPayload[] = rows
      .filter(r => r.qty_returned > 0)
      .map(r => ({
        req_item_id: r.req_item_id,
        qty_returned: r.qty_returned,
        condition: r.condition,
        note: r.note || undefined,
      }));

    if (payload.length === 0) {
      MySwal.fire({ title: "กรุณาระบุจำนวนที่คืน", icon: "warning", timer: 2000, showConfirmButton: false });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitReturn(header.id, payload);
      if (!result.success) throw new Error(result.message);

      await MySwal.fire({
        title: "บันทึกสำเร็จ",
        text: "ส่งคืนสำเร็จ (รอคลังตรวจรับคืน)",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      router.push("/request/returnitem");
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─ Top bar ─ */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/request/returnitem")}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800">รายละเอียดการยืม</h1>
            <p className="text-xs font-mono text-slate-400">{header.doc_no}</p>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-full border ${status.cls}`}
        >
          {status.label}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ─ Overdue banner ─ */}
        {overdue > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">
              เกินกำหนดคืน {overdue} วัน — กรุณาส่งคืนโดยด่วน
            </p>
          </div>
        )}

        {/* ─ Info card ─ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-700">ข้อมูลการยืม</h2>
          </div>
          <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">ผู้ยืม</p>
              <p className="text-sm font-semibold text-slate-800">{borrowerName}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">แผนก</p>
              <p className="text-sm text-slate-700">
                {header.department_name ?? `แผนก ${header.department_id}`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">วันที่ยืม</p>
              <p className="text-sm text-slate-700">{fmtDate(header.request_date)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">กำหนดคืน</p>
              <p className={`text-sm font-semibold ${overdue > 0 ? "text-red-600" : "text-slate-700"}`}>
                {fmtDate(header.due_date)}
              </p>
            </div>
          </div>
          {(header.note || bd?.notes) && (
            <div className="px-6 pb-4 text-sm text-slate-500 border-t border-slate-50 pt-3">
              <span className="font-semibold text-slate-600">หมายเหตุ: </span>
              {bd?.notes ?? header.note}
            </div>
          )}
        </div>

        {/* ─ Items ─ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-700">
                รายการพัสดุ{" "}
                <span className="font-normal text-slate-400">
                  ({header.items?.length ?? 0} รายการ)
                </span>
              </h2>
            </div>
            {canReturn && hasAnyReturn && (
              <span className="text-xs text-emerald-600 font-semibold">
                <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                ระบุแล้วบางรายการ
              </span>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">ชื่อผู้ยืม</p>
                <p className="text-base text-slate-800">{getBorrowerDisplay(header)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">ผู้ทำรายการ</p>
                <p className="text-base text-slate-800">{header.requester ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">แผนก</p>
                <p className="text-base text-slate-800">{header.department_name ?? `แผนก ${header.department_id}`}</p>
              </div>

              {header.borrower_details?.phone && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">เบอร์โทร</p>
                  <p className="text-base text-slate-800">{header.borrower_details.phone}</p>
                </div>
              )}

              {header.borrower_details?.address && (
                <div className="md:col-span-2">
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

            {(header.borrower_details?.notes || header.note) && (
              <div>
                <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
                <p className="text-base text-slate-800">
                  {header.borrower_details?.notes ?? header.note}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ─ Submit bar ─ */}
        {canReturn && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">พร้อมส่งคืน?</p>
              <p className="text-xs text-slate-400 mt-0.5">
                คลังจะรับเรื่องและตรวจสอบสภาพก่อนปิดรายการ
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !hasAnyReturn}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 flex-shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              แจ้งส่งคืน
            </button>
          </div>
        )}

        {/* Status info for non-BORROWING */}
        {!canReturn && header.status === "PENDING_RETURN_CHECK" && (
          <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4">
            <Clock className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-sky-800">รอตรวจรับคืน</p>
              <p className="text-xs text-sky-600 mt-0.5">
                ส่งคืนแล้ว รอเจ้าหน้าที่คลังยืนยันรับสินค้าเข้าคลัง
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─ Modals ─ */}
      {openConsumableItem && (
        <ConsumableModal
          item={openConsumableItem}
          initial={consumableReturns.get(openConsumableItem.id) ?? null}
          onConfirm={r => {
            setConsumableReturns(prev => {
              const next = new Map(prev);
              next.set(openConsumableItem.id, r);
              return next;
            });
            setOpenConsumable(null);
          }}
          onClose={() => setOpenConsumable(null)}
        />
      )}

      {openReusableItem && (
        <ReusableModal
          item={openReusableItem}
          initial={reusableSelections.get(openReusableItem.id) ?? []}
          onConfirm={sels => {
            setReusableSelections(prev => {
              const next = new Map(prev);
              next.set(openReusableItem.id, sels);
              return next;
            });
            setOpenReusable(null);
          }}
          onClose={() => setOpenReusable(null)}
        />
      )}
    </div>
  );
}
