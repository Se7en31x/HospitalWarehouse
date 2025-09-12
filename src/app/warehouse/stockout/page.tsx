"use client";

import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  Calendar,
  FileText,
  Save,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  X,
  Edit3,
  User,
  Truck,
  ArrowUpFromLine,
} from "lucide-react";

const HospitalStockOut = () => {
  const [activeTab, setActiveTab] = useState("entry");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const departments = [
    { id: "DEP001", name: "แผนกอายุรกรรม", contact: "02-123-4567" },
    { id: "DEP002", name: "แผนกศัลยกรรม", contact: "02-234-5678" },
    { id: "DEP003", name: "แผนกกุมารเวช", contact: "02-345-6789" },
  ];

  const categories = [
    { id: "medicine", name: "ยาและเวชภัณฑ์", color: "bg-blue-100 text-blue-800" },
    { id: "equipment", name: "อุปกรณ์การแพทย์", color: "bg-green-100 text-green-800" },
    { id: "consumable", name: "วัสดุสิ้นเปลือง", color: "bg-yellow-100 text-yellow-800" },
    { id: "office", name: "วัสดุสำนักงาน", color: "bg-purple-100 text-purple-800" },
  ];

  const stockOutHistory = [
    {
      id: "SO-2024-001",
      date: "2024-09-10",
      department: "แผนกอายุรกรรม",
      totalItems: 10,
      totalValue: 15000,
      status: "completed",
      issuedBy: "นางสาว สายใจ สุขดี",
    },
    {
      id: "SO-2024-002",
      date: "2024-09-11",
      department: "แผนกศัลยกรรม",
      totalItems: 5,
      totalValue: 8000,
      status: "pending",
      issuedBy: "นาย สมศักดิ์ รักดี",
    },
  ];

  const addItemToList = () => {
    const newItem = {
      id: Date.now(),
      code: "MED-001",
      name: "Paracetamol 500mg",
      category: "medicine",
      unit: "กล่อง",
      quantity: 0,
      unitPrice: 25.5,
      lotNumber: "",
      location: "",
    };
    setItems([...items, newItem]);
    setShowItemModal(false);
  };

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const getTotalValue = () => {
    return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, text: "เสร็จสมบูรณ์" },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, text: "รอดำเนินการ" },
      cancelled: { color: "bg-red-100 text-red-800", icon: X, text: "ยกเลิก" },
    };
    const config = statusConfig[status] || statusConfig.cancelled;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <ArrowUpFromLine className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ระบบนำออกของ</h1>
                <p className="text-xs text-gray-600">จัดการการนำออกสินค้าจากคลังโรงพยาบาล</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors text-sm">
                <FileText className="w-4 h-4" />
                ออกรายงาน
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 border-t border-gray-200">
          <nav className="flex space-x-6">
            {["entry", "history"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? "border-rose-500 text-rose-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab === "entry" ? "บันทึกการนำออก" : "ประวัติการนำออก"}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4">
        {activeTab === "entry" ? (
          <div className="space-y-4">
            {/* Entry Form */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">ข้อมูลการนำออก</h2>
                <div className="text-xs text-gray-500">
                  เอกสารเลขที่: <span className="font-semibold text-gray-900">SO-2024-003</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: "วันที่นำออก",
                    type: "date",
                    icon: Calendar,
                    defaultValue: new Date().toISOString().split("T")[0],
                  },
                  {
                    label: "แผนกที่รับ",
                    type: "select",
                    options: [{ value: "", label: "เลือกแผนก" }, ...departments.map((d) => ({ value: d.id, label: d.name }))],
                    value: selectedDepartment,
                    onChange: (e) => setSelectedDepartment(e.target.value),
                  },
                  {
                    label: "ผู้จ่ายของ",
                    type: "text",
                    placeholder: "ชื่อผู้จ่ายของ",
                    icon: User,
                  },
                  {
                    label: "เลขที่ใบเบิก",
                    type: "text",
                    placeholder: "เลขที่ใบเบิก",
                  },
                  {
                    label: "หมายเหตุ",
                    type: "text",
                    placeholder: "หมายเหตุเพิ่มเติม",
                  },
                ].map((field, index) => (
                  <div key={index}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                    <div className="relative">
                      {field.type === "select" ? (
                        <select
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-sm"
                        >
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            defaultValue={field.defaultValue}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-sm ${
                              field.icon ? "pl-9" : ""
                            }`}
                          />
                          {field.icon && <field.icon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">รายการสินค้า</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowItemModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มรายการ
                  </button>
                </div>
              </div>

              {items.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            "รหัสสินค้า",
                            "ชื่อสินค้า",
                            "หมวดหมู่",
                            "จำนวน",
                            "ราคาต่อหน่วย",
                            "Lot/Batch",
                            "ตำแหน่ง",
                            "รวม",
                            "จัดการ",
                          ].map((header) => (
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
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
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
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                  min="0"
                                />
                                <span className="text-xs text-gray-500">{item.unit}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={item.lotNumber}
                                onChange={(e) => updateItem(item.id, "lotNumber", e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Lot/Batch"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="text"
                                value={item.location}
                                onChange={(e) => updateItem(item.id, "location", e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="A1-01"
                              />
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                              ฿{(item.quantity * item.unitPrice).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          รายการทั้งหมด: <span className="font-semibold">{items.length}</span>
                        </span>
                        <span>
                          จำนวนรวม:{" "}
                          <span className="font-semibold">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">มูลค่ารวม</div>
                        <div className="text-xl font-bold text-rose-600">
                          ฿{getTotalValue().toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ArrowUpFromLine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-2">ยังไม่มีรายการสินค้า</h3>
                  <p className="text-sm text-gray-600 mb-3">เริ่มต้นโดยการเพิ่มรายการสินค้าที่ต้องการนำออก</p>
                  <button
                    onClick={() => setShowItemModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มรายการแรก
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {items.length > 0 && (
              <div className="flex justify-end gap-3">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
                  บันทึกแบบร่าง
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors text-sm">
                  <Save className="w-4 h-4" />
                  บันทึกการนำออก
                </button>
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาด้วยเลขที่เอกสาร, แผนก หรือผู้จ่ายของ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-sm">
                    <option value="">ทุกสถานะ</option>
                    <option value="completed">เสร็จสมบูรณ์</option>
                    <option value="pending">รอดำเนินการ</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>
                  <input
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-base font-semibold text-gray-900">ประวัติการนำออก</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {stockOutHistory.map((record) => (
                  <div key={record.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">{record.id}</h3>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">วันที่: </span>
                            <span className="text-gray-900">{new Date(record.date).toLocaleDateString("th-TH")}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">แผนก: </span>
                            <span className="text-gray-900">{record.department}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">ผู้จ่ายของ: </span>
                            <span className="text-gray-900">{record.issuedBy}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">จำนวนรายการ: </span>
                            <span className="text-gray-900">{record.totalItems} รายการ</span>
                          </div>
                          <div>
                            <span className="text-gray-500">มูลค่ารวม: </span>
                            <span className="text-gray-900 font-semibold">
                              ฿{record.totalValue.toLocaleString("th-TH")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {[
                          { icon: Eye, color: "text-gray-600 hover:text-rose-600 hover:bg-rose-50" },
                          { icon: Edit3, color: "text-gray-600 hover:text-blue-600 hover:bg-blue-50" },
                          { icon: FileText, color: "text-gray-600 hover:text-gray-800 hover:bg-gray-100" },
                        ].map((btn, index) => (
                          <button key={index} className={`p-1.5 rounded-md ${btn.color} transition-colors`}>
                            <btn.icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">เพิ่มรายการสินค้า</h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาสินค้าด้วยรหัสหรือชื่อ..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-3 border border-gray-200 rounded-md hover:bg-rose-50 hover:border-rose-300 transition-colors text-center ${
                      selectedCategory === category.id ? "bg-rose-50 border-rose-300" : ""
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-900">{category.name}</div>
                    <div className="text-xs text-gray-500">เพิ่มรายการ</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={addItemToList}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                เพิ่มรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalStockOut;