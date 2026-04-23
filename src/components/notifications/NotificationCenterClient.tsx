"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, FileText, Info, Loader2, Package, ShoppingCart } from "lucide-react";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  emitNotificationsUIRefresh,
  type NotificationItem,
} from "@/services/notificationService";
import { socket } from "@/lib/socket";

type ReadFilter = "all" | "unread" | "read";

interface NotificationCenterClientProps {
  title: string;
  /** ให้สอดคล้องกับ NotificationBell (กรองรายการและนับยังไม่อ่านตาม context เดียวกัน) */
  entityType?: string;
}

/** Returns a Thai relative timestamp string e.g. "5 นาทีที่แล้ว" */
const relativeTimeTh = (value?: string | null): string => {
  if (!value) return "-";
  const diff = Date.now() - new Date(value).getTime();
  const sec  = Math.floor(diff / 1000);
  const min  = Math.floor(sec  / 60);
  const hr   = Math.floor(min  / 60);
  const day  = Math.floor(hr   / 24);

  if (sec  < 60)  return "เมื่อสักครู่";
  if (min  < 60)  return `${min} นาทีที่แล้ว`;
  if (hr   < 24)  return `${hr} ชั่วโมงที่แล้ว`;
  if (day  < 7)   return `${day} วันที่แล้ว`;

  return new Date(value).toLocaleDateString("th-TH", { dateStyle: "medium" });
};

