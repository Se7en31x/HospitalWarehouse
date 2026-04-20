import { api } from "@/lib/apiClient";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReceiveType = "PURCHASE" | "DONATION" | "PURCHASE_ASSET" | "REUSABLE_UNIT";
export type ReceiveStatus = "PENDING" | "COMPLETED" | "CANCELLED";
export type AcquisitionType = "PURCHASE" | "DONATION" | "TRANSFER";

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

export interface ReceiveBatchHeader {
    id: number;
    doc_no: string;
    type: ReceiveType;
    status: ReceiveStatus;
    note: string | null;
    batch_id: number | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    receive_item: ReceiveItem[];
}

export interface ReceiveBatch {
    id: number;
    batch_no: string;
    acquisition_type: AcquisitionType;
    supplier_id: string | null;
    supplier_name: string | null;
    donor_name: string | null;
    receive_date: string;
    note: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    headers: ReceiveBatchHeader[];
}

export interface ReceiveListResponse {
    items: ReceiveBatch[];
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
    [key: string]: unknown;
}

// ── Batch API ──────────────────────────────────────────────────────────────────

export async function createBatch(payload: {
    batch_no: string;
    acquisition_type: AcquisitionType;
    supplier_id?: string | null;
    donor_name?: string | null;
    receive_date?: string | null;
    note?: string | null;
}): Promise<ReceiveBatch> {
    return api.post<ReceiveBatch>("/v1/receives/batch", payload);
}

export async function getBatchById(batchId: number): Promise<ReceiveBatch> {
    return api.get<ReceiveBatch>(`/v1/receives/batch/${batchId}`);
}

export async function getAllReceives(params: GetReceivesParams = {}): Promise<ReceiveListResponse> {
    const res = await api.list<ReceiveBatch>(`/v1/receives`, params as Record<string, unknown>);

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

// ── Header API ─────────────────────────────────────────────────────────────────

export async function createReceive(payload: {
    doc_no: string;
    type: ReceiveType;
    status: "PENDING" | "COMPLETED";
    batch_id: number;
    note?: string | null;
    items: Array<{
        item_id: string;
        expected_qty: number;
        qty: number;
        cost_price?: number;
        lot_code?: string | null;
        expired_at?: string | null;
        warehouse_id?: string | null;
        department_id?: number | null;
        note?: string | null;
    }>;
}): Promise<ReceiveBatchHeader> {
    return api.post<ReceiveBatchHeader>("/v1/receives", payload);
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
): Promise<ReceiveBatchHeader> {
    return api.patch<ReceiveBatchHeader>(`/v1/receives/${headerId}/confirm`, { items });
}

export async function cancelReceive(headerId: number, reason?: string): Promise<ReceiveBatchHeader> {
    return api.patch<ReceiveBatchHeader>(`/v1/receives/${headerId}/cancel`, { reason: reason || "" });
}

export async function getSuppliers(): Promise<Array<{ id: string; name: string }>> {
    return api.get<Array<{ id: string; name: string }>>("/v1/suppliers/option");
}

// ── Reusable API ───────────────────────────────────────────────────────────────

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
    batch_id: number;
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
