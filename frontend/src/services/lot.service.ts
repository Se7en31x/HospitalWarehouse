import Cookies from "js-cookie";
import type * as Lot from "@/types/lot_type";
import type * as Item from "@/types/items_type";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LOTS_BASE = "/v1/lots";

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

// ============ Mapping Functions ============
export const mapApiLotToUi = (lot: Lot.ApiLot): Lot.UiLot => ({
	id: lot.lot_code,
	itemName: lot.items?.name || "-",
	itemCode: lot.items?.code || "-",
	category: lot.items?.categories?.name || "-",
	warehouse: lot.warehouses?.name || "-",
	quantity: lot.quantity || 0,
	unit: lot.items?.unit?.name || "ชิ้น",
	cost: lot.cost_price || 0,
	expiryDate: lot.expried_at,
	status: lot.status,
});

// ============ API Functions ============

/**
 * Get all lots with optional filters
 */
export async function getLots(
	page: number = 1,
	limit: number = 10,
	filters?: {
		search?: string;
		warehouse?: string;
		category?: string;
		status?: string;
	}
): Promise<Lot.UiLot[]> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(filters?.search && { search: filters.search }),
		...(filters?.warehouse && { warehouse: filters.warehouse }),
		...(filters?.category && { category: filters.category }),
		...(filters?.status && { status: filters.status }),
	});

	const data = await request<Lot.ApiLot[]>(`${LOTS_BASE}?${params}`);
	return (data || []).map(mapApiLotToUi);
}

/**
 * Get a single lot by ID
 */
export async function getLotById(id: string): Promise<Lot.UiLot | null> {
	try {
		const data = await request<Lot.ApiLot>(`${LOTS_BASE}/${id}`);
		return mapApiLotToUi(data);
	} catch (error) {
		console.error("Failed to fetch lot:", error);
		return null;
	}
}

/**
 * Create a new lot
 */
export async function createLot(
	payload: Lot.CreateLotDto
): Promise<{ success: boolean; message: string; data?: Lot.UiLot }> {
	try {
		const data = await request<Lot.ApiLot>(`${LOTS_BASE}`, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return {
			success: true,
			message: "Create lot success",
			data: mapApiLotToUi(data),
		};
	} catch (error: any) {
		return {
			success: false,
			message: error.message || "Failed to create lot",
		};
	}
}

/**
 * Adjust lot quantity
 */
export async function adjustLot(
	lotId: string,
	payload: Lot.AdjustLotPayload
): Promise<{ success: boolean; message: string; data?: Lot.UiLot }> {
	try {
		const data = await request<Lot.ApiLot>(`${LOTS_BASE}/adjust/${lotId}`, {
			method: "PUT",
			body: JSON.stringify(payload),
		});
		return {
			success: true,
			message: "Adjust lot success",
			data: mapApiLotToUi(data),
		};
	} catch (error: any) {
		return {
			success: false,
			message: error.message || "Failed to adjust lot",
		};
	}
}

/**
 * Delete a lot
 */
export async function deleteLot(lotId: string): Promise<boolean> {
	try {
		await request<{ message: string }>(`${LOTS_BASE}/${lotId}`, {
			method: "DELETE",
		});
		return true;
	} catch (error: any) {
		console.error("Failed to delete lot:", error);
		return false;
	}
}

/**
 * Get master suppliers list
 */
export async function getMasterSuppliers(): Promise<Lot.MasterSupplier[]> {
	try {
		// This endpoint might need adjustment based on backend implementation
		const data = await request<Lot.MasterSupplier[]>(`/v1/suppliers`);
		return data || [];
	} catch (error) {
		console.error("Failed to fetch suppliers:", error);
		return [];
	}
}
