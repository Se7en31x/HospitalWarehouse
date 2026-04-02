export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

// --- เพิ่มข้อมูลคนยืม ---
export interface BorrowerDetails {
  id: string; // UUID
  fullname: string;
  phone: string;
  address?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  zipcode?: string;
  notes?: string;
}

export interface RequisitionFilters {
  department_codes?: string[];
  status?: "PENDING" | "COMPLETED" | "REJECTED" | "DRAFT" | "CANCELLED";
  type?: "WITHDRAW" | "BORROW";
  page?: number;
  limit?: number;
  keyword?: string; // เพิ่มเพื่อรองรับการ Search
  [key: string]: unknown;
}

export interface RequisitionItem {
  id: number;
  item_id: string;
  name: string;
  code: string;
  image_url?: string | null;
  qty: number;
  current_stock: number;
  approved: number;
  issued: number;
  returned: number;
  note?: string;
}

export interface RequisitionPayload {
  type: "WITHDRAW" | "BORROW";
  department_id: string; 
  items: Array<{ item_id: string; qty: number; note?: string }>; 
  due_date?: string;
  note?: string;
  borrower?: Omit<BorrowerDetails, 'id'>; 
}

// src/types/requisition_type.ts

export interface RequisitionHeader {
  id: number;
  doc_no: string;
  request_date: string;
  due_date?: string | null;
  department_id: number;
  department_name?: string;
  requester_id: string;
  requester?: string;
  item_count?: number;
  status: "PENDING" | "COMPLETED" | "BORROWING" | "APPROVED" | "REJECTED" | "DRAFT" | "CANCELLED";
  type: "WITHDRAW" | "BORROW";
  items: RequisitionItem[];
  note?: string;
  borrower_id?: string | null;
  borrower_details?: BorrowerDetails | null;
}