"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  FileText, Package, Loader2, CheckCircle, X, RotateCcw,
  ChevronRight, ChevronDown, AlertTriangle, Clock,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getRequisitionById, submitReturn, ReturnItemPayload } from "@/services/requisitionService";
import type {
  RequisitionHeader, RequisitionItem, OutstandingUnit, AllocatedLot, BorrowerDetails,
} from "@/types/requisition_type";

const MySwal = withReactContent(Swal);
const getErr = (e: unknown) => (e instanceof Error ? e.message : String(e));
const LOTTIE_SRC = "https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReturnItemDetailClientProps {
  returnId: string;
}

type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

interface UnitSelection {
  unit_id: string;
  unit_code: string;
  serial_no: string | null;
  condition: ReturnCondition;
  note: string;
}

interface UnitReturn {
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

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

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

const formatBorrowerAddress = (bd: BorrowerDetails): string | null => {
  const parts: string[] = [];
  if (bd.address?.trim()) parts.push(bd.address.trim());
  if (bd.subdistrict?.trim()) parts.push(`ต.${bd.subdistrict.trim()}`);
  if (bd.district?.trim()) parts.push(`อ.${bd.district.trim()}`);
  if (bd.province?.trim()) parts.push(`จ.${bd.province.trim()}`);
  if (bd.zipcode?.trim()) parts.push(bd.zipcode.trim());
  return parts.length ? parts.join(" ") : null;
};

const displayOrDash = (v: string | null | undefined): string =>
  v != null && String(v).trim() !== "" ? String(v).trim() : "—";

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

/** Backend อาจเก็บหลาย URL ใน id_card_url เป็น JSON array */
const parseIdCardUrls = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean) as string[];
  } catch {
    /* ไม่ใช่ JSON — URL เดียว */
  }
  return [raw];
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