const NotifAvatar = ({ n }: { n: NotificationItem }) => {
  const s    = (n.severity || "INFO").toUpperCase();
  const type = (n.type || "").toUpperCase();

  if (s === "CRITICAL" || type.includes("LOW") || type.includes("OUT")) {
    return (
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
    );
  }
  if (s === "WARNING" || type.includes("STOCK")) {
    return (
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
        <Package className="w-7 h-7 text-amber-500" />
      </div>
    );
  }
  if (type.includes("REQ") || type.includes("WITHDRAW")) {
    return (
      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
        <ShoppingCart className="w-7 h-7 text-blue-500" />
      </div>
    );
  }
  if (type.includes("BORROW") || type.includes("REQUEST")) {
    return (
      <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
        <FileText className="w-7 h-7 text-purple-500" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
      <Info className="w-7 h-7 text-blue-500" />
    </div>
  );
};

const NotifBadge = ({ n }: { n: NotificationItem }) => {
  const s = (n.severity || "INFO").toUpperCase();
  if (s === "CRITICAL") {
    return (
      <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
        <AlertTriangle className="w-3 h-3 text-white" />
      </div>
    );
  }
  if (s === "WARNING") {
    return (
      <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center border-2 border-white">
        <AlertTriangle className="w-3 h-3 text-white" />
      </div>
    );
  }
  return (
    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white">
      <Bell className="w-3 h-3 text-white" />
    </div>
  );
};

export default function NotificationCenterClient({ title, entityType }: NotificationCenterClientProps) {
  const [items, setItems]               = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [readFilter, setReadFilter]     = useState<ReadFilter>("all");
  const [totalUnread, setTotalUnread]   = useState(0);
  const [showMore, setShowMore]         = useState(false);

  const isVisibleRef    = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readFilterRef   = useRef<ReadFilter>("all");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const rf = readFilterRef.current;
      const [result, unread] = await Promise.all([
        getNotifications({
          page: 1,
          limit: 200,
          ...(entityType ? { entity_type: entityType } : {}),
          ...(rf === "unread" ? { unread: true } : rf === "read" ? { read: true } : {}),
        }),
        getUnreadCount(entityType),
      ]);
      setItems(result.items || []);
      setTotalUnread(unread);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleRefreshSignal = (message: string) => {
      if (message !== "NOTIFICATIONS") return;
      if (!isVisibleRef.current) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        loadData();
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
  }, [loadData]);

  const handleMarkAllRead = useCallback(async () => {
    if (totalUnread === 0) return;
    setIsMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setTotalUnread(0);
    try {
      await markAllNotificationsRead();
      emitNotificationsUIRefresh(entityType);
    } catch {
      await loadData();
    } finally {
      setIsMarkingAll(false);
    }
  }, [loadData, entityType, totalUnread]);

  const handleMarkRead = useCallback(
    async (id: number) => {
      let wasUnread = false;
      setItems((prev) => {
        const t = prev.find((n) => n.id === id);
        wasUnread = !!t && !t.is_read;
        if (!wasUnread) return prev;
        return prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      });
      if (wasUnread) {
        setTotalUnread((c) => Math.max(0, c - 1));
      }
      if (!wasUnread) return;
      try {
        await markNotificationRead(id);
        emitNotificationsUIRefresh(entityType);
      } catch {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
        setTotalUnread((c) => c + 1);
      }
    },
    [entityType]
  );

  const newItems = items.filter((n) => {
    const ts = n.created_at || n.delivered_at;
    if (!ts) return false;
    return Date.now() - new Date(ts).getTime() < 2 * 60 * 60 * 1000;
  });
  const olderItems = items.filter((n) => {
    const ts = n.created_at || n.delivered_at;
    if (!ts) return true;
    return Date.now() - new Date(ts).getTime() >= 2 * 60 * 60 * 1000;
  });

  const INITIAL_OLDER = 5;
  const visibleOlderItems = showMore ? olderItems : olderItems.slice(0, INITIAL_OLDER);

  const NotifRow = ({ n }: { n: NotificationItem }) => (
    <button
      type="button"
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors ${!n.is_read ? "bg-blue-50/70" : ""}`}
      onClick={() => { handleMarkRead(n.id); }}
    >
      {/* Avatar with badge */}
      <div className="relative flex-shrink-0">
        <NotifAvatar n={n} />
        <NotifBadge n={n} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13.5px] text-gray-800 leading-snug line-clamp-3">
          <span className="font-semibold">{n.title || "(ไม่มีหัวข้อ)"}</span>
          {n.body ? <span className="font-normal text-gray-600"> {n.body}</span> : null}
        </p>
        {n.entity_code && (
          <p className="text-[11px] text-gray-400 mt-0.5">{n.entity_code}</p>
        )}
        <p className={`text-[12px] font-bold mt-1 ${!n.is_read ? "text-blue-600" : "text-gray-500"}`}>
          {relativeTimeTh(n.created_at || n.delivered_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!n.is_read && (
        <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-white flex justify-center pt-6 px-4 pb-10">
      <div className="w-full max-w-[680px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || totalUnread === 0}
              title="อ่านทั้งหมด"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-gray-200 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isMarkingAll
                ? <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                : <CheckCheck className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { value: "all",    label: "ทั้งหมด" },
            { value: "unread", label: "ยังไม่ได้อ่าน" },
          ] as { value: ReadFilter; label: string }[]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setReadFilter(tab.value);
                readFilterRef.current = tab.value;
                loadData();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                readFilter === tab.value
                  ? "bg-white border border-gray-300 text-gray-900 shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              {tab.value === "unread" && totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {totalUnread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-3 py-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin" />
              <span className="text-base font-medium">กำลังโหลด...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <>
              {newItems.length > 0 && (
                <div className="mb-1">
                  <h3 className="text-[15px] font-bold text-gray-900 px-3 pt-3 pb-1">ใหม่</h3>
                  <div className="space-y-0.5">
                    {newItems.map((n) => (
                      <NotifRow key={`new-${n.recipient_row_id}-${n.id}`} n={n} />
                    ))}
                  </div>
                </div>
              )}

              {olderItems.length > 0 && (
                <div className="mb-1">
                  <h3 className="text-[15px] font-bold text-gray-900 px-3 pt-3 pb-1">ก่อนหน้านี้</h3>
                  <div className="space-y-0.5">
                    {visibleOlderItems.map((n) => (
                      <NotifRow key={`old-${n.recipient_row_id}-${n.id}`} n={n} />
                    ))}
                  </div>
                </div>
              )}

              {/* See more */}
              {!showMore && olderItems.length > INITIAL_OLDER && (
                <button
                  onClick={() => setShowMore(true)}
                  className="w-full py-3 mt-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  ดูการแจ้งเตือนก่อนหน้า
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
