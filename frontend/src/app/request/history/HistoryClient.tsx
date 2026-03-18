'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, History, X, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Calendar, Filter, ChevronDown } from 'lucide-react';

// Types
interface Item {
  itemId: string;
  itemName: string;
  qty: number;
  unit: string;
  category: string;
}

interface Request {
  requestId: string;
  type: string;
  date: string;
  time: string;
  status: string;
  location?: string;
  items: Item[];
  returnDate?: string;
  returnTime?: string;
  returnedQuantity?: number;
  reason?: string;
}

interface HistoryContentProps {
  data: Request[];
}

const HistoryContent: React.FC<HistoryContentProps> = ({ data }) => {
  // ✅ State สำหรับ Search และ Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // ✅ State สำหรับ Pagination และ Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const itemsPerPage = 10;

  // ✅ State สำหรับ UI และ Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const types = ['ทั้งหมด', 'เบิก', 'ยืม', 'คืน'];
  const statuses = ['ทั้งหมด', 'อนุมัติ', 'รออนุมัติ', 'ยืมอยู่', 'คืนครบ', 'คืนไม่ครบ', 'ชำรุด', 'สูญหาย'];

  // --- [Initialize Component] ---
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- [Close dropdowns when clicking outside] ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-type-dropdown]')) {
        setIsTypeDropdownOpen(false);
      }
      if (!target.closest('[data-status-dropdown]')) {
        setIsStatusDropdownOpen(false);
      }
      if (!target.closest('[data-date-dropdown]')) {
        setShowDateFilter(false);
      }
    };

    if (isTypeDropdownOpen || isStatusDropdownOpen || showDateFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTypeDropdownOpen, isStatusDropdownOpen, showDateFilter]);

  // --- [Filter Logic] ---
  const filteredHistory = useMemo(() => {
    return data.filter((req) => {
      const matchesType = selectedType === 'ทั้งหมด' || req.type === selectedType;
      const matchesStatus = selectedStatus === 'ทั้งหมด' || req.status === selectedStatus;
      const matchesSearch =
        req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.items.some(
          (i) =>
            i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesDate =
        (!dateRange.start || req.date >= dateRange.start) &&
        (!dateRange.end || req.date <= dateRange.end);
      return matchesType && matchesStatus && matchesSearch && matchesDate;
    });
  }, [data, selectedType, selectedStatus, searchTerm, dateRange]);

  // --- [Sort Logic] ---
  const sortHistory = useCallback((dataToSort: Request[], key: string, direction: string) => {
    return [...dataToSort].sort((a, b) => {
      if (key === 'date' || key === 'requestId') {
        const aVal = String(a[key as keyof Request] || '');
        const bVal = String(b[key as keyof Request] || '');
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, []);

  const sortedHistory = useMemo(() => {
    return sortHistory(filteredHistory, sortConfig.key, sortConfig.direction);
  }, [filteredHistory, sortConfig, sortHistory]);

  // --- [Pagination Logic] ---
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const paginatedHistory = useMemo(() => {
    return sortedHistory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedHistory, currentPage, itemsPerPage]);

  // --- [Handlers] ---
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  }, []);

  const openDetailModal = useCallback((req: Request) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedType('ทั้งหมด');
    setSelectedStatus('ทั้งหมด');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  }, []);
  // --- [Status Style Helper] ---
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'อนุมัติ':
      case 'คืนครบ':
        return 'bg-green-100 text-green-800';
      case 'รออนุมัติ':
      case 'ยืมอยู่':
        return 'bg-yellow-100 text-yellow-800';
      case 'ชำรุด':
      case 'สูญหาย':
        return 'bg-red-100 text-red-800';
      case 'คืนไม่ครบ':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const Badge: React.FC<{ status: string }> = ({ status }) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(
        status
      )}`}
    >
      {status}
    </span>
  );

  // --- [Computed Values] ---
  const hasActiveFilters = searchTerm || selectedType !== 'ทั้งหมด' || selectedStatus !== 'ทั้งหมด' || dateRange.start || dateRange.end;

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <History className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-indigo-600">ประวัติการเบิก ยืม และคืน</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-semibold transition-colors active:scale-95"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-center">
        {/* Search */}
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        {/* Type Dropdown */}
        <div className="relative ml-auto" data-type-dropdown>
          <button
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {selectedType}
            <ChevronDown className={`w-4 h-4 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTypeDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 min-w-[200px] max-h-64 overflow-y-auto">
              <ul className="py-1">
                {types.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedType(t);
                        setIsTypeDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedType === t
                          ? 'bg-indigo-100 text-indigo-900 font-medium'
                          : 'text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-status-dropdown>
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {selectedStatus}
            <ChevronDown className={`w-4 h-4 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 min-w-[200px] max-h-64 overflow-y-auto">
              <ul className="py-1">
                {statuses.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus(s);
                        setIsStatusDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedStatus === s
                          ? 'bg-indigo-100 text-indigo-900 font-medium'
                          : 'text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="relative" data-date-dropdown>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            วันที่
            <ChevronDown className={`w-4 h-4 transition-transform ${showDateFilter ? 'rotate-180' : ''}`} />
          </button>

          {showDateFilter && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 p-4 min-w-[300px]">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    วันที่เริ่มต้น
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => {
                      setDateRange((prev) => ({ ...prev, start: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    วันที่สิ้นสุด
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange((prev) => ({ ...prev, end: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('requestId')}
                >
                  รหัสคำขอ {sortConfig.key === 'requestId' && <ArrowUpDown className="w-4 h-4 inline ml-1" />}
                </th>
                <th className="px-6 py-4 whitespace-nowrap">ประเภท</th>
                <th
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('date')}
                >
                  วันที่/เวลา {sortConfig.key === 'date' && <ArrowUpDown className="w-4 h-4 inline ml-1" />}
                </th>
                <th className="px-6 py-4 whitespace-nowrap">จำนวนรายการ</th>
                <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((req) => (
                  <tr key={req.requestId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {req.requestId}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{req.type}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{req.date}</div>
                      <div className="text-xs text-slate-500">{req.time}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {req.items.length} รายการ
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openDetailModal(req)}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-600">
          แสดง {paginatedHistory.length} จาก {sortedHistory.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-all duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-500 via-indigo-400 to-blue-400 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <History className="w-5 h-5" />
                </div>
                รายละเอียดคำขอ {selectedRequest.requestId}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors duration-200"
                aria-label="ปิด"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white">
              {/* Status Badge Section */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">สถานะปัจจุบัน</span>
                  <div className="mt-2">
                    <Badge status={selectedRequest.status} />
                  </div>
                </div>
                {selectedRequest.type && (
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ประเภทคำขอ</span>
                    <p className="text-lg font-bold text-indigo-600 mt-1">{selectedRequest.type}</p>
                  </div>
                )}
              </div>

              {/* Summary Grid */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">ข้อมูลทั่วไป</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <label className="block text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2">
                      รหัสคำขอ
                    </label>
                    <p className="text-base font-bold text-slate-900">
                      {selectedRequest.requestId}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                      วันที่ยื่นคำขอ
                    </label>
                    <p className="text-sm font-semibold text-slate-900">{selectedRequest.date}</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedRequest.time}</p>
                  </div>

                  {selectedRequest.returnDate && (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <label className="block text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">
                        วันที่คืน
                      </label>
                      <p className="text-sm font-semibold text-slate-900">{selectedRequest.returnDate}</p>
                      <p className="text-xs text-slate-500 mt-1">{selectedRequest.returnTime}</p>
                    </div>
                  )}

                  {selectedRequest.returnedQuantity && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                        จำนวนที่คืน
                      </label>
                      <p className="text-base font-bold text-slate-900">
                        {selectedRequest.returnedQuantity} <span className="text-sm text-slate-600">{selectedRequest.items[0]?.unit}</span>
                      </p>
                    </div>
                  )}

                  {selectedRequest.location && (
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                      <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">
                        ตำแหน่งเก็บ
                      </label>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedRequest.location}
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      จำนวนรายการ
                    </label>
                    <p className="text-2xl font-bold text-indigo-600">
                      {selectedRequest.items.length}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRequest.reason && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 p-5 rounded-xl border-2 border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-200 rounded-lg mt-0.5">
                      <History className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-red-900 mb-1">
                        🔴 เหตุผล/หมายเหตุ
                      </label>
                      <p className="text-sm text-red-800 leading-relaxed">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">รายการพัสดุที่เกี่ยวข้อง ({selectedRequest.items.length} รายการ)</h3>
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                        <tr>
                          <th className="px-5 py-3.5 text-left font-semibold">รหัสพัสดุ</th>
                          <th className="px-5 py-3.5 text-left font-semibold">ชื่ออุปกรณ์</th>
                          <th className="px-5 py-3.5 text-left font-semibold">หมวดหมู่</th>
                          <th className="px-5 py-3.5 text-center font-semibold">จำนวน</th>
                          <th className="px-5 py-3.5 text-left font-semibold">หน่วย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRequest.items.map((item, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-indigo-50/40 transition-colors duration-150 bg-white"
                          >
                            <td className="px-5 py-3.5 text-slate-900 font-medium">
                              {item.itemId}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 font-medium">
                              {item.itemName}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm">
                                {item.qty}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">
                              {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 font-semibold transition-all duration-200 text-sm active:scale-95 shadow-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryContent;
