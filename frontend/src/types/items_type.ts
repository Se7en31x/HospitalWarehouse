export type ItemStatus =
	| "ACTIVE"
	| "INACTIVE"
	| "ปกติ"
	| "ต่ำ"
	| "หมด"
	| "ระงับ"
	| string;

export interface Option {
	id: string;
	name: string;
}

export interface ApiItem {
	id: number | string;
	code?: string | null;
	name?: string | null;
	current_stock?: number | null;
	min_stock?: number | null;
	status?: ItemStatus | null;
	image_url?: string | null;
	categories?: Option | null;
	category?: Option | null;
	unit?: Option | null;
	warehouse?: Option | null;
}

export interface UiItem {
	id: string;
	code: string;
	name: string;
	category: string;
	unit: string;
	location: string;
	stock: number;
	minStock: number;
	price: number;
	status: ItemStatus;
	imageUrl: string;
}

export interface AllOptions {
	category: Option[];
	unit: Option[];
	warehouse: Option[];
}

export type ItemOptions = AllOptions;

export interface CreatePayload {
	name: string;
	min_stock: number;
	category_id: string;
	unit_id: string;
	warehouse_id?: string;
	status?: ItemStatus;
	image_url?: string;
}

export interface UpdatePayload {
	name?: string;
	min_stock?: number;
	unit_id?: string;
	warehouse_id?: string;
	status?: ItemStatus;
	image_url?: string;
}

export interface DeleteResponse {
	success?: boolean;
	message?: string;
}

export const categoryTranslations: Record<string, string> = {
	"วัสดุสิ้นเปลือง": "วัสดุสิ้นเปลือง",
	"เวชภัณฑ์": "เวชภัณฑ์",
	"ครุภัณฑ์": "ครุภัณฑ์",
};
