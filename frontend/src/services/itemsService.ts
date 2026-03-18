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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
	categoryId: item.category_id || "",
	category: item.category_name || item.categories?.name || item.category?.name || "-",
	unitId: item.unit_id || "",
	unit: item.unit_name || item.unit?.name || "ชิ้น",
	warehouseId: item.warehouse_id || "",
	location: item.warehouse_name || item.warehouse?.name || "-",
	stock: item.current_stock || 0,
	minStock: item.min_stock || 0,
	price: 0,
	status: item.status || "ACTIVE",
	imageUrl: item.image_url || "",
});

export async function getInventoryItems(): Promise<Item.UiItem[]> {
	const data = await request<Item.ApiItem[]>(`/v1/items`);
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

export async function createInventoryItem(payload: Item.CreatePayload) {
    
	return request<Item.ApiItem>(`/v1/items`, {
		method: "POST",
		body: JSON.stringify(payload),
	});
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

export async function deleteInventoryItem(id: string): Promise<Item.DeleteResponse> {
	return request<Item.DeleteResponse>(`/v1/items/${id}`, {
		method: "DELETE",
	});
}