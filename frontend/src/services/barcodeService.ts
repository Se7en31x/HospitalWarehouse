import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

// ============================================================
// Types — ตรงกับ response จาก backend resolveBarcode service
// ============================================================

export interface BarcodeUnitResult {
  id: string;
  unit_code: string;
  serial_no: string | null;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  department_id: number | null;
  status: string;
  condition: string;
}

export interface BarcodeLotResult {
  id: string;
  lot_code: string;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  quantity: number;
  status: string;
  expired_at: string | null;
}

export interface BarcodeItemResult {
  id: string;
  code: string;
  name: string;
  type: string;
  current_stock: number;
  status: string;
  warehouse_id: string | null;
}

export type BarcodeResolveResult =
  | { type: "UNIT"; value: string; unit: BarcodeUnitResult }
  | { type: "LOT"; value: string; lot: BarcodeLotResult }
  | { type: "ITEM"; value: string; item: BarcodeItemResult };

// ============================================================
// Core resolve function — ใช้ endpoint กลาง /v1/barcodes/resolve
// ทุกหน้าที่ต้องสแกน barcode ให้ใช้ฟังก์ชันนี้
// ============================================================

/**
 * ส่ง barcode value ไปที่ endpoint กลาง `/v1/barcodes/resolve`
 * ระบบจะ resolve ตามลำดับ: unit_code → serial_no → lot_code → item_code
 *
 * @param value - ค่า barcode ที่สแกนมา (รหัส unit / lot / item)
 * @param departmentId - (optional) กรอง unit ตาม department
 * @returns BarcodeResolveResult | null
 */
export async function resolveBarcode(
  value: string,
  departmentId?: string | number | null
): Promise<BarcodeResolveResult | null> {
  const key = (value || "").trim();
  if (!key) return null;
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");

  const query = new URLSearchParams();
  query.set("value", key);
  if (departmentId != null && String(departmentId).trim()) {
    query.set("department_id", String(departmentId));
  }

  try {
    const res = await fetch(`${API_URL}/v1/barcodes/resolve?${query.toString()}`, {
      headers: getHeaders(),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;

    const body = await res.json();
    if (!res.ok) return null;

    return (body?.data ?? null) as BarcodeResolveResult | null;
  } catch {
    return null;
  }
}

// ============================================================
// Context-specific helpers — แต่ละหน้าเรียกเพื่อตัดสินใจ
// ============================================================

/**
 * Resolve แล้วคืน item_code เพื่อหา item ใน local list
 * เหมาะสำหรับหน้าเบิก/ยืม ที่ต้องการ map ไปหา item ในตาราง
 */
export async function resolveToItemCode(
  value: string,
  departmentId?: string | number | null
): Promise<string | null> {
  const result = await resolveBarcode(value, departmentId);
  if (!result) return null;

  if (result.type === "ITEM") return result.item.code;
  if (result.type === "LOT") return result.lot.item_code;
  if (result.type === "UNIT") return result.unit.item_code;
  return null;
}

/**
 * Resolve แล้วคืน item_id โดยตรง
 */
export async function resolveToItemId(
  value: string,
  departmentId?: string | number | null
): Promise<string | null> {
  const result = await resolveBarcode(value, departmentId);
  if (!result) return null;

  if (result.type === "ITEM") return result.item.id;
  if (result.type === "LOT") return result.lot.item_id;
  if (result.type === "UNIT") return result.unit.item_id;
  return null;
}
