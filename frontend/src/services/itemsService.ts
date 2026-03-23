// ดึงข้อมูล item หลายตัวด้วย id
export async function getItemsByIds(ids: (string | number)[]): Promise<ApiItem[]> {
	if (!ids || ids.length === 0) return [];
	const query = ids.map((id) => `ids=${id}`).join("&");
	// สมมติ backend รองรับ /v1/items/batch?ids=1&ids=2
	const data = await request<ApiItem[]>(`/v1/items/batch?${query}`);
	return data || [];
}
import Cookies from "js-cookie";
import * as Item from "@/types/items_type";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => {
	let token = "";
	try {
		// Only works in browser context
		if (typeof window !== "undefined") {
			token = Cookies.get("user_token") || "";
		}
	} catch {
		// Silently fail if cookies are not available (server-side rendering)
	}
	
	return {
		"Content-Type": "application/json",
		...(token && { Authorization: `Bearer ${token}` }),
	};
};

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
	categoryId: item.category_id || "",
	category: item.category_name || item.categories?.name || item.category?.name || "-",
	unitId: item.unit_id || "",
	unit: item.unit_name || item.unit?.name || "ชิ้น",
	warehouseId: item.warehouse_id || "",
	location: item.warehouse_name || item.warehouses?.name || item.warehouse?.name || "-",
	stock: item.current_stock || 0,
	description: item.description || "",
	minStock: item.min_stock || 0,
	price: 0,
	status: item.status || "ACTIVE",
	imageUrl: item.image_url || "",
	type: item.type || "CONSUMABLE",
	allowed_req: item.allowed_req ?? true,
	allowed_borrow: item.allowed_borrow ?? false,
});

export async function getInventoryItems(filters: GetItemsFilters = {}): Promise<Item.UiItem[]> {
	const query = new URLSearchParams();
	if (filters.allowed_req !== undefined) query.append("allowed_req", String(filters.allowed_req));
	if (filters.allowed_borrow !== undefined) query.append("allowed_borrow", String(filters.allowed_borrow));
	if (filters.keyword) query.append("keyword", filters.keyword);
	if (filters.type) query.append("type", filters.type);
	if (filters.page) query.append("page", String(filters.page));
	if (filters.limit) query.append("limit", String(filters.limit));

	const data = await request<Item.ApiItem[]>(`/v1/items?${query.toString()}`);
	return (data || []).map(mapApiToUi);
}

export async function getcategoriesOptions(): Promise<Item.categoryOptions> {
	const data = await request<Item.Option[]>(`/v1/categories/option`);
	return data || [];
}

export async function getWarehousesOptions(): Promise<Item.warehouseOptions> {
	const data = await request<Item.Option[]>(`/v1/warehouses/option`);
	return data || [];
}

export async function getUnitsOptions(): Promise<Item.unitOptions> {
	const data = await request<Item.Option[]>(`/v1/units/option`);
	return data || [];
}

export async function getItemOptions(): Promise<ItemOptions> {
	const [categories, warehouses, units] = await Promise.all([
		getcategoriesOptions(),
		getWarehousesOptions(),
		getUnitsOptions(),
	]);
	return {
		category: categories,
		warehouse: warehouses,
		unit: units,
	};
}

export async function createInventoryItem(payload: FormData) {
	if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
	let token = "";
	if (typeof window !== "undefined") {
		token = Cookies.get("user_token") || "";
	}
	const res = await fetch(`${API_URL}/v1/items`, {
		method: "POST",
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		body: payload,
		cache: "no-store",
	});
	const body = await parseJson<{ data: Item.ApiItem; message?: string; error?: string }>(res);
	if (!res.ok) throw new Error(body.error || body.message || "Request failed");
	return body.data;
}

export async function updateInventoryItem(id: string, payload: Item.UpdatePayload) {
	if (!id) {
		throw new Error("Item ID is required for update");
	}
	console.log(`Updating item - ID: ${id}, URL: /v1/items/${id}`, payload);
	return request<Item.ApiItem>(`/v1/items/${id}`, {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
}

export async function updateItemImage(id: string, file: File) {
	if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
	let token = "";
	if (typeof window !== "undefined") {
		token = Cookies.get("user_token") || "";
	}
	const fd = new FormData();
	fd.append("image", file);
	const res = await fetch(`${API_URL}/v1/files/items/${id}/image`, {
		method: "PATCH",
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		body: fd,
		cache: "no-store",
	});
	const body = await parseJson<{ message?: string; error?: string }>(res);
	if (!res.ok) throw new Error(body.error || body.message || "Request failed");
}

export async function removeItemImage(id: string) {
	return request(`/v1/files/items/${id}/image`, { method: "DELETE" });
}


export async function deleteInventoryItem(id: string): Promise<Item.DeleteResponse> {
	return request<Item.DeleteResponse>(`/v1/items/${id}`, {
		method: "DELETE",
	});
}