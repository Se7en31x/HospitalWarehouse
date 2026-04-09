import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...getHeaders(), ...(options?.headers || {}) },
        cache: "no-store",
    });
    
    let body;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        body = await res.json();
    } else {
        throw new Error(`Unexpected response type: ${contentType}. Status: ${res.status}`);
    }

    if (!res.ok) throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
    return body.data as T;
}

async function requestList<T>(path: string): Promise<T> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
    const res = await fetch(`${API_URL}${path}`, {
        headers: getHeaders(),
        cache: "no-store",
    });

    let body;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        body = await res.json();
    } else {
        throw new Error(`Unexpected response type: ${contentType}. Status: ${res.status}`);
    }

    if (!res.ok) throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
    
    // ปรับ Mapping ให้ตรงกับ JSON: เอา data ไปใส่ใน items และกระจาย meta ออกมา
    return { 
        items: body.data ?? [], 
        ...(body.meta ?? {}) 
    } as unknown as T;
}

// ============ Types (ปรับตาม JSON จริง) ============
export interface Asset {
    id: string;              // 🟢 เปลี่ยนจาก number เป็น string (UUID)
    asset_code: string;
    item_id: string;
    item_name: string;       // 🟢 เพิ่มตาม JSON
    item_code: string;       // 🟢 เพิ่มตาม JSON
    serial_no: string | null;
    department_id: number | null;
    department_name: string | null; // 🟢 เพิ่มตาม JSON
    status: string;
    note: string | null;
    receive_doc_no: string;  // 🟢 เพิ่มตาม JSON
    created_at: string;
    updated_at: string;      // 🟢 เพิ่มตาม JSON
    purchase_date: string | null;
    warranty_expire: string | null;
}

export interface AssetListResponse {
    items: Asset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface GetAssetsParams {
    page?: number;
    limit?: number;
    keyword?: string;
    department_id?: string;
    status?: string;
    item_id?: string;
}

// ============ API ============
export async function getAssets(params: GetAssetsParams = {}): Promise<AssetListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.keyword) query.set("keyword", params.keyword);
    if (params.department_id) query.set("department_id", params.department_id);
    if (params.status) query.set("status", params.status);
    if (params.item_id) query.set("item_id", params.item_id);
    
    return requestList<AssetListResponse>(`/v1/assets?${query.toString()}`);
}

export async function getAssetById(id: string): Promise<Asset> { // 🟢 เปลี่ยน ID เป็น string
    return request<Asset>(`/v1/assets/${id}`);
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<Asset> { // 🟢 เปลี่ยน ID เป็น string
    return request<Asset>(`/v1/assets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteAsset(id: string): Promise<void> {
    return request<void>(`/v1/assets/${id}`, {
        method: "DELETE",
    });
}