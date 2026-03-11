"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Plus, Eye, Search, Calendar,
  FileText, DollarSign, Clock, MoreHorizontal, Loader2, ChevronLeft, ChevronRight, ArrowDownToLine
} from "lucide-react";
import StockInFormModal from "./StockInFormModal";
import * as stockInService from "@/services/stockInService";

interface StockInRecord {
  id: string;
  date: string;
  docNo: string;
  supplier: string;
  totalAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

interface Props {
  initialHistory?: StockInRecord[];
}

// Helper: Component สำหรับป้ายสถานะ
const StatusBadge = ({ status }: { status: string }) => {
    const config = {
        COMPLETED: { color: "bg-emerald-100 text-emerald-700", label: "เสร็จสมบูรณ์" },
        PENDING: { color: "bg-amber-100 text-amber-700", label: "รอดำเนินการ" },
        CANCELLED: { color: "bg-red-100 text-red-700", label: "ยกเลิก" }
    }[status] || { color: "bg-gray-100 text-gray-700", label: status };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'COMPLETED' ? 'bg-emerald-500' : status === 'PENDING' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
            {config.label}
        </span>
    );
};

// Helper: Map status from API to UI status
const mapStatus = (apiStatus: string): 'PENDING' | 'COMPLETED' | 'CANCELLED' => {
  const statusMap: Record<string, 'PENDING' | 'COMPLETED' | 'CANCELLED'> = {
    'ACTIVE': 'COMPLETED',
    'PENDING': 'PENDING',
    'DELETED': 'CANCELLED',
    'COMPLETED': 'COMPLETED'
  };
  return statusMap[apiStatus] || 'PENDING';
};

export default function StockInClient({ initialHistory = [] }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [history, setHistory] = useState<StockInRecord[]>(initialHistory);
  const [isFetching, setIsFetching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data function
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await stockInService.getAllStockIn();
      const transformedData = data.map((item: any) => ({
        id: item.id || '',
        date: item.date || new Date().toISOString().split('T')[0],
        docNo: item.docNo || item.id,
        supplier: item.supplier || 'ไม่ระบุ',
        totalAmount: item.totalAmount || 0,
        status: mapStatus(item.status)
      }));
      setHistory(transformedData);
    } catch (error) {
      console.error("Error fetching stock in data:", error);
      setHistory([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Mock data for demonstration
  useEffect(() => {
    if (history.length === 0) {
      refreshData();
    }
  }, [refreshData]);

  // --- Logic: Filter ข้อมูล ---
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
        const matchesSearch = 
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.docNo.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
        
        // Date range filter
        let matchesDate = true;
        if (startDate && endDate) {
          const itemDate = new Date(item.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          matchesDate = itemDate >= start && itemDate <= end;
        } else if (startDate) {
          const itemDate = new Date(item.date);
          const start = new Date(startDate);
          matchesDate = itemDate >= start;
        } else if (endDate) {
          const itemDate = new Date(item.date);
          const end = new Date(endDate);
          matchesDate = itemDate <= end;
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });
  }, [history, searchTerm, statusFilter, startDate, endDate]);

  // --- Logic: Pagination ---
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- Logic: คำนวณยอดสรุป (Stats) ---
  const stats = useMemo(() => {
    return {
        totalDocs: history.length,
        totalAmount: history.reduce((sum, item) => item.status !== 'CANCELLED' ? sum + item.totalAmount : sum, 0),
        pendingDocs: history.filter(item => item.status === 'PENDING').length
    };
  }, [history]);

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <ArrowDownToLine className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-indigo-600">บันทึกการนำเข้า</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> สร้างใบรับสินค้า
          </button>
        </div>
      </div>

      {/* 2. Stats Cards (Dashboard View) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">เอกสารทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDocs} <span className="text-xs text-gray-400 font-normal">ฉบับ</span></p>
            </div>
        </div>
        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">ยอดรับเข้าสุทธิ</p>
                <p className="text-2xl font-bold text-emerald-600">฿{stats.totalAmount.toLocaleString()}</p>
            </div>
        </div>
        {/* Card 3 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">รอดำเนินการ</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingDocs} <span className="text-xs text-gray-400 font-normal">รายการ</span></p>
            </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ค้นหา..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none" 
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto md:ml-auto">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="COMPLETED">เสร็จสมบูรณ์</option>
            <option value="PENDING">รอดำเนินการ</option>
            <option value="CANCELLED">ยกเลิก</option>
          </select>
          <div className="flex gap-2 md:gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <span className="flex items-center text-slate-400">ถึง</span>
            <div className="relative flex-1 md:flex-none">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="h-[65vh] rounded-xl bg-white shadow-lg overflow-hidden relative border border-slate-100">
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        )}
        <div className="overflow-x-auto h-full flex flex-col">
          <table className="w-full text-sm text-left flex-1">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[150px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[150px]">วันที่รับ</th>
                <th className="px-6 py-4 w-[200px]">PO/Invoice</th>
                <th className="px-6 py-4">ผู้จำหน่าย</th>
                <th className="px-6 py-4 text-right w-[120px]">ยอดรวม</th>
                <th className="px-6 py-4 text-center w-[150px]">สถานะ</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedHistory.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4 font-medium text-indigo-600">{item.id}</td>
                  <td className="px-6 py-4 text-slate-600">{item.date}</td>
                  <td className="px-6 py-4 font-mono text-sm">{item.docNo || '-'}</td>
                  <td className="px-6 py-4 text-slate-900">{item.supplier}</td>
                  <td className="px-6 py-4 text-right font-bold">฿{item.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedHistory.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">ไม่พบข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {paginatedHistory.length} จาก {filteredHistory.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stock In Form Modal */}
      <StockInFormModal 
        isOpen={isModalOpen} 
        onCloseAction={() => setIsModalOpen(false)}
        onSuccessAction={() => {
          refreshData();
        }}
      />
    </div>
  );
}