"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Layers,
  Search,
  Calendar,
  Download,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  AlertTriangle,
  Archive,
  Wrench,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { debounce } from "lodash";
import toast, { Toaster } from "react-hot-toast";

// Interfaces
interface Lot {
  id: string;
  itemId: string;
  itemName: string;
  imageUrl: string;
  category: string;
  unit: string;
  quantity: number;
  expiryDate: string;
  status: "active" | "near-expiry" | "expired" | "damaged";
}

interface Category {
  id: string;
  name: string;
  color: string;
  defaultImage: string;
}

interface AdjustmentData {
  quantity: string;
  adjustmentType: "adjust" | "damage" | "expire";
  reason: string;
}

// ฟังก์ชันคำนวณสถานะ Lot ตามวันหมดอายุ
const calculateStatus = (expiryDate: string): Lot["status"] => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "near-expiry";
  return "active";
};

// Mock data
const categories: Category[] = [
  {
    id: "all",
    name: "ทุกหมวดหมู่",
    color: "bg-gray-100 text-gray-800",
    defaultImage: "https://via.placeholder.com/50",
  },
  {
    id: "medicine",
    name: "ยาและเวชภัณฑ์",
    color: "bg-blue-100 text-blue-800",
    defaultImage: "https://via.placeholder.com/50/0000FF/FFFFFF?text=Medicine",
  },
  {
    id: "equipment",
    name: "อุปกรณ์การแพทย์",
    color: "bg-green-100 text-green-800",
    defaultImage: "https://via.placeholder.com/50/008000/FFFFFF?text=Equipment",
  },
  {
    id: "consumable",
    name: "วัสดุสิ้นเปลือง",
    color: "bg-yellow-100 text-yellow-800",
    defaultImage: "https://via.placeholder.com/50/FFFF00/FFFFFF?text=Consumable",
  },
  {
    id: "office",
    name: "วัสดุสำนักงาน",
    color: "bg-purple-100 text-purple-800",
    defaultImage: "https://via.placeholder.com/50/800080/FFFFFF?text=Office",
  },
];

const initialLots: Lot[] = Array.from({ length: 50 }, (_, i) => {
  const expiryDate = `202${5 + (i % 5)}-${String((i % 12) + 1).padStart(2, "0")}-15`;
  const category = ["medicine", "consumable", "equipment", "office"][i % 4];
  const imageUrls = {
    medicine: "https://via.placeholder.com/40?text=ยา",
    consumable: "https://via.placeholder.com/40?text=สิ้นเปลือง",
    equipment: "https://via.placeholder.com/40?text=อุปกรณ์",
    office: "https://via.placeholder.com/40?text=สำนักงาน",
  };
  return {
    id: `LOT-${String(i + 1).padStart(3, "0")}`,
    itemId: `ITEM-${String((i % 10) + 1).padStart(3, "0")}`,
    itemName: `สินค้า ${i + 1} ${["Paracetamol", "ผ้าก๊อซ", "เครื่องวัดความดัน", "เครื่องพ่นยา"][i % 4]}`,
    imageUrl: imageUrls[category as keyof typeof imageUrls] || "https://via.placeholder.com/50",
    category,
    unit: ["กล่อง", "แพ็ค", "เครื่อง", "ชิ้น"][i % 4],
    quantity: Math.floor(Math.random() * 100) + 10,
    expiryDate,
    status: calculateStatus(expiryDate),
  };
});

// StatusBadge Component
const StatusBadge: React.FC<{ status: Lot["status"] }> = ({ status }) => {
  const statusConfig: Record<Lot["status"], { color: string; text: string; icon?: React.ReactNode }> = {
    active: { color: "bg-green-100 text-green-800", text: "ใช้งานได้" },
    "near-expiry": { color: "bg-yellow-100 text-yellow-800", text: "ใกล้หมดอายุ" },
    expired: { color: "bg-red-100 text-red-800", text: "หมดอายุ", icon: <AlertTriangle className="w-3 h-3" /> },
    damaged: { color: "bg-gray-500 text-white", text: "ชำรุด", icon: <X className="w-3 h-3" /> },
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.text}
    </span>
  );
};

