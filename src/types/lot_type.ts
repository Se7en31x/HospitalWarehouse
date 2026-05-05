import type { Option, UiItem } from "./items_type";

// ============ Enums & Constants ============
export type ExpiryStatus = 'ปกติ' | 'ใกล้หมด' | 'หมดอายุ';
export type LotStatusEnum = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'DEPLETED' | 'DISPOSED';
export type LotDetailStatus = 'QUARANTINE' | 'APPROVED' | 'RECALLED' | 'EXPIRED' | 'DAMAGED';

// ============ API Response Types ============
export type MasterSupplier = {
	id: string | number;
	name: string;
	contact?: string | null;
	address?: string | null;
};

export type ApiLot = {
	id: string;
	lot_code: string;
	item_id: string;
	item_code: string;
	item_name: string;
	category_id: string;
	category_name: string;
	unit_id: string;
	unit_name: string;
	warehouse_id: string | null;
	warehouse_name: string | null;
	warehouse_location: string | null;
	quantity: number;
	status: string;
	expiry_status: string;
	expired_at: string | null;
	note: string | null;
	created_at: string;
	updated_at: string;
};

// ============ Traceability Types ============
export type LotMovement = {
	id: string;
	lot_id: string;
	action: 'RECEIVE' | 'ADJUST' | 'TRANSFER' | 'WITHDRAW' | 'RETURN';
	quantity_before: number;
	quantity_after: number;
	quantity_changed: number;
	reason?: string;
	user_name: string;
	created_at: string;
};

// ============ UI Display Types ============
export type UiLot = {
	id: string;
	lotCode: string;
	itemName: string;
	itemCode: string;
	categoryId: string;
	category: string;
	warehouseId: string | null;
	warehouse: string;
	quantity: number;
	unit: string;
	cost: number;
	expiryDate: string | null;
	status: string;
	// Computed fields
	expiryStatus?: ExpiryStatus;
	daysRemaining?: number;
	totalValue?: number;
	createdAt?: string;
	supplierId?: number | null;
	supplierName?: string;
};

// ============ KPI & Dashboard Types ============
export type KpiMetrics = {
	totalLots: number;
	nearExpiryCount: number;
	expiredCount: number;
	totalValue: number;
	averageExpiryDays: number;
	warehouseCount: number;
	categoryCount: number;
};

export type LotSortField = 'itemName' | 'expiryDate' | 'quantity' | 'cost' | 'createdAt' | 'daysRemaining';
export type SortOrder = 'asc' | 'desc';

// ============ DTO / Form Types ============
export type CreateLotFormData = {
	item_id: string | number;
	warehouse_id: string | number;
	category_id: string | number;
	supplier_id: string | number | null;
	quantity: number;
	quantity_received: number;
	cost_price: number;
	expried_at: string;
	status: string;
	lot_status: string;
	mfg_date: string | null;
	received_date: string | null;
	qc_approved_date: string | null;
	po_number: string | null;
	barcode: string | null;
	coa_file: string | null;
	manufacturing_cert_file: string | null;
	qc_inspector: string | null;
	qc_inspection_date: string | null;
	serial_number: string | null;
};

export type CreateLotDto = {
	item_id: number;
	warehouse_id: number;
	category_id: number;
	supplier_id: string | null;
	quantity: number;
	quantity_received: number;
	cost_price: number;
	expried_at: string;
	status?: string;
	lot_status?: string;
	mfg_date?: string | null;
	received_date?: string | null;
	qc_approved_date?: string | null;
	po_number?: string | null;
	barcode?: string | null;
	coa_file?: string | null;
	manufacturing_cert_file?: string | null;
	qc_inspector?: string | null;
	qc_inspection_date?: string | null;
	serial_number?: string | null;
};

export type AdjustLotPayload = {
	new_quantity: number;
	reason: string;
	user_name: string;
	/** ส่งเมื่อเปิดกลับหลังจำหน่ายทิ้ง (DISPOSED) ร่วมกับ new_quantity > 0 */
	status?: LotStatusEnum;
	note?: string;
};

// ============ Component Props Types ============
export type CreateModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: CreateLotFormData) => void;
	itemsList: UiItem[];
	warehousesList: Option[];
	suppliersList: MasterSupplier[];
	isSaving: boolean;
};

export type AdjustModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (newQty: number, reason: string) => void;
	lot: UiLot | null;
	isAdjusting: boolean;
};

export type LotDetailsModalProps = {
	isOpen: boolean;
	onClose: () => void;
	lot: UiLot | null;
	movements?: LotMovement[];
	isLoading?: boolean;
};

export type LotClientProps = {
	initialLots: UiLot[];
	initialItems: UiItem[];
	initialWarehouses: Option[];
	initialSuppliers: MasterSupplier[];
};

// ============ API Response Types ============
export type ApiResponse<T> = {
	success: boolean;
	message: string;
	data?: T;
};
