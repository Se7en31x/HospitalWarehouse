import { api, PaginatedResponse } from "@/lib/apiClient";

// ============ Types ============

export type ReceiveType = "PURCHASE" | "DONATION" | "PURCHASE_ASSET" | "REUSABLE_UNIT";
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
    [key: string]: any;
}

// ============ API Functions ============

export async function getAllReceives(params: GetReceivesParams = {}): Promise<ReceiveListResponse> {
    const res = await api.list<ReceiveHeader>(`/v1/receives`, params as Record<string, unknown>);
    
    return {
        items: res.data || [],
        total: res.meta?.total || 0,
        page: res.meta?.page || 1,
        limit: res.meta?.limit || 20,
        totalPages: res.meta?.totalPages || 1,
        nextPage: res.meta?.nextPage ?? null,
        prevPage: res.meta?.prevPage ?? null,
    };
}

export async function getAllReceivesPages(params: GetReceivesParams = {}): Promise<ReceiveHeader[]> {
    const firstPage = await getAllReceives({ ...params, page: 1, limit: params.limit || 100 });
    const items = [...firstPage.items];

    for (let page = 2; page <= Math.max(1, firstPage.totalPages || 1); page += 1) {
        const nextPage = await getAllReceives({
            ...params,
            page,
            limit: firstPage.limit || 100,
        });
        items.push(...nextPage.items);
    }

    return items;
}

export async function getReceiveById(id: number): Promise<ReceiveHeader> {
    return api.get<ReceiveHeader>(`/v1/receives/${id}`);
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
    return api.post<ReceiveHeader>("/v1/receives", payload);
}

export async function confirmReceive(
    headerId: number,
    items: Array<{
        receive_item_id: number;
        qty: number;
        lot_code?: string;
        expired_at?: string;
        warehouse_id?: string;
        assets?: Array<{
            serial_no?: string;
            department_id?: string;
            note?: string;
        }>;
    }>
): Promise<ReceiveHeader> {
    return api.patch<ReceiveHeader>(`/v1/receives/${headerId}/confirm`, { items });
}

export async function cancelReceive(headerId: number, reason?: string): Promise<ReceiveHeader> {
    return api.patch<ReceiveHeader>(`/v1/receives/${headerId}/cancel`, { reason: reason || "" });
}

export async function getSuppliers(): Promise<Array<{ id: string; name: string }>> {
    return api.get<Array<{ id: string; name: string }>>("/v1/suppliers/option");
}

export interface ReusableUnitInput {
    unit_code?: string;
    serial_no?: string;
    department_id?: string | null;
    status?: "AVAILABLE" | "IN_USE" | "REPAIR" | "DISPOSED";
    condition?: "GOOD" | "DAMAGED" | "LOST" | "BROKEN";
    note?: string;
}

export interface ReusableReceivePayload {
    doc_no: string;
    supplier_id?: string | null;
    donor_name?: string | null;
    receive_date?: string | null;
    note?: string | null;
    items: Array<{
        item_id: string;
        cost_price?: number;
        units: ReusableUnitInput[];
    }>;
}

export async function createReusableReceive(payload: ReusableReceivePayload): Promise<{
    receive_id: number;
    doc_no: string;
    type: "REUSABLE_UNIT";
    total_items: number;
    total_units: number;
}> {
    return api.post("/v1/reusable-items/receive", payload);
}