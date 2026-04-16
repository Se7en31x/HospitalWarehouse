"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
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

/** Returns a Thai relative timestamp string e.g. "5 นาทีที่แล้ว" */
const relativeTimeTh = (value?: string | null): string => {
  if (!value) return "-";
  const diff = Date.now() - new Date(value).getTime();
  const sec  = Math.floor(diff / 1000);
  const min  = Math.floor(sec  / 60);
  const hr   = Math.floor(min  / 60);
  const day  = Math.floor(hr   / 24);

  if (sec  < 60)  return "เมื่อกี้";
  if (min  < 60)  return `${min} นาทีที่แล้ว`;
  if (hr   < 24)  return `${hr} ชั่วโมงที่แล้ว`;
  if (day  < 7)   return `${day} วันที่แล้ว`;

  return new Date(value).toLocaleDateString("th-TH", { dateStyle: "medium" });
};

const severityLabel = (severity?: string) => {
  const s = (severity || "INFO").toUpperCase();
  if (s === "CRITICAL") return "เร่งด่วน";
  if (s === "WARNING")  return "เตือน";
  return "ข้อมูล";
};

/** Left-border style applied per severity */
const leftBorderClass = (severity?: string) => {
  if ((severity || "").toUpperCase() === "CRITICAL") return "border-l-2 border-l-red-500";
  return "border-l-2 border-l-transparent";
};

/** Small severity badge — outlined, no filled background for INFO/WARNING */
const SeverityBadge = ({ severity }: { severity?: string }) => {
  const s = (severity || "INFO").toUpperCase();
  if (s === "CRITICAL") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full border border-red-400 text-red-600 font-medium">
        {severityLabel(s)}
      </span>
    );
  }
  if (s === "WARNING") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400 text-amber-600 font-medium">
        {severityLabel(s)}
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full border border-slate-300 text-slate-500 font-medium">
      {severityLabel(s)}
    </span>
  );
};

export default function NotificationCenterClient({ title }: NotificationCenterClientProps) {
  const [items, setItems]           = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");

  const isVisibleRef    = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const loadData = useCallback(async () => {
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

  const filteredItems = useMemo(() => {
    return items.filter((n) => {
      const matchesSeverity =
        severityFilter === "all" || (n.severity || "INFO").toUpperCase() === severityFilter;
      const matchesRead =
        readFilter === "all" || (readFilter === "read" ? n.is_read : !n.is_read);
      return matchesSeverity && matchesRead;
    });
  }, [items, severityFilter, readFilter]);

  const handleMarkRead = useCallback(async (id: number) => {
    try {
      await markNotificationRead(id);
      await loadData();
    } catch {
      // silent
    }
  }, [loadData]);

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await loadData();
    } catch {
      // silent
    } finally {
      setIsMarkingAll(false);
    }
  }, [loadData]);

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            ยังไม่อ่าน{" "}
            <span className="font-semibold text-blue-700">{unreadCount}</span> รายการ
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={isMarkingAll || unreadCount === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-700 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCheck className="w-4 h-4" />
          อ่านทั้งหมด
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
        >
          <option value="all">ทุกระดับ</option>
          <option value="INFO">ข้อมูล</option>
          <option value="WARNING">เตือน</option>
          <option value="CRITICAL">เร่งด่วน</option>
        </select>

        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
        >
          <option value="all">ทั้งหมด</option>
          <option value="unread">ยังไม่อ่าน</option>
          <option value="read">อ่านแล้ว</option>
        </select>

        <span className="ml-auto text-xs text-slate-400">{filteredItems.length} รายการ</span>
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">กำลังโหลด...</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Bell className="w-10 h-10 mb-3" />
            <p className="text-sm">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredItems.map((n) => (
              <li
                key={`${n.recipient_row_id}-${n.id}`}
                className={`flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors ${leftBorderClass(n.severity)} ${!n.is_read ? "bg-blue-50/30" : ""}`}
              >
                {/* Unread dot */}
                <div className="mt-2 w-2 flex-shrink-0">
                  {!n.is_read && (
                    <span className="block w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-slate-800">
                      {n.title || "(ไม่มีหัวข้อ)"}
                    </span>
                    <SeverityBadge severity={n.severity} />
                    {n.entity_code && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {n.entity_code}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{n.body || "-"}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {relativeTimeTh(n.created_at || n.delivered_at)}
                  </p>
                </div>

                {/* Mark read — text-only button */}
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    title="ทำเครื่องหมายว่าอ่านแล้ว"
                    className="flex-shrink-0 text-xs text-slate-400 hover:text-blue-700 transition-colors mt-1 whitespace-nowrap"
                  >
                    อ่านแล้ว
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
