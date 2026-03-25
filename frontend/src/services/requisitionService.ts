import {
  ApiResponse,
  RequisitionHeader,
  RequisitionPayload,
  RequisitionFilters
} from "../types/requisition_type";

// ดึง Base URL จาก env เหมือนเดิม
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Helper สำหรับจัดการ Headers พื้นฐาน (ไม่มี Token)
const getHeaders = () => ({
  "Content-Type": "application/json",
});

/**
 * ดึงประวัติใบเบิกทั้งหมด
 */
export const getRequisitionHistory = async (
  filters?: RequisitionFilters
): Promise<ApiResponse<RequisitionHeader[]>> => {
  try {
    let queryString = "";
    if (filters) {
      const cleanParams: Record<string, string> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value != null) cleanParams[key] = String(value);
      });
      queryString = "?" + new URLSearchParams(cleanParams).toString();
    }

    const response = await fetch(`${API_BASE_URL}/v1/requisitions${queryString}`, {
      method: "GET",
      headers: getHeaders(),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Fetch Error:", error);
    return {
      success: false,
      data: [],
      message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};

/**
 * ดึงรายละเอียดใบเบิกตาม ID
 */
export const getRequisitionById = async (id: number): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/requisitions/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      message: "ไม่สามารถดึงข้อมูลได้",
    };
  }
};

/**
 * สร้างใบเบิก
 */
export const createRequisition = async (
  payload: RequisitionPayload
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/requisitions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    // ถ้า Backend ส่ง 401 มา (กรณีลืมปิด Middleware ที่ Backend)
    if (response.status === 401) {
      return { success: false, data: null, message: "Backend ปฏิเสธการเข้าถึง (Unauthorized)" };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      message: "สร้างใบเบิกไม่สำเร็จ (Network Error)",
    };
  }
};

/**
 * อนุมัติใบเบิก
 */
export const approveRequisition = async (
  requisitionId: number,
  itemsToIssue: Record<number, number>
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/requisitions/approve/${requisitionId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ itemsToIssue }),
    });

    return await response.json();
  } catch (error) {
    return { success: false, data: null, message: "อนุมัติใบเบิกไม่สำเร็จ" };
  }
};

/**
 * ปฏิเสธใบเบิก
 */
export const rejectRequisition = async (
  requisitionId: number,
  note: string
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/requisitions/reject/${requisitionId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ note }),
    });

    return await response.json();
  } catch (error) {
    return { success: false, data: null, message: "ปฏิเสธใบเบิกไม่สำเร็จ" };
  }
};