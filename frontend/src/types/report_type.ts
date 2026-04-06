// --- 1. UI Interfaces (ข้อมูลที่จะเอาไปแสดงหน้าเว็บ) ---

export type ReportType = 
  | "stock-balance" 
  | "stock-movement" 
  | "expired-lots" 
  | "stockin" 
  | "stockout" 
  | "requisition";

export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";

export interface ReportItem {
  id: string;
  itemId?: string;
  itemCode: string;
  itemName: string;
  category?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  lotCode?: string;
  expiryDate?: string;
  warehouse?: string;
  notes?: string;
}

export interface Report {
  id: string;
  reportNo: string;
  type: ReportType;
  date: string;
  warehouse?: string;
  supplier?: string;
  requester?: string;
  department?: string;
  totalItems: number;
  totalValue: number;
  status: ReportStatus | string;
  items: ReportItem[];
  notes?: string;
  createdAt?: string;
}

// --- 2. API Response Interfaces (ข้อมูลดิบจาก Backend) ---

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StockBalanceRaw {
  id: number | string;
  code: string;
  name: string;
  warehouse: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

export interface StockMovementRaw {
  id: number | string;
  type: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  quantity: number;
  unit: string;
  date: string;
  note: string;
}

export interface ExpiredLotRaw {
  id: number | string;
  lotCode: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  quantity: number;
  unit: string;
  expiredAt: string;
}

export interface StockInRaw {
  id: number | string;
  docNo: string;
  receiveDate: string;
  supplier: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  quantity: number;
  unit: string;
  lotCode: string;
  costPrice: number;
  expiredAt: string;
}

// --- 3. Parameter Interfaces ---

export interface ReportQueryParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  warehouse_id?: string; // รองรับกรณีส่งมาจากหน้า UI
  search?: string;
  status?: string;
  type?: string;
  department_name?: string;
}

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  warehouse?: string;
  type?: ReportType;
  status?: ReportStatus;
}

export interface ReportSummary {
  type: string;
  label: string;
  count: number;
  totalValue: number;
  totalItems: number;
  color: string;
  bgColor: string;
  icon: string;
}