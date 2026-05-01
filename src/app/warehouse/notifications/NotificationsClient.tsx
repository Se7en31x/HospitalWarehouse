'use client';

import { useState } from 'react';
import {
  Bell, AlertCircle, CheckCircle, Info, XCircle,
  CheckCheck, Trash2,
} from 'lucide-react';

export type NotifType = 'warning' | 'success' | 'info' | 'error';

export interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: NotifType;
  category: string;
  read: boolean;
}

const typeConfig: Record<NotifType, { icon: React.ReactNode; bg: string; text: string; badge: string }> = {
  warning: { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-amber-100',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700'   },
  success: { icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-emerald-100', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  info:    { icon: <Info className="w-4 h-4" />,        bg: 'bg-blue-100',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700'      },
  error:   { icon: <XCircle className="w-4 h-4" />,     bg: 'bg-red-100',     text: 'text-red-500',     badge: 'bg-red-100 text-red-700'        },
};

const typeLabel: Record<NotifType, string> = {
  warning: 'เตือน', success: 'สำเร็จ', info: 'ข้อมูล', error: 'ข้อผิดพลาด',
};

export default function NotificationsClient({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filterType, setFilterType] = useState<NotifType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    const matchType = filterType === 'all' || n.type === filterType;
    const matchRead = filterRead === 'all' || (filterRead === 'unread' ? !n.read : n.read);
    return matchType && matchRead;
  });

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const deleteNotif = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-600 rounded-xl">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">การแจ้งเตือน</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                  {unreadCount} ยังไม่อ่าน
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">แจ้งเตือนสต็อกต่ำกว่าเกณฑ์และพัสดุใกล้หมดอายุ</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 shadow-md"
          >
            <CheckCheck className="w-4 h-4" /> อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as NotifType | 'all')}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">ทุกประเภท</option>
          <option value="warning">เตือน</option>
          <option value="error">ข้อผิดพลาด</option>
          <option value="success">สำเร็จ</option>
          <option value="info">ข้อมูล</option>
        </select>
        <select
          value={filterRead}
          onChange={e => setFilterRead(e.target.value as 'all' | 'unread' | 'read')}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">ทั้งหมด</option>
          <option value="unread">ยังไม่อ่าน</option>
          <option value="read">อ่านแล้ว</option>
        </select>
        <span className="ml-auto text-sm text-slate-500">{filtered.length} รายการ</span>
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-100 shadow-lg overflow-hidden bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map(n => {
              const cfg = typeConfig[n.type];
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="mt-1 flex-shrink-0 w-2">
                    {!n.read && <span className="block w-2 h-2 rounded-full bg-blue-600 mt-1.5"></span>}
                  </div>
                  <div className={`flex-shrink-0 mt-0.5 p-2 rounded-full ${cfg.bg} ${cfg.text}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{n.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                        {typeLabel[n.type]}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {n.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="ทำเครื่องหมายว่าอ่านแล้ว"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      title="ลบ"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
