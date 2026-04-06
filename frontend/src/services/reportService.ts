import Cookies from "js-cookie";
import * as T from "@/types/report_type";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Helper: จัดการ Fetch และแกะ JSON พร้อมระบุ Type
 */
async function request<Data>(path: string, options?: RequestInit): Promise<Data> {
  const token = Cookies.get("user_token");
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${baseUrl}${cleanPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  const result = await res.json();
  if (!res.ok || result.success === false) {
    throw new Error(result.message || `API Error: ${res.status}`);
  }
  return result.data as Data;
}

// --- API Implementation ---

/** 1. รายงานคงคลัง */
export async function getStockBalanceReports(params?: T.ReportQueryParams): Promise<T.Report[]> {
  const query = new URLSearchParams();
  if (params?.warehouse_id || params?.warehouseId) 
    query.append("warehouseId", params.warehouse_id || params.warehouseId || "");
  if (params?.search) query.append("search", params.search);

  const data = await request<T.PaginatedResponse<T.StockBalanceRaw>>(`/reports/stock-balance?${query.toString()}`);
  
  return data.items.map((item): T.Report => ({
    id: String(item.id),
    reportNo: item.code,
    type: "stock-balance",
    date: new Date().toISOString().split("T")[0],
    warehouse: item.warehouse,
    totalItems: 1,
    totalValue: item.currentStock,
    status: "COMPLETED",
    items: [{
      id: String(item.id),
      itemCode: item.code,
      itemName: item.name,
      quantity: item.currentStock,
      unit: item.unit,
    }],
  }));
}

/** 2. รายงานเคลื่อนไหว / จ่ายออก */
export async function getStockMovementReports(params?: T.ReportQueryParams): Promise<T.Report[]> {
  const query = new URLSearchParams();
  const isOut = params?.type === 'OUT' || params?.type === 'stockout';
  const apiPath = isOut ? '/reports/stock-out' : '/reports/stock-movement';
  
  if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
  if (params?.dateTo) query.append("dateTo", params.dateTo);
  if (params?.search) query.append("search", params.search);

  const data = await request<T.PaginatedResponse<T.StockMovementRaw>>(`${apiPath}?${query.toString()}`);
  
  return data.items.map((item): T.Report => ({
    id: String(item.id),
    reportNo: item.itemCode,
    type: isOut ? "stockout" : "stock-movement",
    date: item.date,
    warehouse: item.warehouse,
    totalItems: 1,
    totalValue: item.quantity,
    status: "COMPLETED",
    notes: item.note,
    items: [{
      id: String(item.id),
      itemCode: item.itemCode,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
    }],
  }));
}

/** 3. รายงานสินค้าหมดอายุ */
export async function getExpiredLotsReports(params?: T.ReportQueryParams): Promise<T.Report[]> {
  const query = new URLSearchParams();
  if (params?.dateTo) query.append("dateTo", params.dateTo);

  const data = await request<T.PaginatedResponse<T.ExpiredLotRaw>>(`/reports/expired-lots?${query.toString()}`);
  
  return data.items.map((item): T.Report => ({
    id: String(item.id),
    reportNo: item.lotCode,
    type: "expired-lots",
    date: item.expiredAt,
    warehouse: item.warehouse,
    totalItems: 1,
    totalValue: item.quantity,
    status: "COMPLETED",
    items: [{
      id: String(item.id),
      itemCode: item.itemCode,
      itemName: item.itemName,
      lotCode: item.lotCode,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiredAt,
    }],
  }));
}

/** 4. รายงานนำเข้า */
/** 4. รายงานนำเข้า (Stock In) */
export async function getStockInReports(params?: T.ReportQueryParams): Promise<T.Report[]> {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
  if (params?.search) query.append("search", params.search);

  const data = await request<T.PaginatedResponse<T.StockInRaw>>(`/reports/stock-in?${query.toString()}`);
  
  return data.items.map((item): T.Report => ({
    id: String(item.id),
    reportNo: item.docNo,
    type: "stockin",
    date: item.receiveDate,
    supplier: item.supplier,
    warehouse: item.warehouse,
    totalItems: 1,
    totalValue: item.quantity,
    status: "COMPLETED",
    items: [{
      id: String(item.id),
      itemCode: item.itemCode,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,          
      unitPrice: item.costPrice,
      lotCode: item.lotCode,
      expiryDate: item.expiredAt,
    }],
  }));
}

/** 5. รายงานเบิกพัสดุ */
export async function getRequisitionReports(params?: T.ReportQueryParams): Promise<T.Report[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.department_name) query.append("department_name", params.department_name);

  // อันนี้ Backend Map มาให้ตรงกับ T.Report แล้ว
  const data = await request<T.PaginatedResponse<T.Report>>(`/reports/requisitions?${query.toString()}`);
  return data.items;
}

/** 6. รวมรายงานทั้งหมด */
export async function getAllReports(filters?: T.ReportFilterParams): Promise<T.Report[]> {
  const params: T.ReportQueryParams = {
    dateFrom: filters?.startDate,
    dateTo: filters?.endDate,
    search: filters?.searchTerm,
    warehouse_id: filters?.warehouse
  };

  const results = await Promise.allSettled([
    getRequisitionReports(params),
    getStockInReports(params),
    getStockBalanceReports(params),
    getExpiredLotsReports(params),
    getStockMovementReports({ ...params, type: 'OUT' })
  ]);

  const all = results
    .filter((r): r is PromiseFulfilledResult<T.Report[]> => r.status === "fulfilled")
    .flatMap(r => r.value);

  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}