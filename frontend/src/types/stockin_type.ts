export interface Option {
  id: string;
  name: string;
}

export interface ItemOption extends Option {
  category?: string;
  categoryId?: string;
  unit?: string;
  unitId?: string;
  warehouseId?: string;
  warehouseName?: string;
}

export interface StockInItem {
  itemId: string;
  itemName: string;
  categoryId: string;
  category: string;
  poNumber: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitId: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  supplierId?: string;
  lotCode?: string; // Barcode or lot code
  costPrice?: number;
  mfgDate?: string;
  expiryDate?: string;
  isDraft?: boolean;
}

export interface StockInRecord {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  poNumber: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  warehouse: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'PENDING' | 'DRAFT' | 'DELETED';
}

export interface CreatePayload {
  item_id: string;
  warehouse_id: string;
  quantity: number;
  quantity_received: number;
  po_number?: string;
  supplier_id?: string;
  cost_price?: number;
  mfg_date?: string;
  expried_at?: string;
  barcode?: string;
  serial_number?: string;
}

export interface DraftPayload {
  item_id: string;
  warehouse_id: string;
  expected_qty: number;
  qty?: number;
  cost_price?: number;
  po_number?: string;
  supplier_id?: string;
  status: 'PENDING' | 'DRAFT';
  note?: string;
}

export interface AllOptions {
  items: ItemOption[];
  categories: Option[];
  units: Option[];
  warehouses: Option[];
  suppliers: Option[];
}

// Namespace for backwards compatibility
export namespace StockIn {
  export interface Option {
    id: string;
    name: string;
  }

  export interface ItemOption extends Option {
    category?: string;
    categoryId?: string;
    unit?: string;
    unitId?: string;
    warehouseId?: string;
    warehouseName?: string;
  }

  export interface StockInItem {
    itemId: string;
    itemName: string;
    categoryId: string;
    category: string;
    poNumber: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitId: string;
    unit: string;
    warehouseId: string;
    warehouseName: string;
    supplierId?: string;
    lotCode?: string;
    costPrice?: number;
    mfgDate?: string;
    expiryDate?: string;
    barcode?: string;
    isDraft?: boolean;
  }

  export interface StockInRecord {
    id: string;
    itemId: string;
    itemName: string;
    category: string;
    poNumber: string;
    quantityOrdered: number;
    quantityReceived: number;
    unit: string;
    warehouse: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'PENDING' | 'DRAFT' | 'DELETED';
  }

  export interface CreatePayload {
    item_id: string;
    warehouse_id: string;
    quantity: number;
    quantity_received: number;
    po_number?: string;
    supplier_id?: string;
    cost_price?: number;
    mfg_date?: string;
    expried_at?: string;
    barcode?: string;
    serial_number?: string;
  }

  export interface DraftPayload {
    item_id: string;
    warehouse_id: string;
    expected_qty: number;
    qty?: number;
    cost_price?: number;
    po_number?: string;
    supplier_id?: string;
    status: 'PENDING' | 'DRAFT';
    note?: string;
  }

  export interface AllOptions {
    items: ItemOption[];
    categories: Option[];
    units: Option[];
    warehouses: Option[];
    suppliers: Option[];
  }
}
