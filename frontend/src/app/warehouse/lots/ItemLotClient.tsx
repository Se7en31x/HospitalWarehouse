"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers, Search, Download,
  Wrench, Trash2, Copy,
  ChevronLeft, ChevronRight, ChevronDown, Package,
  MapPin, Tag, X, Save,
  Calendar, ArrowRight,
  TrendingUp, TrendingDown,
  Loader2, Plus, AlertCircle, XCircle, BarChart3,
  ToggleRight, ToggleLeft
} from "lucide-react";

import { socket } from "../../../lib/socket";
import { getLots, getMasterSuppliers, deleteLot, toggleLotStatus, adjustLot } from "@/services/lotservice";
import { getInventoryItems, getWarehousesOptions } from "@/services/itemsService";
import { saveLots } from "@/services/stockInService";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import type * as LotInterface from "@/types/lot_type";
import type * as ItemInterface from "@/types/items_type";
import type * as StockIn from "@/types/stockin_type";

// --- [Types & Interfaces] ---
interface AdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newQty: number, reason: string) => void;
  lot: LotInterface.UiLot | null;
  isAdjusting: boolean;
}

interface LotClientProps {
  initialLots: LotInterface.UiLot[];
  initialItems: ItemInterface.UiItem[];
  initialWarehouses: ItemInterface.Option[];
  initialSuppliers: LotInterface.MasterSupplier[];
}

interface StockinFormData {
  productId: string;
  lotId: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  expiryDate: string;
  warehouseId: string;
  poNumber: string;
  remarks: string;
}

// --- [Helper Functions] ---
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const formatMoney = (val: number): string =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(val);

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const calculateStatus = (expiryDateStr: string | null): string => {
  if (!expiryDateStr) return "ปกติ";
  const now = new Date();
  const expiry = new Date(expiryDateStr);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return "หมดอายุ";
  if (diffDays <= 30) return "ใกล้หมด";
  return "ปกติ";
};

// Helper: Get enriched lot data by joining with master lists is no longer necessary as data comes enriched from API
// We'll just define a pass-through function to prevent any refactor breakage
const getEnrichedLotData = (lot: LotInterface.UiLot) => {
  return {
    itemName: lot.itemName || '-',
    itemCode: lot.itemCode || '-',
    category: lot.category || '-',
    warehouse: lot.warehouse || '-',
    unit: lot.unit || '-',
  };
};

const INITIAL_STOCKIN_FORM: StockinFormData = {
  productId: "",
  lotId: "",
  quantity: 0,
  unit: "",
  costPerUnit: 0,
  expiryDate: "",
  warehouseId: "",
  poNumber: "",
  remarks: ""
};

