// ---------------------------------------------------------------------------
// Canonical label maps for the HPK Warehouse Management System.
// Import from here instead of declaring inline badge/status maps per-file.
// ---------------------------------------------------------------------------

// ── Item / Asset statuses ───────────────────────────────────────────────────
export const ITEM_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "เปิดใช้งาน",
  LOW: "ต่ำ",
  OUT_OF_STOCK: "หมด",
  SUSPEND: "ระงับ",
  SUSPENDED: "ระงับ",
};

export const ITEM_STATUS_CLASSES: Record<string, string> = {
  เปิดใช้งาน: "bg-green-100 text-green-600 border border-green-200",
  ต่ำ: "bg-amber-100 text-amber-600 border border-amber-200",
  หมด: "bg-red-100 text-red-600 border border-red-200",
  ระงับ: "bg-slate-100 text-slate-500 border border-slate-200",
};

// ── Lot statuses ────────────────────────────────────────────────────────────
export const LOT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ใช้งานได้",
  INACTIVE: "ระงับการใช้งาน",
  SUSPENDED: "ระงับการใช้งาน",
  CANCELLED: "ยกเลิก",
};

// ── Requisition statuses (withdraw / borrow request flow) ───────────────────
export const REQUISITION_STATUS_LABELS: Record<string, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  COMPLETED: "เสร็จสิ้น",
  BORROWING: "กำลังยืม",
  PENDING_RETURN_CHECK: "รอตรวจรับคืน",
  REJECTED: "ถูกปฏิเสธ",
  CANCELLED: "ยกเลิก",
  DRAFT: "ร่าง",
};

export const REQUISITION_STATUS_CLASSES: Record<string, string> = {
  รออนุมัติ: "bg-amber-100 text-amber-700 border border-amber-200",
  อนุมัติแล้ว: "bg-blue-100 text-blue-700 border border-blue-200",
  เสร็จสิ้น: "bg-green-100 text-green-700 border border-green-200",
  กำลังยืม: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  รอตรวจรับคืน: "bg-purple-100 text-purple-700 border border-purple-200",
  ถูกปฏิเสธ: "bg-red-100 text-red-700 border border-red-200",
  ยกเลิก: "bg-slate-100 text-slate-500 border border-slate-200",
  ร่าง: "bg-slate-100 text-slate-500 border border-slate-200",
};

// Override labels for the borrow-return context (ReturnsClient)
export const BORROW_RETURN_STATUS_LABELS: Record<string, string> = {
  ...REQUISITION_STATUS_LABELS,
  COMPLETED: "คืนแล้ว",
  BORROWING: "รอการคืน",
};

export const BORROW_RETURN_STATUS_CLASSES: Record<string, string> = {
  ...REQUISITION_STATUS_CLASSES,
  คืนแล้ว: "bg-green-100 text-green-700 border border-green-200",
  รอการคืน: "bg-blue-100 text-blue-700 border border-blue-200",
};

// ── Reusable return-request statuses (returns-department flow) ──────────────
export const REUSABLE_RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "รอดำเนินการ",
  PROCESSING: "กำลังตรวจรับ",
  COMPLETED: "เสร็จสิ้น",
};

/** Badge สำหรับสถานะคำขอคืน reusable (request list + detail) */
export const REUSABLE_RETURN_STATUS_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  REQUESTED: {
    label: REUSABLE_RETURN_STATUS_LABELS.REQUESTED,
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-200",
  },
  PROCESSING: {
    label: REUSABLE_RETURN_STATUS_LABELS.PROCESSING,
    bg: "bg-sky-100",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  COMPLETED: {
    label: REUSABLE_RETURN_STATUS_LABELS.COMPLETED,
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
  },
};

/** ป้ายไทยสำหรับคำขอคืน reusable หรือ fallback ไปสถานะคำขอเบิก */
export function getReturnRequestListStatusLabel(code: string): string {
  return (
    REUSABLE_RETURN_STATUS_LABELS[code] ?? REQUISITION_STATUS_LABELS[code] ?? code
  );
}

// ── Reusable unit (ครุภัณฑ์ทับกลับ) — สถานะหน่วย / สภาพ ───────────────────────
export const REUSABLE_UNIT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "พร้อมใช้งาน",
  IN_USE: "กำลังใช้งาน",
  REPAIR: "ซ่อมบำรุง",
  DISPOSED: "จำหน่ายออก",
  BORROWED: "ถูกยืม",
  MAINTENANCE: "ซ่อมบำรุง",
  RETIRED: "เลิกใช้งาน",
  LOST: "สูญหาย",
};

/** สภาพหน่วยทับกลับ — ใช้คำชุดเดียวกับ dropdown รับคืน (ProcessReturn / รายงานสภาพคืน) */
export const REUSABLE_UNIT_CONDITION_LABELS: Record<string, string> = {
  GOOD: "สภาพดี",
  DAMAGED: "ชำรุด",
  LOST: "สูญหาย",
  INCOMPLETE: "คืนไม่ครบ",
  FAIR: "พอใช้",
  POOR: "แย่",
  BROKEN: "ชำรุด",
};

