"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Layers,
  Search,
  Calendar,
  Download,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
} from "lucide-react";
import { debounce } from "lodash";

const LotManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editLotData, setEditLotData] = useState<any | null>(null);
  const [newLotFormData, setNewLotFormData] = useState({
    itemId: "",
    id: "",
    quantity: "",
    expiryDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const itemsPerPage = 10;

  // ข้อมูลจำลองสำหรับ Lot
  const lots = Array.from({ length: 50 }, (_, i) => ({
    id: `LOT-${String(i + 1).padStart(3, "0")}`,
    itemId: `ITEM-${String((i % 10) + 1).padStart(3, "0")}`,
    itemName: `สินค้า ${i + 1} ${["Paracetamol", "ผ้าก๊อซ", "เครื่องวัดความดัน", "เครื่องพ่นยา"][i % 4]}`,
    category: ["medicine", "consumable", "equipment", "office"][i % 4],
    unit: ["กล่อง", "แพ็ค", "เครื่อง", "ชิ้น"][i % 4],
    quantity: Math.floor(Math.random() * 100) + 10,
    expiryDate: `202${5 + (i % 5)}-12-31`,
    status: i % 3 === 0 ? "active" : i % 3 === 1 ? "near-expiry" : "expired",
  }));

  // ข้อมูลหมวดหมู่
  const categories = [
    { id: "all", name: "ทุกหมวดหมู่" },
    { id: "medicine", name: "ยาและเวชภัณฑ์", color: "bg-blue-100 text-blue-800" },
    { id: "equipment", name: "อุปกรณ์การแพทย์", color: "bg-green-100 text-green-800" },
    { id: "consumable", name: "วัสดุสิ้นเปลือง", color: "bg-yellow-100 text-yellow-800" },
    { id: "office", name: "วัสดุสำนักงาน", color: "bg-purple-100 text-purple-800" },
  ];

  // ฟังก์ชันสำหรับ badge สถานะ
  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", text: "ใช้งานได้" },
      "near-expiry": { color: "bg-yellow-100 text-yellow-800", text: "ใกล้หมดอายุ" },
      expired: { color: "bg-red-100 text-red-800", text: "หมดอายุ" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  }, []);

  // Debounce การค้นหา
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 300),
    []
  );

  // ฟังก์ชันกรอง Lot
  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const matchesSearch =
        lot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || lot.category === selectedCategory;
      const matchesExpiry = !expiryFilter || lot.expiryDate <= expiryFilter;
      return matchesSearch && matchesCategory && matchesExpiry;
    });
  }, [searchTerm, selectedCategory, expiryFilter, lots]);

  // Pagination
  const totalPages = Math.ceil(filteredLots.length / itemsPerPage);
  const paginatedLots = filteredLots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ฟังก์ชันเพิ่ม/แก้ไข Lot
  const handleSaveLot = useCallback((lotData: any) => {
    if (!lotData.itemId || !lotData.id || !lotData.quantity || !lotData.expiryDate) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (parseInt(lotData.quantity) <= 0) {
      setError("จำนวนต้องมากกว่า 0");
      return;
    }
    console.log(editLotData ? "แก้ไข Lot:" : "เพิ่ม Lot:", lotData);
    handleCloseModal();
    alert(editLotData ? "แก้ไข Lot สำเร็จ" : "เพิ่ม Lot สำเร็จ");
  }, [editLotData]);

  // ฟังก์ชันลบ Lot
  const handleDeleteLot = useCallback((id: string) => {
    if (confirm(`ลบ Lot ${id} ?`)) {
      console.log("ลบ Lot:", id);
    }
  }, []);

  // ฟังก์ชันส่งออก
  const handleExport = useCallback((format: string) => {
    console.log(`ส่งออก Lot เป็น ${format}`);
  }, []);

  const handleOpenModal = (lot: any = null) => {
    setEditLotData(lot);
    setNewLotFormData({
      itemId: lot?.itemId || "",
      id: lot?.id || "",
      quantity: lot?.quantity?.toString() || "",
      expiryDate: lot?.expiryDate || "",
    });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditLotData(null);
    setNewLotFormData({
      itemId: "",
      id: "",
      quantity: "",
      expiryDate: "",
    });
    setError("");
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewLotFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col h-full w-full p-6 bg-gray-50">
      {/* Header และปุ่ม Action */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6 bg-white rounded-lg shadow-sm px-6 py-4 -mx-6 -mt-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
          <span className="flex items-center gap-3">
            <Layers className="w-9 h-9 text-indigo-600" /> จัดการ Lot
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm shadow-md"
          >
            <Download className="w-4 h-4" />
            ส่งออก PDF
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm shadow-md"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม Lot
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัส Lot หรือชื่อสินค้า..."
            onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-sm"
          />
        </div>
        
        <div className="flex-shrink-0 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 appearance-none shadow-sm"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        
        <div className="flex-shrink-0 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={expiryFilter}
            onChange={(e) => {
              setExpiryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-sm"
          />
        </div>
      </div>

      {/* Lot List (Table) */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden flex-grow flex flex-col">
        <div className="relative w-full overflow-auto flex-grow">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr className="[&_th]:px-6 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-gray-600 [&_th]:uppercase [&_th]:tracking-wider">
                <th className="w-[120px]">รหัส Lot</th>
                <th>ชื่อสินค้า</th>
                <th>หมวดหมู่</th>
                <th>จำนวน</th>
                <th>วันหมดอายุ</th>
                <th>สถานะ</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLots.length > 0 ? (
                paginatedLots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{lot.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{lot.itemName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {categories.find((cat) => cat.id === lot.category)?.name || "ไม่ระบุ"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{lot.quantity} {lot.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(lot.expiryDate).toLocaleDateString("th-TH")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(lot.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(lot)}
                          className="p-1.5 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLot(lot.id)}
                          className="p-1.5 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-lg">
                    <div className="flex flex-col items-center justify-center">
                        <Layers className="h-12 w-12 text-gray-300 mb-3" />
                        ไม่พบรายการ Lot ที่ตรงกับที่ค้นหา
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white border-t border-gray-200 p-4 sm:p-6 mt-6 rounded-lg shadow-sm flex items-center justify-between">
        <div className="text-sm text-gray-600">
          แสดง <span className="font-semibold">{paginatedLots.length}</span> จาก <span className="font-semibold">{filteredLots.length}</span> รายการ
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 bg-gray-200 text-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
            title="หน้าก่อนหน้า"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1 text-sm text-gray-700 font-medium">
            หน้า <span className="font-semibold text-indigo-600">{currentPage}</span> จาก <span className="font-semibold">{totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 bg-gray-200 text-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
            title="หน้าถัดไป"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Add/Edit Lot Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editLotData ? "แก้ไข Lot" : "เพิ่ม Lot"}</h3>
              <button
                onClick={handleCloseModal}
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
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveLot(newLotFormData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">สินค้า</label>
                  <select
                    name="itemId"
                    value={newLotFormData.itemId}
                    onChange={handleFormChange}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">เลือกสินค้า</option>
                    {[...new Set(lots.map((lot) => lot.itemId))].map((itemId) => (
                      <option key={itemId} value={itemId}>
                        {lots.find((lot) => lot.itemId === itemId)?.itemName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">รหัส Lot</label>
                  <input
                    type="text"
                    name="id"
                    value={newLotFormData.id}
                    onChange={handleFormChange}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="เช่น LOT-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">จำนวน</label>
                  <input
                    type="number"
                    name="quantity"
                    value={newLotFormData.quantity}
                    onChange={handleFormChange}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="ระบุจำนวน"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันหมดอายุ</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={newLotFormData.expiryDate}
                    onChange={handleFormChange}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                  >
                    {editLotData ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotManagementPage;