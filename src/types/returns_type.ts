import type { Option } from "./items_type";

// ============ Enums & Constants ============
export type ReturnStatus = "รอการคืน" | "คืนแล้ว" | "ค้างคืน" | "ยกเลิก";
export type ReturnType = "BORROW";

// ============ API Response Types ============
export type ApiBorrow = {
	id: string;
	item_id: number;
	quantity: number;
	returned_qty?: number;
	borrowed_by: string;
	borrow_date: string;
	due_date: string;
	return_date?: string | null;
	status: string;
	notes?: string | null;
	department?: string;
	item?: {
		id: number;
		code: string;
		name: string;
		categories?: { id: number; name: string } | null;
		unit?: { id: number; name: string } | null;
	};
};

// ============ UI Display Types ============
export type UiReturn = {
	id: string;
	itemCode: string;
	itemName: string;
	category: string;
	unit: string;
	quantity: number;
	returnedQuantity?: number;
	borrowedBy: string;
	borrowDate: string;
	dueDate: string;
	returnDate?: string;
	status: ReturnStatus;
	notes?: string;
	daysOverdue?: number;
};

// ============ Statistics Types ============
export type ReturnStats = {
	totalBorrowed: number;
	returned: number;
	pending: number;
	overdue: number;
	totalQuantity: number;
};

// ============ DTO / Form Types ============
export type UpdateReturnStatusDto = {
	status: ReturnStatus;
	return_date?: string;
	returned_qty?: number;
	notes?: string;
};

export type ReturnFilters = {
	search?: string;
	status?: ReturnStatus;
};

export type ReturnSortField = "dueDate" | "status" | "quantity" | "itemName" | "borrowDate";
export type SortOrder = "asc" | "desc";

// ============ Response Type ============
export type PagedResponse<T> = {
	data: T[];
	total: number;
	page: number;
	limit: number;
};
