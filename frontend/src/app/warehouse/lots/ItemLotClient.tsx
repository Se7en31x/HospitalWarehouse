"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers, Search, Download,
  Wrench, Trash2, Copy,
  ChevronLeft, ChevronRight, Package,
  MapPin, Tag, X, Save,
  Calendar, ArrowRight,
  TrendingUp, TrendingDown,
  Loader2, Plus, AlertCircle, XCircle, BarChart3,
  ToggleRight, ToggleLeft
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";

import { socket } from "../../../lib/socket";
import { getLots, getMasterSuppliers, deleteLot, toggleLotStatus, adjustLot } from "@/services/lotservice";
import { getInventoryItems, getWarehousesOptions } from "@/services/itemsService";
import { saveLots } from "@/services/stockInService"; 
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
  // Get initial data first - we'll pass enriched data via component props later
  const itemsMaster: ItemInterface.UiItem[] = [];
  const warehousesMaster: ItemInterface.Option[] = [];

  useEffect(() => {
    if (isOpen && lot) {
      setNewQty(lot.quantity);
      setReason("");
    }
  }, [isOpen, lot]);

  if (!isOpen || !lot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdjusting) return; // ✅ กันกดเบิ้ล
    onConfirm(newQty, reason);
  };

  const diff = newQty - lot.quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex justify-between items-center text-white shadow-md">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5" /> ปรับปรุงยอดคงเหลือ (Stock Adjust)
          </h2>
          {/* ✅ Disable ปุ่มปิดขณะบันทึก */}
          <button onClick={onClose} disabled={isAdjusting} className="hover:bg-white/20 p-1.5 rounded-full transition duration-200 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-blue-900 shadow-sm border border-blue-100 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base line-clamp-1">{lot.itemName}</h3>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono">Lot: {lot.lotCode || lot.id}</span>
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{lot.warehouse}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="block text-xs text-gray-500 mb-1">ยอดเดิม</span>
              <span className="text-xl font-bold text-gray-700">{lot.quantity.toLocaleString()}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="relative">
              <span className="absolute -top-2.5 left-2 bg-white px-1 text-xs font-medium text-blue-700">ยอดใหม่</span>
              <input required type="number" min="0" value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} className="w-full border-2 border-blue-100 rounded-lg px-3 py-3 text-center text-xl font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
            </div>
          </div>
          {diff !== 0 ? (
             <div className={`flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg ${diff > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {diff > 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                <span>{diff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} {Math.abs(diff).toLocaleString()} {lot.unit}</span>
             </div>
          ) : (
             <div className="text-center text-sm text-gray-400 py-2">ยังไม่มีการเปลี่ยนแปลงยอด</div>
          )}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">สาเหตุการปรับปรุง <span className="text-red-500">*</span></label>
              <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุสาเหตุ เช่น นับสต็อกใหม่, สินค้าชำรุด, ตัดยอดผิด..." className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow" />
          </div>
          <div className="flex gap-3 mt-2 pt-2">
            <button type="button" onClick={onClose} disabled={isAdjusting} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">ยกเลิก</button>
            
            {/* ✅ ปุ่ม Submit กันเบิ้ล */}
            <button type="submit" disabled={isAdjusting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-md transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                {isAdjusting ? (
                    <> <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก... </>
                ) : (
                    <> <Save className="w-4 h-4" /> บันทึกผล </>
                )}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  const fetchAllData = async () => {
    setLoading(true);
    try {
        const [lotsData, itemsData, warehousesData] = await Promise.all([
            getLots(1, 100),
            getInventoryItems(),
            getWarehousesOptions(),
        ]);

        setLots(lotsData);
        if(itemsData && itemsData.length > 0) setItemsMaster(itemsData);
        if(warehousesData && warehousesData.length > 0) setWarehousesMaster(warehousesData);
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
            await fetchAllData();
            setIsAdjustModalOpen(false);
            setAdjustingLot(null);
            Swal.fire({ icon: 'success', title: 'ปรับยอดสำเร็จ', text: `ปรับยอดสินค้าเรียบร้อยแล้ว`, timer: 1500, showConfirmButton: false });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        Swal.fire({ icon: 'error', title: 'ปรับยอดไม่สำเร็จ', text: error.message });
    } finally {
        setIsAdjusting(false);
    }
  };

  const handleToggleStatus = async (lot: LotInterface.UiLot) => {
    const isCurrentlyActive = lot.status === "ACTIVE";
    const nextActionText = isCurrentlyActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน';
    
    const confirmResult = await Swal.fire({
        title: `ยืนยันการ${nextActionText}?`,
        text: `คุณต้องการ${nextActionText} Lot: ${lot.lotCode || lot.id} ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: isCurrentlyActive ? '#f59e0b' : '#10b981', // Amber/Green
        cancelButtonColor: '#64748b',
        confirmButtonText: `ยืนยันการ${nextActionText}`,
        cancelButtonText: 'ย้อนกลับ'
    });

    if (confirmResult.isConfirmed) {
        Swal.showLoading();
        try {
            const updatedLot = await toggleLotStatus(lot.id);
            // Replace the updated lot inside the state array
            setLots(prev => prev.map(l => l.id === updatedLot.id ? updatedLot : l));
            Swal.fire('สำเร็จ!', `Lot ถูกเปลี่ยนสถานะเป็น ${nextActionText} เรียบร้อยแล้ว`, 'success');
        } catch (error: any) {
            Swal.fire('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถทำการเปลี่ยนสถานะได้', 'error');
        }
    }
  };

  const handleDelete = async (lot: LotInterface.UiLot) => {
    const confirmResult = await Swal.fire({
        title: 'ยืนยันการยกเลิก?',
        text: `คุณต้องการยกเลิก Lot: ${lot.lotCode || lot.id} ใช่หรือไม่? สต็อกจะถูกตัดออกตามจำนวนคงเหลือ`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ยกเลิกข้อมูล (Soft Delete)',
        cancelButtonText: 'ย้อนกลับ'
    });

    if (confirmResult.isConfirmed) {
        Swal.showLoading();
        try {
            await deleteLot(lot.id);
            setLots(prev => prev.filter(l => l.id !== lot.id));
            Swal.fire('ยกเลิกสำเร็จ!', 'ข้อมูล Lot ถูกยกเลิกเรียบร้อยแล้ว', 'success');
        } catch (error: any) {
            Swal.fire('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถยกเลิกข้อมูลได้', 'error');
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
    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleStockinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ตรวจสอบข้อมูลจำเป็น
    if (!stockinForm.productId || !stockinForm.lotId || !stockinForm.quantity || !stockinForm.unit || !stockinForm.warehouseId) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกข้อมูลจำเป็นให้ครบถ้วน'
      });
      return;
    }

    // สร้าง popup ยืนยัน
    const confirmResult = await Swal.fire({
      title: 'ยืนยันการรับของเข้า?',
      html: `
        <div className="text-left">
          <p><strong>สินค้า:</strong> ${itemsMaster.find(i => i.id === stockinForm.productId)?.name || '-'}</p>
          <p><strong>Lot:</strong> ${stockinForm.lotId}</p>
          <p><strong>จำนวน:</strong> ${stockinForm.quantity} ${stockinForm.unit}</p>
          <p><strong>ราคาต่อหน่วย:</strong> ${stockinForm.costPerUnit}</p>
          <p><strong>วันหมดอายุ:</strong> ${stockinForm.expiryDate || '-'}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยันบันทึก',
      cancelButtonText: 'ยกเลิก'
    });

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
          barcode: "",
          warehouseId: stockinForm.warehouseId,
          warehouseName: warehousesMaster.find(w => w.id === stockinForm.warehouseId)?.name || ''
        };
        
        // เรียก API บันทึก
        await saveLots([lotData]);
        
        // แสดงข้อความสำเร็จ
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: 'บันทึกข้อมูลสินค้าเข้าเรียบร้อยแล้ว',
          timer: 1500,
          showConfirmButton: false
        });
        
        // รีเซตฟอร์ม
        setStockinForm(INITIAL_STOCKIN_FORM);
        
        // รีโหลดข้อมูล
        await fetchAllData();
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก';
        Swal.fire({
          icon: 'error',
          title: 'บันทึกไม่สำเร็จ',
          text: errorMsg
        });
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
      <Toaster position="top-right" />

      <AdjustLotModal 
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={handleConfirmAdjust}
        lot={adjustingLot}
        isAdjusting={isAdjusting}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">ล็อตพัสดุ</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold flex items-center gap-2 shadow-md">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
        </div>
        <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="ทั้งหมด">ทุกหมวดหมู่</option>
          {Array.from(new Set(itemsMaster.map(i => i.category))).map(catName => <option key={catName} value={catName}>{catName}</option>)}
        </select>
        <select value={selectedWarehouse} onChange={(e) => { setSelectedWarehouse(e.target.value); setCurrentPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="ทั้งหมด">ทุกคลัง</option>
          {warehousesMaster.map((wh) => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="ALL">ทุกสถานะ</option>
          <option value="NEAR">ใกล้หมดอายุ</option>
          <option value="EXPIRED">หมดอายุ</option>
        </select>
      </div>

      {/* Content - Main Lot Management Table */}
      <div className="space-y-6">
      <div className="h-[60vh] rounded-xl bg-white shadow-lg overflow-hidden relative border border-slate-100">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-900" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4">ชื่อสินค้า</th>
                <th className="px-6 py-4">รหัส</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">เลข Lot</th>
                <th className="px-6 py-4">คลังสินค้า</th>
                <th className="px-6 py-4 text-center">วันหมดอายุ</th>
                <th className="px-6 py-4 text-center">ราคา</th>
                <th className="px-6 py-4 text-center">คงเหลือ</th>
                <th className="px-6 py-4 text-center">สถานะอายุ</th>
                <th className="px-6 py-4 text-center">สถานะคลัง</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentItems.map((lot, idx) => {
                const currentStatus = calculateStatus(lot.expiryDate);
                const enrichedData = getEnrichedLotData(lot);
                return (
                  <tr key={lot.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                        <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span>{enrichedData.itemName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono">{enrichedData.itemCode}</span>
                    </td>
                    <td className="px-6 py-4"><span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs">{enrichedData.category}</span></td>
                    <td className="px-6 py-4 font-mono">{lot.lotCode || lot.id}</td>
                    <td className="px-6 py-4">{enrichedData.warehouse}</td>
                    <td className={`px-6 py-4 text-center ${currentStatus === 'หมดอายุ' ? 'text-red-600' : currentStatus === 'ใกล้หมด' ? 'text-orange-600' : ''}`}>{formatDate(lot.expiryDate)}</td>
                    <td className="px-6 py-4 text-center font-mono">{formatMoney(lot.cost)}</td>
                    <td className="px-6 py-4 text-center">{lot.quantity.toLocaleString()} {enrichedData.unit}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${currentStatus === 'ปกติ' ? 'bg-green-100 text-green-800' : currentStatus === 'หมดอายุ' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {currentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${lot.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {lot.status === 'ACTIVE' ? 'ใช้งานได้' : 'ระงับการใช้งาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 items-center">
                        <button onClick={() => handleToggleStatus(lot)} className={`p-2 rounded-lg transition-colors ${lot.status === 'ACTIVE' ? 'text-green-500 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'}`} title={lot.status === 'ACTIVE' ? 'กดเพื่อระงับการใช้งาน' : 'กดเพื่อเปิดใช้งาน'}>
                           {lot.status === 'ACTIVE' ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button onClick={() => openAdjustModal(lot)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Wrench className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(lot)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {currentItems.length === 0 && !loading && (
                <tr>
                  <td colSpan={13}>
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
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      </div>

    </div>
  );
}