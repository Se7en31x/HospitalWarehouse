export interface Option {
  id: string;
  name: string;
}

export interface ItemOption extends Option {
  category?: string;
  unit?: string;
}

export interface StockInItem {
  itemId: string;
  itemName: string;
  category: string;
  poNumber: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  warehouse: string;
  supplierId?: string;
  lotCode?: string;
  costPrice?: number;
  mfgDate?: string;
  expiryDate?: string;
  barcode?: string;
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
  status: 'ACTIVE' | 'PENDING' | 'DELETED';
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
    unit?: string;
  }

  export interface StockInItem {
    itemId: string;
    itemName: string;
    category: string;
    poNumber: string;
    quantityOrdered: number;
    quantityReceived: number;
    unit: string;
    warehouse: string;
    supplierId?: string;
    lotCode?: string;
    costPrice?: number;
    mfgDate?: string;
    expiryDate?: string;
    barcode?: string;
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
    status: 'ACTIVE' | 'PENDING' | 'DELETED';
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

  export interface AllOptions {
    items: ItemOption[];
    categories: Option[];
    units: Option[];
    warehouses: Option[];
    suppliers: Option[];
  }
}
