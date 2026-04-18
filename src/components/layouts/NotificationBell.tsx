"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, Package, FileText, Loader2, CheckCheck } from "lucide-react";
import Link from "next/link";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/services/notificationService";
import { socket } from "@/lib/socket";

interface NotificationBellProps {
  title?: string;
  viewAllHref?: string;
}

const timeAgo = (value?: string | null): string => {
  if (!value) return "-";
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return "เมื่อกี้";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
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

export default function NotificationBell({ title = "การแจ้งเตือน", viewAllHref }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const isVisibleRef = useRef(true);
  const pendingRefreshRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const badgeText = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications({ page: 1, limit: 10 });
      setItems(result.items || []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadUnreadCount(), loadItems()]);
  }, [loadUnreadCount, loadItems]);

  useEffect(() => { loadUnreadCount(); }, [loadUnreadCount]);
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
    if (!socket.connected) socket.connect();

    const handleRefreshSignal = (message: string) => {
      console.log("[NotificationBell] socket REFRESH_DATA received:", message);
      if (message !== "NOTIFICATIONS") return;

      if (!isVisibleRef.current) {
        // Tab is hidden — mark pending so we refresh when user comes back
        pendingRefreshRef.current = true;
        return;
      }

      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        loadUnreadCount();
        if (isOpen) loadItems();
        refreshTimerRef.current = null;
      }, 180);
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    return () => {
      if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [loadUnreadCount, loadItems, isOpen]);

  const handleMarkRead = useCallback(async (id: number) => {
    try { await markNotificationRead(id); await refreshAll(); } catch { /* silent */ }
  }, [refreshAll]);

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAll(true);
    try { await markAllNotificationsRead(); await refreshAll(); } catch { /* silent */ } finally { setIsMarkingAll(false); }
  }, [refreshAll]);

  return (
    <div className="relative self-stretch flex items-center" ref={rootRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="p-2.5 hover:bg-white/10 rounded-full transition-colors relative group"
        title="การแจ้งเตือน"
      >
        <Bell className="w-5 h-5 text-blue-100 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[9px] text-white font-bold flex items-center justify-center ring-2 ring-blue-900 leading-none">
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 top-full w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 transition-all duration-200 ease-out">

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-800">{title}</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || unreadCount === 0}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isMarkingAll
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <CheckCheck className="w-3 h-3" />}
              Mark all as read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">

            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">กำลังโหลด...</span>
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-500">ไม่มีการแจ้งเตือนใหม่</p>
                  <p className="text-xs text-slate-400 mt-0.5">ระบบจะแจ้งเตือนเมื่อมีกิจกรรมใหม่</p>
                </div>
              </div>
            )}

            {!isLoading && items.map((n) => {
              const { icon, bg } = getIconConfig(n);
              return (
                <button
                  key={`${n.recipient_row_id}-${n.id}`}
                  onClick={() => handleMarkRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 px-3 py-3 border-b border-slate-50 last:border-0 transition-colors ${
                    n.is_read
                      ? "hover:bg-slate-50"
                      : "bg-blue-50/30 border-l-4 border-blue-500 hover:bg-blue-50/60"
                  }`}
                >
                  {/* Type icon */}
                  <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${bg}`}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold truncate ${n.is_read ? "text-slate-600" : "text-slate-800"}`}>
                        {n.title || "(ไม่มีหัวข้อ)"}
                      </p>
                      {!n.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      {timeAgo(n.created_at || n.delivered_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {viewAllHref && (
            <div className="border-t border-slate-100">
              <Link
                href={viewAllHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition-colors"
              >
                ดูการแจ้งเตือนทั้งหมด →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
