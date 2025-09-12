"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ShoppingCart,
  Search,
  Calendar,
  Download,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { debounce } from "lodash";

const PurchaseRequestPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [cartItems, setCartItems] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [quantities, setQuantities] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const itemsPerPage = 10;

  // ข้อมูลจำลองสำหรับสินค้าในคลัง (50 รายการ รวม Lot)
  const availableItems = Array.from({ length: 50 }, (_, i) => ({
    id: `ITEM-${String(i + 1).padStart(3, "0")}`,
    name: `สินค้า ${i + 1} ${["Paracetamol", "ผ้าก๊อซ", "เครื่องวัดความดัน", "เครื่องพ่นยา"][i % 4]}`,
    category: ["medicine", "consumable", "equipment", "office"][i % 4],
    unit: ["กล่อง", "แพ็ค", "เครื่อง", "ชิ้น"][i % 4],
    lots: [
      {
        lotId: `LOT-${String(i + 1).padStart(3, "0")}`,
        quantity: Math.floor(Math.random() * 100) + 10,
        expiryDate: `202${5 + (i % 5)}-12-31`,
      },
    ],
  }));

  // ข้อมูลจำลองสำหรับคำขอสั่งซื้อ
  const purchaseRequests = [
    {
      id: "PR-2025-001",
      date: "2025-09-10",
      department: "คลังกลาง",
      requester: "นางสาว สายใจ สุขดี",
      items: [
        { id: "ITEM-001", name: "Paracetamol 500mg", category: "medicine", lotId: "LOT-001", quantity: 20, unit: "กล่อง" },
        { id: "ITEM-002", name: "ผ้าก๊อซ", category: "consumable", lotId: "LOT-002", quantity: 10, unit: "แพ็ค" },
      ],
      totalItems: 30,
      totalValue: 3500,
      status: "pending",
    },
    {
      id: "PR-2025-002",
      date: "2025-09-11",
      department: "แผนกศัลยกรรม",
      requester: "นาย สมศักดิ์ รักดี",
      items: [
        { id: "ITEM-003", name: "เครื่องพ่นยา", category: "equipment", lotId: "LOT-003", quantity: 2, unit: "เครื่อง" },
      ],
      totalItems: 2,
      totalValue: 5000,
      status: "approved",
    },
  ];

  // ข้อมูลหมวดหมู่
  const categories = [
    { id: "medicine", name: "ยาและเวชภัณฑ์", color: "bg-blue-100 text-blue-800" },
    { id: "equipment", name: "อุปกรณ์การแพทย์", color: "bg-green-100 text-green-800" },
    { id: "consumable", name: "วัสดุสิ้นเปลือง", color: "bg-yellow-100 text-yellow-800" },
    { id: "office", name: "วัสดุสำนักงาน", color: "bg-purple-100 text-purple-800" },
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
  const getStatusBadge = useCallback((status) => {
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
  }, []);

  // Debounce การค้นหาสินค้า
  const debouncedSetItemSearch = useCallback(
    debounce((value) => {
      setItemSearch(value);
      setCurrentPage(1);
    }, 300),
    []
  );

  // ฟังก์ชันกรองสินค้า
  const filteredItems = useMemo(() => {
    return availableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.id.toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [itemSearch, availableItems]);

  // Pagination
  const totalPages = Math.ceil(
    filteredItems.reduce((acc, item) => acc + item.lots.length, 0) / itemsPerPage
  );
  const paginatedItems = useMemo(() => {
    const flatItems = filteredItems.flatMap((item) =>
      item.lots.map((lot) => ({ ...item, lotId: lot.lotId, lotQuantity: lot.quantity, expiryDate: lot.expiryDate }))
    );
    return flatItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredItems, currentPage]);

  // ฟังก์ชันเพิ่มสินค้าลงตะกร้า
  const handleAddItems = useCallback(() => {
    const selectedItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [itemId, lotId] = key.split("-");
        const item = availableItems.find((i) => i.id === itemId);
        const lot = item.lots.find((l) => l.lotId === lotId);
        return { ...item, lotId, quantity: parseInt(qty), expiryDate: lot.expiryDate };
      });

    if (selectedItems.length === 0) {
      setError("กรุณาระบุจำนวนสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    let hasError = false;
    selectedItems.forEach((item) => {
      const lot = availableItems.find((i) => i.id === item.id).lots.find((l) => l.lotId === item.lotId);
      if (item.quantity > lot.quantity) {
        setError(`จำนวน ${item.name} (Lot ${item.lotId}) เกินสต็อก (${lot.quantity} ${item.unit})`);
        hasError = true;
      }
    });

    if (!hasError) {
      setCartItems((prev) => [...prev, ...selectedItems]);
      setQuantities({});
      setItemSearch("");
      setCurrentPage(1);
      setError("");
      setIsAddModalOpen(false);
      alert(`${selectedItems.length} รายการถูกเพิ่มลงตะกร้า`);
    }
  }, [quantities, availableItems]);

  // ฟังก์ชันลบสินค้าจากตะกร้า
  const handleRemoveItem = useCallback((index) => {
    const item = cartItems[index];
    if (confirm(`ลบ ${item.name} (Lot ${item.lotId}) ออกจากตะกร้า?`)) {
      setCartItems((prev) => prev.filter((_, i) => i !== index));
    }
  }, [cartItems]);

  // ฟังก์ชันยื่นคำขอ
  const handleSubmitRequest = useCallback(() => {
    if (cartItems.length === 0) {
      alert("ตะกร้าว่าง กรุณาเพิ่มสินค้าก่อน");
      return;
    }
    console.log("ยื่นคำขอสั่งซื้อ:", cartItems);
    alert("คำขอสั่งซื้อถูกส่งไปยังฝ่ายจัดซื้อ");
    setCartItems([]);
    setIsCartModalOpen(false);
  }, [cartItems]);

  // ฟังก์ชันกรองคำขอ
  const filteredRequests = useMemo(() => {
    return purchaseRequests.filter((req) => {
      const matchesSearch =
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requester.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || req.status === selectedStatus;
      const matchesDate =
        (!dateRange.start || req.date >= dateRange.start) &&
        (!dateRange.end || req.date <= dateRange.end);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [searchTerm, selectedStatus, dateRange]);

  // ฟังก์ชันส่งออก
  const handleExport = useCallback((format) => {
    console.log(`ส่งออกรายการคำขอสั่งซื้อเป็น ${format}`);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ระบบขอสั่งซื้อ</h1>
                <p className="text-xs text-gray-600">สร้างและจัดการคำขอสั่งซื้อไปยังฝ่ายจัดซื้อ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                เพิ่มคำขอ
              </button>
              <button
                onClick={() => setIsCartModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                ตะกร้า ({cartItems.length})
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                ส่งออก PDF
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

        {/* Request List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-base font-semibold text-gray-900">รายการคำขอสั่งซื้อ</h2>
          </div>
          <div className="divide-y divide-gray-200" style={{ maxHeight: "390px", overflowY: "auto" }}>
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
                          <span className="text-gray-500">จำนวนรายการ: </span>
                          <span className="text-gray-900">{req.totalItems} รายการ</span>
                        </div>
                        <div>
                          <span className="text-gray-500">มูลค่ารวม: </span>
                          <span className="text-gray-900 font-semibold">
                            ฿{req.totalValue.toLocaleString("th-TH")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => console.log(`ดูรายละเอียด ${req.id}`, req)}
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
                <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-2">ไม่มีคำขอสั่งซื้อ</h3>
                <p className="text-sm text-gray-600">ไม่มีคำขอที่ตรงกับเงื่อนไขการค้นหา</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">เพิ่มสินค้าลงคำขอ</h3>
              <button
                onClick={() => {
                  setQuantities({});
                  setItemSearch("");
                  setCurrentPage(1);
                  setError("");
                  setIsAddModalOpen(false);
                }}
                className="p-1 text-gray-600 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาสินค้าด้วยชื่อหรือรหัส..."
                  onChange={(e) => debouncedSetItemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">รหัส</th>
                    <th className="px-4 py-3">ชื่อสินค้า</th>
                    <th className="px-4 py-3">หมวดหมู่</th>
                    <th className="px-4 py-3">Lot</th>
                    <th className="px-4 py-3">วันหมดอายุ</th>
                    <th className="px-4 py-3">สต็อก</th>
                    <th className="px-4 py-3">หน่วย</th>
                    <th className="px-4 py-3">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((item) => (
                      <tr key={`${item.id}-${item.lotId}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{item.id}</td>
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${
                              categories.find((cat) => cat.id === item.category)?.color
                            }`}
                          >
                            {categories.find((cat) => cat.id === item.category)?.name || "ไม่ระบุ"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{item.lotId}</td>
                        <td className="px-4 py-3">{new Date(item.expiryDate).toLocaleDateString("th-TH")}</td>
                        <td className="px-4 py-3">{item.lotQuantity}</td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={quantities[`${item.id}-${item.lotId}`] || ""}
                            onChange={(e) =>
                              setQuantities({
                                ...quantities,
                                [`${item.id}-${item.lotId}`]: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-gray-600">
                        ไม่พบสินค้าที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-200 text-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-gray-200 text-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setQuantities({});
                    setItemSearch("");
                    setCurrentPage(1);
                    setError("");
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddItems}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                >
                  เพิ่ม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {isCartModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">ตะกร้าสินค้า</h3>
              <button
                onClick={() => setIsCartModalOpen(false)}
                className="p-1 text-gray-600 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {cartItems.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto" style={{ maxHeight: "400px" }}>
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">สินค้า</th>
                        <th className="px-4 py-3">หมวดหมู่</th>
                        <th className="px-4 py-3">Lot</th>
                        <th className="px-4 py-3">จำนวน</th>
                        <th className="px-4 py-3">หน่วย</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{item.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs ${
                                categories.find((cat) => cat.id === item.category)?.color
                              }`}
                            >
                              {categories.find((cat) => cat.id === item.category)?.name || "ไม่ระบุ"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{item.lotId}</td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3">{item.unit}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsCartModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    ปิด
                  </button>
                  <button
                    onClick={handleSubmitRequest}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                  >
                    ยื่นคำขอ
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">ตะกร้าว่าง</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequestPage;