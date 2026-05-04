import { api, PaginatedResponse } from "@/lib/apiClient";
import type {
    ApiResponse,
    Category,
    CategoryPayload,
    Unit,
    UnitPayload,
    Warehouse,
    WarehousePayload,
    Supplier,
    SupplierPayload,
    SystemSettingsMap,
} from "@/types/settings_type";

const SETTINGS_BASE = "/v1";

// ============ Helper Functions ============

/**
 * ดึงข้อมูลทั้งหมดในครั้งเดียว (ใช้สำหรับพวก Master Data ใน Settings)
 */
async function fetchAllPages<T>(basePath: string, token?: string): Promise<T[]> {
    const res = await api.list<T>(basePath, { limit: 1000, _t: Date.now() }, token);
    return res.data || [];
}

// ============ API Functions ============

// --- Categories ---
export const getCategories = (token?: string) => fetchAllPages<Category>(`${SETTINGS_BASE}/categories`, token);

export const getCategoryById = (id: string) => 
    api.get<Category>(`${SETTINGS_BASE}/categories/${id}`);

export const createCategory = (payload: CategoryPayload) =>
    api.post<Category>(`${SETTINGS_BASE}/categories`, payload);

export const updateCategory = (id: string, payload: Partial<CategoryPayload>) =>
    api.patch<Category>(`${SETTINGS_BASE}/categories/${id}`, payload);

export const deleteCategory = (id: string) =>
    api.delete(`${SETTINGS_BASE}/categories/${id}`);

// --- Units ---
export const getUnits = (token?: string) => fetchAllPages<Unit>(`${SETTINGS_BASE}/units`, token);

export const createUnit = (payload: UnitPayload) =>
    api.post<Unit>(`${SETTINGS_BASE}/units`, payload);

export const updateUnit = (id: string, payload: Partial<UnitPayload>) =>
    api.patch<Unit>(`${SETTINGS_BASE}/units/${id}`, payload);

export const deleteUnit = (id: string) =>
    api.delete(`${SETTINGS_BASE}/units/${id}`);

// --- Warehouses ---
export const getWarehouses = (token?: string) => fetchAllPages<Warehouse>(`${SETTINGS_BASE}/warehouses`, token);

export const createWarehouse = (payload: WarehousePayload) =>
    api.post<Warehouse>(`${SETTINGS_BASE}/warehouses`, payload);

export const updateWarehouse = (id: string, payload: Partial<WarehousePayload>) =>
    api.patch<Warehouse>(`${SETTINGS_BASE}/warehouses/${id}`, payload);

export const deleteWarehouse = (id: string) =>
    api.delete(`${SETTINGS_BASE}/warehouses/${id}`);

// --- Suppliers ---
export const getSuppliers = (token?: string) => fetchAllPages<Supplier>(`${SETTINGS_BASE}/suppliers`, token);

export const createSupplier = (payload: SupplierPayload) =>
    api.post<Supplier>(`${SETTINGS_BASE}/suppliers`, payload);

export const updateSupplier = (id: string, payload: Partial<SupplierPayload>) =>
    api.patch<Supplier>(`${SETTINGS_BASE}/suppliers/${id}`, payload);

export const deleteSupplier = (id: string) =>
    api.delete(`${SETTINGS_BASE}/suppliers/${id}`);

// --- System Settings (Notifications/Schedules) ---
/** Pass `token` from a Server Component for authenticated SSR. */
export const getSystemSettings = (token?: string) =>
    api.get<SystemSettingsMap>(`${SETTINGS_BASE}/settings`, undefined, token);

export const updateSystemSettings = (payload: Record<string, string | number | boolean>) =>
    api.put<SystemSettingsMap>(`${SETTINGS_BASE}/settings`, payload);