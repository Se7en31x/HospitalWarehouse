import { api } from "@/lib/apiClient";
import * as Item from "@/types/items_type";

// Re-export types เพื่อให้ภายนอกเรียกใช้จากไฟล์นี้ได้เลย
export type UiItem = Item.UiItem;
export type ApiItem = Item.ApiItem;
export type Option = Item.Option;
export type categoryOptions = Item.categoryOptions;
export type warehouseOptions = Item.warehouseOptions;
export type unitOptions = Item.unitOptions;
export type CreatePayload = Item.CreatePayload;
export type UpdatePayload = Item.UpdatePayload;
export type DeleteResponse = Item.DeleteResponse;

export interface ItemOptions {
    category: Item.categoryOptions;
    warehouse: Item.warehouseOptions;
    unit: Item.unitOptions;
}

export interface GetItemsFilters {
    allowed_req?: boolean;
    allowed_borrow?: boolean;
    keyword?: string;
    type?: string;
    page?: number;
    limit?: number;
}

export interface PagedItems {
  items: Item.UiItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Mapper: แปลงข้อมูลจาก API (Snake Case) เป็น UI (Camel Case)
export const mapApiToUi = (item: Item.ApiItem): Item.UiItem => ({
    id: String(item.id),
    code: item.code || "-",
    name: item.name || "ไม่ระบุชื่อ",
    categoryId: item.category_id || "",
    category: item.category_name || item.categories?.name || item.category?.name || "-",
    unitId: item.unit_id || "",
    unit: item.unit_name || item.unit?.name || "ชิ้น",
    warehouseId: item.warehouse_id || "",
    location: item.warehouse_name || item.warehouses?.name || item.warehouse?.name || "-",
    stock: item.current_stock || 0,
    availableStock: item.available_stock === null || item.available_stock === undefined ? undefined : Number(item.available_stock),
    description: item.description || "",
    minStock: item.min_stock || 0,
    price: 0,
    status: item.status || "ACTIVE",
    imageUrl: item.image_url || "",
    type: item.type || "CONSUMABLE",
    allowed_req: item.allowed_req ?? true,
    allowed_borrow: item.allowed_borrow ?? false,
    updatedAt: item.updated_at || null,
});

/** ---------------------------------------------------------
 * API CALLS
 * --------------------------------------------------------- */

// ดึงรายการพัสดุตาม ID (สำหรับ SSR header pre-fetch)
export async function getInventoryItemById(id: string, token?: string): Promise<Item.ApiItem> {
    return api.get<Item.ApiItem>(`/v1/items/${id}`, undefined, token);
}

// ดึงรายการพัสดุพร้อมตัวกรอง
// token — ส่งมาจาก Server Component เพื่อใช้ใน SSR (ไม่ต้องส่งตอนเรียกจาก Client)
export async function getInventoryItems(filters: GetItemsFilters = {}, token?: string): Promise<Item.UiItem[]> {
    const data = await api.get<Item.ApiItem[]>(`/v1/items`, filters as Record<string, unknown>, token);
    return (data || []).map(mapApiToUi);
}

// ดึงรายการพัสดุแบบ paginated — คืน items + meta สำหรับ server-side pagination
export async function getInventoryItemsPage(
    filters: GetItemsFilters = {},
    token?: string
): Promise<PagedItems> {
    const res = await api.list<Item.ApiItem>(`/v1/items`, filters as Record<string, unknown>, token);
    return {
        items: (res.data || []).map(mapApiToUi),
        meta: res.meta || { total: 0, page: 1, limit: 10, totalPages: 0 },
    };
}

// ดึงข้อมูลทั้งหมด (ทำ Pagination วนลูปจนครบ)
export async function getAllInventoryItems(filters: Omit<GetItemsFilters, "page" | "limit"> = {}): Promise<Item.UiItem[]> {
    const allItems: Item.UiItem[] = [];
    const limit = 10;
    let page = 1;

    while (true) {
        const batch = await getInventoryItems({ ...filters, page, limit });
        allItems.push(...batch);
        if (batch.length < limit) break;
        page += 1;
    }

    return allItems;
}

// ดึงพัสดุหลายรายการด้วย Array ของ ID
export async function getItemsByIds(ids: (string | number)[]): Promise<ApiItem[]> {
    if (!ids || ids.length === 0) return [];
    // สำหรับเคส query string พิเศษ สามารถส่งเป็น string ต่อท้ายได้
    const query = ids.map((id) => `ids=${id}`).join("&");
    return api.get<ApiItem[]>(`/v1/items/batch?${query}`);
}

// ดึง Options สำหรับ Dropdown ต่างๆ
export async function getcategoriesOptions(): Promise<Item.categoryOptions> {
    return api.get<Item.Option[]>(`/v1/categories/option`);
}

export async function getWarehousesOptions(token?: string): Promise<Item.warehouseOptions> {
    return api.get<Item.Option[]>(`/v1/warehouses/option`, undefined, token);
}

export async function getUnitsOptions(): Promise<Item.unitOptions> {
    return api.get<Item.Option[]>(`/v1/units/option`);
}

// ดึง Options ทั้งหมดพร้อมกัน
export async function getItemOptions(): Promise<ItemOptions> {
    const [category, warehouse, unit] = await Promise.all([
        getcategoriesOptions(),
        getWarehousesOptions(),
        getUnitsOptions(),
    ]);
    return { category, warehouse, unit };
}

// สร้างพัสดุใหม่ (รองรับรูปภาพผ่าน FormData)
export async function createInventoryItem(payload: FormData): Promise<Item.ApiItem> {
    return api.upload<Item.ApiItem>(`/v1/items`, payload, "POST");
}

// อัปเดตข้อมูลพัสดุ
export async function updateInventoryItem(id: string, payload: Item.UpdatePayload): Promise<Item.ApiItem> {
    if (!id) throw new Error("Item ID is required for update");
    return api.patch<Item.ApiItem>(`/v1/items/${id}`, payload);
}

// อัปเดต/เปลี่ยนรูปภาพพัสดุ
export async function updateItemImage(id: string, file: File): Promise<void> {
    const fd = new FormData();
    fd.append("image", file);
    await api.upload(`/v1/files/items/${id}/image`, fd, "PATCH");
}

// ลบรูปภาพ
export async function removeItemImage(id: string): Promise<void> {
    await api.delete(`/v1/files/items/${id}/image`);
}

// ลบพัสดุ
export async function deleteInventoryItem(id: string): Promise<Item.DeleteResponse> {
    return api.delete<Item.DeleteResponse>(`/v1/items/${id}`);
}