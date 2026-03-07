import Cookies from "js-cookie";
import type {
    ApiResponse,
    Category,
    CategoryPayload,
    Unit,
    UnitPayload,
    Warehouse,
    WarehousePayload,
} from "@/types/settings_type";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SETTINGS_BASE = "/v1";

const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const contentType = res.headers.get("content-type") || "";

    // Defensive parse: backend errors can come back as HTML and break JSON parsing.
    if (!contentType.includes("application/json")) {
        const text = await res.text();
        const preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
        throw new Error(`Invalid response format (${res.status}): ${preview || "non-JSON response"}`);
    }

    const body = (await res.json()) as ApiResponse<T> | { error?: string; message?: string };

    if (!res.ok) {
        const message = "error" in body ? body.error : body.message;
        throw new Error(message || "Request failed");
    }

    return body as ApiResponse<T>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...(options?.headers || {}),
        },
        cache: "no-store",
    });

    const json = await parseResponse<T>(res);
    return json.data;
}

async function requestEnvelope<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...(options?.headers || {}),
        },
        cache: "no-store",
    });

    return parseResponse<T>(res);
}

async function fetchAllPages<T>(basePath: string): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
        const res = await requestEnvelope<T[]>(`${basePath}?page=${page}&limit=${limit}&keyword=`);
        all.push(...(res.data || []));

        if (!res.meta?.nextPage) break;
        page = res.meta.nextPage;
    }

    return all;
}

export const getCategories = async () => {
    return fetchAllPages<Category>(`${SETTINGS_BASE}/categories`);
};

export const getCategoryById = (id: string) => request<Category>(`${SETTINGS_BASE}/categories/${id}`);

export const createCategory = (payload: CategoryPayload) =>
    request<Category>(`${SETTINGS_BASE}/categories`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateCategory = (id: string, payload: Partial<CategoryPayload>) =>
    request<Category>(`${SETTINGS_BASE}/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });

export const deleteCategory = (id: string) =>
    request<Category>(`${SETTINGS_BASE}/categories/${id}`, {
        method: "DELETE",
    });

// Units
export const getUnits = async () => {
    return fetchAllPages<Unit>(`${SETTINGS_BASE}/units`);
};

export const createUnit = (payload: UnitPayload) =>
    request<Unit>(`${SETTINGS_BASE}/units`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateUnit = (id: string, payload: Partial<UnitPayload>) =>
    request<Unit>(`${SETTINGS_BASE}/units/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });

export const deleteUnit = (id: string) =>
    request<Unit>(`${SETTINGS_BASE}/units/${id}`, {
        method: "DELETE",
    });

// Warehouses  
export const getWarehouses = async () => {
    return fetchAllPages<Warehouse>(`${SETTINGS_BASE}/warehouses`);
};

export const createWarehouse = (payload: WarehousePayload) =>
    request<Warehouse>(`${SETTINGS_BASE}/warehouses`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateWarehouse = (id: string, payload: Partial<WarehousePayload>) =>
    request<Warehouse>(`${SETTINGS_BASE}/warehouses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });

export const deleteWarehouse = (id: string) =>
    request<Warehouse>(`${SETTINGS_BASE}/warehouses/${id}`, {
        method: "DELETE",
    });