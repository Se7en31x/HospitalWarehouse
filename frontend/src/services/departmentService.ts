import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function req<T>(path: string, options?: RequestInit): Promise<T> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...getHeaders(), ...(options?.headers || {}) },
        cache: "no-store",
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
    return body.data as T;
}

export interface DepartmentOption {
    id: number;
    name: string;
}

export interface Department {
    id: number;
    name: string;
    description?: string | null;
    is_disable?: boolean | null;
    created_at?: string | null;
}

export const getDepartmentOptions = (): Promise<DepartmentOption[]> =>
    req("/v1/departments/option");

export const getDepartments = (page = 1, limit = 20, keyword = ""): Promise<{ items: Department[]; total: number }> =>
    req(`/v1/departments?page=${page}&limit=${limit}&keyword=${encodeURIComponent(keyword)}`);

export const createDepartment = (data: { name: string; description?: string }): Promise<{ id: number }> =>
    req("/v1/departments", {
        method: "POST",
        body: JSON.stringify(data),
    });

export const updateDepartment = (id: number, data: { name?: string; description?: string; is_disable?: boolean }): Promise<{ id: number }> =>
    req(`/v1/departments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });

export const deleteDepartment = (id: number): Promise<void> =>
    req(`/v1/departments/${id}`, { method: "DELETE" });
