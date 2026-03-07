export interface ApiResponse<T> {
  status: "ok" | "error";
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
    keyword: string;
  };
}

export interface Category {
  id: string;
  name: string;
  code_prefix: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryPayload {
  name: string;
  code_prefix: string;
  description?: string;
}

export interface UnitPayload {
  name: string;
  description?: string;
}

export interface WarehousePayload {
  name: string;
  location?: string;
  description?: string;
}