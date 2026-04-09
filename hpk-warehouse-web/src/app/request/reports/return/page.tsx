'use client';
import React, { useState } from 'react';
import { Search, FileText, X, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Download } from 'lucide-react';
import { saveAs } from 'file-saver';

interface Item {
  itemId: string;
  itemName: string;
  qty: number;
  unit: string;
  category: string;
  returnedQty?: number;
}

interface ReturnRequest {
  requestId: string;
  borrowRequestId: string;
  date: string;
  time: string;
  status: string;
  items: Item[];
  note?: string;
}

const ReturnReport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const itemsPerPage = 10;

  const returns: ReturnRequest[] = [
    {
      requestId: 'RET-001',
      borrowRequestId: 'BOR-002',
      date: '2025-09-15',
      time: '10:00',
      status: 'คืนครบ',
      items: [
        { itemId: 'EQP004', itemName: 'เครื่องพ่นยา', qty: 1, returnedQty: 1, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
      ],
    },
    {
      requestId: 'RET-002',
      borrowRequestId: 'BOR-003',
      date: '2025-09-14',
      time: '13:20',
      status: 'ชำรุด',
      note: 'เครื่องเสียหายจากน้ำท่วม',
      items: [
        { itemId: 'EQP005', itemName: 'เครื่องวัดออกซิเจน', qty: 3, returnedQty: 2, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
      ],
    },
    {
      requestId: 'RET-003',
      borrowRequestId: 'BOR-004',
      date: '2025-09-13',
      time: '09:30',
      status: 'คืนไม่ครบ',
      note: 'สูญหายบางส่วน',
      items: [
        { itemId: 'EQP006', itemName: 'รถเข็นวีลแชร์', qty: 2, returnedQty: 1, unit: 'คัน', category: 'อุปกรณ์ช่วยเหลือ' },
      ],
    },
  ];

  const statuses = ['ทั้งหมด', 'คืนครบ', 'คืนไม่ครบ', 'ชำรุด', 'สูญหาย'];

  const sortReturns = (data: ReturnRequest[], key: string, direction: string) => {
    return [...data].sort((a, b) => {
      if (key === 'date' || key === 'requestId' || key === 'borrowRequestId') {
        return direction === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
      return 0;
    });
  };

  const filteredReturns = returns.filter((req) => {
    const matchesStatus = selectedStatus === 'ทั้งหมด' || req.status === selectedStatus;
    const matchesSearch =
      req.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.borrowRequestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.items.some(
        (i) =>
          i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesDate =
      (!dateRange.start || req.date >= dateRange.start) &&
      (!dateRange.end || req.date <= dateRange.end);
    return matchesStatus && matchesSearch && matchesDate;
  });

  const sortedReturns = sortReturns(filteredReturns, sortConfig.key, sortConfig.direction);
  const totalPages = Math.ceil(sortedReturns.length / itemsPerPage);
  const paginatedReturns = sortedReturns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'คืนครบ':
        return 'bg-green-100 text-green-800';
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

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const openDetailModal = (req: ReturnRequest) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  };

  const exportToCSV = () => {
    const headers = ['รหัสคำขอ', 'รหัสคำขอยืม', 'วันที่คืน', 'เวลาคืน', 'จำนวนรายการ', 'สถานะ', 'หมายเหตุ'];
    const rows = sortedReturns.map((req) => [
      req.requestId,
      req.borrowRequestId,
      req.date,
      req.time,
      req.items.length.toString(),
      req.status,
      req.note || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'return_report.csv');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
            รายงานการคืน
          </h2>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm sm:text-base"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            ส่งออก CSV
          </button>
        </div>
        <p className="text-gray-600 text-sm sm:text-base">
          ดูข้อมูลการคืนพัสดุ รวมถึงรหัสคำขอยืมและหมายเหตุ
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="ค้นหารหัสคำขอ, รหัสคำขอยืม, หรือหมวดหมู่..."
              className="w-full pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto min-w-[1000px] sm:min-w-[1200px]">
          <table className="w-full text-xs sm:text-sm table-fixed">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th
                  className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider cursor-pointer w-[150px]"
                  onClick={() => handleSort('requestId')}
                >
                  รหัสคำขอ{' '}
                  {sortConfig.key === 'requestId' && (
                    <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />
                  )}
                </th>
                <th
                  className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider cursor-pointer w-[150px]"
                  onClick={() => handleSort('borrowRequestId')}
                >
                  รหัสคำขอยืม{' '}
                  {sortConfig.key === 'borrowRequestId' && (
                    <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />
                  )}
                </th>
                <th
                  className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider cursor-pointer w-[150px]"
                  onClick={() => handleSort('date')}
                >
                  วันที่/เวลาคืน{' '}
                  {sortConfig.key === 'date' && (
                    <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 inline ml-1" />
                  )}
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider w-[120px]">
                  จำนวนรายการ
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider w-[120px]">
                  สถานะ
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider w-[150px]">
                  หมายเหตุ
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-center font-semibold uppercase tracking-wider w-[100px]">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedReturns.length > 0 ? (
                paginatedReturns.map((req) => (
                  <tr
                    key={req.requestId}
                    className="hover:bg-indigo-50/50 transition-colors duration-200 h-12"
                  >
                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-medium text-gray-900 w-[150px] truncate">
                      {req.requestId}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700 w-[150px] truncate">
                      {req.borrowRequestId}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700 w-[150px]">
                      <div className="truncate">{req.date}</div>
                      <div className="text-xs text-gray-500 truncate">{req.time}</div>
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700 w-[120px]">
                      {req.items.length} รายการ
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 w-[120px]">
                      <Badge status={req.status} />
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700 w-[150px] truncate">
                      {req.note || '-'}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-center w-[100px]">
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
                  <td colSpan={7} className="text-center py-8 sm:py-12">
                    <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                      <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-600">
                        ไม่พบข้อมูลการคืน
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

        <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-6 border-t bg-gray-50">
          <span className="text-xs sm:text-sm text-gray-600">
            แสดง {paginatedReturns.length} จาก {sortedReturns.length} รายการ
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

      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl sm:max-w-3xl mx-4 max-h-[85vh] flex flex-col transform transition-all duration-300">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
                    รหัสคำขอยืม
                  </label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {selectedRequest.borrowRequestId}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    วันที่/เวลาคืน
                  </label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {selectedRequest.date} {selectedRequest.time}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    สถานะ
                  </label>
                  <Badge status={selectedRequest.status} />
                </div>
                {selectedRequest.note && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 col-span-1 sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-red-700">
                      หมายเหตุ
                    </label>
                    <p className="text-sm sm:text-base text-red-600 font-medium mt-1">
                      {selectedRequest.note}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">
                  รายการพัสดุ
                </label>
                <div className="bg-gray-50 rounded-lg overflow-hidden shadow-inner min-w-[600px] sm:min-w-[800px]">
                  <table className="w-full text-xs sm:text-sm table-fixed">
                    <thead className="bg-indigo-100 text-indigo-900">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold w-[120px]">
                          รหัส
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold w-[200px]">
                          ชื่อ
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold w-[150px]">
                          หมวดหมู่
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold w-[100px]">
                          จำนวนยืม
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-center font-semibold w-[100px]">
                          จำนวนคืน
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-semibold w-[100px]">
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
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 w-[120px] truncate">
                            {item.itemId}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 w-[200px] truncate">
                            {item.itemName}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-500 w-[150px] truncate">
                            {item.category}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-center text-gray-700 font-semibold w-[100px]">
                            {item.qty}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-center text-gray-700 font-semibold w-[100px]">
                            {item.returnedQty ?? item.qty}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-700 w-[100px] truncate">
                            {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

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

export default ReturnReport;