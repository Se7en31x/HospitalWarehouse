import { api, PaginatedResponse } from "@/lib/apiClient";
import { resolveBarcode, type BarcodeResolveResult } from "./barcodeService";

// Re-export สำหรับ backward-compat (WithdrawClient ยังใช้ชื่อเดิม)
export type { BarcodeResolveResult };
export type ResolvedReusableBarcode = BarcodeResolveResult;

// ============ Types ============

export interface ReusableUnit {
  id: string;
  usage_context?: "BORROW" | "WITHDRAW" | null;
  unit_code: string;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  item_image_url?: string | null;
  receive_item_id: number | null;
  receive_doc_no: string | null;
  serial_no: string | null;
  department_id: string | null;
  department_name: string | null;
  status: "AVAILABLE" | "IN_USE" | "REPAIR" | "DISPOSED" | string;
  condition: "GOOD" | "DAMAGED" | "LOST" | "BROKEN" | string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReusableUnitListResponse {
  items: ReusableUnit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

export interface GetReusableUnitsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  department_id?: string;
  status?: string;
  item_id?: string;
  [key: string]: any;
}

export interface ReturnableSummaryItem {
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  category_name?: string | null;
  image_url?: string | null;
  in_use_qty: number;
}

export interface ReturnableSummaryResponse {
  department_id: string;
  items: ReturnableSummaryItem[];
}

export interface ReusableReturnRequestItem {
  id: number;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  item_image_url?: string | null;
  item_unit_name?: string | null;
  category_name?: string | null;
  requested_qty: number;
  note: string | null;
  requested_unit_codes?: string[];
  requested_units?: Array<{
    id: string | null;
    unit_code: string;
    serial_no: string | null;
    item_id: string;
    item_code?: string | null;
    item_name: string | null;
    item_image_url?: string | null;
    item_unit_name?: string | null;
    status: string | null;
    condition: string | null;
    is_found: boolean;
  }>;
}

export interface ReusableReturnRequest {
  id: number;
  doc_no: string;
  department_id: string;
  department_name: string | null;
  preferred_pickup_at: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  items: ReusableReturnRequestItem[];
  submit_attachments?: import("./returnAttachmentService").ReturnAttachment[];
  process_attachments?: import("./returnAttachmentService").ReturnAttachment[];
  processed_by?: string | null;
  processed_by_name?: string | null;
  processed_at?: string | null;
}

export interface ReusableReturnRequestListResponse {
  items: ReusableReturnRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

// ============ API Functions ============

/**
 * Fetch a single reusable unit by its ID.
 * Pass `token` from a Server Component for SSR requests.
 */
export async function getReusableUnitById(id: string, token?: string): Promise<ReusableUnit> {
  return api.get<ReusableUnit>(`/v1/reusable-items/${id}`, undefined, token);
}

export async function getReusableUnits(params: GetReusableUnitsParams = {}, token?: string): Promise<ReusableUnitListResponse> {
  const res = await api.list<ReusableUnit>(`/v1/reusable-items`, params as Record<string, unknown>, token);
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

export async function updateReusableUnit(
  id: string,
  payload: Partial<Pick<ReusableUnit, "serial_no" | "department_id" | "status" | "condition" | "note">>
): Promise<ReusableUnit> {
  return api.patch<ReusableUnit>(`/v1/reusable-items/${id}`, payload);
}

export async function deleteReusableUnit(id: string): Promise<void> {
  await api.delete(`/v1/reusable-items/${id}`);
}

export async function returnReusableFromWithdraw(
  id: string,
  payload: { condition?: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE"; note?: string } = {}
): Promise<ReusableUnit> {
  return api.post<ReusableUnit>(`/v1/reusable-items/${id}/return-from-withdraw`, payload);
}

export async function getReturnableWithdrawSummary(departmentId: string | number): Promise<ReturnableSummaryResponse> {
  return api.get<ReturnableSummaryResponse>(`/v1/reusable-items/returnable-summary`, { department_id: departmentId });
}

export async function createReusableReturnRequest(payload: {
  department_id: string;
  preferred_pickup_at?: string;
  contact_name?: string;
  contact_phone?: string;
  note?: string;
  items: Array<{ item_id: string; requested_qty: number; note?: string }>;
}): Promise<ReusableReturnRequest> {
  return api.post<ReusableReturnRequest>(`/v1/reusable-items/return-requests`, payload);
}

export async function getReusableReturnRequests(params: {
  page?: number;
  limit?: number;
  keyword?: string;
  department_id?: string;
  status?: string;
  [key: string]: any;
} = {}): Promise<ReusableReturnRequestListResponse> {
  const res = await api.list<ReusableReturnRequest>(`/v1/reusable-items/return-requests`, params as Record<string, unknown>);
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

export async function getReusableReturnRequestById(id: number | string): Promise<ReusableReturnRequest> {
  return api.get<ReusableReturnRequest>(`/v1/reusable-items/return-requests/${id}`);
}

export async function processReusableReturnRequest(
  id: number | string,
  payload: {
    items?: Array<{ item_id: string; return_qty: number; condition?: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE"; note?: string }>;
    units?: Array<{ unit_id: string; condition?: "GOOD" | "DAMAGED" | "LOST"; note?: string }>;
    complete?: boolean;
    note?: string;
  }
): Promise<ReusableReturnRequest> {
  return api.post<ReusableReturnRequest>(`/v1/reusable-items/return-requests/${id}/process`, payload);
}

export async function deleteReusableReturnRequest(id: number | string): Promise<ReusableReturnRequest> {
  return api.delete<ReusableReturnRequest>(`/v1/reusable-items/return-requests/${id}`);
}

/**
 * resolveReusableBarcode — delegate ไปที่ barcodeService กลาง
 */
export async function resolveReusableBarcode(
  value: string,
  departmentId?: number | string
): Promise<ResolvedReusableBarcode | null> {
  return resolveBarcode(value, departmentId ?? null);
}