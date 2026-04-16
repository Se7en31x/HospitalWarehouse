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
 * ดึงข้อมูลการเคลื่อนไหวพัสดุทุกหน้ามาต่อกันเป็น Array เดียว
 */
export const getAllStockMovements = async (
  filters?: StockMovementFilters
): Promise<StockMovement[]> => {
  const firstPage = await getStockMovements({ ...filters, page: 1, limit: 10 });

  if (!firstPage.success) {
    return [];
  }

  const allMovements = [...firstPage.data];
  const totalPages = firstPage.meta.totalPages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await getStockMovements({
      ...filters,
      page,
      limit: firstPage.meta.limit || 10,
    });

    if (nextPage.success) {
      allMovements.push(...nextPage.data);
    }
  }

  return allMovements;
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