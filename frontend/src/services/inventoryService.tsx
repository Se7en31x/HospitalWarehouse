import Cookies from "js-cookie";
import * as Item from "../app/interfaces/item.interface";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Helper: Headers ---
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Cookies.get('user_token')}`
});

// --- Helper: Mapper (ใช้ชื่อตรงตาม Interface ใหม่) ---
export const mapApiToUi = (item: Item.ApiItem): Item.UiItem => ({
    id: item.id.toString(),
    code: item.code || "-",
    name: item.name || "ไม่ระบุชื่อ",
    category: item.category?.name || "-",
    unit: item.unit?.name || "ชิ้น",
    location: item.warehouse?.name || "-",
    stock: item.current_stock || 0,
    minStock: item.min_stock || 0, // ✅ อิงตาม UiItem.minStock
    price: 0,
    status: item.status,
    imageUrl: item.image_url || "",
});

// --- API Functions ---

export async function getInventoryItems(): Promise<Item.UiItem[]> {
    try {
        const res = await fetch(`${API_URL}/item`, {
            method: 'GET',
            headers: getHeaders(),
            cache: 'no-store'
        });

        if (!res.ok) return [];

        const { data } = await res.json() as { data: Item.ApiItem[] };
        return (data || []).map(mapApiToUi);
    } catch (error) {
        console.error("🔥 Get Items Error:", error);
        return [];
    }
}

export async function getItemOptions(): Promise<Item.AllOptions> { // ✅ เปลี่ยนเป็น AllOptions
    try {
        const res = await fetch(`${API_URL}/item/option`, {
            method: 'GET',
            headers: getHeaders(),
            cache: 'no-store'
        });

        if (!res.ok) return { category: [], unit: [], warehouse: [] };

        const { data } = await res.json() as { data: Item.AllOptions };

        return {
            category: (data.category || []).map((cat: Item.Option) => ({ // ✅ ใช้ Item.Option
                ...cat,
                name: Item.categoryTranslations[cat.name] || cat.name
            })),
            unit: data.unit || [],
            warehouse: data.warehouse || []
        };
    } catch (error) {
        return { category: [], unit: [], warehouse: [] };
    }
}

export async function createInventoryItem(payload: Item.CreatePayload) { // ✅ เปลี่ยนเป็น CreatePayload
    const res = await fetch(`${API_URL}/item`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const { error } = await res.json() as { error: string };
        throw new Error(error || "Create failed");
    }
    return res.json();
}

export async function updateInventoryItem(id: string | number, payload: Item.UpdatePayload) { // ✅ เปลี่ยนเป็น UpdatePayload
    const res = await fetch(`${API_URL}/item/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const { error } = await res.json() as { error: string };
        throw new Error(error || "Update failed");
    }
    return res.json();
}

export async function deleteInventoryItem(id: string | number): Promise<Item.DeleteResponse> { // ✅ เปลี่ยนเป็น DeleteResponse
    const res = await fetch(`${API_URL}/item/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });

    if (!res.ok) {
        const { error } = await res.json() as { error: string };
        throw new Error(error || "Delete failed");
    }
    return res.json() as Promise<Item.DeleteResponse>;
}