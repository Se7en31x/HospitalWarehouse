import Cookies from "js-cookie";
import * as Item from "@/types/items_type";

export type UiItem = Item.UiItem;
export type ApiItem = Item.ApiItem;
export type ItemOptions = Item.ItemOptions;
export type Option = Item.Option;
export type AllOptions = Item.AllOptions;
export type CreatePayload = Item.CreatePayload;
export type UpdatePayload = Item.UpdatePayload;
export type DeleteResponse = Item.DeleteResponse;

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ITEMS_BASE = "/v1/items";

const getHeaders = () => ({
	"Content-Type": "application/json",
	Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function parseJson<T>(res: Response): Promise<T> {
	const contentType = res.headers.get("content-type") || "";
	if (!contentType.includes("application/json")) {
		const raw = await res.text();
		throw new Error(raw.slice(0, 120) || "Invalid response");
	}
	return (await res.json()) as T;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			...getHeaders(),
			...(options?.headers || {}),
		},
		cache: "no-store",
	});

	const body = await parseJson<{ data: T; message?: string; error?: string }>(res);
	if (!res.ok) {
		throw new Error(body.error || body.message || "Request failed");
	}

	return body.data;
}

export const mapApiToUi = (item: Item.ApiItem): Item.UiItem => ({
	id: String(item.id),
	code: item.code || "-",
	name: item.name || "ไม่ระบุชื่อ",
	category: item.categories?.name || item.category?.name || "-",
	unit: item.unit?.name || "ชิ้น",
	location: item.warehouse?.name || "-",
	stock: item.current_stock || 0,
	minStock: item.min_stock || 0,
	price: 0,
	status: item.status || "ACTIVE",
	imageUrl: item.image_url || "",
});

export async function getInventoryItems(): Promise<Item.UiItem[]> {
	const data = await request<Item.ApiItem[]>(`${ITEMS_BASE}`);
	return (data || []).map(mapApiToUi);
}

export async function getItemOptions(): Promise<Item.AllOptions> {
	const data = await request<Item.AllOptions>(`${ITEMS_BASE}/option`);

	return {
		category: (data?.category || []).map((cat) => ({
			...cat,
			name: Item.categoryTranslations[cat.name] || cat.name,
		})),
		unit: data?.unit || [],
		warehouse: data?.warehouse || [],
	};
}

export async function createInventoryItem(payload: Item.CreatePayload) {
    
	return request<Item.ApiItem>(`${ITEMS_BASE}`, {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function updateInventoryItem(id: string, payload: Item.UpdatePayload) {
	return request<Item.ApiItem>(`${ITEMS_BASE}/${id}`, {
		method: "PUT",
		body: JSON.stringify(payload),
	});
}

export async function deleteInventoryItem(id: string): Promise<Item.DeleteResponse> {
	return request<Item.DeleteResponse>(`${ITEMS_BASE}/${id}`, {
		method: "DELETE",
	});
}