/** สถานะหน่วย reusable (IN_USE, …) — fallback ไป ITEM_STATUS_LABELS ถ้าเป็นค่าคลังทั่วไป */
export function getReusableUnitStatusLabel(code: string | null | undefined): string {
  if (code == null || !String(code).trim()) return "—";
  const k = String(code).trim().toUpperCase();
  return (
    REUSABLE_UNIT_STATUS_LABELS[k] ??
    ITEM_STATUS_LABELS[k] ??
    code
  );
}

export function getReusableUnitConditionLabel(code: string | null | undefined): string {
  if (code == null || !String(code).trim()) return "—";
  const k = String(code).trim().toUpperCase();
  return REUSABLE_UNIT_CONDITION_LABELS[k] ?? code;
}

/** ป้ายสีสถานะหน่วย (ตาราง/โมดัล) — key เป็นสตริงอังกฤษจาก API */
export const REUSABLE_UNIT_STATUS_BADGE_CLASSES: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-900 border-emerald-200",
  IN_USE: "bg-blue-50 text-blue-900 border-blue-200",
  REPAIR: "bg-amber-50 text-amber-900 border-amber-200",
  MAINTENANCE: "bg-amber-50 text-amber-900 border-amber-200",
  DISPOSED: "bg-slate-100 text-slate-700 border-slate-200",
  RETIRED: "bg-slate-100 text-slate-600 border-slate-200",
  BORROWED: "bg-violet-50 text-violet-900 border-violet-200",
  LOST: "bg-rose-50 text-rose-900 border-rose-200",
};

export const REUSABLE_UNIT_CONDITION_BADGE_CLASSES: Record<string, string> = {
  GOOD: "bg-emerald-50 text-emerald-900 border-emerald-200",
  DAMAGED: "bg-rose-50 text-rose-900 border-rose-200",
  LOST: "bg-red-50 text-red-900 border-red-200",
  INCOMPLETE: "bg-orange-50 text-orange-900 border-orange-200",
  FAIR: "bg-amber-50 text-amber-900 border-amber-200",
  POOR: "bg-orange-50 text-orange-950 border-orange-200",
  BROKEN: "bg-rose-50 text-rose-900 border-rose-200",
};

export function getReusableUnitStatusBadgeClasses(code: string | null | undefined): string {
  if (code == null || !String(code).trim()) {
    return "bg-slate-50 text-slate-500 border-slate-200";
  }
  const k = String(code).trim().toUpperCase();
  return REUSABLE_UNIT_STATUS_BADGE_CLASSES[k] ?? "bg-slate-50 text-slate-700 border-slate-200";
}

export function getReusableUnitConditionBadgeClasses(code: string | null | undefined): string {
  if (code == null || !String(code).trim()) {
    return "bg-slate-50 text-slate-500 border-slate-200";
  }
  const k = String(code).trim().toUpperCase();
  return REUSABLE_UNIT_CONDITION_BADGE_CLASSES[k] ?? "bg-slate-50 text-slate-700 border-slate-200";
}

// ── Canonical column header strings ────────────────────────────────────────
export const COL = {
  // Item identity
  ITEM_CODE: "รหัสรายการ",
  ITEM_NAME: "ชื่อพัสดุ",
  ASSET_NAME: "ชื่อครุภัณฑ์",
  CATEGORY: "หมวดหมู่",
  TYPE: "ประเภท",
  UNIT: "หน่วย",       // for table columns
  UNIT_NAME: "หน่วยนับ", // for form labels and settings

  // Stock
  STOCK: "คงเหลือ",
  MIN_STOCK: "ขั้นต่ำ",
  LOCATION: "ตำแหน่งจัดเก็บ",

  // Dates
  DATE_RECEIVE: "วันที่รับเข้า",
  DATE_TRANSACTION: "วันที่ทำรายการ",
  DATE_TIME: "วันที่/เวลา",      // for stock movement
  DATE_CREATED: "วันที่สร้างรายการ",
  DATE_DUE: "กำหนดคืน",
  DATE_RETURNED: "วันที่คืนสำเร็จ",
  DATE_EXPIRY: "วันหมดอายุ",

  // People
  OPERATOR_STOCK: "ผู้ดำเนินการ",  // for stock movement
  OPERATOR_REQ: "ผู้ทำรายการ",     // for requisition tables
  BORROWER: "ผู้ยืม",
  DEPARTMENT: "แผนก",
  SUPPLIER: "ผู้จำหน่าย",

  // Documents
  DOC_NO: "เลขที่เอกสาร",
  LOT_CODE: "รหัส LOT",
  IMPORT_NO: "เลขที่นำเข้า",

  // Common
  STATUS: "สถานะ",
  ITEMS: "รายการ",
  MANAGE: "จัดการ",
  VERIFY: "ตรวจสอบ",
  NO: "#",
} as const;
