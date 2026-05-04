"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Package, Loader2, CheckCircle, X, RotateCcw,
  ChevronRight, ChevronDown, AlertTriangle, Clock, FileText, Eye,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getRequisitionById, submitReturn, ReturnItemPayload } from "@/services/requisitionService";
import { fmtDate } from "@/utils/dateUtils";
import type {
  RequisitionHeader, RequisitionItem, OutstandingUnit, AllocatedLot, BorrowerDetails,
} from "@/types/requisition_type";
import { WarehouseDetailPageSkeleton } from "@/components/skeletons/WarehouseDetailPageSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";

const MySwal = withReactContent(Swal);
const getErr = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReturnItemDetailClientProps {
  returnId: string;
}
// 
type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

interface UnitSelection {
  unit_id: string;
  unit_code: string;
  serial_no: string | null;
  condition: ReturnCondition;
  note: string;
}

interface ReturnRowState {
  req_item_id: number;
  name: string;
  max: number;
  qty_returned: number;
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

const daysOverdue = (h: RequisitionHeader) => {
  if (!h.due_date || h.status !== "BORROWING") return 0;
  const diff = Date.now() - new Date(h.due_date).getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0;
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

/** ดรอปดาวน์สถานะคืน — โทนเดียวกับตัวกรองหน้า BorrowClient (ปุ่มขอบ slate + เมนูลอย); portal เพื่อไม่โดนตัดในกล่องเลื่อนตาราง */
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
  size?: "xs" | "sm" | "md" | "lg" | "60";
  /** ถ้ามีและมี url — คลิกเพื่อดูรูปขยาย */
  onImageClick?: () => void;
}) {
  const cls =
    size === "xs"
      ? "w-8 h-8 rounded-md"
      : size === "sm"
        ? "w-10 h-10 rounded-lg"
        : size === "md"
          ? "w-12 h-12 rounded-xl"
          : size === "60"
            ? "w-[60px] h-[60px] rounded-xl"
            : "w-14 h-14 rounded-xl ring-2 ring-white shadow-md border border-slate-200/90";
  const iconCls =
    size === "xs" ? "w-4 h-4" : (size === "lg" || size === "60") ? "w-6 h-6" : "w-5 h-5";
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

/** หัวโมดัลส่งคืน — จัดวางแบบรูปอ้างอิง: รูปซ้าย / คำบรรยายซ้อนกัน / ปิดมุมขวา */
function ModalProductHeader({
  imageUrl,
  eyebrow,
  title,
  code,
  onClose,
}: {
  imageUrl?: string | null;
  eyebrow: string;
  title: string;
  code: string | null | undefined;
  onClose: () => void;
}) {
  return (
    <header className="flex items-start gap-4 px-5 sm:px-7 py-5 sm:py-6 border-b border-slate-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
        <ItemThumb url={imageUrl} size="lg" />
        <div className="min-w-0 flex flex-col gap-1">
          <p className="text-xs font-medium text-slate-500 leading-tight">{eyebrow}</p>
          <h2 className="text-xl sm:text-[1.35rem] font-bold text-slate-900 leading-snug tracking-tight">
            {title}
          </h2>
          <p className="text-sm font-mono font-medium text-slate-500 tabular-nums">
            {code != null && String(code).trim() !== "" ? String(code).trim() : "—"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/90 hover:bg-white hover:border-slate-300 text-slate-500 flex-shrink-0 transition-colors self-start shadow-sm"
        aria-label="ปิด"
      >
        <X className="w-4 h-4" />
      </button>
    </header>
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
  /** เช่น max-w-lg | max-w-xl */
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
      <ModalProductHeader
        imageUrl={item.image_url}
        eyebrow="ส่งคืนวัสดุ"
        title={item.name}
        code={item.code}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 sm:py-6 space-y-6">
        {/* Lots reference */}
        {lots.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">ล็อตที่ได้รับจากคลัง</p>
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
          <p className="text-xs font-semibold text-slate-500 mb-3">
            จำนวนที่คืน{" "}
            <span className="font-normal text-slate-500">
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
          <p className="text-xs font-semibold text-slate-500 mb-2">สภาพสินค้าที่คืน</p>
          <ConditionPills value={cond} onChange={setCond} />
        </div>

        {/* Note */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">หมายเหตุ</p>
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
      <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-slate-200 bg-slate-50/60 flex-shrink-0">
        <p className="text-sm text-slate-600">
          คืน{" "}
          <span className="font-bold text-blue-600">{qty}</span>
          {" "}ชิ้น
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm shadow-red-200/60"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ qty_returned: qty, condition: cond, note })}
            disabled={qty === 0}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
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
    <ModalShell onClose={onClose} maxWidthClass="max-w-4xl">
      <ModalProductHeader
        imageUrl={item.image_url}
        eyebrow="เลือกครุภัณฑ์ที่คืน"
        title={item.name}
        code={item.code}
        onClose={onClose}
      />

        {/* Toolbar */}
        {outstanding.length > 0 && (
          <div className="flex items-center justify-between px-5 sm:px-7 py-3 bg-slate-50/80 border-b border-slate-200 flex-shrink-0">
            <p className="text-sm font-medium text-slate-600">
              เลือก{" "}
              <span className="font-bold text-blue-600">{selCount}</span>
              {" "}/{" "}{outstanding.length} ชิ้น
            </p>
            {selCount < outstanding.length ? (
              <button
                type="button"
                onClick={selectAll}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                เลือกทั้งหมด
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDraft(new Map())}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                ยกเลิกทั้งหมด
              </button>
            )}
          </div>
        )}

        {/* ตารางรายการหน่วย — เลื่อนได้เมื่อมีหลายแถว */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-5 sm:px-7 py-4 sm:py-5">
          {outstanding.length === 0 && (
            <div className="py-14 text-center text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-600">ไม่มีครุภัณฑ์ค้างคืน</p>
              <p className="text-xs mt-1 text-slate-400">อาจถูกคืนไปแล้วทั้งหมด</p>
            </div>
          )}

          {outstanding.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-0 flex-1">
              <div className="overflow-auto max-h-[min(52vh,28rem)] overscroll-contain">
                <table className="w-full text-sm border-collapse min-w-[640px]">
                  <thead className="sticky top-0 z-[1] bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
                    <tr>
                      <th scope="col" className="w-12 px-2 py-2.5 text-center font-semibold text-slate-600 align-middle">
                        <span className="sr-only">เลือก</span>
                      </th>
                      <th scope="col" className="text-left px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">
                        รหัสหน่วย
                      </th>
                      <th scope="col" className="text-left px-3 py-2.5 font-semibold text-slate-600 w-[9.5rem]">
                        สถานะ
                      </th>
                      <th scope="col" className="text-left px-3 py-2.5 font-semibold text-slate-600 min-w-[12rem]">
                        หมายเหตุ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstanding.map(unit => {
                      const sel = draft.get(unit.id);
                      const isSel = !!sel;
                      return (
                        <tr
                          key={unit.id}
                          className={`border-b border-slate-100 last:border-b-0 transition-colors ${
                            isSel ? "bg-blue-50/50" : "hover:bg-slate-50/60"
                          }`}
                        >
                          <td className="px-2 py-2 align-middle text-center">
                            <button
                              type="button"
                              onClick={() => toggle(unit)}
                              className="inline-flex items-center justify-center align-middle"
                              aria-label={isSel ? "ไม่เลือกรายการนี้" : "เลือกรายการนี้"}
                            >
                              <span
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  isSel ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
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
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-2 align-middle whitespace-nowrap">
                            <span className="font-mono text-sm font-semibold text-slate-800">
                              {unit.unit_code}
                            </span>
                            {unit.serial_no ? (
                              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                                S/N {unit.serial_no}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <ReturnConditionBorrowDropdown
                              value={isSel ? sel.condition : "GOOD"}
                              disabled={!isSel}
                              onChange={c => patch(unit.id, { condition: c })}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="text"
                              value={sel?.note ?? ""}
                              disabled={!isSel}
                              onChange={e => patch(unit.id, { note: e.target.value })}
                              placeholder={
                                !isSel
                                  ? "เลือกแถวก่อน"
                                  : sel?.condition === "LOST"
                                    ? "อธิบายสาเหตุการสูญหาย..."
                                    : "หมายเหตุ (ถ้ามี)"
                              }
                              className="w-full min-w-[11rem] border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-t border-slate-200 bg-slate-50/60 flex-shrink-0">
          <p className="text-sm text-slate-600">
            คืน{" "}
            <span className="font-bold text-blue-600">{selCount}</span>
            {" "}จาก{" "}
            <span className="font-semibold text-slate-800">{outstanding.length}</span>
            {" "}ชิ้น
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm shadow-red-200/60"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onConfirm(Array.from(draft.values()))}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
            >
              ยืนยัน{selCount > 0 ? ` (${selCount})` : ""}
            </button>
          </div>
        </div>
    </ModalShell>
  );
}

// ─── ตารางรายละเอียดการส่งคืน ────────────────────────────────────────────────────

function ConsumableReturnTableRow({
  item,
  value,
  onOpenModal,
  onPreviewImage,
  canReturn = true,
}: {
  item: RequisitionItem;
  value: ConsumableReturn | null;
  onOpenModal: () => void;
  onPreviewImage?: (payload: { url: string; name: string }) => void;
  canReturn?: boolean;
}) {
  const max = (item.issued || 0) - (item.returned || 0);
  const lots: AllocatedLot[] = item.allocated_lots ?? [];
  const hasValue = value && value.qty_returned > 0;

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors" style={{ height: "64px" }}>
      <td className="px-4 py-4 align-middle">
        <div className="flex justify-center">
          <ItemThumb
            url={item.image_url}
            size="60"
            onImageClick={
              item.image_url && onPreviewImage
                ? () => onPreviewImage({ url: item.image_url!, name: item.name })
                : undefined
            }
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
        <span className="text-sm font-medium text-slate-600">วัสดุ</span>
      </td>
      <td className="px-4 py-4 align-middle">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {lots.map((lot, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700"
            >
              <span className="font-mono font-semibold">{lot.lot_code || "-"}</span>
              <span className="text-slate-300">·</span>
              <span>{lot.qty} ชิ้น</span>
            </span>
          ))}
          {hasValue ? (
            <>
              <span className={`inline-flex text-sm font-medium px-2.5 py-1 rounded-full border ${condBadge(value!.condition)}`}>
                {condLabel(value!.condition)}
              </span>
              <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                คืน{" "}<span className="font-bold text-blue-600">{value!.qty_returned}</span>{" / "}{max} ชิ้น
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-500 whitespace-nowrap">
              คงค้าง{" "}<span className="font-bold text-slate-600">{max}</span>{" "}ชิ้น · ยังไม่ได้ระบุ
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 align-middle text-center">
        {canReturn ? (
          <button
            type="button"
            onClick={onOpenModal}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border transition-all whitespace-nowrap ${
              hasValue
                ? "bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
            }`}
          >
            {hasValue ? (<><RotateCcw className="w-4 h-4 shrink-0" />แก้ไข</>) : (<>ส่งคืน<ChevronRight className="w-4 h-4 shrink-0" /></>)}
          </button>
        ) : (
          <span className="text-sm text-slate-400 font-medium">ไม่สามารถแก้ไข</span>
        )}
      </td>
    </tr>
  );
}

function ReusableReturnTableRow({
  item,
  selections,
  onOpenModal,
  onPreviewImage,
  canReturn = true,
}: {
  item: RequisitionItem;
  selections: UnitSelection[];
  onOpenModal: () => void;
  onPreviewImage?: (payload: { url: string; name: string }) => void;
  canReturn?: boolean;
}) {
  const outstanding: OutstandingUnit[] = item.outstanding_units ?? [];
  const hasSelections = selections.length > 0;

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors" style={{ height: "64px" }}>
      <td className="px-4 py-4 align-middle">
        <div className="flex justify-center">
          <ItemThumb
            url={item.image_url}
            size="60"
            onImageClick={
              item.image_url && onPreviewImage
                ? () => onPreviewImage({ url: item.image_url!, name: item.name })
                : undefined
            }
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
        <span className="text-sm font-medium text-slate-600">ครุภัณฑ์</span>
      </td>
      <td className="px-4 py-4 align-middle">
        {outstanding.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-slate-600 whitespace-nowrap shrink-0">
              ค้างคืน {outstanding.length} ชิ้น
            </span>
            {hasSelections && (
              <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                เลือกคืน{" "}<span className="font-bold text-blue-600">{selections.length}</span>{" / "}{outstanding.length} ชิ้น
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-500 italic">ไม่มีครุภัณฑ์ค้างคืน</p>
        )}
      </td>
      <td className="px-4 py-4 align-middle text-center">
        {outstanding.length > 0 && canReturn && (
          <button
            type="button"
            onClick={onOpenModal}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border transition-all whitespace-nowrap ${
              hasSelections
                ? "bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
            }`}
          >
            {hasSelections ? (<><RotateCcw className="w-4 h-4 shrink-0" />แก้ไข</>) : (<>เลือกรายการ<ChevronRight className="w-4 h-4 shrink-0" /></>)}
          </button>
        )}
        {outstanding.length > 0 && !canReturn && (
          <span className="text-sm text-slate-400 font-medium">ไม่สามารถแก้ไข</span>
        )}
      </td>
    </tr>
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
          text: getErr(err),
          icon: "error",
        }).then(() => router.push("/request/returnitem"));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [parsedId, router]);

  if (isLoading) {
    return <WarehouseDetailPageSkeleton ariaLabel="กำลังโหลดรายละเอียดการคืนพัสดุ" />;
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
  const [attachmentLightbox, setAttachmentLightbox] = useState<{
    url: string;
    name: string;
  } | null>(null);
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
  const openConsumableItem = openConsumable !== null ? consumableItems[openConsumable] ?? null : null;

  // ── Reusable state ──
  const reusableItems = useMemo(
    () => (header.items ?? []).filter(it => it.itemType === "REUSABLE"),
    [header.items]
  );

  const [reusableSelections, setReusableSelections] = useState<
    Map<number, UnitSelection[]>
  >(new Map());
  const [openReusable, setOpenReusable] = useState<number | null>(null);
  const openReusableItem = openReusable !== null ? reusableItems[openReusable] ?? null : null;

  const returnable: ReturnRowState[] = consumableItems.map(it => ({
    req_item_id: it.id,
    name: it.name,
    max: (it.issued || 0) - (it.returned || 0),
    qty_returned: (it.issued || 0) - (it.returned || 0),
    condition: "GOOD" as ReturnCondition,
    note: "",
  }));

  const [rows, setRows] = useState<ReturnRowState[]>(returnable);

  const consumablePayloadFor = (it: RequisitionItem, idx: number): ReturnItemPayload | null => {
    const fromModal = consumableReturns.get(it.id);
    const row = rows[idx];
    if (fromModal !== undefined) {
      if (fromModal.qty_returned <= 0) return null;
      return {
        req_item_id: it.id,
        qty_returned: fromModal.qty_returned,
        condition: fromModal.condition,
        note: fromModal.note || undefined,
      };
    }
    if (row && row.qty_returned > 0) {
      return {
        req_item_id: it.id,
        qty_returned: row.qty_returned,
        condition: row.condition,
        note: row.note || undefined,
      };
    }
    return null;
  };

  const hasAnyReturn = useMemo(() => {
    const consumableOk = consumableItems.some((it, idx) => consumablePayloadFor(it, idx) !== null);
    const reusableOk = reusableItems.some(it => (reusableSelections.get(it.id)?.length ?? 0) > 0);
    return consumableOk || reusableOk;
  }, [consumableItems, reusableItems, consumableReturns, rows, reusableSelections]);

  const handleSubmitReturn = async () => {
    const payload: ReturnItemPayload[] = [];

    consumableItems.forEach((it, idx) => {
      const row = consumablePayloadFor(it, idx);
      if (row) payload.push(row);
    });

    reusableItems.forEach(it => {
      const sels = reusableSelections.get(it.id) ?? [];
      if (sels.length === 0) return;
      const condition: ReturnCondition = sels.some(s => s.condition === "LOST")
        ? "LOST"
        : sels.some(s => s.condition === "DAMAGED")
          ? "DAMAGED"
          : sels.some(s => s.condition === "INCOMPLETE")
            ? "INCOMPLETE"
            : "GOOD";
      const note = sels.map(s => s.note).filter(Boolean).join("; ") || undefined;
      payload.push({
        req_item_id: it.id,
        qty_returned: sels.length,
        condition,
        note,
      });
    });

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
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErr(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <div className="w-full px-6 py-6 flex flex-col flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <PageHeadingIconBox icon={FileText} tone="violet" className="shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 tracking-tight">
                รายละเอียดการส่งคืน
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">ดูรายละเอียดสถานะการส่งคืนอุปกรณ์และผลการตรวจรับ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/request/returnitem")}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors self-start sm:self-auto shrink-0"
          >
            ย้อนกลับ
          </button>
        </div>

        <div className="space-y-4 flex-1">

          {overdue > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                เกินกำหนดคืน {overdue} วัน — กรุณาส่งคืนโดยด่วน
              </p>
            </div>
          )}

          {/* ── ข้อมูลเอกสาร + ข้อมูลผู้ยืม (2 คอลัมน์) ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* ข้อมูลเอกสาร */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-gray-900">ข้อมูลเอกสาร</h2>
                <p className="text-xs text-slate-500 mt-0.5">ผู้ดำเนินเรื่อง: {displayOrDash(header.requester)}</p>
              </div>
              <div className="px-5 py-5 flex-1 grid grid-cols-2 gap-x-6 gap-y-5">
                <BorrowerFieldRow label="เลขที่เอกสาร" value={header.doc_no} valueClassName="font-mono font-medium" />
                <BorrowerFieldRow label="แผนก" value={displayOrDash(header.department_name ?? `แผนก ${header.department_id}`)} />
                <BorrowerFieldRow label="ผู้ทำคำขอ" value={displayOrDash(header.requester)} />
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
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-2.5">เอกสารแนบ</h3>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 list-none min-w-0">
                      {attachmentThumbs.map((att, idx) => {
                        const fname = att.filename || att.name || `ไฟล์ ${idx + 1}`;
                        const isImg =
                          /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(att.url) ||
                          att.url.includes("image");

                        const iconBox =
                          "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white";

                        const cardClass =
                          "flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-2 shadow-sm outline-none ring-slate-200 transition hover:border-blue-400 hover:ring-1 focus-visible:ring-2 focus-visible:ring-blue-500";

                        if (isImg) {
                          return (
                            <li key={`${att.url}-${idx}`} className="min-w-0">
                              <button
                                type="button"
                                aria-label={`ขยายรูป ${fname}`}
                                title={fname}
                                onClick={() => setAttachmentLightbox({ url: att.url, name: fname })}
                                className={cardClass}
                              >
                                <p className="min-w-0 flex-1 truncate text-left text-xs font-medium leading-tight text-slate-900">
                                  {fname}
                                </p>
                                <div className={iconBox}>
                                  <Eye className="h-5 w-5 text-blue-600" strokeWidth={1.75} aria-hidden />
                                </div>
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li key={`${att.url}-${idx}`} className="min-w-0">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={fname}
                              className={cardClass}
                            >
                              <span className="min-w-0 flex-1 truncate text-left text-xs font-medium leading-tight text-slate-900">
                                {fname}
                              </span>
                              <span className={iconBox}>
                                <FileText className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── รายละเอียดการส่งคืน ──────────────────────────────────────── */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">รายละเอียดการส่งคืน</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ระบุจำนวน สภาพ และครุภัณฑ์รายชิ้น แล้วกด <span className="font-semibold text-slate-700">แจ้งส่งคืน</span> เพื่อส่งให้คลังตรวจรับ
                </p>
              </div>
              {canReturn && hasAnyReturn && (
                <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1 shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                  พร้อมส่งคืน
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "140px" }} />
                  <col style={{ width: "400px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "300px" }} />
                  <col style={{ width: "110px" }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4">รูป</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4">รหัสรายการ</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4">ชื่อพัสดุ</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4">ประเภท</th>
                    <th className="text-left text-sm font-bold text-slate-700 px-4 py-4">รายการที่ต้องคืน</th>
                    <th className="text-center text-sm font-bold text-slate-700 px-4 py-4">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {consumableItems.map((it, idx) => (
                    <ConsumableReturnTableRow
                      key={it.id}
                      item={it}
                      value={consumableReturns.get(it.id) ?? null}
                      canReturn={canReturn}
                      onOpenModal={() => setOpenConsumable(idx)}
                      onPreviewImage={setAttachmentLightbox}
                    />
                  ))}
                  {reusableItems.map((it, idx) => (
                    <ReusableReturnTableRow
                      key={it.id}
                      item={it}
                      selections={reusableSelections.get(it.id) ?? []}
                      canReturn={canReturn}
                      onOpenModal={() => setOpenReusable(idx)}
                      onPreviewImage={setAttachmentLightbox}
                    />
                  ))}
                  {consumableItems.length === 0 && reusableItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center">
                        <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">ไม่มีรายการที่ต้องดำเนินการคืนในขั้นนี้</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {canReturn && (consumableItems.length > 0 || reusableItems.length > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-bold text-slate-800">แจ้งส่งคืนไปคลัง</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  หลังส่งแล้ว สถานะจะเป็น &ldquo;รอตรวจรับคืน&rdquo; จนกว่าคลังจะยืนยัน
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={isSubmitting || !hasAnyReturn}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 w-full sm:w-auto shrink-0"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                แจ้งส่งคืน
              </button>
            </div>
          )}

          {!canReturn && header.status === "PENDING_RETURN_CHECK" && (
            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4">
              <Clock className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-sky-800">รอตรวจรับคืน</p>
                <p className="text-xs text-sky-600 mt-0.5">ส่งคืนแล้ว รอเจ้าหน้าที่คลังยืนยันรับสินค้าเข้าคลัง</p>
              </div>
            </div>
          )}

        </div>
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
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setAttachmentLightbox(null)}
          role="presentation"
        >
          <div
            className="relative flex size-[min(92vw,min(92vh,420px))] flex-col rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="ดูภาพเอกสารแนบ"
          >
            <button
              type="button"
              onClick={() => setAttachmentLightbox(null)}
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-1 pt-1">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <img
                  src={attachmentLightbox.url}
                  alt=""
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </div>
              <p
                className="shrink-0 truncate px-1 text-center text-sm font-medium text-slate-700"
                title={attachmentLightbox.name}
              >
                {attachmentLightbox.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
