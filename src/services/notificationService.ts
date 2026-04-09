import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const parseJwtPayload = (token: string) => {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

const resolveRecipientId = (): string => {
  const token = Cookies.get("user_token") || "";
  const payload = token ? parseJwtPayload(token) : null;
  return String(payload?.user_id || payload?.id || payload?.sub || "");
};

const getHeaders = () => {
  const token = Cookies.get("user_token") || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

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

export const getNotifications = async (params: { page?: number; limit?: number; unread?: boolean } = {}): Promise<NotificationListResult> => {
  const query = new URLSearchParams();
  query.set("recipient_id", resolveRecipientId());
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.unread !== undefined) query.set("unread", String(params.unread));

  const response = await fetch(`${API_BASE_URL}/v1/notifications?${query.toString()}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || "ไม่สามารถดึงข้อมูลแจ้งเตือนได้");
  }

  return {
    items: result?.data || [],
    total: result?.meta?.total || 0,
    page: result?.meta?.page || 1,
    limit: result?.meta?.limit || 20,
    totalPages: result?.meta?.totalPages || 1,
    nextPage: result?.meta?.nextPage ?? null,
    prevPage: result?.meta?.prevPage ?? null,
  };
};

export const getUnreadCount = async (): Promise<number> => {
  const recipientId = resolveRecipientId();
  const response = await fetch(`${API_BASE_URL}/v1/notifications/unread-count?recipient_id=${encodeURIComponent(recipientId)}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || "ไม่สามารถดึงจำนวนแจ้งเตือนที่ยังไม่อ่านได้");
  }

  return Number(result?.data?.unread || 0);
};

export const markNotificationRead = async (id: number): Promise<void> => {
  const recipientId = resolveRecipientId();
  const response = await fetch(`${API_BASE_URL}/v1/notifications/${id}/read`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ recipient_id: recipientId }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || "ไม่สามารถอัปเดตสถานะอ่านแล้วได้");
  }
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const recipientId = resolveRecipientId();
  const response = await fetch(`${API_BASE_URL}/v1/notifications/read-all`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ recipient_id: recipientId }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || "ไม่สามารถอ่านทั้งหมดได้");
  }
};
