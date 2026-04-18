export type StockMovementType =
  | "RECEIVE_IN"
  | "RECEIVE_CANCEL"
  | "OUT"
  | "ADJUST_IN"
  | "ADJUST_OUT"
  | "UPDATE";

export interface StockMovementItem {
  id: string;
  name: string;
  code: string;
  image_url?: string | null;
  category?: string | null;
  unit?: string | null;
}

export interface StockMovement {
  id: number;
  type: StockMovementType;
  quantity: number;
  balance_before?: number | null;
  balance_after?: number | null;
  remaining_balance?: number | null;   // alias for balance_after, kept for compat
  note?: string | null;
  created_by?: string | null;
  created_by_id?: string | null;
  operator_name?: string | null;
  created_at: string;
  item: StockMovementItem | null;
}

export interface StockMovementFilters {
  keyword?: string;
  type?: StockMovementType | "";
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface StockMovementListResponse {
  success: boolean;
  message?: string;
  data: StockMovement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
  };
}
