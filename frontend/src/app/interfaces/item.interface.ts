export const categoryTranslations: Record<string, string> = {
    "Equipment": "ครุภัณฑ์",
    "Drug": "ยา",
    "Supplies": "วัสดุสิ้นเปลือง",
    "Medical Non-Drug Supplies": "เวชภัณฑ์มิใช่ยา"
};

// ตัดคำว่า Item ออก เพราะเราจะเรียกผ่าน Item. อยู่แล้ว
export interface ApiItem {
    id: number;
    name: string;
    code: string | null;
    min_stock: number;
    current_stock: number;
    status: string;
    category: { id: number; name: string } | null;
    unit: { id: number; name: string } | null;
    warehouse: { id: number; name: string; location?: string } | null;
    image_url: string;
}

export interface UiItem {
    id: string;
    code: string;
    name: string;
    category: string;
    stock: number;
    minStock: number; 
    unit: string;
    location: string;
    price: number;
    status: string;
    imageUrl: string;
}

export interface CreatePayload {
    name: string;
    min_stock: number;
    category_id: number;
    unit_id: number;
    warehouse_id: number;
    status: string;
    image_url: string;
}

export interface UpdatePayload {
    name: string;
    min_stock: number;
    unit_id: number;
    warehouse_id: number;
    status: string;
    image_url: string;
}

export interface Option {
    id: number;
    name: string;
}

export interface AllOptions {
    category: Option[];
    unit: Option[];
    warehouse: Option[];
}

export interface DeleteResponse {
    message: string;
    data?: unknown;
    error?: string;
}