// --- [Modal Components] ---
const AdjustLotModal = ({ isOpen, onClose, onConfirm, lot, isAdjusting }: AdjustModalProps) => {
  const [newQty, setNewQty] = useState<number>(0);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (isOpen && lot) {
      setNewQty(lot.quantity);
      setReason("");
    }
  }, [isOpen, lot]);

  if (!isOpen || !lot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdjusting) return; // กันกดเบิ้ล
    onConfirm(newQty, reason);
  };

  const diff = newQty - lot.quantity;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        onClick={isAdjusting ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl pointer-events-auto flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Wrench className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">ปรับปรุงยอดคงเหลือ</h2>
                <p className="text-sm text-slate-500 mt-1">อัปเดตยอดสินค้าตาม Stock จริง</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isAdjusting}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Item Info Card */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-500" />
                ข้อมูลพัสดุ
              </h3>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-24 h-24 shrink-0 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                  <Package className="w-10 h-10 text-slate-300" />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-600">ชื่อสินค้า</label>
                    <p className="text-base text-slate-900 font-medium">{lot.itemName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-600">หมวดหมู่</label>
                    <p className="text-base text-slate-900">{lot.category || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-600">ตำแหน่งเก็บ(คลัง)</label>
                    <p className="text-base text-slate-900">{lot.warehouse || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Adjust Quantities Card */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                รายละเอียดการปรับยอด
              </h3>

              <div className="grid grid-cols-[1fr,auto,1fr] gap-6 items-center mb-6">
                <div className="text-center p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="block text-sm font-medium text-slate-500 mb-2">ยอดเดิม</span>
                  <span className="text-3xl font-bold text-slate-700">{lot.quantity.toLocaleString()}</span>
                  <span className="text-sm text-slate-500 ml-2">{lot.unit}</span>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-300" />
                <div className="relative">
                  <span className="absolute -top-3 left-4 bg-white px-2 text-xs font-semibold text-indigo-600 rounded-full border border-indigo-100 shadow-sm z-10">
                    ระบุยอดใหม่
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    value={newQty === 0 && newQty.toString() === "0" ? "" : newQty}
                    onChange={(e) => setNewQty(e.target.value === "" ? 0 : Number(e.target.value))}
                    className="w-full bg-white border-2 border-indigo-100 rounded-xl px-4 py-4 text-center text-3xl font-bold text-indigo-900 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {diff !== 0 ? (
                <div className={`flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl mb-6 ${diff > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                  {diff > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span>ส่วนต่าง: {diff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} {Math.abs(diff).toLocaleString()} {lot.unit}</span>
                </div>
              ) : (
                <div className="text-center text-sm font-medium text-slate-400 py-3 mb-6 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                  ไม่มีการเปลี่ยนแปลงยอด
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  สาเหตุการปรับปรุง <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ระบุสาเหตุ เช่น นับสต็อกใหม่, สินค้าชำรุด, ตัดยอดผิดพลาด..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-shadow shadow-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-8 py-4 flex gap-3 justify-end shrink-0 z-10 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isAdjusting}
              className="px-6 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isAdjusting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-70 min-w-[140px]"
            >
              {isAdjusting ? (
                <> <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก... </>
              ) : (
                <> <Save className="w-4 h-4" /> ยืนยันปรับยอด </>
              )}
            </button>
          </div>
        </form>
      </div >
    </>
  );
};

// =======================
// 2. Main Client Component
// =======================
export default function LotClient({
  initialLots, initialItems, initialWarehouses, initialSuppliers
}: LotClientProps) {

  const [lots, setLots] = useState<LotInterface.UiLot[]>(initialLots);
  const [itemsMaster, setItemsMaster] = useState<ItemInterface.UiItem[]>(initialItems);
  const [warehousesMaster, setWarehousesMaster] = useState<ItemInterface.Option[]>(initialWarehouses);
  const [loading, setLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingLot, setAdjustingLot] = useState<LotInterface.UiLot | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("ทั้งหมด");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"all" | "summary" | "stockin">("all");
  const [stockinForm, setStockinForm] = useState({
    productId: "",
    lotId: "",
    quantity: 0,
    unit: "",
    costPerUnit: 0,
    expiryDate: "",
    warehouseId: "",
    poNumber: "",
    remarks: ""
  });
  const [isSavingStockIn, setIsSavingStockIn] = useState(false);
  const itemsPerPage = 10;

  // Dropdown open states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
    };
    if (isCategoryOpen || isStatusOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [lotsData, itemsData, warehousesData] = await Promise.all([
        getLots(1, 10000),
        getInventoryItems(),
        getWarehousesOptions(),
      ]);

      setLots(lotsData);
      if (itemsData && itemsData.length > 0) setItemsMaster(itemsData);
      if (warehousesData && warehousesData.length > 0) setWarehousesMaster(warehousesData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isItemsMissing = !itemsMaster || itemsMaster.length === 0;
    const isWarehousesMissing = !warehousesMaster || warehousesMaster.length === 0;

    if (isItemsMissing || isWarehousesMissing) {
      console.log("Data missing, fetching...");
      fetchAllData();
    }
  }, []);

  const openAdjustModal = (lot: LotInterface.UiLot) => {
    setAdjustingLot(lot);
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (newQty: number, reason: string) => {
    if (!adjustingLot) return;

    setIsAdjusting(true);

    try {
      const result = await adjustLot(adjustingLot.id, {
        new_quantity: newQty,
        reason: reason,
        user_name: "Admin"
      });

      if (result.success) {
        SweetAlertUtils.success('ปรับยอดสำเร็จ', 'ปรับยอดสินค้าเรียบร้อยแล้ว');
        await fetchAllData();
        setIsAdjustModalOpen(false);
        setAdjustingLot(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      SweetAlertUtils.error('ปรับยอดไม่สำเร็จ', error.message);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleToggleStatus = async (lot: LotInterface.UiLot) => {
    const isCurrentlyActive = lot.status === "ACTIVE";
    const nextActionText = isCurrentlyActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน';

    const confirmResult = await SweetAlertUtils.question(
      `ยืนยันการ${nextActionText}?`,
      `คุณต้องการ${nextActionText} Lot: ${lot.lotCode || lot.id} ใช่หรือไม่?`
    );

    if (confirmResult.isConfirmed) {
      try {
        const updatedLot = await toggleLotStatus(lot.id);
        setLots(prev => prev.map(l => l.id === updatedLot.id ? updatedLot : l));
        SweetAlertUtils.success('สำเร็จ!', `Lot ถูกเปลี่ยนสถานะเป็น ${nextActionText} เรียบร้อยแล้ว`);
      } catch (error: any) {
        SweetAlertUtils.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถทำการเปลี่ยนสถานะได้');
      }
    }
  };

  const handleDelete = async (lot: LotInterface.UiLot) => {
    const confirmResult = await SweetAlertUtils.delete(
      'ยืนยันการยกเลิก?',
      `คุณต้องการยกเลิก Lot: ${lot.lotCode || lot.id} ใช่หรือไม่? สต็อกจะถูกตัดออกตามจำนวนคงเหลือ`
    );

    if (confirmResult.isConfirmed) {
      try {
        await deleteLot(lot.id);
        SweetAlertUtils.success('ยกเลิกสำเร็จ!', 'ข้อมูล Lot ถูกยกเลิกเรียบร้อยแล้ว');
        setLots(prev => prev.filter(l => l.id !== lot.id));
      } catch (error: any) {
        SweetAlertUtils.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถยกเลิกข้อมูลได้');
      }
    }
  };

  const calculateStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return "ปกติ";
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return "หมดอายุ";
    if (diffDays <= 30) return "ใกล้หมด";
    return "ปกติ";
  };

  const filteredData = lots.filter(lot => {
    const currentStatus = calculateStatus(lot.expiryDate);
    const enrichedData = getEnrichedLotData(lot);
    const searchLower = searchTerm.toLowerCase();
    const name = enrichedData.itemName || "";
    const lotCode = lot.lotCode || "";
    const code = enrichedData.itemCode || "";
    const matchesSearch = name.toLowerCase().includes(searchLower) || lotCode.toLowerCase().includes(searchLower) || code.toLowerCase().includes(searchLower);
    const matchesWarehouse = selectedWarehouse === "ทั้งหมด" || enrichedData.warehouse === selectedWarehouse;
    const matchesCategory = selectedCategory === "ทั้งหมด" || enrichedData.category === selectedCategory;
    let matchesStatus = true;
    if (statusFilter === 'NEAR') matchesStatus = currentStatus === 'ใกล้หมด';
    if (statusFilter === 'EXPIRED') matchesStatus = currentStatus === 'หมดอายุ';
    if (statusFilter === 'ACTIVE') matchesStatus = lot.status === 'ACTIVE';
    if (statusFilter === 'INACTIVE') matchesStatus = lot.status !== 'ACTIVE';
    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleStockinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ตรวจสอบข้อมูลจำเป็น
    if (!stockinForm.productId || !stockinForm.lotId || !stockinForm.quantity || !stockinForm.unit || !stockinForm.warehouseId) {
      SweetAlertUtils.warning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลจำเป็นให้ครบถ้วน');
      return;
    }

    // สร้าง popup ยืนยัน
    const confirmResult = await SweetAlertUtils.question(
      'ยืนยันการรับของเข้า?',
      `<div class="text-left" style="text-align:left">
        <p><strong>สินค้า:</strong> ${itemsMaster.find(i => i.id === stockinForm.productId)?.name || '-'}</p>
        <p><strong>Lot:</strong> ${stockinForm.lotId}</p>
        <p><strong>จำนวน:</strong> ${stockinForm.quantity} ${stockinForm.unit}</p>
        <p><strong>ราคาต่อหน่วย:</strong> ${stockinForm.costPerUnit}</p>
        <p><strong>วันหมดอายุ:</strong> ${stockinForm.expiryDate || '-'}</p>
      </div>`
    );

    if (confirmResult.isConfirmed) {
      setIsSavingStockIn(true);
      try {
        // เตรียมข้อมูลสำหรับส่ง API
        const lotData: StockIn.StockInItem = {
          itemId: stockinForm.productId,
          itemName: itemsMaster.find(i => i.id === stockinForm.productId)?.name || '',
          categoryId: itemsMaster.find(i => i.id === stockinForm.productId)?.categoryId || '',
          category: itemsMaster.find(i => i.id === stockinForm.productId)?.category || '',
          poNumber: stockinForm.poNumber,
          quantityOrdered: stockinForm.quantity,
          quantityReceived: stockinForm.quantity,
          unitId: itemsMaster.find(i => i.id === stockinForm.productId)?.unitId || '',
          unit: stockinForm.unit,
          supplierId: "",
          costPrice: stockinForm.costPerUnit,
          mfgDate: "",
          expiryDate: stockinForm.expiryDate,
          warehouseId: stockinForm.warehouseId,
          warehouseName: warehousesMaster.find(w => w.id === stockinForm.warehouseId)?.name || ''
        };

        // เรียก API บันทึก
        await saveLots([lotData]);

        // แสดงข้อความสำเร็จ
        SweetAlertUtils.success('บันทึกสำเร็จ', 'บันทึกข้อมูลสินค้าเข้าเรียบร้อยแล้ว');

        // รีเซตฟอร์ม
        setStockinForm(INITIAL_STOCKIN_FORM);

        // รีโหลดข้อมูล
        await fetchAllData();
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก';
        SweetAlertUtils.error('บันทึกไม่สำเร็จ', errorMsg);
      } finally {
        setIsSavingStockIn(false);
      }
    }
  };

  const handleStockinChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numValue = ['quantity', 'costPerUnit'].includes(name) ? Number(value) : value;
    setStockinForm(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(val);
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">

      <AdjustLotModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={handleConfirmAdjust}
        lot={adjustingLot}
        isAdjusting={isAdjusting}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">ล็อตพัสดุ</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Action buttons can go here */}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
        </div>
        {/* Category Dropdown */}
        <div className="relative" data-filter-category>
          <button
            type="button"
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory === "ทั้งหมด" ? "หมวดหมู่ทั้งหมด" : selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {["ทั้งหมด", ...Array.from(new Set(itemsMaster.map(i => i.category)))].map(c => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(c); setIsCategoryOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {c === "ทั้งหมด" ? "หมวดหมู่ทั้งหมด" : c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-filter-status>
          <button
            type="button"
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{{ ALL: "สถานะทั้งหมด", NEAR: "ใกล้หมดอายุ", EXPIRED: "หมดอายุ", ACTIVE: "ใช้งานได้", INACTIVE: "ระงับการใช้งาน" }[statusFilter] || "สถานะทั้งหมด"}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[{ value: "ALL", label: "สถานะทั้งหมด" }, { value: "NEAR", label: "ใกล้หมดอายุ" }, { value: "EXPIRED", label: "หมดอายุ" }, { value: "ACTIVE", label: "ใช้งานได้" }, { value: "INACTIVE", label: "ระงับการใช้งาน" }].map(s => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => { setStatusFilter(s.value); setIsStatusOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${statusFilter === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Content - Main Lot Management Table */}
      <div className="space-y-6">
        <div 
          className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col"
          style={{ height: '65vh' }}
        >
          {loading && (
            <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
              <div className="animate-spin">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
              </div>
            </div>
          )}
          <div 
            className="flex-1" 
            style={{
              overflowX: 'auto',
              overflowY: 'auto',
              scrollbarWidth: 'auto',
              msOverflowStyle: 'auto',
            } as React.CSSProperties}
          >
            <style>{`
              div::-webkit-scrollbar {
                width: 0;
                height: 8px;
              }
              div::-webkit-scrollbar-track {
                background: #f1f5f9;
              }
              div::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}</style>
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-[60px] text-center">#</th>
                  <th className="px-6 py-4 w-[80px]">รูปภาพ</th>
                  <th className="px-6 py-4 w-[120px]">รหัสสินค้า</th>
                  <th className="px-6 py-4 w-[100px]">รหัส LOT</th>
                  <th className="px-6 py-4 w-[200px]">ชื่อสินค้า</th>
                  <th className="px-6 py-4 w-[150px]">หมวดหมู่</th>
                  <th className="px-6 py-4 w-[120px]">คงเหลือ</th>
                  <th className="px-6 py-4 w-[120px]">วันหมดอายุ</th>
                  <th className="px-6 py-4 w-[120px]">สถานะ</th>
                  <th className="px-6 py-4 text-center w-[120px]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentItems.map((lot, idx) => {
                  const currentStatus = calculateStatus(lot.expiryDate);
                  const enrichedData = getEnrichedLotData(lot);
                  const rowNumber = startIndex + idx + 1;
                  return (
                    <tr key={lot.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-center font-medium text-slate-600">{rowNumber}</td>
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                          <Package className="w-6 h-6 text-slate-400" />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">{enrichedData.itemCode}</td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-600">{lot.lotCode || lot.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 line-clamp-2" title={enrichedData.itemName}>{enrichedData.itemName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{enrichedData.category}</td>
                      <td className="px-6 py-4">{lot.quantity.toLocaleString()} {enrichedData.unit}</td>
                      <td className={`px-6 py-4 ${currentStatus === 'หมดอายุ' ? 'text-red-600' : currentStatus === 'ใกล้หมด' ? 'text-orange-600' : ''}`}>{formatDate(lot.expiryDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${lot.status !== 'ACTIVE' ? 'bg-red-100 text-red-800' : currentStatus === 'ปกติ' ? 'bg-green-100 text-green-800' : currentStatus === 'หมดอายุ' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {lot.status !== 'ACTIVE' ? 'ระงับการใช้งาน' : (currentStatus === 'ปกติ' ? 'ใช้งานได้' : currentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleToggleStatus(lot)} className={`p-2 rounded-lg transition-colors ${lot.status === 'ACTIVE' ? 'text-green-500 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'}`} title={lot.status === 'ACTIVE' ? 'กดเพื่อระงับการใช้งาน' : 'กดเพื่อเปิดใช้งาน'}>
                            {lot.status === 'ACTIVE' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button onClick={() => openAdjustModal(lot)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Wrench className="w-5 h-5" /></button>
                          <button onClick={() => handleDelete(lot)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {currentItems.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10}>
                      <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                        </svg>
                        <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">แสดง {currentItems.length} จาก {filteredData.length} รายการ</p>
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

    </div>
  );
}