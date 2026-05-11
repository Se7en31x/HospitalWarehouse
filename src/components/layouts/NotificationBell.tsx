"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, Package, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_UI_REFRESH,
  type NotificationItem,
} from "@/services/notificationService";
import { socket } from "@/lib/socket";
import { fmtDateCompact } from "@/utils/dateUtils";

interface NotificationBellProps {
  title?: string;
  viewAllHref?: string;
  entityType?: string;
}

const REQUISITION_CODE_PREFIXES = ["REQ-", "BOR-"];

const isRequisitionCode = (code?: string | null): boolean => {
  if (!code) return false;
  const upper = code.toString().trim().toUpperCase();
  return REQUISITION_CODE_PREFIXES.some((p) => upper.startsWith(p));
};

/**
 * แปลง notification → URL ของหน้าที่เกี่ยวข้อง
 * รองรับทั้งฝั่ง WAREHOUSE และ REQUEST_HISTORY
 * คืน null ถ้าไม่มีหน้าที่เหมาะสม (จะใช้แค่ mark-read โดยไม่ navigate)
 */
const resolveNotificationHref = (n: NotificationItem): string | null => {
  const type = (n.type || "").toUpperCase();
  const entityType = (n.entity_type || "").toUpperCase();
  const entityId = (n.entity_id || "").toString().trim();
  const entityCode = n.entity_code || null;

  // ── ฝั่งผู้ขอ: ทุกอย่างผูกกับใบคำขอ → ไปหน้าประวัติของใบนั้น ────────────
  if (entityType === "REQUEST_HISTORY") {
    if (!entityId) return "/request/history";
    return `/request/history/${entityId}`;
  }

  // ── ฝั่งคลัง: เลือกหน้าตาม type ──────────────────────────────────────
  if (entityType === "WAREHOUSE") {
    switch (type) {
      case "LOT_EXPIRING":
        return "/warehouse/lots";

      case "LOW_STOCK":
        return "/warehouse/items";

      case "STOCK_IN":
        // STOCK_IN มี 2 แหล่ง: รับเข้า batch (notifyBatch) กับ ตรวจรับคืน (verifyReturn)
        // entity_code ของฝั่ง verifyReturn เป็น REQ-/BOR- เสมอ
        if (isRequisitionCode(entityCode)) {
          return entityId ? `/warehouse/requests/${entityId}` : "/warehouse/requests";
        }
        return entityId ? `/warehouse/receives/${entityId}` : "/warehouse/receives";

      case "STOCK_OUT":
      case "REQUISITION_CREATED":
      case "REQUISITION_CANCELLED":
      case "BORROW_OVERDUE":
        return entityId ? `/warehouse/requests/${entityId}` : "/warehouse/requests";

      case "BORROW_RETURN_SUBMITTED":
        return entityId ? `/warehouse/returns/${entityId}` : "/warehouse/returns";

      default:
        return null;
    }
  }

  return null;
};

const timeAgo = (value?: string | null): string => {
  if (!value) return "-";
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return "เมื่อกี้";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return fmtDateCompact(value);
};

interface IconConfig {
  icon: React.ReactNode;
  bg: string;
}

const getIconConfig = (n: NotificationItem): IconConfig => {
  const type = (n.type || "").toUpperCase();
  const severity = (n.severity || "INFO").toUpperCase();

  if (severity === "CRITICAL" || type.includes("STOCK") || type.includes("LOW")) {
    return {
      icon: <AlertTriangle className="w-4 h-4" />,
      bg: "bg-red-100 text-red-600",
    };
  }
  if (type.includes("ASSET") || type.includes("NEW_ASSET")) {
    return {
      icon: <Package className="w-4 h-4" />,
      bg: "bg-emerald-100 text-emerald-600",
    };
  }
  if (type.includes("REQ") || type.includes("BORROW") || type.includes("REQUEST") || type.includes("WITHDRAW")) {
    return {
      icon: <FileText className="w-4 h-4" />,
      bg: "bg-blue-100 text-blue-600",
    };
  }
  return {
    icon: <Bell className="w-4 h-4" />,
    bg: "bg-blue-100 text-blue-600",
  };
};

export default function NotificationBell({ title = "การแจ้งเตือน", viewAllHref, entityType }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const isVisibleRef = useRef(true);
  const isOpenRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevItemCountRef = useRef(4);
  const seenNotifIdsRef = useRef<Set<number>>(new Set());

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount(entityType);
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, [entityType]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    // After a real fetch the full list replaces optimistic additions, so reset the
    // dedup registry so future socket pushes are counted correctly.
    seenNotifIdsRef.current = new Set();
    try {
      const result = await getNotifications({ page: 1, limit: 200, ...(entityType ? { entity_type: entityType } : {}) });
      const fetched = result.items || [];
      prevItemCountRef.current = fetched.length || prevItemCountRef.current;
      setItems(fetched);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadUnreadCount(), loadItems()]);
  }, [loadUnreadCount, loadItems]);

  // Keep the ref in sync so the stable socket effect can read it without deps
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => { loadUnreadCount(); }, [loadUnreadCount]);

  useEffect(() => {
    const onUIFresh = (ev: Event) => {
      const t = (ev as CustomEvent<{ entityType?: string }>).detail?.entityType;
      if (t != null && t !== entityType) return;
      loadUnreadCount();
    };
    window.addEventListener(NOTIFICATIONS_UI_REFRESH, onUIFresh);
    return () => window.removeEventListener(NOTIFICATIONS_UI_REFRESH, onUIFresh);
  }, [entityType, loadUnreadCount]);
  useEffect(() => { if (isOpen) loadItems(); }, [isOpen, loadItems]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const nowVisible = document.visibilityState === "visible";
      isVisibleRef.current = nowVisible;
      // Flush any refresh that arrived while the tab was hidden
      if (nowVisible && pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        loadUnreadCount();
      }
    };
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [loadUnreadCount]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    console.log("[Socket] Listening for:", entityType);

    if (!socket.connected) socket.connect();

    const handleRefreshSignal = (message: string) => {
      if (message !== "NOTIFICATIONS") return;
      if (!isVisibleRef.current) {
        pendingRefreshRef.current = true;
        return;
      }
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        loadUnreadCount();
        if (isOpenRef.current) loadItems();
        refreshTimerRef.current = null;
      }, 180);
    };

    const handleNotificationNew = (notif: NotificationItem) => {
      if (entityType && notif.entity_type !== entityType) return;
      // Deduplicate via ref before touching any state — prevents double-counting
      // when the same notification arrives from both USER: and ROLE: socket rooms.
      if (notif.id) {
        if (seenNotifIdsRef.current.has(notif.id)) return;
        seenNotifIdsRef.current.add(notif.id);
      }
      setItems((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    socket.on("notification:new", handleNotificationNew);

    return () => {
      if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
      socket.off("notification:new");
      socket.off("REFRESH_DATA");
    };
  }, [entityType, socket, loadUnreadCount, loadItems]);

  const handleMarkRead = useCallback(async (id: number) => {
    const wasUnread = items.find((n) => n.id === id)?.is_read === false;

    // Optimistic update — flip to read instantly
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await markNotificationRead(id);
    } catch {
      // Revert on failure
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n));
      if (wasUnread) setUnreadCount((c) => c + 1);
    }
  }, [items]);

  const handleItemClick = useCallback(async (n: NotificationItem) => {
    const href = resolveNotificationHref(n);

    // Mark read first (fire-and-forget) so navigation isn't blocked
    if (n.id) handleMarkRead(n.id);

    if (href) {
      setIsOpen(false);
      router.push(href);
    }
  }, [handleMarkRead, router]);

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAll(true);
    try { await markAllNotificationsRead(); await refreshAll(); } catch { /* silent */ } finally { setIsMarkingAll(false); }
  }, [refreshAll]);

  return (
    <div className="relative self-stretch flex items-center" ref={rootRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-11 w-11 shrink-0 items-center justify-center hover:bg-white/10 rounded-full transition-colors relative group"
        title={
          unreadCount > 0
            ? `การแจ้งเตือน (${unreadCount.toLocaleString("th-TH")} ยังไม่ได้อ่าน)`
            : "การแจ้งเตือน"
        }
        aria-label={
          unreadCount > 0
            ? `การแจ้งเตือน มี ${unreadCount.toLocaleString("th-TH")} รายการยังไม่ได้อ่าน`
            : "การแจ้งเตือน"
        }
      >
        <Bell className="w-6 h-6 text-blue-100 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
            aria-hidden
          />
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 top-full w-[360px] bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50">

          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAll || unreadCount === 0}
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                {isMarkingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                อ่านทั้งหมด
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {(["all", "unread"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                    activeTab === tab
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab === "all" ? "ทั้งหมด" : "ยังไม่ได้อ่าน"}
                  {tab === "unread" && unreadCount > 0 && (
                    <span className="text-[10px] font-extrabold tabular-nums text-red-600 min-w-[17px] flex items-center justify-center px-0.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="min-h-[300px] max-h-[420px] overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col">
                {[...Array(prevItemCountRef.current)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/4 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && items.filter(n => activeTab === "all" || !n.is_read).length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bell className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">ไม่มีการแจ้งเตือน</p>
              </div>
            )}

            {!isLoading && items.filter(n => activeTab === "all" || !n.is_read).map((n) => {
              const { icon, bg } = getIconConfig(n);
              const hasHref = resolveNotificationHref(n) !== null;
              return (
                <button
                  key={n.id ?? `sock-${n.created_at}`}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                    !n.is_read ? "bg-blue-50/60 hover:bg-blue-100/60" : "hover:bg-gray-100"
                  } ${hasHref ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] leading-snug ${!n.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      <span className="font-bold">{n.title || "(ไม่มีหัวข้อ)"}</span>
                      {n.body ? <> {n.body}</> : null}
                    </p>
                    <p className={`text-[12px] mt-1 font-semibold ${!n.is_read ? "text-blue-600" : "text-gray-400"}`}>
                      {timeAgo(n.created_at || n.delivered_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {viewAllHref && (
            <div className="border-t border-gray-100">
              <Link
                href={viewAllHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center w-full px-4 py-3 text-[13px] font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ดูการแจ้งเตือนทั้งหมด
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
