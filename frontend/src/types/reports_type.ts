/**
 * Report Types for Hospital Warehouse System
 */

// Transaction type enum
export type ReportType = 'stockin' | 'stockout' | 'requisition' | 'adjustment' | 'return';

// Status enum
export type ReportStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

// Individual item in a transaction
export interface ReportItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  lotCode?: string;
  expiryDate?: string;
  warehouse?: string;
}

// Stock In Report (นำเข้า)
export interface StockInReport {
  id: string;
  reportNo: string;
  type: 'stockin';
  date: string;
  warehouse: string;
  supplier?: string;
  totalItems: number;
  totalValue: number;
  status: ReportStatus;
  items: ReportItem[];
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

// Stock Out / Requisition Report (นำออก/เบิก)
export interface RequisitionReport {
  id: string;
  reportNo: string;
  type: 'requisition';
  date: string;
  requester: string;
  department: string;
  totalItems: number;
  totalValue: number;
  status: ReportStatus;
  items: ReportItem[];
  approver?: string;
  dueDate?: string;
  returnDate?: string;
  notes?: string;
  createdAt?: string;
}

// Stock Out Report (จ่าย - issue)
export interface StockOutReport {
  id: string;
  reportNo: string;
  type: 'stockout';
  date: string;
  warehouse: string;
  department?: string;
  totalItems: number;
  totalValue: number;
  status: ReportStatus;
  items: ReportItem[];
  issuedBy?: string;
  notes?: string;
  createdAt?: string;
}

// Adjustment Report (ปรับปรุง)
export interface AdjustmentReport {
  id: string;
  reportNo: string;
  type: 'adjustment';
  date: string;
  warehouse: string;
  totalItems: number;
  totalValue: number;
  adjustedBy: string;
  status: ReportStatus;
  items: (ReportItem & { reason?: string })[]; // Added reason field
  notes?: string;
  createdAt?: string;
}

// Return Report (คืนสินค้า)
export interface ReturnReport {
  id: string;
  reportNo: string;
  type: 'return';
  date: string;
  warehouse: string;
  department?: string;
  returnedBy: string;
  totalItems: number;
  totalValue: number;
  status: ReportStatus;
  items: ReportItem[];
  originalRequisitionNo?: string;
  reason?: string;
  notes?: string;
  createdAt?: string;
}

// Union type for all reports
export type Report = StockInReport | RequisitionReport | StockOutReport | AdjustmentReport | ReturnReport;

// Summary statistics
export interface ReportSummary {
  type: ReportType;
  label: string;
  count: number;
  totalValue: number;
  totalItems: number;
  color: string;
  bgColor: string;
  icon: string;
}

// Filter parameters
export interface ReportFilterParams {
  type?: ReportType;
  status?: ReportStatus;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  warehouse?: string;
  department?: string;
  page?: number;
  limit?: number;
}

// Paginated response
export interface ReportResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Request payload for filtering
export interface ReportQueryParams {
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  warehouse_id?: string;
  department_name?: string;
  page?: number;
  limit?: number;
}
