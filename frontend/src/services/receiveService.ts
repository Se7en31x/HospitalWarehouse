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
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
    return body.data as T;
}

// sendListResponse returns { data: items[], meta: { total, page, ... } }
async function requestList<T>(path: string): Promise<T & { items: unknown[] }> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
    const res = await fetch(`${API_URL}${path}`, {
        headers: getHeaders(),
        cache: "no-store",
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
    return { items: body.data ?? [], ...(body.meta ?? {}) } as T & { items: unknown[] };
}

// ============ Types ============

export type ReceiveType = "PURCHASE" | "DONATION" | "PURCHASE_ASSET";
export type ReceiveStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface ReceiveItem {
    id: number;
    header_id: number;
    item_id: string;
    item_code: string | null;
    item_name: string | null;
    lot_code: string | null;
    expected_qty: number;
    qty: number;
    cost_price: number | null;
    expired_at: string | null;
}

export interface ReceiveHeader {
    id: number;
    doc_no: string;
    type: ReceiveType;
    status: ReceiveStatus;
    supplier_id: string | null;
    supplier_name: string | null;
    donor_name: string | null;
    receive_date: string;
    note: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    receive_item: ReceiveItem[];
}

export interface ReceiveListResponse {
    items: ReceiveHeader[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
}

export interface GetReceivesParams {
    page?: number;
    limit?: number;
    keyword?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
}

// ============ API Functions ============

export async function getAllReceives(params: GetReceivesParams = {}): Promise<ReceiveListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.keyword) query.set("keyword", params.keyword);
    if (params.type) query.set("type", params.type);
    if (params.status) query.set("status", params.status);
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    return requestList<ReceiveListResponse>(`/v1/receives?${query.toString()}`);
}

export async function getReceiveById(id: number): Promise<ReceiveHeader> {
    return request<ReceiveHeader>(`/v1/receives/${id}`);
}

export async function createReceive(payload: {
    doc_no: string;
    type: ReceiveType;
    status: "PENDING" | "COMPLETED";
    supplier_id?: string | null;
    donor_name?: string | null;
    receive_date?: string | null;
    note?: string | null;
    items: Array<{
        item_id: string;
        expected_qty: number;
        qty: number;
        cost_price?: number;
        lot_code?: string | null;
        expired_at?: string | null;
        warehouse_id?: string | null;
    }>;
}): Promise<ReceiveHeader> {
    return request<ReceiveHeader>("/v1/receives", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function confirmReceive(
    headerId: number,
    items: Array<{
        receive_item_id: number;
        qty: number;
        lot_code?: string;
        expired_at?: string;
        warehouse_id?: string;
        // สำหรับ PURCHASE_ASSET
        assets?: Array<{
            serial_no?: string;
            department_id?: number;
            note?: string;
        }>;
    }>
): Promise<ReceiveHeader> {
    return request<ReceiveHeader>(`/v1/receives/${headerId}/confirm`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
    });
}

export async function cancelReceive(headerId: number, reason?: string): Promise<ReceiveHeader> {
    return request<ReceiveHeader>(`/v1/receives/${headerId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason: reason || "" }),
    });
}

export async function getSuppliers(): Promise<Array<{ id: string; name: string }>> {
    return request<Array<{ id: string; name: string }>>("/v1/suppliers/option");
}
