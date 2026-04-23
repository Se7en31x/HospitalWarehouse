import { UUID } from "crypto";

export type ItemStatus =
	| "ACTIVE"
	| "INACTIVE"
	| "ปกติ"
	| "ต่ำ"
	| "หมด"
	| "ระงับ"
	| string;

export interface ApiItem {
	id: number | string;
	code?: string | null;
	name?: string | null;
	description?: string | null;
	current_stock?: number | null;
	available_stock?: number | null;
	min_stock?: number | null;
	status?: ItemStatus | null;
	image_url?: string | null;
	category_id?: string | null;
	category_name?: string | null;
	unit_id?: string | null;
	unit_name?: string | null;
	warehouse_id?: string | null;
	warehouse_name?: string | null;
	/** บาง response ส่งเป็น object เดียว บาง response ส่งเป็น array ของ option */
	categories?: Option | Option[] | null;
	category?: Option | null;
	unit?: Option | null;
	warehouse?: Option | null;
	warehouses?: Option | null;
	type?: string | null;
	allowed_req?: boolean | null;
	allowed_borrow?: boolean | null;
	updated_at?: string | null;
}

export interface UiItem {
	id: string;
	code: string;
	name: string;
	description: string;
	categoryId: string;
	category: string;
	unitId: string;
	unit: string;
	warehouseId: string;
	location: string;
	stock: number;
	availableStock?: number;
	minStock: number;
	price: number;
	status: ItemStatus;
	imageUrl: string;
	type: string;
	allowed_req: boolean;
	allowed_borrow: boolean;
	updatedAt?: string | null;
}

export interface Option {
	id: UUID;
	name: string;
	item_type?: string | null;
}

export type categoryOptions = Option[];
export type warehouseOptions = Option[];
export type unitOptions = Option[];

export interface CreatePayload {
	name: string;
	description?: string;
	min_stock: number;
	category_id: string;
	unit_id: string;
	warehouse_id?: string;
	status?: ItemStatus;
	image_url?: string;
	type?: string;
	allowed_req?: boolean;
	allowed_borrow?: boolean;
}

export interface UpdatePayload {
	name?: string;
	description?: string;
	min_stock?: number;
	unit_id?: string;
	warehouse_id?: string;
	status?: ItemStatus;
	image_url?: string;
	type?: string;
	allowed_req?: boolean;
	allowed_borrow?: boolean;
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
