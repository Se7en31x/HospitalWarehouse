
"use client"

import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Calendar,
  Truck,
  FileText,
  Save,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Building,
  Barcode,
  Camera,
  Upload,
  Download,
  Filter,
  X,
  Edit3,
  Calculator
} from 'lucide-react';

const HospitalStockIn = () => {
  const [activeTab, setActiveTab] = useState('entry');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // ข้อมูลตัวอย่าง
  const suppliers = [
    { id: 'SUP001', name: 'บริษัท เมดิคอล ซัพพลาย จำกัด', contact: '02-123-4567' },
    { id: 'SUP002', name: 'บริษัท ฟาร์มา อีควิปเมนท์ จำกัด', contact: '02-234-5678' },
    { id: 'SUP003', name: 'บริษัท ไบโอ เมดิคัล จำกัด', contact: '02-345-6789' }
  ];

  const categories = [
    { id: 'medicine', name: 'ยาและเวชภัณฑ์', color: 'bg-blue-100 text-blue-800' },
    { id: 'equipment', name: 'อุปกรณ์การแพทย์', color: 'bg-green-100 text-green-800' },
    { id: 'consumable', name: 'วัสดุสิ้นเปลือง', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'office', name: 'วัสดุสำนักงาน', color: 'bg-purple-100 text-purple-800' }
  ];

  const stockInHistory = [
    {
      id: 'SI-2024-001',
      date: '2024-09-10',
      supplier: 'บริษัท เมดิคอล ซัพพลาย จำกัด',
      totalItems: 15,
      totalValue: 25000,
      status: 'completed',
      receivedBy: 'นางสาว มาลี จันทร์'
    },
    {
      id: 'SI-2024-002',
      date: '2024-09-11',
      supplier: 'บริษัท ฟาร์มา อีควิปเมนท์ จำกัด',
      totalItems: 8,
      totalValue: 15000,
      status: 'pending',
      receivedBy: 'นาย สมชาย ใจดี'
    }
  ];

  const addItemToList = () => {
    const newItem = {
      id: Date.now(),
      code: 'MED-001',
      name: 'Paracetamol 500mg',
      category: 'medicine',
      unit: 'กล่อง',
      quantity: 0,
      unitPrice: 25.50,
      lotNumber: '',
      expDate: '',
      location: ''
    };
    setItems([...items, newItem]);
    setShowItemModal(false);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const getTotalValue = () => {
    return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'เสร็จสมบูรณ์' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'รอดำเนินการ' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: X, text: 'ยกเลิก' }
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ระบบนำเข้าของ</h1>
                <p className="text-sm text-gray-600">จัดการการรับของเข้าคลังโรงพยาบาล</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <Download className="w-4 h-4" />
                นำเข้า Excel
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <FileText className="w-4 h-4" />
                รายงาน
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('entry')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'entry'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              บันทึกการนำเข้า
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ประวัติการนำเข้า
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'entry' ? (
          <div className="space-y-6">
            {/* Entry Form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">ข้อมูลการนำเข้า</h2>
                <div className="text-sm text-gray-500">
                  เอกสารเลขที่: <span className="font-semibold text-gray-900">SI-2024-003</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* วันที่รับของ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    วันที่รับของ
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                    <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* ผู้จำหน่าย */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ผู้จำหน่าย
                  </label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">เลือกผู้จำหน่าย</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ผู้รับของ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ผู้รับของ
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ชื่อผู้รับของ"
                      className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* เลขที่ใบส่งของ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลขที่ใบส่งของ
                  </label>
                  <input
                    type="text"
                    placeholder="เลขที่ใบส่งของ"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* เลขที่ใบสั่งซื้อ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลขที่ใบสั่งซื้อ
                  </label>
                  <input
                    type="text"
                    placeholder="เลขที่ PO (ถ้ามี)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* หมายเหตุ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    หมายเหตุ
                  </label>
                  <input
                    type="text"
                    placeholder="หมายเหตุเพิ่มเติม"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">รายการสินค้า</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowItemModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มรายการ
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Barcode className="w-4 h-4" />
                    สแกนบาร์โค้ด
                  </button>
                </div>
              </div>

              {items.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัสสินค้า</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อสินค้า</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หมวดหมู่</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ราคาต่อหน่วย</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot/Batch</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันหมดอายุ</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ตำแหน่ง</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รวม</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.code}</td>
                            <td className="px-4 py-4 text-sm text-gray-900">{item.name}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                categories.find(cat => cat.id === item.category)?.color || 'bg-gray-100 text-gray-800'
                              }`}>
                                {categories.find(cat => cat.id === item.category)?.name || 'ไม่ระบุ'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                  min="0"
                                />
                                <span className="text-xs text-gray-500">{item.unit}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="text"
                                value={item.lotNumber}
                                onChange={(e) => updateItem(item.id, 'lotNumber', e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Lot/Batch"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="date"
                                value={item.expDate}
                                onChange={(e) => updateItem(item.id, 'expDate', e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="text"
                                value={item.location}
                                onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="A1-01"
                              />
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                              ฿{(item.quantity * item.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4 text-center">
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
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>รายการทั้งหมด: <span className="font-semibold">{items.length}</span></span>
                        <span>จำนวนรวม: <span className="font-semibold">{items.reduce((sum, item) => sum + item.quantity, 0)}</span></span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">มูลค่ารวม</div>
                        <div className="text-2xl font-bold text-emerald-600">
                          ฿{getTotalValue().toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีรายการสินค้า</h3>
                  <p className="text-gray-600 mb-4">เริ่มต้นโดยการเพิ่มรายการสินค้าที่ต้องการนำเข้า</p>
                  <button
                    onClick={() => setShowItemModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มรายการแรก
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {items.length > 0 && (
              <div className="flex justify-end gap-4">
                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  บันทึกแบบร่าง
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  <Save className="w-4 h-4" />
                  บันทึกการนำเข้า
                </button>
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาด้วยเลขที่เอกสาร, ผู้จำหน่าย หรือผู้รับของ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="">ทุกสถานะ</option>
                    <option value="completed">เสร็จสมบูรณ์</option>
                    <option value="pending">รอดำเนินการ</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>
                  <input
                    type="date"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">ประวัติการนำเข้า</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {stockInHistory.map((record) => (
                  <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{record.id}</h3>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">วันที่: </span>
                            <span className="text-gray-900">{new Date(record.date).toLocaleDateString('th-TH')}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">ผู้จำหน่าย: </span>
                            <span className="text-gray-900">{record.supplier}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">ผู้รับของ: </span>
                            <span className="text-gray-900">{record.receivedBy}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">จำนวนรายการ: </span>
                            <span className="text-gray-900">{record.totalItems} รายการ</span>
                          </div>
                          <div>
                            <span className="text-gray-500">มูลค่ารวม: </span>
                            <span className="text-gray-900 font-semibold">
                              ฿{record.totalValue.toLocaleString('th-TH')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                          <FileText className="w-4 h-4" />
                        </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">เพิ่มรายการสินค้า</h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาสินค้าด้วยรหัสหรือชื่อ..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Quick Add Categories */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-center"
                  >
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    <div className="text-xs text-gray-500 mt-1">เพิ่มรายการใหม่</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={addItemToList}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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

export default HospitalStockIn;