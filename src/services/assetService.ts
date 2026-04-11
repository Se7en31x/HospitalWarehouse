import { api, PaginatedResponse } from "@/lib/apiClient";

// ============ Types ============
export interface Asset {
    id: string;              
    asset_code: string;
    item_id: string;
    item_name: string;       
    item_code: string;       
    serial_no: string | null;
    department_id: string | null;
    department_name: string | null; 
    status: string;
    note: string | null;
    receive_doc_no: string;  
    created_at: string;
    updated_at: string;      
    purchase_date: string | null;
    warranty_expire: string | null;
}

export type AssetListResponse = PaginatedResponse<Asset>;

export interface GetAssetsParams {
    page?: number;
    limit?: number;
    keyword?: string;
    department_id?: string;
    status?: string;
    item_id?: string;
    [key: string]: any; 
}

// ============ API ============
export async function getAssets(params: GetAssetsParams = {}): Promise<AssetListResponse> {
    // ใช้ api.list เพื่อรับข้อมูลแบบที่มี meta (total, page, totalPages)
    return api.list<Asset>(`/v1/assets`, params);
}

export async function getAssetById(id: string): Promise<Asset> {
    return api.get<Asset>(`/v1/assets/${id}`);
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    return api.patch<Asset>(`/v1/assets/${id}`, data);
}

export async function deleteAsset(id: string): Promise<void> {
    return api.delete(`/v1/assets/${id}`);
}