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

export async function getAssets(params: GetAssetsParams = {}, token?: string): Promise<AssetListResponse> {
    return api.list<Asset>(`/v1/assets`, params, token);
}

/**
 * Returns { [item_id]: registeredCount } for each requested item type UUID.
 * Each medical_assets row = one physical unit, so this is the real "คงเหลือ"
 * for asset-type items (items.current_stock is always 0 for assets).
 */
export async function getAssetCounts(itemIds: string[], token?: string): Promise<Record<string, number>> {
    if (!itemIds.length) return {};
    return api.get<Record<string, number>>(
        `/v1/assets/counts`,
        { item_ids: itemIds.join(',') },
        token,
    );
}

/**
 * Fetch a single asset by its ID.
 * Pass `token` from a Server Component for SSR requests.
 */
export async function getAssetById(id: string, token?: string): Promise<Asset> {
    return api.get<Asset>(`/v1/assets/${id}`, undefined, token);
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    return api.patch<Asset>(`/v1/assets/${id}`, data);
}

export async function deleteAsset(id: string): Promise<void> {
    return api.delete(`/v1/assets/${id}`);
}