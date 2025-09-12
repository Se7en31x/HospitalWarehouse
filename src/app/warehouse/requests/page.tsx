"use client";

import React, { useState } from "react";
import {
  ClipboardCheck,
  Search,
  Calendar,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Package,
  X,
} from "lucide-react";

const HospitalRequests = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(null);

  // ข้อมูลหมวดหมู่
  const categories = [
    { id: "medicine", name: "ยาและเวชภัณฑ์", color: "bg-blue-100 text-blue-800" },
    { id: "equipment", name: "อุปกรณ์การแพทย์", color: "bg-green-100 text-green-800" },
    { id: "consumable", name: "วัสดุสิ้นเปลือง", color: "bg-yellow-100 text-yellow-800" },
    { id: "office", name: "วัสดุสำนักงาน", color: "bg-purple-100 text-purple-800" },
  ];

  // ข้อมูลจำลองคำขอเบิก-ยืม
  const requests = [
    {
      id: "REQ-2025-001",
      date: "2025-09-10",
      department: "แผนกอายุรกรรม",
      requester: "นางสาว สายใจ สุขดี",
      type: "borrow",
      items: [
        { code: "MED-001", name: "Paracetamol 500mg", category: "medicine", quantity: 10, unit: "กล่อง" },
        { code: "EQP-002", name: "เครื่องวัดความดัน", category: "equipment", quantity: 1, unit: "เครื่อง" },
      ],
      totalItems: 11,
      totalValue: 2550,
      status: "pending",
      returnDueDate: "2025-09-20",
    },
    {
      id: "REQ-2025-002",
      date: "2025-09-11",
      department: "แผนกศัลยกรรม",
      requester: "นาย สมศักดิ์ รักดี",
      type: "withdraw",
      items: [
        { code: "CNS-003", name: "ผ้าก๊อซ", category: "consumable", quantity: 20, unit: "แพ็ค" },
      ],
      totalItems: 20,
      totalValue: 1500,
      status: "approved",
      returnDueDate: null,
    },
    {
      id: "REQ-2025-003",
      date: "2025-09-11",
      department: "แผนกกุมารเวช",
      requester: "นางสาว มาลี จันทร์",
      type: "borrow",
      items: [
        { code: "EQP-004", name: "เครื่องพ่นยา", category: "equipment", quantity: 2, unit: "เครื่อง" },
      ],
      totalItems: 2,
      totalValue: 5000,
      status: "rejected",
      returnDueDate: "2025-09-25",
    },
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, text: "รอดำเนินการ" },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "อนุมัติ" },
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

  const handleApprove = (id) => {
    console.log(`อนุมัติคำขอ ${id}`);
    // ควรอัปเดตสถานะในฐานข้อมูลจริง
  };

  const handleReject = (id) => {
    console.log(`ปฏิเสธคำขอ ${id}`);
    // ควรอัปเดตสถานะในฐานข้อมูลจริง
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || req.status === selectedStatus;
    const matchesDate = !selectedDate || req.date === selectedDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ระบบคำขอ/อนุมัติ</h1>
                <p className="text-xs text-gray-600">จัดการคำขอเบิกและยืมพัสดุในคลังโรงพยาบาล</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm">
                <FileText className="w-4 h-4" />
                ออกรายงาน
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 border-t border-gray-200">
          <nav className="flex space-x-6">
            {["pending", "all"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab === "pending" ? "รอดำเนินการ" : "ทั้งหมด"}
              </button>
            ))}
          </nav>
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
                  placeholder="ค้นหาด้วยเลขที่คำขอ, แผนก หรือผู้ขอ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="approved">อนุมัติ</option>
                <option value="rejected">ปฏิเสธ</option>
              </select>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Request List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-base font-semibold text-gray-900">รายการคำขอ</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <div key={req.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-gray-900">{req.id}</h3>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">วันที่: </span>
                          <span className="text-gray-900">{new Date(req.date).toLocaleDateString("th-TH")}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">แผนก: </span>
                          <span className="text-gray-900">{req.department}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">ผู้ขอ: </span>
                          <span className="text-gray-900">{req.requester}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">ประเภท: </span>
                          <span className="text-gray-900">{req.type === "borrow" ? "ยืม" : "เบิกใช้"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">จำนวนรายการ: </span>
                          <span className="text-gray-900">{req.totalItems} รายการ</span>
                        </div>
                        <div>
                          <span className="text-gray-500">มูลค่ารวม: </span>
                          <span className="text-gray-900 font-semibold">
                            ฿{req.totalValue.toLocaleString("th-TH")}
                          </span>
                        </div>
                        {req.type === "borrow" && (
                          <div>
                            <span className="text-gray-500">วันที่ต้องคืน: </span>
                            <span className="text-gray-900">{new Date(req.returnDueDate).toLocaleDateString("th-TH")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDetailsModal(req)}
                        className="p-1.5 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {req.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="p-1.5 rounded-md text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="p-1.5 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-2">ไม่มีคำขอ</h3>
                <p className="text-sm text-gray-600">ไม่มีคำขอที่ตรงกับเงื่อนไขการค้นหา</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">รายละเอียดคำขอ: {showDetailsModal.id}</h3>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">วันที่: </span>
                  <span className="text-gray-900">{new Date(showDetailsModal.date).toLocaleDateString("th-TH")}</span>
                </div>
                <div>
                  <span className="text-gray-500">แผนก: </span>
                  <span className="text-gray-900">{showDetailsModal.department}</span>
                </div>
                <div>
                  <span className="text-gray-500">ผู้ขอ: </span>
                  <span className="text-gray-900">{showDetailsModal.requester}</span>
                </div>
                <div>
                  <span className="text-gray-500">ประเภท: </span>
                  <span className="text-gray-900">{showDetailsModal.type === "borrow" ? "ยืม" : "เบิกใช้"}</span>
                </div>
                {showDetailsModal.type === "borrow" && (
                  <div>
                    <span className="text-gray-500">วันที่ต้องคืน: </span>
                    <span className="text-gray-900">{new Date(showDetailsModal.returnDueDate).toLocaleDateString("th-TH")}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">รายการสินค้า</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["รหัสสินค้า", "ชื่อสินค้า", "หมวดหมู่", "จำนวน", "หน่วย"].map((header) => (
                          <th
                            key={header}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {showDetailsModal.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                categories.find((cat) => cat.id === item.category)?.color || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {categories.find((cat) => cat.id === item.category)?.name || "ไม่ระบุ"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span>จำนวนรายการ: <span className="font-semibold">{showDetailsModal.totalItems}</span></span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">มูลค่ารวม</div>
                  <div className="text-lg font-bold text-indigo-600">
                    ฿{showDetailsModal.totalValue.toLocaleString("th-TH")}
                  </div>
                </div>
              </div>
            </div>

            {showDetailsModal.status === "pending" && (
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => handleReject(showDetailsModal.id)}
                  className="px-3 py-1.5 border border-gray-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
                >
                  ปฏิเสธ
                </button>
                <button
                  onClick={() => handleApprove(showDetailsModal.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  อนุมัติ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalRequests;