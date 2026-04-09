"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bell, CheckCheck, CheckCircle2, Clock3 } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/services/notificationService";
import { socket } from "@/lib/socket";

type SeverityFilter = "all" | "INFO" | "WARNING" | "CRITICAL";
type ReadFilter = "all" | "unread" | "read";

interface NotificationCenterClientProps {
  title: string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const severityLabel = (severity?: string) => {
  const s = (severity || "INFO").toUpperCase();
  if (s === "CRITICAL") return "เร่งด่วน";
  if (s === "WARNING") return "เตือน";
  return "ข้อมูล";
};

const iconBySeverity = (severity?: string) => {
  const s = (severity || "INFO").toUpperCase();
  if (s === "CRITICAL") return <AlertCircle className="w-4 h-4" />;
  if (s === "WARNING") return <Clock3 className="w-4 h-4" />;
  return <CheckCircle2 className="w-4 h-4" />;
};

const styleBySeverity = (severity?: string) => {
  const s = (severity || "INFO").toUpperCase();
  if (s === "CRITICAL") return "bg-rose-100 text-rose-700 border-rose-200";
  if (s === "WARNING") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
};

export default function NotificationCenterClient({ title }: NotificationCenterClientProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");

  const isVisibleRef = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications({ page: 1, limit: 100 });
      setItems(result.items || []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

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

  const filteredItems = useMemo(() => {
    return items.filter((n) => {
      const matchesSeverity = severityFilter === "all" || (n.severity || "INFO").toUpperCase() === severityFilter;
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" ? n.is_read : !n.is_read);
      return matchesSeverity && matchesRead;
    });
  }, [items, severityFilter, readFilter]);

  const handleMarkRead = useCallback(async (id: number) => {
    try {
      await markNotificationRead(id);
      await loadData();
    } catch {
      // silent in page
    }
  }, [loadData]);

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await loadData();
    } catch {
      // silent in page
    } finally {
      setIsMarkingAll(false);
    }
  }, [loadData]);

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">ยังไม่อ่าน {unreadCount} รายการ</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={isMarkingAll || unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-md disabled:opacity-40"
        >
          <CheckCheck className="w-4 h-4" /> อ่านทั้งหมด
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">ทุกระดับ</option>
          <option value="INFO">ข้อมูล</option>
          <option value="WARNING">เตือน</option>
          <option value="CRITICAL">เร่งด่วน</option>
        </select>

        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">ทั้งหมด</option>
          <option value="unread">ยังไม่อ่าน</option>
          <option value="read">อ่านแล้ว</option>
        </select>

        <span className="ml-auto text-sm text-slate-500">{filteredItems.length} รายการ</span>
      </div>

      <div className="rounded-xl border border-slate-100 shadow-lg overflow-hidden bg-white">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-slate-400">กำลังโหลด...</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredItems.map((n) => (
              <li
                key={`${n.recipient_row_id}-${n.id}`}
                className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-blue-50/40" : ""}`}
              >
                <div className="mt-1 flex-shrink-0 w-2">
                  {!n.is_read && <span className="block w-2 h-2 rounded-full bg-blue-600 mt-1.5"></span>}
                </div>
                <div className={`flex-shrink-0 mt-0.5 p-2 rounded-full border ${styleBySeverity(n.severity)}`}>
                  {iconBySeverity(n.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{n.title || "(ไม่มีหัวข้อ)"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${styleBySeverity(n.severity)}`}>
                      {severityLabel(n.severity)}
                    </span>
                    {n.entity_code && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {n.entity_code}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{n.body || "-"}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_at || n.delivered_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    title="ทำเครื่องหมายว่าอ่านแล้ว"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
