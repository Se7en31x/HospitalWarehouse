import { api, PaginatedResponse } from '@/lib/apiClient';
import {
  HistoryEntry,
  HistoryResponse,
  HistoryFilterParams,
  TransactionType,
} from '@/types/history_type';

/**
 * Fetch history/transaction records with optional filters
 */
export const fetchHistory = async (
  filters?: HistoryFilterParams,
  page = 1,
  limit = 10
): Promise<HistoryResponse> => {
  const params = {
    page,
    limit,
    ...filters,
  };

  // ใช้ api.list เพื่อจัดการ Pagination meta อัตโนมัติ
  const res = await api.list<HistoryEntry>('/history', params as Record<string, unknown>);
  
  return {
    items: res.data || [],
    total: res.meta?.total || 0,
    page: res.meta?.page || 1,
    limit: res.meta?.limit || 10,
    totalPages: res.meta?.totalPages || 1
  } as unknown as HistoryResponse;
};

/**
 * Fetch a single history entry by ID
 */
export const fetchHistoryById = async (id: string): Promise<HistoryEntry> => {
  return api.get<HistoryEntry>(`/history/${id}`);
};

/**
 * Export history as CSV
 */
export const exportHistoryAsCSV = async (filters?: HistoryFilterParams): Promise<Blob> => {
  const params = {
    format: 'csv',
    ...filters,
  };

  // สำหรับไฟล์ Blob ยังต้องใช้ fetch พื้นฐาน แต่ดึง Token ผ่าน helper 
  // (หรือถ้า apiClient มีเมธอดสำหรับ blob สามารถเปลี่ยนไปใช้ได้)
  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history/export?${queryString}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${/* ดึงจาก storage/cookie ตามที่ apiClient ทำ */ ''}`,
    },
  });

  if (!response.ok) throw new Error(`Export failed: ${response.status}`);
  return await response.blob();
};

/**
 * Export history as PDF
 */
export const exportHistoryAsPDF = async (filters?: HistoryFilterParams): Promise<Blob> => {
  const params = {
    format: 'pdf',
    ...filters,
  };

  const queryString = new URLSearchParams(params as any).toString();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history/export?${queryString}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${/* ดึงจาก storage/cookie ตามที่ apiClient ทำ */ ''}`,
    },
  });

  if (!response.ok) throw new Error(`Export failed: ${response.status}`);
  return await response.blob();
};

/**
 * Get statistics/summary of transactions
 */
export const fetchHistoryStats = async (
  startDate?: string,
  endDate?: string
): Promise<{ byType: Record<TransactionType, number>; byStatus: Record<string, number> }> => {
  const params = {
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  return api.get('/history/stats', params);
};