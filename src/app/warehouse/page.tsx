"use client";

import { useState } from "react";
import { Package, AlertTriangle, Clock, Plus, Eye, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function WarehousePage() {
  // Mock data for dashboard
  const stockSummary = {
    totalItems: 1250,
    lowStockItems: 42,
    totalCategories: 15,
    pendingRequests: 8,
  };

  const recentRequests = [
    { id: "REQ1234", item: "หน้ากากอนามัย N95", quantity: 100, status: "รออนุมัติ", date: "11 ก.ย. 2568" },
    { id: "REQ1235", item: "ถุงมือยางทางการแพทย์", quantity: 500, status: "อนุมัติแล้ว", date: "10 ก.ย. 2568" },
    { id: "REQ1236", item: "น้ำเกลือ 0.9%", quantity: 200, status: "ปฏิเสธ", date: "10 ก.ย. 2568" },
    { id: "REQ1237", item: "เข็มฉีดยา 5ml", quantity: 300, status: "รออนุมัติ", date: "9 ก.ย. 2568" },
  ];

  const activityLog = [
    { id: 1, action: "นำเข้าพัสดุ: หน้ากากอนามัย N95", quantity: 1000, user: "สมชาย ใจดี", time: "11 ก.ย. 2568 14:30" },
    { id: 2, action: "นำออกพัสดุ: ถุงมือยาง", quantity: 200, user: "สมหญิง รอบคอบ", time: "10 ก.ย. 2568 09:15" },
    { id: 3, action: "อนุมัติคำขอ: REQ1235", quantity: 500, user: "สมชาย ใจดี", time: "10 ก.ย. 2568 08:00" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-indigo-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            คลังพัสดุ - แดชบอร์ด
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            ภาพรวมของการจัดการพัสดุ การนำเข้า การนำออก และคำขอ
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/95 backdrop-blur-lg rounded-lg shadow-md p-5 flex items-center gap-4 animate-slide-in">
            <div className="p-3 bg-indigo-100/50 rounded-md">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">พัสดุทั้งหมด</p>
              <p className="text-lg font-semibold text-indigo-900">{stockSummary.totalItems}</p>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-lg rounded-lg shadow-md p-5 flex items-center gap-4 animate-slide-in" style={{ animationDelay: "100ms" }}>
            <div className="p-3 bg-red-100/50 rounded-md">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">พัสดุใกล้หมด</p>
              <p className="text-lg font-semibold text-indigo-900">{stockSummary.lowStockItems}</p>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-lg rounded-lg shadow-md p-5 flex items-center gap-4 animate-slide-in" style={{ animationDelay: "200ms" }}>
            <div className="p-3 bg-blue-100/50 rounded-md">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">ประเภทพัสดุ</p>
              <p className="text-lg font-semibold text-indigo-900">{stockSummary.totalCategories}</p>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-lg rounded-lg shadow-md p-5 flex items-center gap-4 animate-slide-in" style={{ animationDelay: "300ms" }}>
            <div className="p-3 bg-yellow-100/50 rounded-md">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">คำขอดำเนินการ</p>
              <p className="text-lg font-semibold text-indigo-900">{stockSummary.pendingRequests}</p>
            </div>
          </div>
        </div>

        {/* Recent Requests Table */}
        <div className="bg-white/95 backdrop-blur-lg rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-indigo-900">คำขอเบิก/ยืมล่าสุด</h3>
            <Link
              href="/warehouse/requests"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 px-3 py-1.5 rounded-md transition-all duration-300"
              aria-label="ดูคำขอทั้งหมด"
            >
              <Eye className="w-4 h-4" />
              ดูทั้งหมด
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="text-left text-gray-600 border-b border-indigo-100/50">
                  <th className="py-2 px-4">รหัสคำขอ</th>
                  <th className="py-2 px-4">รายการ</th>
                  <th className="py-2 px-4">จำนวน</th>
                  <th className="py-2 px-4">สถานะ</th>
                  <th className="py-2 px-4">วันที่</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((request, index) => (
                  <tr
                    key={request.id}
                    className="border-b border-indigo-100/50 last:border-b-0 hover:bg-indigo-50/50 transition-all duration-200 animate-slide-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="py-2 px-4">{request.id}</td>
                    <td className="py-2 px-4">{request.item}</td>
                    <td className="py-2 px-4">{request.quantity}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === "รออนุมัติ"
                            ? "bg-yellow-100 text-yellow-700"
                            : request.status === "อนุมัติแล้ว"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="py-2 px-4">{request.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white/95 backdrop-blur-lg rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-indigo-900">บันทึกกิจกรรม</h3>
            <button
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 px-3 py-1.5 rounded-md transition-all duration-300"
              aria-label="เพิ่มบันทึกใหม่"
            >
              <Plus className="w-4 h-4" />
              เพิ่มบันทึก
            </button>
          </div>
          <div className="space-y-3">
            {activityLog.map((log, index) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-md hover:bg-indigo-50/50 transition-all duration-200 animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Clock className="w-4 h-4 text-indigo-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{log.action}</p>
                  <p className="text-xs text-gray-500">โดย {log.user} • {log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}