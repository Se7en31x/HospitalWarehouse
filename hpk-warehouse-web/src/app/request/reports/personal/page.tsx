'use client';
import React, { useState } from 'react';
import { Search, FileText, Download, BarChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { saveAs } from 'file-saver';

interface UsageSummary {
  month: string;
  withdrawCount: number;
  borrowCount: number;
}

interface FrequentItem {
  itemId: string;
  itemName: string;
  category: string;
  usageCount: number;
  totalQty: number;
  unit: string;
}

const PersonalUsageReport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const usageSummary: UsageSummary[] = [
    { month: '2025-01', withdrawCount: 5, borrowCount: 3 },
    { month: '2025-02', withdrawCount: 7, borrowCount: 2 },
    { month: '2025-03', withdrawCount: 4, borrowCount: 4 },
    { month: '2025-04', withdrawCount: 6, borrowCount: 1 },
    { month: '2025-05', withdrawCount: 8, borrowCount: 5 },
    { month: '2025-06', withdrawCount: 3, borrowCount: 2 },
  ];

  const frequentItems: FrequentItem[] = [
    { itemId: 'ITM001', itemName: 'ชุดตรวจ ATK', category: 'อุปกรณ์ทางการแพทย์', usageCount: 15, totalQty: 150, unit: 'ชิ้น' },
    { itemId: 'ITM002', itemName: 'ถุงมือยาง', category: 'วัสดุสิ้นเปลือง', usageCount: 10, totalQty: 20, unit: 'กล่อง' },
    { itemId: 'EQP001', itemName: 'เครื่องวัดความดัน', category: 'เครื่องมือแพทย์', usageCount: 8, totalQty: 8, unit: 'เครื่อง' },
    { itemId: 'EQP003', itemName: 'รถเข็นวีลแชร์', category: 'อุปกรณ์ช่วยเหลือ', usageCount: 5, totalQty: 5, unit: 'คัน' },
  ];

  const filteredItems = frequentItems.filter((item) =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSummary = usageSummary.filter((summary) =>
    (!dateRange.start || summary.month >= dateRange.start) &&
    (!dateRange.end || summary.month <= dateRange.end)
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    const summaryHeaders = ['เดือน', 'จำนวนครั้งที่เบิก', 'จำนวนครั้งที่ยืม'];
    const summaryRows = filteredSummary.map((s) => [
      s.month,
      s.withdrawCount.toString(),
      s.borrowCount.toString(),
    ]);

    const itemsHeaders = ['รหัส', 'ชื่อ', 'หมวดหมู่', 'จำนวนครั้งที่ใช้งาน', 'จำนวนรวม', 'หน่วย'];
    const itemsRows = filteredItems.map((i) => [
      i.itemId,
      i.itemName,
      i.category,
      i.usageCount.toString(),
      i.totalQty.toString(),
      i.unit,
    ]);

    const csvContent = [
      'สรุปการใช้งานต่อเดือน',
      summaryHeaders.join(','),
      ...summaryRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      '',
      'พัสดุที่ใช้งานบ่อย',
      itemsHeaders.join(','),
      ...itemsRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'personal_usage_report.csv');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
            รายงานสรุปการใช้งานส่วนตัว
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
          ดูสรุปพฤติกรรมการใช้งานส่วนตัว เช่น จำนวนครั้งที่เบิก/ยืม และพัสดุที่ใช้งานบ่อย
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือหมวดหมู่พัสดุ..."
              className="w-full pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart className="w-5 h-5 mr-2 text-indigo-600" />
          สรุปจำนวนครั้งที่เบิก/ยืมต่อเดือน
        </h3>
        {/* ใส่กราฟที่นี่ */}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            พัสดุที่ใช้งานบ่อย
          </h3>
        </div>
        <div className="overflow-x-auto min-w-[1000px] sm:min-w-[1200px]">
          <table className="w-full text-xs sm:text-sm table-fixed">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider w-[120px]">
                  รหัส
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider w-[200px]">
                  ชื่อ
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider w-[150px]">
                  หมวดหมู่
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-center font-semibold uppercase tracking-wider w-[120px]">
                  จำนวนครั้งที่ใช้งาน
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-center font-semibold uppercase tracking-wider w-[120px]">
                  จำนวนรวม
                </th>
                <th className="h-10 sm:h-12 px-4 sm:px-6 text-left font-semibold uppercase tracking-wider w-[100px]">
                  หน่วย
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-indigo-50/50 transition-colors duration-200 h-12"
                  >
                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-medium text-gray-900 w-[120px] truncate">
                      {item.itemId}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700 w-[200px] truncate">
                      {item.itemName}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-500 w-[150px] truncate">
                      {item.category}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-center text-gray-700 font-semibold w-[120px]">
                      {item.usageCount}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-center text-gray-700 font-semibold w-[120px]">
                      {item.totalQty}
                    </td>
                    <td className="py-3 sm:py-4 px-4 sm:px-6 text-gray-700 w-[100px] truncate">
                      {item.unit}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 sm:py-12">
                    <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                      <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-600">
                        ไม่พบข้อมูลพัสดุ
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
            แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
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
    </div>
  );
};

export default PersonalUsageReport;