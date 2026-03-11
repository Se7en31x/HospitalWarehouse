// Requisition Service
import { apiClient } from "../lib/apiClient";

export interface RequisitionItem {
  id: number;
  req_qty: number;
  item?: {
    name: string;
    code: string;
    current_stock: number;
  };
}

export interface RequisitionPayload {
  type: "WITHDRAW" | "BORROW";
  department_id: string;
  department_name: string;
  items: Array<{ item_id: number; qty: number }>;
  note?: string;
}

export interface RequisitionHeader {
  id: number;
  doc_no: string;
  request_date: string;
  department_code: string;
  department_name?: string;
  requester_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "WITHDRAW" | "BORROW";
  requisition_item: RequisitionItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getRequisitionHistory = async (): Promise<ApiResponse<RequisitionHeader[]>> => {
  try {
    const response = await apiClient.get("/api/requisition/history");
    return response.data;
  } catch (error) {
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : "Failed to fetch requisition history",
    };
  }
};

export const approveRequisition = async (
  requisitionId: number,
  issuedQtys: Record<number, number>
): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post("/api/requisition/approve", {
      requisition_id: requisitionId,
      issued_items: issuedQtys,
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to approve requisition",
    };
  }
};

export const rejectRequisition = async (
  requisitionId: number,
  reason: string
): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post("/api/requisition/reject", {
      requisition_id: requisitionId,
      reject_reason: reason,
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to reject requisition",
    };
  }
};

export const createRequisition = async (
  payload: RequisitionPayload
): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.post("/api/requisition/create", payload);
    return response.data;
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to create requisition",
    };
  }
};
