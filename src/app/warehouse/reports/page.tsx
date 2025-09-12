"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  Calendar,
  Download,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";

const HospitalReports = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // ข้อมูลจำลองสำหรับรายงานทั้งหมด
  const reports = [
    // รายงานการนำเข้า (StockIn)
    {
      id: "SI-2025-001",
      type: "stockin",
      date: "2025-09-01",
      department: "คลังกลาง",
      totalItems: 50,
      totalValue: 12500,
      status: "completed",
      details: "นำเข้ายา Paracetamol 500mg และผ้าก๊อซ",
    },
    {
      id: "SI-2025-002",
      type: "stockin",
      date: "2025-09-05",
      department: "คลังกลาง",
      totalItems: 10,
      totalValue: 30000,
      status: "completed",
      details: "นำเข้าอุปกรณ์เครื่องวัดความดัน",
    },
    // รายงานการนำออก (StockOut)
    {
      id: "SO-2025-001",
      type: "stockout",
      date: "2025-09-02",
      department: "แผนกอายุรกรรม",
      totalItems: 10,
      totalValue: 2550,
      status: "completed",
      details: "จ่าย Paracetamol 500mg ให้แผนก",
    },
    {
      id: "SO-2025-002",
      type: "stockout",
      date: "2025-09-06",
      department: "แผนกศัลยกรรม",
      totalItems: 15,
      totalValue: 1200,
      status: "completed",
      details: "จ่ายผ้าก๊อซให้แผนก",
    },
    // รายงานคำขอ (Requests)
    {
      id: "REQ-2025-001",
      type: "request",
      date: "2025-09-03",
      department: "แผนกศัลยกรรม",
      requester: "นาย สมศักดิ์ รักดี",
      totalItems: 20,
      totalValue: 1500,
      status: "approved",
      details: "คำขอเบิกผ้าก๊อซ",
      returnDueDate: null,
    },
    {
      id: "REQ-2025-002",
      type: "request",
      date: "2025-09-04",
      department: "แผนกกุมารเวช",
      requester: "นางสาว มาลี จันทร์",
      totalItems: 2,
      totalValue: 5000,
      status: "pending",
      details: "คำขอยืมเครื่องพ่นยา",
      returnDueDate: "2025-09-25",
    },
  ];

  // ข้อมูลแผนก
  const departments = [
    { id: "all", name: "ทุกแผนก" },
    { id: "DEP001", name: "คลังกลาง" },
    { id: "DEP002", name: "แผนกอายุรกรรม" },
    { id: "DEP003", name: "แผนกศัลยกรรม" },
    { id: "DEP004", name: "แผนกกุมารเวช" },
  ];

  // ฟังก์ชันสำหรับ badge สถานะ
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "เสร็จสมบูรณ์" },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "อนุมัติ" },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, text: "รอดำเนินการ" },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle, text: "ปฏิเสธ" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  // ฟังก์ชันสำหรับไอคอนประเภท
  const getTypeIcon = (type) => {
    const typeConfig = {
      stockin: { icon: ArrowDownToLine, color: "text-blue-600" },
      stockout: { icon: ArrowUpFromLine, color: "text-rose-600" },
      request: { icon: ClipboardCheck, color: "text-indigo-600" },
    };
    const config = typeConfig[type] || typeConfig.request;
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  // ฟังก์ชันกรองรายงาน
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.requester && report.requester.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === "all" || report.type === selectedType;
    const matchesDepartment = selectedDepartment === "all" || report.department === departments.find((d) => d.id === selectedDepartment)?.name;
    const matchesDate =
      (!dateRange.start || report.date >= dateRange.start) &&
      (!dateRange.end || report.date <= dateRange.end);
    return matchesSearch && matchesType && matchesDepartment && matchesDate;
  });

  // ฟังก์ชันส่งออกรายงาน (จำลอง)
  const handleExport = (format) => {
    console.log(`ส่งออกรายงานรวมเป็น ${format}`);
    // ควรเพิ่ม logic สำหรับการส่งออก เช่น สร้างไฟล์ PDF หรือ Excel
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ระบบรายงานรวม</h1>
                <p className="text-xs text-gray-600">ภาพรวมการนำเข้า นำออก และคำขอในคลังโรงพยาบาล</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleExport("pdf")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                ส่งออก PDF
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                ส่งออก Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยเลขที่, แผนก, ผู้ขอ หรือรายละเอียด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="all">ทุกประเภท</option>
                <option value="stockin">นำเข้า</option>
                <option value="stockout">นำออก</option>
                <option value="request">คำขอ</option>
              </select>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownToLine className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">การนำเข้า</h3>
            </div>
            <p className="text-xs text-gray-600">จำนวน: {reports.filter((r) => r.type === "stockin").length} รายการ</p>
            <p className="text-xs text-gray-600">
              มูลค่ารวม: ฿{reports.filter((r) => r.type === "stockin").reduce((sum, r) => sum + r.totalValue, 0).toLocaleString("th-TH")}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpFromLine className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-semibold text-gray-900">การนำออก</h3>
            </div>
            <p className="text-xs text-gray-600">จำนวน: {reports.filter((r) => r.type === "stockout").length} รายการ</p>
            <p className="text-xs text-gray-600">
              มูลค่ารวม: ฿{reports.filter((r) => r.type === "stockout").reduce((sum, r) => sum + r.totalValue, 0).toLocaleString("th-TH")}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">คำขอ</h3>
            </div>
            <p className="text-xs text-gray-600">จำนวน: {reports.filter((r) => r.type === "request").length} รายการ</p>
            <p className="text-xs text-gray-600">
              มูลค่ารวม: ฿{reports.filter((r) => r.type === "request").reduce((sum, r) => sum + r.totalValue, 0).toLocaleString("th-TH")}
            </p>
          </div>
        </div>

        {/* Report List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-base font-semibold text-gray-900">รายการรายงานทั้งหมด</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <div key={report.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(report.type)}
                          <h3 className="text-base font-semibold text-gray-900">{report.id}</h3>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">วันที่: </span>
                          <span className="text-gray-900">{new Date(report.date).toLocaleDateString("th-TH")}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">ประเภท: </span>
                          <span className="text-gray-900">
                            {report.type === "stockin" ? "นำเข้า" : report.type === "stockout" ? "นำออก" : "คำขอ"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">แผนก: </span>
                          <span className="text-gray-900">{report.department}</span>
                        </div>
                        {report.requester && (
                          <div>
                            <span className="text-gray-500">ผู้ขอ: </span>
                            <span className="text-gray-900">{report.requester}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">จำนวนรายการ: </span>
                          <span className="text-gray-900">{report.totalItems} รายการ</span>
                        </div>
                        <div>
                          <span className="text-gray-500">มูลค่ารวม: </span>
                          <span className="text-gray-900 font-semibold">
                            ฿{report.totalValue.toLocaleString("th-TH")}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">รายละเอียด: </span>
                          <span className="text-gray-900">{report.details}</span>
                        </div>
                        {report.returnDueDate && (
                          <div>
                            <span className="text-gray-500">วันที่ต้องคืน: </span>
                            <span className="text-gray-900">{new Date(report.returnDueDate).toLocaleDateString("th-TH")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => console.log(`ดูรายละเอียด ${report.id}`, report)}
                        className="p-1.5 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-2">ไม่มีรายงาน</h3>
                <p className="text-sm text-gray-600">ไม่มีรายงานที่ตรงกับเงื่อนไขการค้นหา</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalReports;