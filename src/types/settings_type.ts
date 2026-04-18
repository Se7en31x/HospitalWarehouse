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
  item_type?: "CONSUMABLE" | "REUSABLE" | "MED_ASSET" | string;
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
  item_type?: "CONSUMABLE" | "REUSABLE" | "MED_ASSET";
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

export interface Supplier {
  id: string;
  name: string;
  contact?: string | null;
  address?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
  tax_id?: string | null;
  email?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierPayload {
  name: string;
  contact?: string;
  address?: string;
  phone?: string;
  contact_phone?: string;
  tax_id?: string;
  email?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}

export type SystemSettingValueType = "string" | "number" | "boolean";

export interface SystemSettingItem {
  value: string;
  type: SystemSettingValueType;
  label: string;
  group?: string;
  id?: number;
  updated_at?: string;
}

export type SystemSettingsMap = Record<string, SystemSettingItem>;