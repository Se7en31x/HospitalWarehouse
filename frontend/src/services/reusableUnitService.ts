import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

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
  return { items: body.data ?? [], ...(body.meta ?? {}) } as T;
}

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

export interface ReusableUnit {
  id: string;
  usage_context?: "BORROW" | "WITHDRAW" | null;
  unit_code: string;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  receive_item_id: number | null;
  receive_doc_no: string | null;
  serial_no: string | null;
  department_id: number | null;
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
}

export interface ReturnableSummaryItem {
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  in_use_qty: number;
}

export interface ReturnableSummaryResponse {
  department_id: number;
  items: ReturnableSummaryItem[];
}

export interface ReusableReturnRequestItem {
  id: number;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  requested_qty: number;
  note: string | null;
  requested_unit_codes?: string[];
  requested_units?: Array<{
    id: string | null;
    unit_code: string;
    serial_no: string | null;
    item_id: string;
    item_name: string | null;
    status: string | null;
    condition: string | null;
    is_found: boolean;
  }>;
}

export interface ReusableReturnRequest {
  id: number;
  doc_no: string;
  department_id: number;
  department_name: string | null;
  preferred_pickup_at: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  items: ReusableReturnRequestItem[];
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

export async function getReusableUnits(params: GetReusableUnitsParams = {}): Promise<ReusableUnitListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.department_id) query.set("department_id", params.department_id);
  if (params.status) query.set("status", params.status);
  if (params.item_id) query.set("item_id", params.item_id);

  return requestList<ReusableUnitListResponse>(`/v1/reusable-items?${query.toString()}`);
}

export async function updateReusableUnit(
  id: string,
  payload: Partial<Pick<ReusableUnit, "serial_no" | "department_id" | "status" | "condition" | "note">>
): Promise<ReusableUnit> {
  return request<ReusableUnit>(`/v1/reusable-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function returnReusableFromWithdraw(
  id: string,
  payload: { condition?: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE"; note?: string } = {}
): Promise<ReusableUnit> {
  return request<ReusableUnit>(`/v1/reusable-items/${id}/return-from-withdraw`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getReturnableWithdrawSummary(departmentId: string | number): Promise<ReturnableSummaryResponse> {
  return request<ReturnableSummaryResponse>(`/v1/reusable-items/returnable-summary?department_id=${departmentId}`);
}

export async function createReusableReturnRequest(payload: {
  department_id: number;
  preferred_pickup_at?: string;
  contact_name?: string;
  contact_phone?: string;
  note?: string;
  items: Array<{ item_id: string; requested_qty: number; note?: string }>;
}): Promise<ReusableReturnRequest> {
  return request<ReusableReturnRequest>(`/v1/reusable-items/return-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getReusableReturnRequests(params: {
  page?: number;
  limit?: number;
  keyword?: string;
  department_id?: string;
  status?: string;
} = {}): Promise<ReusableReturnRequestListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.department_id) query.set("department_id", params.department_id);
  if (params.status) query.set("status", params.status);

  return requestList<ReusableReturnRequestListResponse>(`/v1/reusable-items/return-requests?${query.toString()}`);
}

export async function getReusableReturnRequestById(id: number | string): Promise<ReusableReturnRequest> {
  return request<ReusableReturnRequest>(`/v1/reusable-items/return-requests/${id}`);
}

export async function processReusableReturnRequest(
  id: number | string,
  payload: {
    items?: Array<{ item_id: string; return_qty: number; condition?: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE"; note?: string }>;
    units?: Array<{ unit_id: string; condition?: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE"; note?: string }>;
    complete?: boolean;
    note?: string;
  }
): Promise<ReusableReturnRequest> {
  return request<ReusableReturnRequest>(`/v1/reusable-items/return-requests/${id}/process`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteReusableReturnRequest(id: number | string): Promise<ReusableReturnRequest> {
  return request<ReusableReturnRequest>(`/v1/reusable-items/return-requests/${id}`, {
    method: "DELETE",
  });
}
