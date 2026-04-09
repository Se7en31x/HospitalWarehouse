// Transaction types
export type TransactionType = 'REQUEST' | 'IMPORT' | 'EXPORT' | 'BORROW' | 'DISPENSE' | 'ADJUSTMENT';

// Status
export type TransactionStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

// Single item in a transaction
export interface HistoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lotNumber?: string;
  expiryDate?: string;
  reason?: string; // for adjustments
}

// Request transaction (has multiple items)
export interface RequestTransaction {
  id: string;
  type: 'REQUEST';
  date: string;
  requester: string;
  department?: string;
  status: TransactionStatus;
  items: HistoryItem[];
  notes?: string;
  dueDate?: string;
}

// Single item transaction (import, export, borrow, dispense, adjustment)
export interface SingleTransaction {
  id: string;
  type: Exclude<TransactionType, 'REQUEST'>;
  date: string;
  user: string;
  department?: string;
  status: TransactionStatus;
  item: HistoryItem;
  notes?: string;
}

// Union type for all transaction types
export type HistoryEntry = RequestTransaction | SingleTransaction;

// History list response
export interface HistoryResponse {
  data: HistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

// Filter parameters
export interface HistoryFilterParams {
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  category?: string;
  userId?: string;
}
