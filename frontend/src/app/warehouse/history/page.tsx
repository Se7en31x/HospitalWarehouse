'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Search,
  Eye,
  ChevronDown,
  X,
  Calendar,
  Filter,
  Download,
  Grid3x3,
  List,
  TrendingUp,
  Package,
  CheckCircle,
  AlertCircle,
  Clock3,
} from 'lucide-react';
import { HistoryEntry, HistoryFilterParams, TransactionType, TransactionStatus } from '@/types/history_type';

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

export default function HistoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [history, setHistory] = useState<HistoryEntry[]>(mockHistory);
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>(mockHistory);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filter states
  const [filters, setFilters] = useState<HistoryFilterParams>({});
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

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Export as ${format}`, filters);
    // TODO: Implement export functionality
  };

  const isFiltered = search || selectedType !== 'all' || selectedStatus !== 'all' || startDate || endDate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-xl shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
              ประวัติการทำรายการ
            </h1>
            <p className="text-slate-600 mt-1">ติดตามการเปลี่ยนแปลงสต็อกทั้งหมด</p>
          </div>
        </div>
      </div>

      {/* Stats Card Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">รวมทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900">{filteredHistory.length}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">สำเร็จแล้ว</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredHistory.filter((h) => h.status === 'COMPLETED').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">รอดำเนินการ</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredHistory.filter((h) => h.status === 'PENDING').length}
              </p>
            </div>
            <Clock3 className="w-10 h-10 text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">ปัญหา</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredHistory.filter((h) => ['REJECTED', 'CANCELLED'].includes(h.status)).length}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหารหัส, ผู้ใช้, หรือรายการ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter & View Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isFilterOpen || isFiltered
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              ตัวกรอง
              {isFiltered && <span className="ml-1 badge badge-sm">✓</span>}
            </button>

            {/* Export Buttons */}
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-all"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-all"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>

            {/* Clear Filters */}
            {isFiltered && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-all"
              >
                <X className="w-4 h-4" />
                ล้างตัวกรอง
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {isFilterOpen && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ประเภท</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as TransactionType | 'all')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">ทั้งหมด</option>
                  {Object.entries(transactionTypeConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">สถานะ</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TransactionStatus | 'all')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">ทั้งหมด</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">จากวันที่</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ถึงวันที่</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-slate-600">
        แสดง <span className="font-semibold text-slate-900">{filteredHistory.length}</span> รายการ
        {isFiltered && ' (ตัวกรองถูกนำไปใช้)'}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((entry) => (
              <div
                key={entry.id}
                onClick={() => handleViewDetails(entry)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 cursor-pointer p-6 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl p-2 rounded-lg ${transactionTypeConfig[entry.type].bgColor}`}>
                      {transactionTypeConfig[entry.type].icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-500">{entry.id}</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {transactionTypeConfig[entry.type].label}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">วันที่:</span>
                    <span className="font-medium text-slate-900">{entry.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ผู้ใช้:</span>
                    <span className="font-medium text-slate-900">
                      {entry.type === 'REQUEST' ? entry.requester : entry.user}
                    </span>
                  </div>
                  {entry.type === 'REQUEST' && entry.department && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">แผนก:</span>
                      <span className="font-medium text-slate-900">{entry.department}</span>
                    </div>
                  )}
                </div>

                {/* Items Preview */}
                <div className="mb-4 pb-4 border-b border-slate-200">
                  {entry.type === 'REQUEST' ? (
                    <div className="text-sm">
                      <span className="text-slate-600">รายการ:</span>
                      <div className="mt-2 space-y-1">
                        {entry.items.slice(0, 2).map((item, i) => (
                          <div key={i} className="text-slate-700">
                            • {item.name} ({item.quantity} {item.unit})
                          </div>
                        ))}
                        {entry.items.length > 2 && (
                          <div className="text-slate-500 text-xs">+{entry.items.length - 2} รายการอื่น</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="text-slate-600">รายการ:</span>
                      <div className="mt-2 text-slate-900 font-medium">
                        {entry.item.name}
                      </div>
                      <div className="text-slate-600 text-xs">
                        {Math.abs(entry.item.quantity)} {entry.item.unit}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[entry.status].bgColor} text-${statusConfig[entry.status].color}-800`}>
                    {statusConfig[entry.status].label}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg font-medium">ไม่พบข้อมูล</p>
              <p className="text-slate-400 text-sm">ลองเปลี่ยนตัวกรองหรือค้นหาใหม่อีกครั้ง</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {filteredHistory.length > 0 ? (
            filteredHistory
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((entry, index) => (
                <div key={entry.id} className="relative flex gap-4">
                  {/* Timeline Line */}
                  {index < filteredHistory.length - 1 && (
                    <div className="absolute left-[15px] top-12 w-0.5 h-12 bg-slate-200" />
                  )}

                  {/* Timeline Dot */}
                  <div className="flex-shrink-0 relative z-10">
                    <div className={`w-8 h-8 rounded-full border-4 border-white ${statusConfig[entry.status].bgColor}`} />
                  </div>

                  {/* Content */}
                  <div
                    onClick={() => handleViewDetails(entry)}
                    className="flex-grow bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {transactionTypeConfig[entry.type].icon}
                        </span>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {transactionTypeConfig[entry.type].label}
                          </h3>
                          <p className="text-xs text-slate-500">{entry.id}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusConfig[entry.status].bgColor}`}>
                        {statusConfig[entry.status].label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-slate-600">วันที่:</span>
                        <p className="font-medium text-slate-900">{entry.date}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">ผู้ใช้:</span>
                        <p className="font-medium text-slate-900">
                          {entry.type === 'REQUEST' ? entry.requester : entry.user}
                        </p>
                      </div>
                    </div>

                    {entry.type === 'REQUEST' ? (
                      <p className="text-sm text-slate-600">
                        {entry.items.length} รายการ: {entry.items.map((i) => i.name).join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600">
                        {entry.item.name} - {entry.item.quantity} {entry.item.unit}
                      </p>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg font-medium">ไม่พบข้อมูล</p>
              <p className="text-slate-400 text-sm">ลองเปลี่ยนตัวกรองหรือค้นหาใหม่อีกครั้ง</p>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {isModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {transactionTypeConfig[selectedEntry.type].icon}
                </span>
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
                <button className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all">
                  พิมพ์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}