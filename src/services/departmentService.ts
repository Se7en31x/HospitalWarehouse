import { api } from "@/lib/apiClient";

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

export interface DepartmentListResponse {
    items: Department[];
    total: number;
}

/** ---------------------------------------------------------
 * API CALLS
 * --------------------------------------------------------- */

export const getDepartmentOptions = (): Promise<DepartmentOption[]> =>
    api.get<DepartmentOption[]>("/v1/departments/option");

export const getDepartments = async (
    page = 1, 
    limit = 20, 
    keyword = ""
): Promise<DepartmentListResponse> => {
    const res = await api.list<Department>("/v1/departments", { 
        page, 
        limit, 
        keyword 
    });
    
    return {
        items: res.data || [],
        total: res.meta?.total || 0
    };
};

export const createDepartment = (data: { name: string; description?: string }): Promise<{ id: number }> =>
    api.post<{ id: number }>("/v1/departments", data);

export const updateDepartment = (
    id: number, 
    data: { name?: string; description?: string; is_disable?: boolean }
): Promise<{ id: number }> =>
    api.patch<{ id: number }>(`/v1/departments/${id}`, data);

export const deleteDepartment = (id: number): Promise<void> =>
    api.delete(`/v1/departments/${id}`);