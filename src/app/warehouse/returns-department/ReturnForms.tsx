import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { SweetAlertUtils } from "@/utils/sweetAlert";

// ─── Types & Interfaces ───────────────────────────────────────────────────────

export interface ProcessItemForm {
  item_id: string;
  item_name: string;
  requested_qty: number;
  return_qty: number;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note: string;
}

export interface ProcessUnitForm {
  unit_id: string;
  unit_code: string;
  serial_no: string;
  item_id: string;
  item_name: string;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note: string;
}

export interface UnitFormTableProps {
  unitForms: ProcessUnitForm[];
  onUpdate: (unitId: string, patch: Partial<ProcessUnitForm>) => void;
}

export interface ItemFormTableProps {
  forms: ProcessItemForm[];
  onUpdate: (itemId: string, patch: Partial<ProcessItemForm>) => void;
}

export type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

// ─── Constants ────────────────────────────────────────────────────────────────

export const RETURN_REQUEST_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "รอดำเนินการ",
  PROCESSING: "กำลังตรวจรับ",
  COMPLETED: "เสร็จสิ้น",
};

export const CONDITION_LABEL: Record<string, string> = {
  GOOD: "ปกติ",
  DAMAGED: "ชำรุด",
  LOST: "สูญหาย",
  INCOMPLETE: "คืนไม่ครบ",
};

export const conditionOptions: { value: ReturnCondition; label: string }[] = [
  { value: "GOOD", label: CONDITION_LABEL.GOOD },
  { value: "DAMAGED", label: CONDITION_LABEL.DAMAGED },
  { value: "LOST", label: CONDITION_LABEL.LOST },
  { value: "INCOMPLETE", label: CONDITION_LABEL.INCOMPLETE },
];

// ─── Alert Helpers ──────────────────────────────────────────────────────────────

export const showToast = {
  success: (title: string) => {
    SweetAlertUtils.success(title);
  },
  error: (title: string) => {
    SweetAlertUtils.error(title);
  },
  warning: (title: string) => {
    SweetAlertUtils.warning(title);
  },
};

// ─── Condition Dropdown Component ───────────────────────────────────────────────

interface ConditionDropdownProps {
  value: ReturnCondition;
  onChange: (value: ReturnCondition) => void;
}

function ConditionDropdown({ value, onChange }: ConditionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedLabel = CONDITION_LABEL[value] || value;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block w-full" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full gap-2 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white hover:border-slate-400 transition-colors"
      >
        <span className="text-slate-700 font-medium">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          className="fixed bg-white border border-slate-300 rounded-lg shadow-lg z-50 min-w-[160px]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <ul className="py-1">
            {conditionOptions.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors whitespace-nowrap ${
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
        </div>
      )}
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

export function UnitFormTable({ unitForms, onUpdate }: UnitFormTableProps) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left w-[180px]">Unit Code</th>
            <th className="px-4 py-3 text-left w-[180px]">Serial</th>
            <th className="px-4 py-3 text-left">รายการ</th>
            <th className="px-4 py-3 text-left w-[160px]">ผลตรวจสภาพ</th>
            <th className="px-4 py-3 text-left">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {unitForms.map((row: ProcessUnitForm) => (
            <tr key={row.unit_id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.unit_code}</td>
              <td className="px-4 py-3">{row.serial_no}</td>
              <td className="px-4 py-3 font-medium">{row.item_name}</td>
              <td className="px-4 py-3">
                <ConditionDropdown
                  value={row.condition}
                  onChange={(cond) => onUpdate(row.unit_id, { condition: cond })}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  value={row.note}
                  onChange={(e) => onUpdate(row.unit_id, { note: e.target.value })}
                  placeholder="หมายเหตุรายชิ้น"
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ItemFormTable({ forms, onUpdate }: ItemFormTableProps) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left">รายการ</th>
            <th className="px-4 py-3 text-left w-[140px]">จำนวนที่ขอคืน</th>
            <th className="px-4 py-3 text-left w-[150px]">รับคืนจริง</th>
            <th className="px-4 py-3 text-left w-[160px]">ผลตรวจสภาพ</th>
            <th className="px-4 py-3 text-left">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {forms.map((row: ProcessItemForm) => (
            <tr key={row.item_id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium">{row.item_name}</td>
              <td className="px-4 py-3">{row.requested_qty}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  max={row.requested_qty}
                  value={row.return_qty}
                  onChange={(e) => onUpdate(row.item_id, { return_qty: Math.max(0, Math.min(row.requested_qty, Number(e.target.value || 0))) })}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <ConditionDropdown
                  value={row.condition}
                  onChange={(cond) => onUpdate(row.item_id, { condition: cond })}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  value={row.note}
                  onChange={(e) => onUpdate(row.item_id, { note: e.target.value })}
                  placeholder="หมายเหตุ"
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