/** ดรอปดาวน์สถานะคืน — โทนเดียวกับตัวกรองหน้า BorrowClient; portal เพื่อไม่โดนตัดในกล่องเลื่อนตาราง */
function ReturnConditionBorrowDropdown({
  value,
  onChange,
  disabled,
}: {
  value: ReturnCondition;
  onChange: (c: ReturnCondition) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const placeMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = r.left;
    const width = Math.max(r.width, 176);
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
    setMenuStyle({
      position: "fixed",
      top: r.bottom + 4,
      left,
      width,
      zIndex: 200,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReposition = () => placeMenu();
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, placeMenu]);

  if (disabled) {
    return (
      <span className="inline-flex min-h-[2.125rem] items-center text-sm text-slate-400 px-1">
        —
      </span>
    );
  }

  const label = condLabel(value);

  return (
    <>
      <div className="relative w-full min-w-[8.5rem]">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full justify-between"
        >
          <span className="text-slate-800 font-medium truncate">{label}</span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            <ul className="py-1">
              {CONDITIONS.map(opt => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      value === opt.value
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Item thumbnail ───────────────────────────────────────────────────────────

function ItemThumb({
  url,
  size = "md",
  onImageClick,
}: {
  url?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  onImageClick?: () => void;
}) {
  const cls =
    size === "xs"
      ? "w-8 h-8 rounded-md"
      : size === "sm"
        ? "w-10 h-10 rounded-lg"
        : size === "md"
          ? "w-12 h-12 rounded-xl"
          : "w-14 h-14 rounded-xl ring-2 ring-white shadow-md border border-slate-200/90";
  const iconCls =
    size === "xs" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const baseBorder =
    size === "lg" ? "" : "border border-slate-100";
  const imgClass = `${cls} object-cover ${baseBorder} flex-shrink-0 block ${
    onImageClick ? "cursor-zoom-in hover:opacity-90 transition-opacity" : ""
  }`.replace(/\s+/g, " ").trim();

  if (url && onImageClick) {
    const round =
      size === "xs"
        ? "rounded-md"
        : size === "sm"
          ? "rounded-lg"
          : "rounded-xl";
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick();
        }}
        className={`p-0 border-0 bg-transparent ${round} focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1`}
        aria-label="ดูรูปสินค้า"
      >
        <img src={url} alt="" className={imgClass} />
      </button>
    );
  }

  return url ? (
    <img
      src={url}
      alt=""
      className={`${cls} object-cover ${baseBorder} flex-shrink-0`}
    />
  ) : (
    <div
      className={`${cls} ${size === "lg" ? "bg-white" : "bg-slate-50"} ${baseBorder || "border border-slate-100"} flex items-center justify-center flex-shrink-0`}
    >
      <Package className={`${iconCls} text-slate-300`} />
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  children,
  onClose: _onClose,
  maxWidthClass = "max-w-lg",
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-xl w-full ${maxWidthClass} flex flex-col overflow-hidden`}
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

// ─── Item Cards ───────────────────────────────────────────────────────────────

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
        <div className="flex items-start gap-2 mb-0.5">
          <p className="font-bold text-slate-800 leading-snug">{item.name}</p>
          <span className="flex-shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
            วัสดุ
          </span>
        </div>
        <p className="text-xs font-mono text-slate-400">{item.code}</p>

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
        <div className="flex items-start gap-2 mb-0.5">
          <p className="font-bold text-slate-800 leading-snug">{item.name}</p>
          <span className="flex-shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
            ครุภัณฑ์
          </span>
        </div>
        <p className="text-xs font-mono text-slate-400">{item.code}</p>

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

        {hasSelections && (
          <p className="mt-2.5 text-sm text-slate-600">
            เลือกคืน{" "}
            <span className="font-bold text-blue-600">{selections.length}</span>
            {" "}จาก{" "}{outstanding.length} ชิ้น
          </p>
        )}
      </div>

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

// ─── Main loader ──────────────────────────────────────────────────────────────

export default function ReturnItemDetailClient({
  returnId,
}: {
  returnId: string | number;
}) {
  const router = useRouter();
  const [header, setHeader] = useState<RequisitionHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedId = useMemo(() => {
    const n = Number(returnId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [returnId]);

  useEffect(() => {
    if (!parsedId) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: "รหัสไม่ถูกต้อง", icon: "error" }).then(() =>
        router.push("/request/returnitem")
      );
      return;
    }
    (async () => {
      try {
        const res = await getRequisitionById(parsedId);
        if (res.success && res.data) setHeader(res.data);
        else
          MySwal.fire({ title: "ไม่พบข้อมูล", icon: "error" }).then(() =>
            router.push("/request/returnitem")
          );
      } catch (err) {
        MySwal.fire({ title: "ข้อผิดพลาด", text: getErr(err), icon: "error" }).then(() =>
          router.push("/request/returnitem")
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [parsedId, router]);

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-[#fafafa] p-3 sm:p-4 md:p-6">
        <DotLottieReact src={LOTTIE_SRC} loop autoplay style={{ width: 160, height: 160 }} />
      </div>
    );

  if (!header) return null;

  return (
    <DetailContent
      header={header}
      isSubmitting={isSubmitting}
      setIsSubmitting={setIsSubmitting}
    />
  );
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
  const [attachmentLightbox, setAttachmentLightbox] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const status = uiStatus(header);
  const ext = !!header.borrower_details;
  const overdue = daysOverdue(header);
  const canReturn = header.status === "BORROWING";
  const bd = header.borrower_details;
  const borrowerName = bd
    ? [bd.firstname, bd.lastname].filter(Boolean).join(" ") || "บุคคลภายนอก"
    : header.requester || "ไม่ระบุ";

  const borrowerAddressLine = useMemo(
    () => (bd ? formatBorrowerAddress(bd) : null),
    [bd]
  );
  const borrowerTitlePrefix = useMemo(() => {
    if (!bd) return null;
    const fromLookup =
      bd.lookup_titles?.short_name?.trim() || bd.lookup_titles?.name?.trim() || null;
    if (fromLookup) return fromLookup;
    return bd.title_code?.trim() || null;
  }, [bd]);

  const borrowerNameWithTitle = useMemo(() => {
    if (!bd) return null;
    const rest = [bd.firstname?.trim(), bd.lastname?.trim()].filter(Boolean).join(" ");
    const withTitle = [borrowerTitlePrefix, rest].filter(Boolean).join(" ").trim();
    return withTitle || borrowerName;
  }, [bd, borrowerTitlePrefix, borrowerName]);

  const attachmentThumbs = useMemo((): Array<{ url: string; filename?: string; name?: string }> => {
    const fromHeader = (header.attachments ?? []).filter((a): a is { url: string; filename?: string; name?: string } =>
      Boolean(a?.url)
    );
    const idUrls = parseIdCardUrls(bd?.id_card_url);
    const fromBorrower = idUrls.map((url, i) => ({
      url,
      filename: i === 0 ? "บัตรประชาชน" : `เอกสารแนบ ${i + 1}`,
    })).filter(e => !fromHeader.some(a => a.url === e.url));
    return [...fromBorrower, ...fromHeader];
  }, [header.attachments, bd?.id_card_url]);

  // ── Consumable state ──
  const consumableItems = useMemo(
    () =>
      (header.items ?? []).filter(
        it => it.itemType !== "REUSABLE" && (it.issued || 0) > (it.returned || 0)
      ),
    [header.items]
  );

  const [consumableReturns, setConsumableReturns] = useState<
    Map<number, ConsumableReturn>
  >(new Map());
  const [openConsumable, setOpenConsumable] = useState<number | null>(null);

  // ── Reusable state ──
  const reusableItems = useMemo(
    () => (header.items ?? []).filter(it => it.itemType === "REUSABLE"),
    [header.items]
  );

  const [reusableSelections, setReusableSelections] = useState<
    Map<number, UnitSelection[]>
  >(new Map());
  const [openReusable, setOpenReusable] = useState<number | null>(null);

  const openConsumableItem = useMemo(
    () => consumableItems.find(it => it.id === openConsumable) ?? null,
    [consumableItems, openConsumable]
  );

  const openReusableItem = useMemo(
    () => reusableItems.find(it => it.id === openReusable) ?? null,
    [reusableItems, openReusable]
  );

  // ── Submit ──
  const hasAnyReturn =
    Array.from(consumableReturns.values()).some(r => r.qty_returned > 0) ||
    Array.from(reusableSelections.values()).some(s => s.length > 0);

  const handleSubmit = async () => {
    const payload: ReturnItemPayload[] = [];

    consumableReturns.forEach((r, id) => {
      if (r.qty_returned > 0)
        payload.push({
          req_item_id: id,
          qty_returned: r.qty_returned,
          condition: r.condition,
          note: r.note || undefined,
        });
    });

    reusableSelections.forEach((units, id) => {
      if (units.length > 0)
        payload.push({
          req_item_id: id,
          qty_returned: units.length,
          condition: "GOOD",
          units: units.map(u => ({
            unit_id: u.unit_id,
            condition: u.condition,
            note: u.note || undefined,
          })),
        });
    });

    if (!payload.length) {
      MySwal.fire({
        title: "กรุณาระบุรายการที่ต้องการคืน",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReturn(header.id, payload);
      if (!res.success) throw new Error(res.message);
      await MySwal.fire({
        title: "ส่งคืนสำเร็จ",
        text: "รอคลังตรวจรับคืน",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      router.push("/request/returnitem");
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErr(err), icon: "error" });
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

        {/* ─ Borrower info card ─ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-700">ข้อมูลการยืม</h2>
            {ext && <span className="ml-auto text-xs text-slate-400">บุคคลภายนอก</span>}
          </div>

          {ext && bd ? (
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
              <div className="space-y-5">
                <BorrowerFieldRow label="ชื่อ-นามสกุล" value={displayOrDash(borrowerNameWithTitle)} />
                <BorrowerFieldRow label="เบอร์โทรศัพท์" value={displayOrDash(bd.phone)} />
                <BorrowerFieldRow label="หมายเหตุ" value={displayOrDash(bd.notes)} />
              </div>
              <div className="space-y-5">
                <BorrowerFieldRow
                  label="บัตรประชาชน"
                  value={displayOrDash(bd.id_card)}
                  valueClassName="font-mono tracking-wide"
                />
                <BorrowerFieldRow label="ที่อยู่" value={displayOrDash(borrowerAddressLine)} />
              </div>
            </div>
          ) : (
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
          )}

          {(header.note || bd?.notes) && !ext && (
            <div className="px-6 pb-4 text-sm text-slate-500 border-t border-slate-50 pt-3">
              <span className="font-semibold text-slate-600">หมายเหตุ: </span>
              {bd?.notes ?? header.note}
            </div>
          )}
        </div>

        {/* ─ Attachments ─ */}
        {attachmentThumbs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">เอกสารแนบ</h2>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-4">
                {attachmentThumbs.map((att, i) => {
                  const fname = att.filename || att.name || `ไฟล์ ${i + 1}`;
                  const isImg = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(att.url) || att.url.includes("image");
                  const wrapClass = "flex flex-col w-[100px] sm:w-[120px] shrink-0 group";
                  const thumbBoxClass =
                    "aspect-square rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center group-hover:border-blue-300 transition-colors";

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
                            <img
                              src={att.url}
                              alt={fname}
                              className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-zoom-in"
                            />
                          </div>
                        </button>
                        <p
                          className="text-[11px] text-slate-600 mt-2 line-clamp-2 break-all text-center leading-tight"
                          title={fname}
                        >
                          {fname}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={`${att.url}-${i}`}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={wrapClass}
                    >
                      <div className={thumbBoxClass}>
                        <FileText className="w-10 h-10 text-slate-300" />
                      </div>
                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 break-all text-center leading-tight" title={fname}>
                        {fname}
                      </p>
                    </a>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-4">ทั้งหมด {attachmentThumbs.length} ไฟล์</p>
            </div>
          </div>
        )}

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

          {canReturn ? (
            <div className="divide-y divide-slate-100">
              {consumableItems.map(it => (
                <ConsumableCard
                  key={it.id}
                  item={it}
                  value={consumableReturns.get(it.id) ?? null}
                  onOpenModal={() => setOpenConsumable(it.id)}
                />
              ))}

              {reusableItems.map(it => (
                <ReusableCard
                  key={it.id}
                  item={it}
                  selections={reusableSelections.get(it.id) ?? []}
                  onOpenModal={() => setOpenReusable(it.id)}
                />
              ))}

              {consumableItems.length === 0 && reusableItems.length === 0 && (
                <div className="py-14 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">ไม่มีรายการที่ต้องคืน</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(header.items ?? []).map(it => {
                const isReusable = it.itemType === "REUSABLE";
                const units = it.issued_units ?? [];
                return (
                  <div key={it.id} className="p-5 flex gap-4">
                    <ItemThumb url={it.image_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-0.5">
                        <p className="font-bold text-slate-800">{it.name}</p>
                        <span className={`flex-shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isReusable ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          {isReusable ? "ครุภัณฑ์" : "วัสดุ"}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400 mb-2">{it.code}</p>

                      {isReusable && units.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {units.map((u, i) => (
                            <span key={i} className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {u.unit_code}
                            </span>
                          ))}
                        </div>
                      )}

                      {!isReusable && (it.allocated_lots ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(it.allocated_lots ?? []).map((lot, i) => (
                            <span key={i} className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                              {lot.lot_code} · {lot.qty} ชิ้น
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[10px] text-slate-400 mb-0.5">ยืม / คืน</p>
                      <p className="text-sm font-bold text-slate-700">
                        {it.issued ?? 0}
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-blue-600">{it.returned ?? 0}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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

      {attachmentLightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setAttachmentLightbox(null)}
          role="presentation"
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl p-2 max-w-[min(90vw,520px)]"
            onClick={(e) => e.stopPropagation()}
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
            <p
              className="text-center text-sm text-slate-600 mt-2 pb-1 px-2 truncate"
              title={attachmentLightbox.name}
            >
              {attachmentLightbox.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
