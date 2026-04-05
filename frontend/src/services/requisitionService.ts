import {
  ApiResponse,
  RequisitionHeader,
  RequisitionPayload,
  RequisitionFilters
} from "../types/requisition_type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * ดึงประวัติใบเบิกทั้งหมด
 */
export const getAllRequisitions = async (
  filters?: RequisitionFilters
): Promise<ApiResponse<RequisitionHeader[]>> => {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/v1/requisitions?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: [],
        message: result.message || "ไม่สามารถดึงข้อมูลประวัติได้",
      };
    }

    return result;
  } catch (_error) {
    return {
      success: false,
      data: [],
      message: "การเชื่อมต่อเครือข่ายขัดข้อง",
    };
  }
};

/**
 * ดึงรายละเอียดใบเบิกตาม ID
 */
export const getRequisitionById = async (
  id: number
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/requisitions/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || "ไม่พบข้อมูลใบเบิกที่ระบุ",
      };
    }

    return {
      success: true,
      data: result.data ?? null,
      message: result.message,
    };
  } catch (_error) {
    return {
      success: false,
      data: null,
      message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || "สร้างใบเบิกไม่สำเร็จ",
      };
    }

    return {
      success: true,
      data: result.data ?? null,
      message: result.message,
    };
  } catch (_error) {
    return {
      success: false,
      data: null,
      message: "เกิดข้อผิดพลาดในการส่งข้อมูล",
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: itemsToIssue }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || "อนุมัติใบเบิกไม่สำเร็จ",
      };
    }

    return {
      success: true,
      data: result.data ?? null,
      message: result.message,
    };
  } catch (_error) {
    return {
      success: false,
      data: null,
      message: "ระบบขัดข้อง ไม่สามารถอนุมัติได้",
    };
  }
};

/**
 * ยืนยันนำส่ง (ปิดงานใบเบิกหลังอนุมัติแล้ว)
 */
export const completeRequisitionDelivery = async (
  requisitionId: number
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/requisitions/deliver/${requisitionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || "บันทึกการนำส่งไม่สำเร็จ",
      };
    }

    return {
      success: true,
      data: result.data ?? null,
      message: result.message,
    };
  } catch (_error) {
    return {
      success: false,
      data: null,
      message: "ระบบขัดข้อง ไม่สามารถบันทึกการนำส่งได้",
    };
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || "ปฏิเสธใบเบิกไม่สำเร็จ",
      };
    }

    return {
      success: true,
      data: result.data ?? null,
      message: result.message,
    };
  } catch (_error) {
    return {
      success: false,
      data: null,
      message: "ไม่สามารถส่งคำขอปฏิเสธได้",
    };
  }
};

/**
 * ยกเลิกใบเบิก (เฉพาะสถานะ PENDING)
 */
export const cancelRequisition = async (
  requisitionId: number
): Promise<ApiResponse<null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/requisitions/${requisitionId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || "ยกเลิกใบเบิกไม่สำเร็จ",
      };
    }

    return {
      success: true,
      data: null,
      message: result.message || "ยกเลิกใบเบิกสำเร็จ",
    };
  } catch (_error) {
    return {
      success: false,
      data: null,
      message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};

/**
 * ดึงรายการยืมที่ยังไม่คืน — เรียกจาก endpoint แยกต่างหาก
 */
export const getBorrowActive = async (
  page = 1,
  limit = 10
): Promise<ApiResponse<RequisitionHeader[]>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/borrows/active`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: [],
        message: result.message || "ไม่สามารถดึงข้อมูลการยืมได้",
      };
    }

    return result;
  } catch (_error) {
    return {
      success: false,
      data: [],
      message: "การเชื่อมต่อเครือข่ายขัดข้อง",
    };
  }
};

export interface ReturnItemPayload {
  req_item_id: number;
  qty_returned: number;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note?: string;
}

/**
 * บันทึกการรับคืนพัสดุ (warehouse side)
 */
export const processReturn = async (
  headerId: number,
  items: ReturnItemPayload[]
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/borrows/return/${headerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || "บันทึกการรับคืนไม่สำเร็จ",
      };
    }

    return {
      success: true,
      data: result.data ?? null,
      message: result.message,
    };
  } catch (_error) {
    return {
      success: false,
      data: null,
      message: "เกิดข้อผิดพลาดในการส่งข้อมูล",
    };
  }
};