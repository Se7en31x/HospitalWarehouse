'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { HistoryEntry, TransactionType, TransactionStatus } from '@/types/history_type';

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

interface HistoryClientProps {
  initialHistory: HistoryEntry[];
}

export default function HistoryClient({ initialHistory }: HistoryClientProps) {
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>(initialHistory);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Apply filters
  useEffect(() => {
    let result = history;

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter((entry) => entry.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter((entry) => entry.status === selectedStatus);
    }

    // Date range filter
    if (startDate) {
      result = result.filter((entry) => entry.date >= startDate);
    }
    if (endDate) {
      result = result.filter((entry) => entry.date <= endDate);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((entry) => {
        const user = entry.type === 'REQUEST' ? entry.requester : entry.user;
        const matchId = entry.id.toLowerCase().includes(searchLower);
        const matchUser = user.toLowerCase().includes(searchLower);
        let matchItem = false;

        if (entry.type === 'REQUEST') {
          matchItem = entry.items.some((item) =>
            item.name.toLowerCase().includes(searchLower)
          );
        } else {
          matchItem = entry.item.name.toLowerCase().includes(searchLower);
        }

        return matchId || matchUser || matchItem;
      });
    }

    setFilteredHistory(result);
  }, [history, selectedType, selectedStatus, startDate, endDate, search]);

  const handleViewDetails = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
  };

  const isFiltered = search || selectedType !== 'all' || selectedStatus !== 'all' || startDate || endDate;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">ประวัติการเคลื่อนไหว</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as TransactionType | 'all')}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">ทุกประเภท</option>
          {Object.entries(transactionTypeConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as TransactionStatus | 'all')}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">ทุกสถานะ</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <span className="text-slate-400 text-sm">ถึง</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {isFiltered && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />ล้าง
          </button>
        )}
        <span className="ml-auto text-sm text-slate-500">{filteredHistory.length} รายการ</span>
      </div>

      {/* Table Content */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รหัส</th>
                <th className="px-6 py-4 w-[150px]">ประเภท</th>
                <th className="px-6 py-4 w-[200px]">รายการ</th>
                <th className="px-6 py-4 w-[100px]">วันที่</th>
                <th className="px-6 py-4 w-[150px]">ผู้ใช้</th>
                <th className="px-6 py-4 w-[100px]">สถานะ</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedHistory.map((entry, idx) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[50px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4 w-[100px]">{entry.id}</td>
                  <td className="px-6 py-4 w-[150px]">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${transactionTypeConfig[entry.type].bgColor}`}>
                      {transactionTypeConfig[entry.type].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 w-[200px]">
                    {entry.type === 'REQUEST' ? (
                      <span>{entry.items.length} รายการ</span>
                    ) : (
                      <span>{entry.item.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 w-[100px]">{entry.date}</td>
                  <td className="px-6 py-4 w-[150px]">{entry.type === 'REQUEST' ? entry.requester : entry.user}</td>
                  <td className="px-6 py-4 w-[100px]">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusConfig[entry.status].bgColor}`}>
                      {statusConfig[entry.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 w-[100px] text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleViewDetails(entry)}
                        className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedHistory.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">
          แสดง {paginatedHistory.length} จาก {filteredHistory.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{transactionTypeConfig[selectedEntry.type].icon}</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {transactionTypeConfig[selectedEntry.type].label}
                  </h2>
                  <p className="text-indigo-100">{selectedEntry.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูลทั่วไป</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-600">วันที่:</span>
                    <p className="font-semibold text-slate-900">{selectedEntry.date}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">ผู้ใช้:</span>
                    <p className="font-semibold text-slate-900">
                      {selectedEntry.type === 'REQUEST' ? selectedEntry.requester : selectedEntry.user}
                    </p>
                  </div>
                  {selectedEntry.type === 'REQUEST' && selectedEntry.department && (
                    <div>
                      <span className="text-sm text-slate-600">แผนก:</span>
                      <p className="font-semibold text-slate-900">{selectedEntry.department}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-slate-600">สถานะ:</span>
                    <p
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusConfig[selectedEntry.status].bgColor}`}
                    >
                      {statusConfig[selectedEntry.status].label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">รายการ</h3>
                {selectedEntry.type === 'REQUEST' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-semibold text-slate-900">รายการ</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-900">ประเภท</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-900">จำนวน</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-900">หน่วย</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntry.items.map((item, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-700">{item.name}</td>
                            <td className="py-2 px-3 text-slate-600">{item.category}</td>
                            <td className="py-2 px-3 text-right text-slate-900 font-medium">
                              {item.quantity}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-slate-600">รายการ:</span>
                        <p className="font-semibold text-slate-900">{selectedEntry.item.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">ประเภท:</span>
                        <p className="font-semibold text-slate-900">{selectedEntry.item.category}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">จำนวน:</span>
                        <p className="font-semibold text-slate-900">
                          {selectedEntry.item.quantity} {selectedEntry.item.unit}
                        </p>
                      </div>
                      {selectedEntry.item.reason && (
                        <div>
                          <span className="text-sm text-slate-600">เหตุผล:</span>
                          <p className="font-semibold text-slate-900">{selectedEntry.item.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {(selectedEntry.type === 'REQUEST' ? selectedEntry.notes : selectedEntry.notes) && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">หมายเหตุ</h3>
                  <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">
                    {selectedEntry.type === 'REQUEST' ? selectedEntry.notes : selectedEntry.notes}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition-all"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
