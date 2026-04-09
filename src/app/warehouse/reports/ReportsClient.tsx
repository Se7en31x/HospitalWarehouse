"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    FileText,
    Search,
    Calendar,
    Download,
    ArrowDownToLine,
    ArrowUpFromLine,
    ClipboardCheck,
    RotateCw,
    Eye,
    Filter,
    ChevronDown,
    Package,
    AlertTriangle,
    History
} from "lucide-react";

// ✅ Import จากชื่อไฟล์ใหม่ (ไม่มี s)
import {
    getAllReports,
    // getReportSummary // ถ้าใน service ใหม่ยังไม่ได้ใส่ ให้ใช้ logic ด้านล่างครับ
} from "@/services/reportService";

import type { 
    Report, 
    ReportType, 
    ReportStatus, 
    ReportSummary 
} from "@/types/report_type";

interface ReportsClientProps {
    initialReports: Report[];
    selectedType?: string;
}

const ReportsClient: React.FC<ReportsClientProps> = ({
    initialReports,
    selectedType: propSelectedType = "all",
}) => {
    const [reports, setReports] = useState<Report[]>(initialReports);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>(propSelectedType);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [showFilters, setShowFilters] = useState(false);

    // Sync กับ Props
    useEffect(() => {
        setSelectedType(propSelectedType);
    }, [propSelectedType]);

    // ✅ ค้นหาแผนกที่มีอยู่จริงจากข้อมูล (Safe access เพราะเป็น Optional)
    const departments = useMemo(() => {
        const deptSet = new Set(reports.map(r => r.department).filter(Boolean));
        return Array.from(deptSet) as string[];
    }, [reports]);

    // ✅ สรุปยอด Summary Cards (คำนวณแบบ Memoization เพื่อ Performance)
    const summaryData = useMemo((): ReportSummary[] => {
        const base: Record<string, ReportSummary> = {
            "requisition": { type: "requisition", label: "การเบิก/ยืม", count: 0, totalValue: 0, totalItems: 0, color: "text-indigo-600", bgColor: "bg-indigo-50", icon: "📋" },
            "stockin": { type: "stockin", label: "นำเข้าพัสดุ", count: 0, totalValue: 0, totalItems: 0, color: "text-blue-600", bgColor: "bg-blue-50", icon: "📥" },
            "stock-balance": { type: "stock-balance", label: "คงคลังปัจจุบัน", count: 0, totalValue: 0, totalItems: 0, color: "text-emerald-600", bgColor: "bg-emerald-50", icon: "📦" },
            "expired-lots": { type: "expired-lots", label: "ใกล้หมดอายุ", count: 0, totalValue: 0, totalItems: 0, color: "text-amber-600", bgColor: "bg-amber-50", icon: "⚠️" },
            "stockout": { type: "stockout", label: "จ่ายออก", count: 0, totalValue: 0, totalItems: 0, color: "text-rose-600", bgColor: "bg-rose-50", icon: "📤" },
        };

        reports.forEach(r => {
            if (base[r.type]) {
                base[r.type].count++;
                base[r.type].totalValue += r.totalValue;
                base[r.type].totalItems += r.totalItems;
            }
        });
        return Object.values(base);
    }, [reports]);

    // ✅ กรองข้อมูล (Filtering Logic)
    const filteredReports = useMemo(() => {
        return reports.filter((r) => {
            const matchesType = selectedType === "all" || r.type === selectedType;
            const matchesStatus = selectedStatus === "all" || r.status === selectedStatus;
            const matchesDept = selectedDepartment === "all" || r.department === selectedDepartment;
            const matchesDateStart = !dateRange.start || r.date >= dateRange.start;
            const matchesDateEnd = !dateRange.end || r.date <= dateRange.end;
            
            const search = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || (
                r.reportNo.toLowerCase().includes(search) ||
                r.requester?.toLowerCase().includes(search) ||
                r.department?.toLowerCase().includes(search) ||
                r.items.some(it => it.itemName.toLowerCase().includes(search))
            );

            return matchesType && matchesStatus && matchesDept && matchesDateStart && matchesDateEnd && matchesSearch;
        });
    }, [reports, selectedType, selectedStatus, selectedDepartment, dateRange, searchTerm]);

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            const freshData = await getAllReports();
            setReports(freshData);
        } catch (error) {
            console.error("Refresh failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helpers สำหรับ UI ---

    const getTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            stockin: "นำเข้า",
            stockout: "จ่ายออก",
            requisition: "เบิก/ยืม",
            "stock-balance": "คงคลัง",
            "stock-movement": "เคลื่อนไหว",
            "expired-lots": "หมดอายุ",
        };
        return labels[type] || type;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "stockin": return <ArrowDownToLine className="w-4 h-4 text-blue-600" />;
            case "stockout": return <ArrowUpFromLine className="w-4 h-4 text-rose-600" />;
            case "requisition": return <ClipboardCheck className="w-4 h-4 text-indigo-600" />;
            case "stock-balance": return <Package className="w-4 h-4 text-emerald-600" />;
            case "expired-lots": return <AlertTriangle className="w-4 h-4 text-amber-600" />;
            default: return <History className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, string> = {
            PENDING: "bg-yellow-100 text-yellow-800",
            APPROVED: "bg-green-100 text-green-800",
            COMPLETED: "bg-blue-100 text-blue-800",
            REJECTED: "bg-red-100 text-red-800",
            CANCELLED: "bg-gray-100 text-gray-800",
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config[status] || "bg-gray-100 text-gray-800"}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
            {/* Header Section */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-indigo-600" />
                        {selectedType === "all" ? "คลังพัสดุ: รายงานรวม" : `รายงาน${getTypeLabel(selectedType)}`}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">จัดการและตรวจสอบข้อมูลความเคลื่อนไหวพัสดุในระบบ</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} disabled={isLoading} className="btn-secondary flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-all text-sm font-medium">
                        <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        รีเฟรช
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium shadow-sm">
                        <Download className="w-4 h-4" />
                        ส่งออกรายงาน
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {selectedType === "all" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {summaryData.map((item) => (
                        <div key={item.type} className={`${item.bgColor} border border-transparent hover:border-current/10 rounded-xl p-4 transition-all shadow-sm`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-xl">{item.icon}</span>
                                <span className={`text-xs font-bold uppercase tracking-wider ${item.color}`}>{item.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการสะสมทั้งหมด</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาเลขที่เอกสาร, ชื่อพัสดุ, หรือผู้เกี่ยวข้อง..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${showFilters ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <Filter className="w-4 h-4" />
                        ตัวกรองขั้นสูง
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-50">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ประเภทรายการ</label>
                            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full p-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                <option value="all">ทั้งหมด</option>
                                <option value="requisition">เบิก/ยืม</option>
                                <option value="stockin">นำเข้า</option>
                                <option value="stockout">จ่ายออก</option>
                                <option value="stock-balance">คงคลัง</option>
                                <option value="expired-lots">สินค้าใกล้หมดอายุ</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">แผนกที่เกี่ยวข้อง</label>
                            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full p-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                <option value="all">ทุกแผนก</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ช่วงเวลา</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="flex-1 p-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                <span className="text-gray-400">ถึง</span>
                                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="flex-1 p-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table/List Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">เอกสาร/วันที่</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ประเภท</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้เกี่ยวข้อง/แผนก</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">จำนวนรายการ</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredReports.map((report) => (
                                <tr key={`${report.type}-${report.id}`} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{report.reportNo}</div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3" />
                                            {report.date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(report.type)}
                                            <span className="text-sm text-gray-700 font-medium">{getTypeLabel(report.type)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 font-medium">{report.requester || report.supplier || '-'}</div>
                                        <div className="text-xs text-gray-400">{report.department || 'ไม่ระบุแผนก'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-bold text-gray-900">{report.totalItems}</div>
                                        <div className="text-xs text-gray-400">รายการ</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(report.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredReports.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-medium">ไม่พบข้อมูลรายงาน</h3>
                        <p className="text-gray-500 text-sm mt-1">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหาใหม่อีกครั้ง</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsClient;