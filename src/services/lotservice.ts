import { api, PaginatedResponse } from "@/lib/apiClient";
import type * as Lot from "@/types/lot_type";

export interface PagedLots {
    items: Lot.UiLot[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

const LOTS_BASE = "/v1/lots";

// ============ Master Data Mapper ============
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
    createdAt: lot.created_at,
});

// ============ API Functions ============

/**
 * Get all lots with optional filters.
 * Pass `token` from a Server Component to authenticate the SSR request.
 */
export async function getLots(
    page: number = 1,
    limit: number = 10,
    filters?: {
        search?: string;
        warehouse?: string;
        category?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        expiry_days?: number;
    },
    token?: string
): Promise<PagedLots> {
    const params = { page, limit, ...filters };
    const res = await api.list<Lot.ApiLot>(LOTS_BASE, params as Record<string, unknown>, token);
    return {
        items: (res.data || []).map(mapApiLotToUi),
        meta: res.meta || { total: 0, page: 1, limit: 10, totalPages: 0 },
    };
}

/**
 * Get a single lot by ID.
 * Pass `token` from a Server Component to authenticate the SSR request.
 */
export async function getLotById(id: string, token?: string): Promise<Lot.UiLot | null> {
    try {
        const data = await api.get<Lot.ApiLot>(`${LOTS_BASE}/${id}`, undefined, token);
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
        const data = await api.post<Lot.ApiLot>(LOTS_BASE, payload);
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
 * Toggle lot status (ACTIVE / SUSPENDED)
 */
export async function toggleLotStatus(lotId: string): Promise<Lot.UiLot> {
    const data = await api.patch<Lot.ApiLot>(`${LOTS_BASE}/${lotId}/toggle-status`, {});
    return mapApiLotToUi(data);
}

/**
 * Adjust lot quantity
 */
export async function adjustLot(
    lotId: string,
    payload: Lot.AdjustLotPayload
): Promise<{ success: boolean; message: string; data?: Lot.UiLot }> {
    try {
        const data = await api.patch<Lot.ApiLot>(`${LOTS_BASE}/${lotId}/adjust`, payload);
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
    await api.delete(`${LOTS_BASE}/${lotId}`);
    return true;
}

/**
 * Get master suppliers list.
 * Pass `token` from a Server Component to authenticate the SSR request.
 */
export async function getMasterSuppliers(token?: string): Promise<Lot.MasterSupplier[]> {
    try {
        const data = await api.get<Lot.MasterSupplier[]>(`/v1/suppliers/option`, undefined, token);
        return data || [];
    } catch (error: any) {
        console.error("Failed to fetch suppliers:", {
            status: error?.status,
            message: error?.message,
        });
        return [];
    }
}