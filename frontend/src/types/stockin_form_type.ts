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

export interface StockInFormModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSuccessAction?: () => void;
}
