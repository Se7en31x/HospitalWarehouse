// app/interfaces/lot.interface.ts

export interface ApiLot {
    lot_code: string;
    item_id: number;
    warehouse_id: number;
    supplier_id?: number | null;
    quantity: number;
    cost_price: number;
    expried_at?: string | null;
    status: string;

    // Relations
    items: {
        id: number;
        code: string;
        name: string;
        category: { name: string };
        unit: { name: string };
    };
    warehouse: {
        id: number;
        name: string;
    };
    supplier?: {
        id: number;
        name: string;
    } | null;
}

export interface UiLot {
    id: string;          // lot_code
    itemId: number;
    itemCode: string;
    itemName: string;
    category: string;
    warehouseId: number;
    warehouse: string;
    supplierId?: number;
    supplierName: string;
    quantity: number;
    unit: string;
    cost: number;
    expiryDate: string | null;
    status: string;
}

export interface CreateLotDto {
    item_id: number;
    warehouse_id: number;
    supplier_id?: number | null;
    quantity: number;
    cost_price: number;
    expried_at: string;
}

export interface AdjustLotDto {
    new_quantity: number;
    reason: string;
    user_id?: number;   
    user_name?: string; 
}

export interface MasterItem {
    id: number;
    code: string;
    name: string;
    category: { name: string };
    unit: { name: string };
}

export interface MasterWarehouse {
    id: number;
    name: string;
}

export interface MasterSupplier {
    id: number;
    name: string;
}