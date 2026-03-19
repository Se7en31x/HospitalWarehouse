export interface FormData {
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
  costPrice?: number;
  mfgDate?: string;
  expiryDate?: string;
  lotCode?: string; // Barcode or lot code field
}

export interface FormErrors {
  itemId?: string;
  quantityOrdered?: string;
  quantityReceived?: string;
  warehouse?: string;
  expiryDate?: string;
  poNumber?: string;
  supplierId?: string;
  donorName?: string;
  lotCode?: string;
}

export interface ReceiveHeaderInfo {
  id: string;
  doc_no: string;
  type: "PURCHASE" | "DONATION";
  supplier_id: string;
  supplier_name?: string;
  status: "PENDING" | "COMPLETED" | "DRAFT";
  receive_date?: string;
  note?: string;
  items: ReceiveItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ReceiveItem {
  id?: string;
  item_id: string;
  item_name?: string;
  expected_qty?: number;
  qty: number;
  lot_code: string;
  cost_price?: number;
  expired_at: string;
  category?: string;
  unit?: string;
}

export interface ConfirmReceiveFormData {
  receive_date: string;
  items: ReceiveItem[];
}

export interface StockInFormModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSuccessAction?: () => void;
  mode?: "create" | "view" | "confirm";
  receiveData?: ReceiveHeaderInfo;
  receiveHeaderId?: string;
}
