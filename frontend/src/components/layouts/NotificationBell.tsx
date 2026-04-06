"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Clock3 } from "lucide-react";
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

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const iconBySeverity = (severity?: string) => {
  const s = (severity || "INFO").toUpperCase();
  if (s === "CRITICAL") return <AlertCircle className="w-3.5 h-3.5" />;
  if (s === "WARNING") return <Clock3 className="w-3.5 h-3.5" />;
  return <CheckCircle2 className="w-3.5 h-3.5" />;
};

const styleBySeverity = (severity?: string) => {
  const s = (severity || "INFO").toUpperCase();
  if (s === "CRITICAL") return "bg-rose-100 text-rose-700";
  if (s === "WARNING") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
};

export default function NotificationBell({ title = "การแจ้งเตือน", viewAllHref }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const isVisibleRef = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const badgeText = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silent for navbar
    }
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications({ page: 1, limit: 12 });
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

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    loadItems();
  }, [isOpen, loadItems]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleRefreshSignal = (message: string) => {
      if (message !== "NOTIFICATIONS") return;
      if (!isVisibleRef.current) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        loadUnreadCount();
        if (isOpen) loadItems();
        refreshTimerRef.current = null;
      }, 180);
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [loadUnreadCount, loadItems, isOpen]);

  const handleMarkRead = useCallback(async (id: number) => {
    try {
      await markNotificationRead(id);
      await refreshAll();
    } catch {
      // silent for navbar
    }
  }, [refreshAll]);

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await refreshAll();
    } catch {
      // silent for navbar
    } finally {
      setIsMarkingAll(false);
    }
  }, [refreshAll]);

  return (
    <div className="relative self-stretch flex items-center" ref={rootRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="p-2.5 hover:bg-white/10 rounded-full transition-colors relative group"
        title="การแจ้งเตือน"
      >
        <Bell className="w-6 h-6 text-blue-100 group-hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center ring-2 ring-blue-900">
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-in fade-in zoom-in duration-200 origin-top-right overflow-hidden">
          <div className="px-4 py-3 bg-gray-50/90 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || unreadCount === 0}
              className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 disabled:opacity-40"
            >
              อ่านทั้งหมด
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-5 text-xs text-gray-400">กำลังโหลด...</div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-gray-400">ยังไม่มีการแจ้งเตือน</div>
            )}

            {!isLoading && items.map((n) => (
              <button
                key={`${n.recipient_row_id}-${n.id}`}
                onClick={() => handleMarkRead(n.id)}
                className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${n.is_read ? "opacity-70" : ""}`}
              >
                <div className={`mt-0.5 p-1.5 rounded-full ${styleBySeverity(n.severity)}`}>
                  {iconBySeverity(n.severity)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{n.title || "(ไม่มีหัวข้อ)"}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.body || "-"}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(n.created_at || n.delivered_at)}</p>
                </div>
              </button>
            ))}
          </div>

          {viewAllHref && (
            <div className="border-t border-gray-100">
              <Link
                href={viewAllHref}
                onClick={() => setIsOpen(false)}
                className="block w-full text-center px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
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
