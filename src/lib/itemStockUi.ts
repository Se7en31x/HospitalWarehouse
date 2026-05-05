import type { UiItem } from "@/types/items_type";

/** คงเหลือสำหรับแสดงและเทียบขั้นต่ำ — REUSABLE=available, MED_ASSET=จำนวนลงทะเบียน, อื่นๆ=current_stock */
export function getEffectiveStockForUiItem(
  item: UiItem,
  assetRegisteredByItemId?: Record<string, number>,
): number {
  if (item.type === "REUSABLE") {
    return typeof item.availableStock === "number" ? item.availableStock : 0;
  }
  if (item.type === "MED_ASSET") {
    return assetRegisteredByItemId?.[item.id] ?? 0;
  }
  return item.stock;
}

export function getStockLevelLabelForUiItem(
  item: UiItem,
  assetRegisteredByItemId?: Record<string, number>,
): "ปกติ" | "ต่ำ" | "หมด" | "ระงับ" {
  const lifecycle = String(item.status ?? "ACTIVE").trim().toUpperCase();
  if (lifecycle === "INACTIVE" || lifecycle === "UNAVAILABLE") return "ระงับ";

  const qty = getEffectiveStockForUiItem(item, assetRegisteredByItemId);
  const min = Math.max(0, Number(item.minStock) || 0);
  if (qty <= 0) return "หมด";
  if (min > 0 && qty <= min) return "ต่ำ";
  return "ปกติ";
}
