export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// --- เพิ่มข้อมูลคนยืม ---
export interface BorrowerDetails {
  id: string; // UUID
  title_code?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  id_card?: string | null;
  phone: string;
  address?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  zipcode?: string;
  notes?: string;
  id_card_url?: string | null;
  lookup_titles?: { short_name: string | null; name: string } | null;
}

export interface RequisitionFilters {
  // แก้ไข: เปลี่ยนจาก department_codes (string[]) เป็น IDs (number[]) หรือเดี่ยว
  department_id?: number; 
  status?: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "DRAFT" | "CANCELLED" | "BORROWING" | "PENDING_RETURN_CHECK";
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

export interface AllocatedLot {
  lot_id: string | null;
  lot_code: string | null;
  qty: number;
  expired_at: string | null;
}

export interface IssuedUnit {
  id: string;
  unit_code: string | null;
  serial_no: string | null;
}

export interface OutstandingUnit {
  id: string;
  unit_code: string;
  serial_no: string | null;
}

export interface RequisitionItem {
  id: number;
  item_id: string;
  itemType?: string;
  name: string;
  code: string;
  image_url?: string | null;
  category_name?: string | null;
  unit_name?: string | null;
  qty: number;
  current_stock: number;
  available_stock?: number;
  approved: number;
  issued: number;
  returned: number;
  note?: string;
  available_lots?: RequisitionItemLots[];
  available_units?: RequisitionItemUnits[];
  allocated_lots?: AllocatedLot[];
  issued_units?: IssuedUnit[];
  outstanding_units?: OutstandingUnit[];
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

export interface PendingReturnItem {
  req_item_id: number;
  qty_returned: number;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note: string | null;
  units?: Array<{ unit_id: string; unit_code?: string; condition?: string; note?: string }>;
}

export interface PendingReturnSubmission {
  state: "SUBMITTED";
  submitted_by: string | null;
  submitted_at: string;
  items: PendingReturnItem[];
}

export interface RequisitionHeader {
  id: number;
  doc_no: string;
  request_date: string;
  return_date?: string | null;
  due_date?: string | null;
  department_id: number; 
  department_name?: string; 
  requester_id: string;
  requester?: string;
  approver?: string | null;
  item_count?: number;
  status: "PENDING" | "COMPLETED" | "BORROWING" | "APPROVED" | "REJECTED" | "DRAFT" | "CANCELLED" | "PENDING_RETURN_CHECK";
  type: "WITHDRAW" | "BORROW";
  items: RequisitionItem[];
  note?: string;
  borrower_id?: string | null;
  borrower_details?: BorrowerDetails | null;
  pending_return_submission?: PendingReturnSubmission | null;
  /** เอกสารแนบ (ถ้า API ส่งมา) */
  attachments?: Array<{ url: string; filename?: string; name?: string }> | null;
}