// FilterBar Component
const FilterBar: React.FC<{
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  expiryFilter: string;
  setExpiryFilter: (value: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
}> = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, expiryFilter, setExpiryFilter, itemsPerPage, setItemsPerPage }) => {
  const debouncedSetSearchTerm = useCallback(debounce((value: string) => setSearchTerm(value), 300), []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาด้วยรหัส Lot, รหัสสินค้า, หรือชื่อสินค้า..."
          onChange={(e) => debouncedSetSearchTerm(e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          aria-label="ค้นหา Lot"
        />
      </div>
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm"
          aria-label="เลือกหมวดหมู่"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="date"
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          aria-label="เลือกวันหมดอายุ"
        />
      </div>
      <div className="relative">
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 py-2.5 pl-3 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm"
          aria-label="เลือกจำนวนรายการต่อหน้า"
        >
          <option value={8}>8 รายการ/หน้า</option>
          <option value={10}>10 รายการ/หน้า</option>
          <option value={20}>20 รายการ/หน้า</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};

// LotTable Component
const LotTable: React.FC<{
  lots: Lot[];
  categories: Category[];
  handleOpenAdjustModal: (lot: Lot, adjustmentType: AdjustmentData["adjustmentType"]) => void;
  currentPage: number;
  itemsPerPage: number;
}> = ({ lots, categories, handleOpenAdjustModal, currentPage, itemsPerPage }) => (
  <div className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-auto max-h-[calc(100vh-300px)]">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
        <tr className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
          <th className="px-6 py-3 w-[4%]">#</th>
          <th className="px-6 py-3 w-[5%]">รูปภาพ</th>
          <th className="px-6 py-3 w-[11%]">รหัสสินค้า</th>
          <th className="px-6 py-3 w-[11%]">รหัส Lot</th>
          <th className="px-6 py-3 w-[20%]">ชื่อสินค้า</th>
          <th className="px-6 py-3 w-[10%]">หมวดหมู่</th>
          <th className="px-6 py-3 w-[7%]">คงเหลือ</th>
          <th className="px-6 py-3 w-[10%]">วันหมดอายุ</th>
          <th className="px-6 py-3 w-[12%]">สถานะ</th>
          <th className="px-6 py-3 text-center w-[10%]">จัดการ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {lots.length > 0 ? (
          lots.map((lot, index) => (
            <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + index + 1}</td>
              <td className="px-6 py-4">
                <img src={lot.imageUrl} alt={lot.itemName} className="w-10 h-10 rounded-md object-cover" />
              </td>
              <td className="px-6 py-4 font-medium text-gray-900">{lot.itemId}</td>
              <td className="px-6 py-4 font-medium text-gray-900">{lot.id}</td>
              <td className="px-6 py-4">{lot.itemName}</td>
              <td className="px-6 py-4 text-gray-500">
                {categories.find((cat) => cat.id === lot.category)?.name || "ไม่ระบุ"}
              </td>
              <td className="px-6 py-4 font-semibold">
                {lot.quantity} {lot.unit}
              </td>
              <td className="px-6 py-4">
                {new Date(lot.expiryDate).toLocaleDateString("th-TH")}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={lot.status} />
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleOpenAdjustModal(lot, "adjust")}
                    className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                    title="ปรับยอด"
                    aria-label="ปรับยอด"
                  >
                    <Wrench className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenAdjustModal(lot, "damage")}
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                    title="ทำชำรุด"
                    aria-label="ทำชำรุด"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenAdjustModal(lot, "expire")}
                    className="p-1.5 rounded-md text-orange-600 hover:bg-orange-50 transition-colors"
                    title="ทำหมดอายุ"
                    aria-label="ทำหมดอายุ"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={10} className="px-6 py-12 text-center text-gray-500 text-lg">
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
);

// Pagination Component
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}> = ({ currentPage, totalPages, setCurrentPage, totalItems, itemsPerPage }) => {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="bg-white border-t border-gray-200 p-4 sm:p-6 mt-6 rounded-lg shadow-sm flex items-center justify-between">
      <div className="text-sm text-gray-600">
        แสดง <span className="font-semibold">{startIndex}-{endIndex}</span> จาก{" "}
        <span className="font-semibold">{totalItems}</span> รายการ
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 bg-gray-200 text-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-sm text-gray-700 font-medium">
          หน้า <span className="font-semibold text-indigo-600">{currentPage}</span> จาก{" "}
          <span className="font-semibold">{totalPages}</span>
        </div>
        <button
          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 bg-gray-200 text-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
          aria-label="หน้าถัดไป"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// AdjustModal Component
const AdjustModal: React.FC<{
  isOpen: boolean;
  lot: Lot | null;
  adjustmentData: AdjustmentData;
  setAdjustmentData: (data: AdjustmentData) => void;
  error: string;
  setError: (error: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ isOpen, lot, adjustmentData, setAdjustmentData, error, setError, onClose, onSubmit }) => {
  if (!isOpen || !lot) return null;

  const getTitle = () => {
    switch (adjustmentData.adjustmentType) {
      case "adjust":
        return "ปรับยอด Lot";
      case "damage":
        return "ทำรายการชำรุด";
      case "expire":
        return "ทำรายการหมดอายุ";
      default:
        return "จัดการ Lot";
    }
  };

  const isAdjustType = adjustmentData.adjustmentType === "adjust";
  const isDamageType = adjustmentData.adjustmentType === "damage";
  const isExpireType = adjustmentData.adjustmentType === "expire";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">{getTitle()}</h3>
          <button onClick={onClose} className="p-1 text-gray-600 hover:text-gray-800" aria-label="ปิด">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">{error}</div>
        )}
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-b pb-4">
              <img src={lot.imageUrl} alt={lot.itemName} className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="font-semibold text-lg text-gray-900">{lot.itemName}</div>
                <div className="text-sm text-gray-500 mt-1">รหัสสินค้า: <span className="font-medium text-gray-700">{lot.itemId}</span></div>
                <div className="text-sm text-gray-500">รหัส Lot: <span className="font-medium text-gray-700">{lot.id}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">จำนวนคงเหลือปัจจุบัน</label>
                <div className="mt-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-bold">
                  {lot.quantity} {lot.unit}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">วันหมดอายุ</label>
                <div className="mt-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-bold">
                  {new Date(lot.expiryDate).toLocaleDateString("th-TH")}
                </div>
              </div>
            </div>

            {isAdjustType && (
              <div>
                <label className="block text-sm font-medium text-gray-700">จำนวนใหม่</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="number"
                    name="quantity"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                    className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-l-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="กรอกจำนวนใหม่"
                    aria-label="จำนวนใหม่"
                    min="0"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    {lot.unit}
                  </span>
                </div>
              </div>
            )}
            
            {isDamageType && (
              <div>
                <label className="block text-sm font-medium text-gray-700">จำนวนที่ชำรุด</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="number"
                    name="quantity"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                    className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-l-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="กรอกจำนวนที่ชำรุด"
                    aria-label="จำนวนที่ชำรุด"
                    min="1"
                    max={lot.quantity}
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    {lot.unit}
                  </span>
                </div>
              </div>
            )}

            {!isExpireType && (
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  เหตุผลในการปรับยอด
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={3}
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                  placeholder="ระบุเหตุผล (สูงสุด 200 ตัวอักษร)"
                  aria-label="เหตุผลในการปรับยอด"
                  maxLength={200}
                />
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm"
                aria-label="ยกเลิก"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                aria-label="บันทึกการปรับยอด"
              >
                บันทึก
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Component
const LotManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [lotToAdjust, setLotToAdjust] = useState<Lot | null>(null);
  const [adjustmentData, setAdjustmentData] = useState<AdjustmentData>({
    quantity: "",
    adjustmentType: "adjust",
    reason: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [error, setError] = useState("");
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [isLoading, setIsLoading] = useState(false);

  const filteredLots = useMemo(() => {
    setIsLoading(true);
    const result = lots.filter((lot) => {
      const matchesSearch =
        lot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || lot.category === selectedCategory;
      const matchesExpiry = !expiryFilter || lot.expiryDate <= expiryFilter;
      return matchesSearch && matchesCategory && matchesExpiry;
    });
    setTimeout(() => setIsLoading(false), 300);
    return result;
  }, [searchTerm, selectedCategory, expiryFilter, lots]);

  const totalPages = Math.ceil(filteredLots.length / itemsPerPage);
  const paginatedLots = useMemo(
    () => filteredLots.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredLots, currentPage, itemsPerPage]
  );

  const validateAdjustment = useCallback(() => {
    if (adjustmentData.adjustmentType === "adjust") {
      const qty = parseInt(adjustmentData.quantity);
      if (isNaN(qty) || qty < 0) {
        setError("จำนวนต้องมากกว่าหรือเท่ากับ 0");
        return false;
      }
    } else if (adjustmentData.adjustmentType === "damage") {
      const damageQty = parseInt(adjustmentData.quantity);
      if (isNaN(damageQty) || damageQty <= 0) {
        setError("กรุณาระบุจำนวนที่ชำรุดให้ถูกต้อง");
        return false;
      }
      if (damageQty > (lotToAdjust?.quantity || 0)) {
        setError("จำนวนที่ชำรุดต้องไม่เกินจำนวนคงเหลือปัจจุบัน");
        return false;
      }
    }
    if (!adjustmentData.reason.trim() && adjustmentData.adjustmentType !== "expire") {
      setError("กรุณาระบุเหตุผล");
      return false;
    }
    return true;
  }, [adjustmentData, lotToAdjust]);

  const handleAdjustLot = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!lotToAdjust || !validateAdjustment()) return;

      setLots((prev) =>
        prev.map((lot) => {
          if (lot.id === lotToAdjust.id) {
            let newQuantity = lot.quantity;
            let newStatus = lot.status;

            if (adjustmentData.adjustmentType === "adjust") {
              newQuantity = parseInt(adjustmentData.quantity);
              newStatus = calculateStatus(lot.expiryDate);
            } else if (adjustmentData.adjustmentType === "damage") {
              const damagedQty = parseInt(adjustmentData.quantity);
              newQuantity = lot.quantity - damagedQty;
              newStatus = newQuantity <= 0 ? "damaged" : lot.status;
            } else if (adjustmentData.adjustmentType === "expire") {
              newQuantity = 0;
              newStatus = "expired";
            }

            return { ...lot, quantity: newQuantity, status: newStatus };
          }
          return lot;
        })
      );

      handleCloseAdjustModal();
      toast.success("ปรับปรุง Lot สำเร็จ");
    },
    [lotToAdjust, adjustmentData]
  );

  const handleOpenAdjustModal = useCallback((lot: Lot, adjustmentType: AdjustmentData["adjustmentType"]) => {
    setLotToAdjust(lot);
    setAdjustmentData({
      quantity: adjustmentType === "adjust" || adjustmentType === "damage" ? lot.quantity.toString() : "",
      adjustmentType,
      reason: "",
    });
    setError(""); // ล้าง error เมื่อเปิด Modal
    setIsAdjustModalOpen(true);
  }, []);

  const handleCloseAdjustModal = useCallback(() => {
    setIsAdjustModalOpen(false);
    setLotToAdjust(null);
    setAdjustmentData({ quantity: "", adjustmentType: "adjust", reason: "" });
    setError("");
  }, []);

  const handleExport = useCallback(() => {
    const csvContent = [
      ["รหัสสินค้า", "รหัส Lot", "ชื่อสินค้า", "หมวดหมู่", "จำนวน", "วันหมดอายุ", "สถานะ"],
      ...filteredLots.map((lot) => [
        lot.itemId,
        lot.id,
        lot.itemName,
        categories.find((cat) => cat.id === lot.category)?.name || "ไม่ระบุ",
        `${lot.quantity} ${lot.unit}`,
        new Date(lot.expiryDate).toLocaleDateString("th-TH"),
        lot.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lot_export.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("ส่งออกข้อมูลเป็น CSV สำเร็จ");
  }, [filteredLots]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" reverseOrder={false} />
      <header className="flex items-center justify-between mb-6 bg-white rounded-lg shadow-sm p-6 -mx-6 -mt-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Layers className="w-8 h-8 text-indigo-600" />
          จัดการ Lot
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
            aria-label="ส่งออก CSV"
          >
            <Download className="w-4 h-4" />
            ส่งออก CSV
          </button>
        </div>
      </header>

      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        selectedCategory={selectedCategory}
        setSelectedCategory={(value) => {
          setSelectedCategory(value);
          setCurrentPage(1);
        }}
        expiryFilter={expiryFilter}
        setExpiryFilter={(value) => {
          setExpiryFilter(value);
          setCurrentPage(1);
        }}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
      />

      <div className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden flex-grow">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">กำลังโหลด...</p>
          </div>
        ) : (
          <LotTable
            lots={paginatedLots}
            categories={categories}
            handleOpenAdjustModal={handleOpenAdjustModal}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        totalItems={filteredLots.length}
        itemsPerPage={itemsPerPage}
      />

      <AdjustModal
        isOpen={isAdjustModalOpen}
        lot={lotToAdjust}
        adjustmentData={adjustmentData}
        setAdjustmentData={setAdjustmentData}
        error={error}
        setError={setError}
        onClose={handleCloseAdjustModal}
        onSubmit={handleAdjustLot}
      />
    </div>
  );
};

export default LotManagementPage;