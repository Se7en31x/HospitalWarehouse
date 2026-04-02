import {
  StockMovement,
  StockMovementFilters,
  StockMovementListResponse,
} from "@/types/stockmovement_type";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const getStockMovements = async (
  filters?: StockMovementFilters
): Promise<StockMovementListResponse> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });
  }

  const res = await fetch(
    `${API_BASE_URL}/v1/stock-movements?${params.toString()}`,
    { headers: { "Content-Type": "application/json" } }
  );

  const result = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: result.message || "ไม่สามารถดึงข้อมูลได้",
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1, nextPage: null, prevPage: null },
    };
  }

  return {
    success: true,
    message: result.message,
    data: Array.isArray(result.data) ? result.data : [],
    meta: result.meta ?? { total: 0, page: 1, limit: 10, totalPages: 1, nextPage: null, prevPage: null },
  };
};

export const getStockMovementById = async (
  id: number
): Promise<{ success: boolean; data: StockMovement | null; message?: string }> => {
  const res = await fetch(`${API_BASE_URL}/v1/stock-movements/${id}`, {
    headers: { "Content-Type": "application/json" },
  });

  const result = await res.json();

  if (!res.ok) {
    return { success: false, data: null, message: result.message || "ไม่พบข้อมูล" };
  }

  return { success: true, data: result.data ?? null, message: result.message };
};
