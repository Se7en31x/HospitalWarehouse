"use client";

import { useState } from "react";
import { Settings, Package, Ruler, FileText, User, Bell, Table } from "lucide-react";

// ข้อมูลตัวอย่างสำหรับการตั้งค่า
const initialCategories = [
  { id: "cat-001", name: "ครุภัณฑ์", isActive: true },
  { id: "cat-002", name: "ยา", isActive: true },
  { id: "cat-003", name: "วัสดุ", isActive: true },
  { id: "cat-004", name: "เวชภัณฑ์ที่ไม่ใช่ยา", isActive: true },
];

const initialUnits = [
  { id: "unit-001", name: "ชิ้น", categoryIds: ["cat-001", "cat-004"] },
  { id: "unit-002", name: "แผง", categoryIds: ["cat-002"] },
  { id: "unit-003", name: "รีม", categoryIds: ["cat-003"] },
  { id: "unit-004", name: "ม้วน", categoryIds: ["cat-004"] },
  { id: "unit-005", name: "ขวด", categoryIds: ["cat-002"] },
  { id: "unit-006", name: "คู่", categoryIds: ["cat-004"] },
  { id: "unit-007", name: "ถุง", categoryIds: ["cat-004"] },
  { id: "unit-008", name: "ด้าม", categoryIds: ["cat-003"] },
];

const initialTransactionTypes = [
  { id: "type-001", name: "คำขอ", requiresApproval: true },
  { id: "type-002", name: "นำเข้า", requiresApproval: false },
  { id: "type-003", name: "นำออก", requiresApproval: false },
  { id: "type-004", name: "ยืม", requiresApproval: true },
  { id: "type-005", name: "เบิกใช้", requiresApproval: true },
];

const initialStatuses = [
  { id: "status-001", name: "สำเร็จ", color: "bg-green-100 text-green-800" },
  { id: "status-002", name: "รออนุมัติ", color: "bg-yellow-100 text-yellow-800" },
  { id: "status-003", name: "ยกเลิก", color: "bg-red-100 text-red-800" },
];

const initialUsers = [
  { id: "user-001", name: "นาย ก", role: "ผู้จัดการคลัง" },
  { id: "user-002", name: "นาง ข", role: "เจ้าหน้าที่" },
  { id: "user-003", name: "นาย ค", role: "เจ้าหน้าที่" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("categories");
  const [categories, setCategories] = useState(initialCategories);
  const [units, setUnits] = useState(initialUnits);
  const [transactionTypes, setTransactionTypes] = useState(initialTransactionTypes);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [users, setUsers] = useState(initialUsers);
  const [notifications, setNotifications] = useState({ enabled: true, channel: "ในระบบ" });
  const [displayPrefs, setDisplayPrefs] = useState({ itemsPerPage: 10, columns: ["รหัส", "ประเภทการทำรายการ", "วันที่", "ผู้ทำรายการ", "สถานะ", "รายการ"] });

  const handleAddCategory = () => {
    // ตัวอย่างการเพิ่มประเภท (ควรเชื่อม API ในระบบจริง)
    const newCategory = { id: `cat-${Date.now()}`, name: "ประเภทใหม่", isActive: true };
    setCategories([...categories, newCategory]);
  };

  const handleToggleCategory = (id: string) => {
    setCategories(categories.map((cat) => (cat.id === id ? { ...cat, isActive: !cat.isActive } : cat)));
  };

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Settings className="w-8 h-8 text-indigo-600 animate-pulse" />
          <h1 className="text-3xl font-bold text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
            การตั้งค่า
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {[
          { id: "categories", label: "ประเภทพัสดุ", icon: <Package className="w-5 h-5" /> },
          { id: "units", label: "หน่วย", icon: <Ruler className="w-5 h-5" /> },
          { id: "transactionTypes", label: "ประเภทการทำรายการ", icon: <FileText className="w-5 h-5" /> },
          { id: "statuses", label: "สถานะ", icon: <FileText className="w-5 h-5" /> },
          { id: "users", label: "ผู้ใช้", icon: <User className="w-5 h-5" /> },
          { id: "notifications", label: "การแจ้งเตือน", icon: <Bell className="w-5 h-5" /> },
          { id: "display", label: "การแสดงผล", icon: <Table className="w-5 h-5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-indigo-600"
            } transition-all duration-200`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {activeTab === "categories" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800">จัดการประเภทพัสดุ</h2>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all duration-200"
              >
                เพิ่มประเภท
              </button>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ชื่อประเภท
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-slate-600">{cat.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          cat.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cat.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleCategory(cat.id)}
                        className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md"
                      >
                        {cat.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "units" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800">จัดการหน่วย</h2>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all duration-200">
                เพิ่มหน่วย
              </button>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ชื่อหน่วย
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ประเภทที่ใช้ได้
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-slate-600">{unit.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {unit.categoryIds
                        .map((id) => categories.find((cat) => cat.id === id)?.name || "ไม่ระบุ")
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "transactionTypes" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800">จัดการประเภทการทำรายการ</h2>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all duration-200">
                เพิ่มประเภท
              </button>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ชื่อประเภท
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ต้องอนุมัติ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactionTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-slate-600">{type.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {type.requiresApproval ? "ใช่" : "ไม่"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "statuses" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800">จัดการสถานะ</h2>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all duration-200">
                เพิ่มสถานะ
              </button>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ชื่อสถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    สี
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statuses.map((status) => (
                  <tr key={status.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-slate-600">{status.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                        {status.name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800">จัดการผู้ใช้</h2>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all duration-200">
                เพิ่มผู้ใช้
              </button>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ชื่อ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    บทบาท
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm text-slate-600">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "notifications" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">ตั้งค่าการแจ้งเตือน</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={notifications.enabled}
                  onChange={() => setNotifications({ ...notifications, enabled: !notifications.enabled })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <label className="text-sm text-slate-700">เปิดใช้งานการแจ้งเตือน</label>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">ช่องทางการแจ้งเตือน:</label>
                <select
                  value={notifications.channel}
                  onChange={(e) => setNotifications({ ...notifications, channel: e.target.value })}
                  className="mt-1 pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  <option value="ในระบบ">ในระบบ</option>
                  <option value="อีเมล">อีเมล</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === "display" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">ตั้งค่าการแสดงผล</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">จำนวนรายการต่อหน้า:</label>
                <select
                  value={displayPrefs.itemsPerPage}
                  onChange={(e) => setDisplayPrefs({ ...displayPrefs, itemsPerPage: Number(e.target.value) })}
                  className="mt-1 pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">คอลัมน์ที่แสดง:</label>
                <div className="mt-2 space-y-2">
                  {["รหัส", "ประเภทการทำรายการ", "วันที่", "ผู้ทำรายการ", "สถานะ", "รายการ"].map((col) => (
                    <div key={col} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={displayPrefs.columns.includes(col)}
                        onChange={() => {
                          const newColumns = displayPrefs.columns.includes(col)
                            ? displayPrefs.columns.filter((c) => c !== col)
                            : [...displayPrefs.columns, col];
                          setDisplayPrefs({ ...displayPrefs, columns: newColumns });
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                      />
                      <label className="text-sm text-slate-700">{col}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}