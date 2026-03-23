// file: src/types/requisition_type.ts

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface RequisitionFilters {
  department_codes?: string[];
  status?: "PENDING" | "COMPLETED" | "REJECTED" | "DRAFT";
  type?: "WITHDRAW" | "BORROW";
  page?: number;
  limit?: number;
  [key: string]: unknown; // เผื่อมี filter อื่นๆ ส่งมาอีก
}

export interface RequisitionItem {
  id: number;
  req_qty: number;
  approved_qty?: number;
  issued_qty?: number;
  item_id?: string;
  items?: { 
    name: string;
    code: string;
    current_stock: number;
  };
  note?: string;
}

export interface RequisitionPayload {
  type: "WITHDRAW" | "BORROW";
  department_id: string; 
  department_name: string;
  items: Array<{ item_id: string; qty: number; note?: string }>; 
  due_date?: string;
  note?: string;
}

export interface RequisitionHeader {
  id: number;
  doc_no: string;
  request_date: string;
  department_code: string;
  department_name?: string;
  requester_id: number;
  status: "PENDING" | "COMPLETED" | "REJECTED" | "DRAFT";
  type: "WITHDRAW" | "BORROW";
  requisition_item: RequisitionItem[];
  note?: string;
}