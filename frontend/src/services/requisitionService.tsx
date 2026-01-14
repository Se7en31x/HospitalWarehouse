import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// --- 1. Interfaces สำหรับ Payload (ส่งไปตอนสร้างใบเบิก) ---
export interface RequisitionItemPayload {
  item_id: number;
  qty: number;
}

export interface RequisitionPayload {
  type: 'WITHDRAW' | 'BORROW';
  department_code: string; // เช่น "01"
  department_name: string; // ✅ เก็บชื่อแผนกแบบ Snapshot เช่น "ฉุกเฉิน"
  items: RequisitionItemPayload[];
  note: string;
}

// --- 2. Interfaces สำหรับ Data Model (ข้อมูลที่ดึงมาจาก DB) ---
export interface RequisitionItem {
  id: number;
  item_id: number;
  req_qty: number;
  approved_qty: number;
  issued_qty: number;
  returned_qty: number;
  note: string | null;
  item?: {
    name: string;
    code: string;
    current_stock: number;
  };
}

export interface RequisitionHeader {
  id: number;
  doc_no: string;
  type: 'WITHDRAW' | 'BORROW';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  department_code: string; // ✅ ดึงมาโชว์ที่หน้าคลัง
  department_name: string; // ✅ ดึงมาโชว์ที่หน้าคลัง
  requester_id: number;
  request_date: string;
  due_date: string | null;
  note: string | null;
  requisition_item: RequisitionItem[];
}

// --- 3. Interfaces สำหรับ API Response ---
export interface RequisitionResponse {
  success: boolean;
  message: string;
  data: RequisitionHeader | null;
}

export interface RequisitionListResponse {
  success: boolean;
  message?: string;
  data: RequisitionHeader[];
}

// --- 4. Helper สำหรับ Headers ---
const getHeaders = () => {
  const token = Cookies.get('user_token');
  console.log("🛠️ Current Token:", token);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// --- 5. Functions หลัก ---

export async function createRequisition(payload: RequisitionPayload): Promise<RequisitionResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/requisition`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json() as RequisitionResponse;
    if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');

    return { ...data, success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: errMsg, data: null };
  }
}

/** * ดึงประวัติ/รายการใบเบิกทั้งหมด 
 * ใช้ในหน้า RequestClient (ฝั่งเจ้าหน้าที่คลัง) เพื่อดูรายการที่ต้องอนุมัติ
 */
export async function getRequisitionHistory(type?: 'WITHDRAW' | 'BORROW'): Promise<RequisitionListResponse> {
  const url = type 
    ? `${API_BASE_URL}/requisition?type=${type}` 
    : `${API_BASE_URL}/requisition`;
        
  try {
    const res = await fetch(url, { 
      method: 'GET',
      headers: getHeaders(), 
      cache: 'no-store' 
    });
    
    const result = await res.json() as RequisitionListResponse;
    if (!res.ok) throw new Error(result.message || 'ดึงข้อมูลไม่สำเร็จ');

    return result;
  } catch (error: unknown) {
    console.error("🔥 Get History Error:", error);
    return { success: false, data: [] };
  }
}

export async function approveRequisition(headerId: number, itemsToIssue: Record<number, number>): Promise<RequisitionResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/requisition/approve/${headerId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ itemsToIssue }),
    });

    const data = await res.json() as RequisitionResponse;
    if (!res.ok) throw new Error(data.message || 'ไม่สามารถบันทึกการอนุมัติได้');
    return { ...data, success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: errMsg, data: null };
  }
}

/** * ปฏิเสธใบเบิก 
 */
export async function rejectRequisition(headerId: number, note: string): Promise<RequisitionResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/requisition/reject/${headerId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ note }),
    });

    const data = await res.json() as RequisitionResponse;
    if (!res.ok) throw new Error(data.message || 'ไม่สามารถปฏิเสธรายการได้');
    return { ...data, success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: errMsg, data: null };
  }
}