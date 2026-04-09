'use client';
import React, { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Users,
  Calendar,
  Building2,
} from 'lucide-react';

interface Item {
  itemId: string;
  itemName: string;
  qty: number;
  unit: string;
  category: string;
}

interface WithdrawRequest {
  requestId: string;
  user: { name: string; department: string };
  date: string;
  time: string;
  status: string;
  items: Item[];
}

interface SummaryStats {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  totalItems: number;
}

const WithdrawReport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด');
  const [selectedDepartment, setSelectedDepartment] = useState('ทั้งหมด');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 10;

  const withdraws: WithdrawRequest[] = [
    {
      requestId: 'WDR-001',
      user: { name: 'สมชาย ใจดี', department: 'ศัลยกรรม' },
      date: '2025-09-10',
      time: '14:30',
      status: 'อนุมัติ',
      items: [
        { itemId: 'ITM001', itemName: 'ชุดตรวจ ATK', qty: 50, unit: 'ชิ้น', category: 'อุปกรณ์ทางการแพทย์' },
        { itemId: 'ITM002', itemName: 'ถุงมือยาง', qty: 10, unit: 'กล่อง', category: 'วัสดุสิ้นเปลือง' },
      ],
    },
    {
      requestId: 'WDR-002',
      user: { name: 'สมหญิง รักสุข', department: 'อายุรกรรม' },
      date: '2025-09-12',
      time: '09:15',
      status: 'รออนุมัติ',
      items: [
        { itemId: 'ITM003', itemName: 'ผ้าก๊อซปลอดเชื้อ', qty: 20, unit: 'กล่อง', category: 'อุปกรณ์ทางการแพทย์' },
      ],
    },
    {
      requestId: 'WDR-003',
      user: { name: 'สมศักดิ์ พยาบาล', department: 'ศัลยกรรม' },
      date: '2025-09-15',
      time: '11:45',
      status: 'อนุมัติ',
      items: [
        { itemId: 'ITM004', itemName: 'หน้ากากทางการแพทย์', qty: 100, unit: 'ชิ้น', category: 'อุปกรณ์ทางการแพทย์' },
      ],
    },
  ];

  const statuses = ['ทั้งหมด', 'อนุมัติ', 'รออนุมัติ', 'ไม่อนุมัติ'];
  const departments = ['ทั้งหมด', ...new Set(withdraws.map((w) => w.user.department))];

  const summary = useMemo((): SummaryStats => {
    const total = withdraws.length;
    const approved = withdraws.filter((w) => w.status === 'อนุมัติ').length;
    const pending = withdraws.filter((w) => w.status === 'รออนุมัติ').length;
    const rejected = withdraws.filter((w) => w.status === 'ไม่อนุมัติ').length;
    const totalItems = withdraws.reduce((sum, w) => sum + w.items.length, 0);

    return { totalRequests: total, approvedRequests: approved, pendingRequests: pending, rejectedRequests: rejected, totalItems };
  }, []);

  const sortWithdraws = (data: WithdrawRequest[], key: string, direction: string) => {
    return [...data].sort((a, b) => {
      if (key === 'date' || key === 'requestId') {
        return direction === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
      return 0;
    });
  };

  const filteredWithdraws = withdraws.filter((req) => {
    const matchesStatus = selectedStatus === 'ทั้งหมด' || req.status === selectedStatus;
    const matchesDepartment = selectedDepartment === 'ทั้งหมด' || req.user.department === selectedDepartment;
    const matchesSearch =
      req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.items.some(
        (i) =>
          i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesDate =
      (!dateRange.start || req.date >= dateRange.start) &&
      (!dateRange.end || req.date <= dateRange.end);
    return matchesStatus && matchesSearch && matchesDate && matchesDepartment;
  });

  const sortedWithdraws = sortWithdraws(filteredWithdraws, sortConfig.key, sortConfig.direction);
  const totalPages = Math.ceil(sortedWithdraws.length / itemsPerPage);
  const paginatedWithdraws = sortedWithdraws.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'อนุมัติ':
        return 'bg-green-100 text-green-800';
      case 'รออนุมัติ':
        return 'bg-yellow-100 text-yellow-800';
      case 'ไม่อนุมัติ':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'อนุมัติ':
        return <CheckCircle className="w-4 h-4" />;
      case 'รออนุมัติ':
        return <Clock className="w-4 h-4" />;
      case 'ไม่อนุมัติ':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const Badge: React.FC<{ status: string }> = ({ status }) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
        status
      )}`}
    >
      {getStatusIcon(status)}
      {status}
    </span>
  );

  const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({
    icon,
    label,
    value,
    color,
  }) => (
    <div className={`bg-gradient-to-br ${color} rounded-lg shadow-md p-4 sm:p-5 text-white`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm opacity-90 font-medium">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const openDetailModal = (req: WithdrawRequest) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleExport = () => {
    alert('ฟีเจอร์ Export จะเปิดใช้งานในเวอร์ชันถัดไป');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ทั้งหมด');
    setSelectedDepartment('ทั้งหมด');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
            รายงานการเบิกพัสดุ
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            ดูข้อมูลการเบิกพัสดุของผู้ใช้งาน รวมถึงชื่อ แผนก สถานะ และรายการพัสดุ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium hidden sm:inline">รีเฟรช</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">ดาวน์โหลด</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <SummaryCard
          icon={<FileText className="w-6 h-6" />}
          label="ทั้งหมด"
          value={summary.totalRequests}
          color="from-slate-500 to-slate-600"
        />
        <SummaryCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="อนุมัติ"
          value={summary.approvedRequests}
          color="from-green-500 to-green-600"
        />
        <SummaryCard
          icon={<Clock className="w-6 h-6" />}
          label="รออนุมัติ"
          value={summary.pendingRequests}
          color="from-yellow-500 to-yellow-600"
        />
        <SummaryCard
          icon={<AlertCircle className="w-6 h-6" />}
          label="ไม่อนุมัติ"
          value={summary.rejectedRequests}
          color="from-red-500 to-red-600"
        />
        <SummaryCard
          icon={<Package className="w-6 h-6" />}
          label="รายการทั้งหมด"
          value={summary.totalItems}
          color="from-blue-500 to-blue-600"
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">ตัวกรอง</span>
            {(searchTerm || selectedStatus !== 'ทั้งหมด' || selectedDepartment !== 'ทั้งหมด' || dateRange.start || dateRange.end) && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                {[searchTerm, selectedStatus !== 'ทั้งหมด', selectedDepartment !== 'ทั้งหมด', dateRange.start, dateRange.end].filter(Boolean).length}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              isFilterOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isFilterOpen && (
          <div className="border-t border-gray-200 p-4 sm:p-6 space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="รหัสคำขอ, ชื่อ, แผนก, หรือหมวดหมู่..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">แผนก</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">วันที่เริ่มต้น</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange((prev) => ({ ...prev, start: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">วันที่สิ้นสุด</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange((prev) => ({ ...prev, end: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={() => handleSort('requestId')}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    รหัสคำขอ
                    {sortConfig.key === 'requestId' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    ผู้เบิก
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    แผนก
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    วันที่/เวลา
                    {sortConfig.key === 'date' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  จำนวนรายการ
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedWithdraws.length > 0 ? (
                paginatedWithdraws.map((req) => (
                  <tr
                    key={req.requestId}
                    className="hover:bg-indigo-50/50 transition-colors duration-200"
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-indigo-600">
                      {req.requestId}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-700">
                      {req.user.name}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-700">
                      {req.user.department}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-700">
                      <div>{req.date}</div>
                      <div className="text-xs text-gray-500">{req.time}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-700">
                      {req.items.length}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <Badge status={req.status} />
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                      <button
                        onClick={() => openDetailModal(req)}
                        className="inline-flex items-center justify-center p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-all duration-200"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-600">
                        ไม่พบข้อมูลการเบิก
                      </h3>
                      <p className="text-gray-500 text-sm">
                        ลองเปลี่ยนคำค้นหาหรือตัวกรอง
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center py-3 sm:py-4 px-4 sm:px-6 border-t bg-gray-50 gap-4">
          <span className="text-sm text-gray-600">
            แสดง {paginatedWithdraws.length} จาก {sortedWithdraws.length} รายการ
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700 px-2 sm:px-3">
              หน้า {currentPage} จาก {totalPages || 1}
            </span>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 animate-in scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-5 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  รายละเอียดคำขอ {selectedRequest.requestId}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  ดูข้อมูลเบิกพัสดุทั้งหมด
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Info Table */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                  ข้อมูลการเบิก
                </h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase w-1/3">
                          ลักษณะ
                        </th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase w-2/3">
                          ข้อมูล
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50">
                          รหัสคำขอ
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {selectedRequest.requestId}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50">
                          ผู้เบิก
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {selectedRequest.user.name}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50">
                          แผนก
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {selectedRequest.user.department}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50">
                          วันที่/เวลา
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {selectedRequest.date} {selectedRequest.time}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50">
                          จำนวนรายการ
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {selectedRequest.items.length} รายการ
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50">
                          สถานะ
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge status={selectedRequest.status} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                  รายการพัสดุ
                </h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">
                          รหัสสินค้า
                        </th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">
                          ชื่อ
                        </th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">
                          หมวดหมู่
                        </th>
                        <th className="px-4 py-3 text-center text-xs sm:text-sm font-semibold text-gray-700 uppercase">
                          จำนวน
                        </th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase">
                          หน่วย
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedRequest.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                            {item.itemId}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {item.category}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-semibold text-center">
                            {item.qty}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-5 sm:p-6 bg-gray-50 rounded-b-xl flex gap-3 justify-between">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ปิด
              </button>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors">
                  พิมพ์
                </button>
                <button className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  ดาวน์โหลด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawReport;
