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
  id_card_url?: string | null;
}

export interface RequisitionFilters {
  // แก้ไข: เปลี่ยนจาก department_codes (string[]) เป็น IDs (number[]) หรือเดี่ยว
  department_id?: number; 
  status?: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "DRAFT" | "CANCELLED" | "BORROWING";
  type?: "WITHDRAW" | "BORROW";
  page?: number;
  limit?: number;
  keyword?: string; 
  start_date?: string; // เพิ่มรองรับการกรองวันที่ตาม Service
  end_date?: string;
  [key: string]: unknown;
}

export interface RequisitionItemLots {
  id: number;
  lot_code: string;
  lot_name?: string | null;
  quantity: number;
  expired_at: string;
}

export interface RequisitionItemUnits {
  id: string;
  unit_code: string;
}

export interface RequisitionItem {
  id: number;
  item_id: string;
  itemType?: string;
  name: string;
  code: string;
  image_url?: string | null;
  qty: number;
  current_stock: number;
  available_stock?: number;
  approved: number;
  issued: number;
  returned: number;
  note?: string;
  available_lots?: RequisitionItemLots[];
  available_units?: RequisitionItemUnits[];
}

export interface RequisitionPayload {
  type: "WITHDRAW" | "BORROW";
  department_id: number; 
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