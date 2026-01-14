"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Eye, Search, Filter, Calendar, 
  FileText, DollarSign, Clock, ChevronDown, MoreHorizontal
} from "lucide-react";
import { StockInRecord } from "@/services/stockInService";

interface Props {
  initialHistory: StockInRecord[];
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

export default function StockInHistoryClient({ initialHistory }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  // --- Logic: Filter ข้อมูล ---
  const filteredHistory = useMemo(() => {
    return initialHistory.filter(item => {
        const matchesSearch = 
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.docNo.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
        // (Optional: เพิ่ม Logic กรองวันที่ตรงนี้)
        
        return matchesSearch && matchesStatus;
    });
  }, [initialHistory, searchTerm, statusFilter]);

  // --- Logic: คำนวณยอดสรุป (Stats) ---
  const stats = useMemo(() => {
    return {
        totalDocs: initialHistory.length,
        totalAmount: initialHistory.reduce((sum, item) => item.status !== 'CANCELLED' ? sum + item.totalAmount : sum, 0),
        pendingDocs: initialHistory.filter(item => item.status === 'PENDING').length
    };
  }, [initialHistory]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ประวัติการนำเข้า (Stock In History)</h1>
          <p className="text-gray-500 text-sm mt-1">รายการรับเวชภัณฑ์และสินค้าเข้าคลังทั้งหมด</p>
        </div>
        <button 
          onClick={() => router.push("/warehouse/stockin/create")}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm font-medium active:scale-95"
        >
          <Plus className="w-5 h-5" /> สร้างใบรับสินค้า
        </button>
      </div>

      {/* 2. Stats Cards (Dashboard View) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Left: Search */}
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
                type="text" 
                placeholder="ค้นหาเลขที่เอกสาร, ผู้จำหน่าย, เลข Invoice..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Right: Filters */}
        <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none">
                <select 
                    className="w-full appearance-none pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-gray-100 transition"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">ทุกสถานะ</option>
                    <option value="COMPLETED">เสร็จสมบูรณ์</option>
                    <option value="PENDING">รอดำเนินการ</option>
                    <option value="CANCELLED">ยกเลิก</option>
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
             </div>

             <div className="relative flex-1 md:flex-none">
                <input 
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
             </div>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">เลขที่เอกสาร</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[12%]">วันที่รับ</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">อ้างอิง (Inv)</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">ผู้จำหน่าย</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%] text-right">ยอดรวม</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[10%] text-center">สถานะ</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[8%] text-center">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredHistory.length > 0 ? (
                        filteredHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-indigo-600 font-mono text-sm group-hover:underline">{item.id}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        {item.date}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 font-mono">{item.docNo || '-'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 line-clamp-1">{item.supplier}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-sm font-bold text-gray-800">฿{item.totalAmount.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <StatusBadge status={item.status} />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                                        <Search className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 font-medium">ไม่พบข้อมูลเอกสาร</p>
                                    <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา หรือตัวกรองสถานะ</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination Footer (Mockup) */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">แสดง {filteredHistory.length} รายการ</span>
            <div className="flex gap-1">
                <button className="px-3 py-1 border rounded bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">ก่อนหน้า</button>
                <button className="px-3 py-1 border rounded bg-white text-sm text-gray-600 hover:bg-gray-50">ถัดไป</button>
            </div>
        </div>
      </div>
    </div>
  );
}