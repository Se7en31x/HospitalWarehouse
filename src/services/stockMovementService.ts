import {
  StockMovement,
  StockMovementFilters,
  StockMovementListResponse,
} from "@/types/stockmovement_type";
import { api } from "@/lib/apiClient";

/**
 * ดึงรายการการเคลื่อนไหวพัสดุพร้อมตัวกรอง (Pagination)
 */
export const getStockMovements = async (
  filters?: StockMovementFilters
): Promise<StockMovementListResponse> => {
  try {
    const params: Record<string, unknown> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });
    }

    // ใช้ api.list เพื่อดึงทั้ง data และ meta มาจัดการต่อ
    const res = await api.list<StockMovement>(`/v1/stock-movements`, params);

    return {
      success: true,
      data: res.data || [],
      meta: res.meta ?? { total: 0, page: 1, limit: 10, totalPages: 1, nextPage: null, prevPage: null },
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "ไม่สามารถดึงข้อมูลได้",
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1, nextPage: null, prevPage: null },
    };
  }
};

/**
 * โหลดการเคลื่อนไหวทั้งหมดในครั้งเดียว — สำหรับ client-side filter
 */
export const getAllStockMovements = async (
  filters?: Omit<StockMovementFilters, "page" | "limit">
): Promise<StockMovement[]> => {
  const res = await getStockMovements({
    ...(filters ?? {}),
    limit: 1000,
    _t: Date.now(),
  } as unknown as StockMovementFilters);
  if (!res.success || !Array.isArray(res.data)) return [];
  return res.data;
};

/**
 * ดึงข้อมูลการเคลื่อนไหวพัสดุตาม ID
 */
export const getStockMovementById = async (
  id: number
): Promise<{ success: boolean; data: StockMovement | null; message?: string }> => {
  try {
    const data = await api.get<StockMovement>(`/v1/stock-movements/${id}`);
    return { success: true, data: data ?? null };
  } catch (err: any) {
    return { success: false, data: null, message: err?.message || "ไม่พบข้อมูล" };
  }
};