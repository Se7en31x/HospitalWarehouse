import Cookies from 'js-cookie';
import {
  HistoryEntry,
  HistoryResponse,
  HistoryFilterParams,
  TransactionType,
} from '@/types/history_type';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${Cookies.get('user_token') || ''}`,
});

const parseJson = async <T,>(response: Response): Promise<T> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse response: ${text}`);
  }
};

/**
 * Fetch history/transaction records with optional filters
 */
export const fetchHistory = async (
  filters?: HistoryFilterParams,
  page = 1,
  limit = 20
): Promise<HistoryResponse> => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.userId) params.append('userId', filters.userId);

    const response = await fetch(
      `${API_BASE_URL}/history?${params.toString()}`,
      {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await parseJson<HistoryResponse>(response);
    return data;
  } catch (error) {
    console.error('Failed to fetch history:', error);
    throw error;
  }
};

/**
 * Fetch a single history entry by ID
 */
export const fetchHistoryById = async (id: string): Promise<HistoryEntry> => {
  try {
    const response = await fetch(`${API_BASE_URL}/history/${id}`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const { data } = await parseJson<{ data: HistoryEntry }>(response);
    return data;
  } catch (error) {
    console.error(`Failed to fetch history ${id}:`, error);
    throw error;
  }
};

/**
 * Export history as CSV
 */
export const exportHistoryAsCSV = async (filters?: HistoryFilterParams): Promise<Blob> => {
  try {
    const params = new URLSearchParams({
      format: 'csv',
    });

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(
      `${API_BASE_URL}/history/export?${params.toString()}`,
      {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Failed to export history:', error);
    throw error;
  }
};

/**
 * Export history as PDF
 */
export const exportHistoryAsPDF = async (filters?: HistoryFilterParams): Promise<Blob> => {
  try {
    const params = new URLSearchParams({
      format: 'pdf',
    });

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(
      `${API_BASE_URL}/history/export?${params.toString()}`,
      {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Failed to export history:', error);
    throw error;
  }
};

/**
 * Get statistics/summary of transactions
 */
export const fetchHistoryStats = async (
  startDate?: string,
  endDate?: string
): Promise<{ byType: Record<TransactionType, number>; byStatus: Record<string, number> }> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(
      `${API_BASE_URL}/history/stats?${params.toString()}`,
      {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await parseJson<{ byType: Record<TransactionType, number>; byStatus: Record<string, number> }>(response);
    return data;
  } catch (error) {
    console.error('Failed to fetch history stats:', error);
    throw error;
  }
};
