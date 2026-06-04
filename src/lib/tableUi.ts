/**
 * มาตรฐานตารางรายการ: หัวตารางใหญ่และหนากว่าแถวข้อมูล (text-base vs text-sm)
 * ใช้ร่วมกับ <table className="... text-sm ..."> และ tbody ด้านล่าง
 */
export const LIST_TABLE_HEAD_ROW =
  "bg-slate-50 text-slate-700 text-base font-semibold uppercase tracking-wide shadow-[inset_0_-1px_0_0_#e2e8f0] border-b border-slate-200 sticky top-0 z-10";

/** หัวคอลัมน์ทั่วไป */
export const LIST_TABLE_TH = "px-5 py-3.5 whitespace-nowrap";

/** หัวคอลัมน์ลำดับ # */
export const LIST_TABLE_TH_NUM = "px-4 py-3.5 text-center whitespace-nowrap";

/** แถวข้อมูล — ตัวอักษรเล็กกว่าหัว (ใช้คลาสสีที่เข้มขึ้น) */
export const LIST_TABLE_TBODY = "text-sm text-slate-700";

export const LIST_TABLE_TD = "px-5 py-3";

export const LIST_TABLE_TD_NUM =
  "px-4 py-3 text-center text-sm text-slate-600 tabular-nums";

/** ตารางคลังที่คอลัมน์กว้าง (เดิมใช้ px-6) */
export const LIST_TABLE_TH_WIDE = "px-6 py-3.5 whitespace-nowrap";

export const LIST_TABLE_TD_WIDE = "px-6 py-3";

/** คอลัมน์รูป / ไอคอนกลาง */
export const LIST_TABLE_TH_ICON = "px-3 py-3.5 text-center whitespace-nowrap";

/** ลำดับ # แถวแคบ (เช่นเบิกยืมสินค้า) */
export const LIST_TABLE_TH_ROWNUM_TIGHT = "px-2 py-3.5 text-center whitespace-nowrap";

export const LIST_TABLE_TD_COMPACT = "px-3 py-3";

/** หัวคอลัมน์แคบ (px-3 — รายการคำขอคลัง / รหัส) */
export const LIST_TABLE_TH_COMPACT = "px-3 py-3.5 whitespace-nowrap";
