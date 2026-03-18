// src/app/warehouse/history/page.tsx
export const dynamic = 'force-dynamic';

import HistoryClient from './HistoryClient';
import { HistoryEntry, TransactionType, TransactionStatus } from '@/types/history_type';

// Mock data for now (will be replaced with API calls)
const mockHistory: HistoryEntry[] = [
  {
    id: 'req-001',
    type: 'REQUEST',
    date: '2026-03-08',
    requester: 'นาย กรรมการ',
    department: 'ICU',
    status: 'COMPLETED',
    items: [
      { id: 'i1', name: 'เครื่องวัดความดัน', category: 'ครุภัณฑ์', quantity: 5, unit: 'ชิ้น' },
      { id: 'i2', name: 'ยาพาราเซตามอล', category: 'ยา', quantity: 100, unit: 'แผง' },
    ],
    notes: 'เร่งด่วน',
  },
  {
    id: 'imp-001',
    type: 'IMPORT',
    date: '2026-03-07',
    user: 'นาย สมชาย',
    department: 'Warehouse',
    status: 'COMPLETED',
    item: { id: 'i3', name: 'เครื่องคอมพิวเตอร์', category: 'ครุภัณฑ์', quantity: 10, unit: 'ชิ้น' },
  },
  {
    id: 'exp-001',
    type: 'EXPORT',
    date: '2026-03-06',
    user: 'นาง สมหญิง',
    status: 'COMPLETED',
    item: { id: 'i4', name: 'ยาแอสไพริน', category: 'ยา', quantity: 50, unit: 'แผง' },
  },
  {
    id: 'adj-001',
    type: 'ADJUSTMENT',
    date: '2026-03-05',
    user: 'นาย เป็นหนึ่ง',
    status: 'COMPLETED',
    item: { id: 'i5', name: 'ผ้าก๊อซ', category: 'เวชภัณฑ์', quantity: -30, unit: 'ม้วน', reason: 'สินค้าเสื่อม' },
  },
];

const transactionTypeConfig: Record<TransactionType, { label: string; color: string; bgColor: string; icon: any }> = {
  REQUEST: { label: 'คำขอ', color: 'blue', bgColor: 'bg-blue-100', icon: '📋' },
  IMPORT: { label: 'นำเข้า', color: 'green', bgColor: 'bg-green-100', icon: '📥' },
  EXPORT: { label: 'นำออก', color: 'orange', bgColor: 'bg-orange-100', icon: '📤' },
  BORROW: { label: 'ยืม', color: 'purple', bgColor: 'bg-purple-100', icon: '🤝' },
  DISPENSE: { label: 'เบิกใช้', color: 'yellow', bgColor: 'bg-yellow-100', icon: '✋' },
  ADJUSTMENT: { label: 'แก้ไข', color: 'red', bgColor: 'bg-red-100', icon: '⚙️' },
};

const statusConfig: Record<TransactionStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: 'รอดำเนินการ', color: 'yellow', bgColor: 'bg-yellow-100' },
  APPROVED: { label: 'อนุมัติ', color: 'blue', bgColor: 'bg-blue-100' },
  COMPLETED: { label: 'สำเร็จ', color: 'green', bgColor: 'bg-green-100' },
  REJECTED: { label: 'ปฏิเสธ', color: 'red', bgColor: 'bg-red-100' },
  CANCELLED: { label: 'ยกเลิก', color: 'gray', bgColor: 'bg-gray-100' },
};

type ViewMode = 'grid' | 'timeline';

export default async function HistoryPage() {
  // TODO: Fetch history data from API
  // const history = await getHistory();
  
  // For now, using mock data
  const history = mockHistory;

  return (
    <main>
      <HistoryClient initialHistory={history} />
    </main>
  );
}