"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, Package, FileText, Loader2 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

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
      const result = await getNotifications({ page: 1, limit: 200 });
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
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">กำลังโหลด...</span>
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
              return (
                <button
                  key={`${n.recipient_row_id}-${n.id}`}
                  onClick={() => handleMarkRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                    !n.is_read ? "bg-blue-50/60 hover:bg-blue-100/60" : "hover:bg-gray-100"
                  }`}
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
