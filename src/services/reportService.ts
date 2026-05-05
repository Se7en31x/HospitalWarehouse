import { api, PaginatedResponse } from "@/lib/apiClient";
import * as T from "@/types/report_type";

// --- API Implementation ---

/** 1. รายงานคงคลัง */
export async function getStockBalanceReports(params?: T.ReportQueryParams): Promise<T.Report[]> {
  const queryParams: Record<string, unknown> = {};
  if (params?.warehouse_id || params?.warehouseId) 
    queryParams.warehouseId = params.warehouse_id || params.warehouseId;
  if (params?.search) queryParams.search = params.search;

  // ใช้ api.list เพื่อแกะ meta และ data
  const res = await api.list<T.StockBalanceRaw>(`/reports/stock-balance`, queryParams);
  
  return (res.data || []).map((item): T.Report => ({
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
  const isOut = params?.type === 'OUT' || params?.type === 'stockout';
  const apiPath = isOut ? '/reports/stock-out' : '/reports/stock-movement';
  
  const queryParams: Record<string, unknown> = {};
  if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
  if (params?.dateTo) queryParams.dateTo = params.dateTo;
  if (params?.search) queryParams.search = params.search;

  const res = await api.list<T.StockMovementRaw>(apiPath, queryParams);
  
  return (res.data || []).map((item): T.Report => ({
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
  const queryParams: Record<string, unknown> = {};
  if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
  if (params?.dateTo) queryParams.dateTo = params.dateTo;

  const res = await api.list<T.ExpiredLotRaw>(`/reports/expired-lots`, queryParams);
  
  return (res.data || []).map((item): T.Report => ({
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

/** 4. รายงานนำเข้า (Stock In) */
export async function getStockInReports(params?: T.ReportQueryParams): Promise<T.Report[]> {
  const queryParams: Record<string, unknown> = {};
  if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
  if (params?.search) queryParams.search = params.search;

  const res = await api.list<T.StockInRaw>(`/reports/stock-in`, queryParams);
  
  return (res.data || []).map((item): T.Report => ({
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
  const queryParams: Record<string, unknown> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.department_name) queryParams.department_name = params.department_name;

  // ใช้ api.list แล้วดึง data ออกมาตรงๆ เพราะ Backend map มาให้แล้ว
  const res = await api.list<T.Report>(`/reports/requisitions`, queryParams);
  return res.data || [];
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