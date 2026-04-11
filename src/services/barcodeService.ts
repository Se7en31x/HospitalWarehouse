import { api } from "@/lib/apiClient";

// ============================================================
// Types
// ============================================================

export interface BarcodeUnitResult {
  id: string;
  unit_code: string;
  serial_no: string | null;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  department_id: string | null;
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
// Core resolve function
// ============================================================

export async function resolveBarcode(
  value: string,
  departmentId?: string | number | null
): Promise<BarcodeResolveResult | null> {
  const key = (value || "").trim();
  if (!key) return null;

  const params: Record<string, unknown> = { value: key };
  if (departmentId != null && String(departmentId).trim()) {
    params.department_id = String(departmentId);
  }

  try {
    // ใช้ api.get จะจัดการ headers และ unwrapping data ให้อัตโนมัติ
    const data = await api.get<BarcodeResolveResult>(`/v1/barcodes/resolve`, params);
    return data || null;
  } catch (error) {
    // กรณี barcode ไม่พบ หรือ error อื่นๆ ให้คืนค่า null ตาม logic เดิม
    console.error("Barcode resolve failed:", error);
    return null;
  }
}

// ============================================================
// Context-specific helpers
// ============================================================

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