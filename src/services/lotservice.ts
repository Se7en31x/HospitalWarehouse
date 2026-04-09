import Cookies from "js-cookie";
import type * as Lot from "@/types/lot_type";
import type * as Item from "@/types/items_type";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LOTS_BASE = "/v1/lots";

const getHeaders = () => ({
	"Content-Type": "application/json",
	Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function parseJson<T>(res: Response, path?: string): Promise<T> {
	const contentType = res.headers.get("content-type") || "";
	
	// Handle 204 No Content or empty responses
	if (res.status === 204 || res.headers.get("content-length") === "0") {
		return {} as T;
	}

	if (!contentType.includes("application/json")) {
		const raw = await res.text();
		throw new Error(`API Error ${res.status} at ${path || 'unknown'}: Expected JSON, got ${contentType}. Body: ${raw.slice(0, 120)}`);
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

	       const body = await parseJson<any>(res, path);
	       if (!res.ok) {
		       throw new Error(body?.error || body?.message || `Request failed [${res.status}] at ${path}`);
	       }

	       // รองรับทั้งกรณีที่ response เป็น { data: ... } หรือ array/object ตรง ๆ
	       if (body && typeof body === 'object' && 'data' in body) {
		       return body.data as T;
	       }
	       return body as T;
}

/**
 * Toggle lot status (ACTIVE / SUSPENDED)
 */
export async function toggleLotStatus(lotId: string): Promise<Lot.UiLot> {
	const data = await request<Lot.ApiLot>(`${LOTS_BASE}/${lotId}/toggle-status`, {
		method: "PATCH",
	});
	return mapApiLotToUi(data);
}

// ============ Master Data ============
export const mapApiLotToUi = (lot: Lot.ApiLot): Lot.UiLot => ({
	id: lot.id,
	lotCode: lot.lot_code,
	itemName: lot.item_name || "-",
	itemCode: lot.item_code || "-",
	category: lot.category_name || "-",
	warehouse: lot.warehouse_name || "-",
	quantity: lot.quantity || 0,
	unit: lot.unit_name || "ชิ้น",
	cost: 0,
	expiryDate: lot.expired_at,
	status: lot.status,
    expiryStatus: lot.expiry_status as Lot.ExpiryStatus,
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
		const data = await request<Lot.ApiLot>(`${LOTS_BASE}/${lotId}/adjust`, {
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
	await request<{ message: string }>(`${LOTS_BASE}/${lotId}`, {
		method: "DELETE",
	});
	return true;
}

/**
 * Get master suppliers list
 */
export async function getMasterSuppliers(): Promise<Lot.MasterSupplier[]> {
	try {
		// ใช้ endpoint /option ตาม backend
		const data = await request<Lot.MasterSupplier[]>(`/v1/suppliers/option`);
		return data || [];
	} catch (error: any) {
		console.error("Failed to fetch suppliers:", error);
		return [];
	}
}
