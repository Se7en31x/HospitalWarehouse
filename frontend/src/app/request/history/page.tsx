'use client';
import React, { useState } from 'react';
import { Search, History, X, ChevronLeft, ChevronRight, ArrowUpDown, Eye } from 'lucide-react';

// อินเทอร์เฟซสำหรับข้อมูล
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

const HospitalHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const itemsPerPage = 10;

  // ข้อมูลประวัติจำลอง
  const history: Request[] = [
    {
      requestId: 'REQ-001',
      type: 'เบิก',
      date: '2025-09-10',
      time: '14:30',
      status: 'อนุมัติ',
      location: 'คลังกลาง A1',
      items: [
        { itemId: 'ITM001', itemName: 'ชุดตรวจ ATK', qty: 50, unit: 'ชิ้น', category: 'อุปกรณ์ทางการแพทย์' },
        { itemId: 'ITM002', itemName: 'ถุงมือยาง', qty: 10, unit: 'กล่อง', category: 'วัสดุสิ้นเปลือง' },
      ],
    },
    {
      requestId: 'REQ-002',
      type: 'เบิก',
      date: '2025-09-12',
      time: '09:15',
      status: 'รออนุมัติ',
      location: 'คลังกลาง B2',
      items: [
        { itemId: 'ITM003', itemName: 'ผ้าก๊อซปลอดเชื้อ', qty: 20, unit: 'กล่อง', category: 'อุปกรณ์ทางการแพทย์' },
      ],
    },
    {
      requestId: 'REQ-003',
      type: 'ยืม',
      date: '2025-09-11',
      time: '16:45',
      status: 'ยืมอยู่',
      returnDate: '2025-09-20',
      returnTime: '16:45',
      location: 'คลังกลาง M1',
      items: [
        { itemId: 'EQP001', itemName: 'เครื่องวัดความดัน', qty: 2, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
        { itemId: 'EQP003', itemName: 'รถเข็นวีลแชร์', qty: 1, unit: 'คัน', category: 'อุปกรณ์ช่วยเหลือ' },
      ],
    },
    {
      requestId: 'REQ-004',
      type: 'ยืม',
      date: '2025-09-08',
      time: '10:00',
      status: 'คืนครบ',
      returnDate: '2025-09-15',
      returnTime: '10:00',
      location: 'คลังกลาง M2',
      items: [
        { itemId: 'EQP004', itemName: 'เครื่องพ่นยา', qty: 1, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
      ],
    },
    {
      requestId: 'REQ-005',
      type: 'ยืม',
      date: '2025-09-07',
      time: '13:20',
      status: 'ชำรุด',
      returnDate: '2025-09-14',
      returnTime: '13:20',
      reason: 'เครื่องเสียหายจากน้ำท่วม',
      returnedQuantity: 2,
      location: 'คลังกลาง M3',
      items: [
        { itemId: 'EQP005', itemName: 'เครื่องวัดออกซิเจน', qty: 3, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
      ],
    },
  ];

  const types = ['ทั้งหมด', 'เบิก', 'ยืม'];
  const statuses = ['ทั้งหมด', 'อนุมัติ', 'รออนุมัติ', 'ยืมอยู่', 'คืนครบ', 'คืนไม่ครบ', 'ชำรุด', 'สูญหาย'];

  // ฟังก์ชันเรียงลำดับ
  const sortHistory = (data: Request[], key: string, direction: string) => {
    return [...data].sort((a, b) => {
      if (key === 'date' || key === 'requestId') {
        return direction === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
      return 0;
    });
  };

  // ฟิลเตอร์ประวัติ
  const filteredHistory = history.filter((req) => {
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

  const sortedHistory = sortHistory(filteredHistory, sortConfig.key, sortConfig.direction);
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const paginatedHistory = sortedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Badge สีตามสถานะ
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

  // จัดการการเรียงลำดับ
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  // เปิด Modal
  const openDetailModal = (req: Request) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <History className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
            ประวัติการเบิกและยืม
          </h2>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="ค้นหารหัสคำขอ, ชื่อ หรือหมวดหมู่..."
              className="w-full pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200 text-sm sm:text-base"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200 text-sm sm:text-base"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, start: e.target.value }));
                setCurrentPage(1);
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200 text-sm sm:text-base"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, end: e.target.value }));
                setCurrentPage(1);
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all duration-200 text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th
                  className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('requestId')}
                >
                  รหัสคำขอ{' '}
                  {sortConfig.key === 'requestId' && (
                    <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />
                  )}
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider">
                  ประเภท
                </th>
                <th
                  className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('date')}
                >
                  วันที่/เวลา{' '}
                  {sortConfig.key === 'date' && (
                    <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />
                  )}
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider">
                  จำนวนรายการ
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-center font-semibold uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((req) => (
                  <tr
                    key={req.requestId}
                    className="hover:bg-indigo-50/50 transition-colors duration-200"
                  >
                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-medium text-gray-900">
                      {req.requestId}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700">{req.type}</td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700">
                      <div>{req.date}</div>
                      <div className="text-xs text-gray-500">{req.time}</div>
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700">
                      {req.items.length} รายการ
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6">
                      <Badge status={req.status} />
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-center">
                      <button
                        onClick={() => openDetailModal(req)}
                        className="p-1 sm:p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-full transition-colors duration-200"
                        aria-label="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 sm:py-12">
                    <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                      <History className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-600">
                        ไม่พบประวัติ
                      </h3>
                      <p className="text-gray-500 text-sm sm:text-base">
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
        <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-6 border-t bg-gray-50">
          <span className="text-xs sm:text-sm text-gray-600">
            แสดง {paginatedHistory.length} จาก {sortedHistory.length} รายการ
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1 sm:p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <span className="text-xs sm:text-sm text-gray-700 px-2 sm:px-3">
              หน้า {currentPage} จาก {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1 sm:p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal รายละเอียด */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg sm:max-w-2xl mx-4 max-h-[85vh] flex flex-col transform transition-all duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                <History className="w-5 h-5 mr-2 text-indigo-600" />
                รายละเอียดคำขอ {selectedRequest.requestId}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                aria-label="ปิด"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    รหัสคำขอ
                  </label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {selectedRequest.requestId}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    ประเภท
                  </label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {selectedRequest.type}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    วันที่/เวลา
                  </label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {selectedRequest.date} {selectedRequest.time}
                  </p>
                </div>
                {selectedRequest.returnDate && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      วันที่/เวลาคืน
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                      {selectedRequest.returnDate} {selectedRequest.returnTime}
                    </p>
                  </div>
                )}
                {selectedRequest.returnedQuantity && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      จำนวนที่คืน
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                      {selectedRequest.returnedQuantity} {selectedRequest.items[0]?.unit}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    สถานะ
                  </label>
                  <Badge status={selectedRequest.status} />
                </div>
                {selectedRequest.location && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      ตำแหน่งเก็บ
                    </label>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                      {selectedRequest.location}
                    </p>
                  </div>
                )}
              </div>

              {selectedRequest.reason && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <label className="block text-xs sm:text-sm font-medium text-red-700">
                    เหตุผล
                  </label>
                  <p className="text-sm sm:text-base text-red-600 font-medium mt-1">
                    {selectedRequest.reason}
                  </p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">
                  รายการพัสดุ
                </label>
                <div className="bg-gray-50 rounded-lg overflow-hidden shadow-inner">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-indigo-100 text-indigo-900">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold">
                          รหัส
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold">
                          ชื่อ
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold">
                          หมวดหมู่
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold">
                          จำนวน
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold">
                          หน่วย
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedRequest.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-indigo-50/50 transition-colors duration-200"
                        >
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700">
                            {item.itemId}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700">
                            {item.itemName}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-500">
                            {item.category}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-center text-gray-700 font-semibold">
                            {item.qty}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700">
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
            <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold transition-colors duration-200 text-sm sm:text-base"
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

export default HospitalHistory;