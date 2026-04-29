import {
  ApiResponse,
  RequisitionHeader,
  RequisitionPayload,
  RequisitionFilters
} from "../types/requisition_type";
import { api } from "@/lib/apiClient";

// ─── API Implementation ─────────────────────────────────────────────

/**
 * ดึงรายการใบเบิก/ยืม ทั้งหมดพร้อมตัวกรอง
 * ใช้ api.list เพื่อจัดการ Pagination meta ให้อัตโนมัติ
 */
export const getAllRequisitions = async (
  filters?: RequisitionFilters
): Promise<ApiResponse<RequisitionHeader[]>> => {
  try {
    const params: Record<string, unknown> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });
    }

    const res = await api.list<RequisitionHeader>(`/v1/requisitions`, params);
    
    return {
      success: true,
      data: res.data || [],
      total: res.meta?.total || 0,
      page: res.meta?.page || 1,
      limit: res.meta?.limit || 0,
      totalPages: res.meta?.totalPages || 0,
    };
  } catch (err: any) {
    return { 
      success: false, 
      data: [], 
      message: err?.message || "การเชื่อมต่อเครือข่ายขัดข้อง" 
    };
  }
};

/**
 * ดึงข้อมูลทุกหน้ามาต่อกัน (Recursive/Loop fetch)
 */
export const getAllRequisitionsPages = async (
  filters: RequisitionFilters = {}
): Promise<RequisitionHeader[]> => {
  const limit = Number(filters.limit) || 100;
  let page = Number(filters.page) || 1;
  const allRecords: RequisitionHeader[] = [];

  while (true) {
    const response = await getAllRequisitions({ ...filters, page, limit });

    if (!response.success || !Array.isArray(response.data)) break;

    allRecords.push(...response.data);

    const fetchedCount = response.data.length;
    const totalPages = response.totalPages || 0;

    if (fetchedCount < limit || page >= totalPages) break;

    page += 1;
  }

  return allRecords;
};

/**
 * ดึงข้อมูลใบเบิกตาม ID
 */
export const getRequisitionById = async (
  id: number
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const data = await api.get<RequisitionHeader>(`/v1/requisitions/${id}`);
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "ไม่พบข้อมูลใบเบิกที่ระบุ" };
  }
};

/**
 * สร้างใบเบิกใหม่
 */
export const createRequisition = async (
  payload: RequisitionPayload
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const data = await api.post<RequisitionHeader>(`/v1/requisitions`, payload);
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "สร้างใบเบิกไม่สำเร็จ" };
  }
};

/**
 * อนุมัติใบเบิก
 */
export const approveRequisition = async (
  requisitionId: number,
  itemsToIssue: Record<number, number> | Record<string, unknown>
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const data = await api.put<RequisitionHeader>(`/v1/requisitions/approve/${requisitionId}`, { items: itemsToIssue });
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "อนุมัติใบเบิกไม่สำเร็จ" };
  }
};

/**
 * บันทึกการส่งมอบ (Delivery)
 */
export const completeRequisitionDelivery = async (
  requisitionId: number
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const data = await api.put<RequisitionHeader>(`/v1/requisitions/deliver/${requisitionId}`);
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "บันทึกการนำส่งไม่สำเร็จ" };
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
    const data = await api.put<RequisitionHeader>(`/v1/requisitions/reject/${requisitionId}`, { note });
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "ปฏิเสธใบเบิกไม่สำเร็จ" };
  }
};

/**
 * ยกเลิกใบเบิก
 */
export const cancelRequisition = async (
  requisitionId: number
): Promise<ApiResponse<null>> => {
  try {
    await api.delete(`/v1/requisitions/${requisitionId}`);
    return { success: true, data: null, message: "ยกเลิกใบเบิกสำเร็จ" };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "ยกเลิกใบเบิกไม่สำเร็จ" };
  }
};

/**
 * ดึงรายการยืมที่ยังไม่คืน (Active Borrows)
 */
export const getBorrowActive = async (
  page = 1,
  limit = 10
): Promise<ApiResponse<RequisitionHeader[]>> => {
  try {
    const res = await api.list<RequisitionHeader>(`/v1/borrows/active`, { page, limit });
    return { 
      success: true, 
      data: res.data || [],
      total: res.meta?.total || 0,
      page: res.meta?.page || 1,
      limit: res.meta?.limit || 10,
      totalPages: res.meta?.totalPages || 0
    };
  } catch (err: any) {
    return { success: false, data: [], message: err?.message || "ไม่สามารถดึงข้อมูลการยืมได้" };
  }
};

/**
 * อัปโหลดเอกสารบัตรประชาชนของผู้ยืม (หลัง createRequisition สำเร็จ)
 */
export const uploadBorrowerDocument = async (
  borrowerId: string,
  formData: FormData
): Promise<{ id_card_url: string } | null> => {
  return api.upload<{ id_card_url: string }>(
    `/v1/files/borrowers/${borrowerId}/document`,
    formData,
    "PATCH"
  );
};

export interface UnitReturnDetail {
  unit_id: string;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note?: string;
}

export interface ReturnItemPayload {
  req_item_id: number;
  qty_returned: number;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note?: string;
  units?: UnitReturnDetail[];  // per-unit detail for REUSABLE items
}

/**
 * ส่งคืนของยืม (ผู้ยืมส่งคืน → รอคลังตรวจรับ)
 */
export const submitReturn = async (
  headerId: number,
  items: ReturnItemPayload[]
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const data = await api.put<RequisitionHeader>(`/v1/borrows/return/${headerId}`, { items });
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "ส่งคืนไม่สำเร็จ" };
  }
};

/**
 * ยืนยันการรับคืน (คลังกดตรวจรับ → อัปเดตสต็อก/ปิดงาน)
 */
export const verifyReturn = async (
  headerId: number
): Promise<ApiResponse<RequisitionHeader | null>> => {
  try {
    const data = await api.put<RequisitionHeader>(`/v1/borrows/return/verify/${headerId}`);
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "ยืนยันการรับคืนไม่สำเร็จ" };
  }
};