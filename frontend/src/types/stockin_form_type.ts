export interface FormData {
  itemId: string;
  itemName: string;
  category: string;
  poNumber: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  warehouse: string;
  supplierId?: string;
  costPrice?: number;
  mfgDate?: string;
  expiryDate?: string;
  barcode?: string;
}

export interface FormErrors {
  itemId?: string;
  quantityOrdered?: string;
  quantityReceived?: string;
  warehouse?: string;
  expiryDate?: string;
  poNumber?: string;
}

export interface StockInFormModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSuccessAction?: () => void;
}
