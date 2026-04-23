import { api, PaginatedResponse } from "@/lib/apiClient";

// ─── Types ───────────────────────────────────────────────────────────

export interface NotificationItem {
  id: number;
  recipient_row_id: number;
  is_read: boolean;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at?: string | null;
  type?: string;
  severity?: string;
  title?: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_code?: string | null;
  metadata?: Record<string, unknown> | null;
  expires_at?: string | null;
}

export interface NotificationListResult {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

// ─── API Calls ───────────────────────────────────────────────────────

/**
 * ดึงรายการแจ้งเตือน
 * ไม่ต้องส่ง recipient_id ไปแล้ว เพราะ Middleware หลังบ้านจะดึงจาก Token ให้เอง
 */
export const getNotifications = async (
  params: { page?: number; limit?: number; unread?: boolean; read?: boolean; severity?: string; entity_type?: string } = {}
): Promise<NotificationListResult> => {
  const res = await api.list<NotificationItem>("/v1/notifications", params as Record<string, unknown>);
  
  return {
    items: res.data || [],
    total: res.meta?.total || 0,
    page: res.meta?.page || 1,
    limit: res.meta?.limit || 20,
    totalPages: res.meta?.totalPages || 1,
    nextPage: res.meta?.nextPage ?? null,
    prevPage: res.meta?.prevPage ?? null,
  };
};

/**
 * ดึงจำนวนแจ้งเตือนที่ยังไม่อ่าน
 */
export const getUnreadCount = async (entityType?: string): Promise<number> => {
  const params = entityType ? `?entity_type=${encodeURIComponent(entityType)}` : "";
  const data = await api.get<{ unread: number }>(`/v1/notifications/unread-count${params}`);
  return Number(data?.unread || 0);
};

/**
 * ดึงจำนวนแจ้งเตือนทั้งหมดตาม severity
 */
export const getSeverityTotal = async (severity: string): Promise<number> => {
  const res = await getNotifications({ page: 1, limit: 1, severity });
  return res.total;
};

/**
 * ทำเครื่องหมายแจ้งเตือนว่าอ่านแล้ว
 */
export const markNotificationRead = async (id: number): Promise<void> => {
  // ไม่ต้องส่ง recipient_id ใน body เพราะหลังบ้านใช้จาก JWT sub
  await api.patch(`/v1/notifications/${id}/read`, {});
};

/**
 * ทำเครื่องหมายแจ้งเตือนทั้งหมดว่าอ่านแล้ว
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch("/v1/notifications/read-all", {});
};

/** แจ้ง client อื่น (เช่น NotificationBell) ให้รีเฟรชจำนวนยังไม่อ่าน หลังอ่านบนหน้าเต็ม */
export const NOTIFICATIONS_UI_REFRESH = "hpk:notifications-refresh";

export function emitNotificationsUIRefresh(entityType?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UI_REFRESH, { detail: { entityType } })
  );
}