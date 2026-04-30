import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_CLASSES,
  LOT_STATUS_LABELS,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_CLASSES,
  BORROW_RETURN_STATUS_LABELS,
  BORROW_RETURN_STATUS_CLASSES,
  REUSABLE_RETURN_STATUS_LABELS,
} from "@/constants/labels";

export type StatusContext =
  | "item"
  | "lot"
  | "requisition"
  | "borrow-return"
  | "reusable-return";

const LOT_STATUS_CLASSES: Record<string, string> = {
  ใช้งานได้: "bg-green-100 text-green-600 border border-green-200",
  ระงับการใช้งาน: "bg-red-100 text-red-500 border border-red-200",
  ยกเลิก: "bg-slate-100 text-slate-500 border border-slate-200",
  ใกล้หมดอายุ: "bg-amber-100 text-amber-600 border border-amber-200",
  หมดอายุ: "bg-red-100 text-red-600 border border-red-200",
};

const REUSABLE_RETURN_STATUS_CLASSES: Record<string, string> = {
  รอดำเนินการ: "bg-amber-100 text-amber-700 border border-amber-200",
  กำลังตรวจรับ: "bg-blue-100 text-blue-700 border border-blue-200",
  เสร็จสิ้น: "bg-green-100 text-green-700 border border-green-200",
};

function resolveLabel(status: string, context: StatusContext): string {
  switch (context) {
    case "item":
      return ITEM_STATUS_LABELS[status] ?? status;
    case "lot":
      return LOT_STATUS_LABELS[status] ?? status;
    case "requisition":
      return REQUISITION_STATUS_LABELS[status] ?? status;
    case "borrow-return":
      return BORROW_RETURN_STATUS_LABELS[status] ?? status;
    case "reusable-return":
      return REUSABLE_RETURN_STATUS_LABELS[status] ?? status;
  }
}

function resolveClass(label: string, context: StatusContext): string {
  const fallback = "bg-slate-100 text-slate-500 border border-slate-200";
  switch (context) {
    case "item":
      return ITEM_STATUS_CLASSES[label] ?? fallback;
    case "lot":
      return LOT_STATUS_CLASSES[label] ?? fallback;
    case "requisition":
      return REQUISITION_STATUS_CLASSES[label] ?? fallback;
    case "borrow-return":
      return BORROW_RETURN_STATUS_CLASSES[label] ?? fallback;
    case "reusable-return":
      return REUSABLE_RETURN_STATUS_CLASSES[label] ?? fallback;
  }
}

interface StatusBadgeProps {
  status: string;
  context: StatusContext;
  className?: string;
}

export function StatusBadge({ status, context, className = "" }: StatusBadgeProps) {
  const label = resolveLabel(status, context);
  const cls = resolveClass(label, context);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls} ${className}`}
    >
      {label}
    </span>
  );
}
