"use client";

import React, { useState, useEffect } from "react";
import {
   Search,
  Wrench, Trash2,
  ChevronLeft, ChevronRight, ChevronDown,
  ToggleRight, ToggleLeft, Printer, X
} from "lucide-react";

import { socket } from "../../../lib/socket";
import AdjustQuantityModal from "@/app/warehouse/lots/AdjustQuantityModal";
import { getLots, deleteLot, toggleLotStatus, adjustLot } from "@/services/lotservice";
import { getInventoryItems, getWarehousesOptions } from "@/services/itemsService";
import { saveLots } from "@/services/stockInService";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printLabels, type LabelData } from "@/lib/printLabel";
import type * as LotInterface from "@/types/lot_type";
import type * as ItemInterface from "@/types/items_type";
import type * as StockIn from "@/types/stockin_type";

// --- [Types & Interfaces] ---
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
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingLot, setAdjustingLot] = useState<LotInterface.UiLot | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("ทั้งหมด");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expiryDays, setExpiryDays] = useState(0);
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
  const LOT_PAGE_LIMIT = 10;
  const [selectedItems, setSelectedItems] = useState<Map<string, LabelData>>(new Map());

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);

  // Refs always hold current filter values for re-fetch
  const pageRef = React.useRef(1);
  const searchTermRef = React.useRef("");
  const warehouseRef = React.useRef("ทั้งหมด");
  const categoryRef = React.useRef("ทั้งหมด");
  const statusRef = React.useRef("ALL");
  const expiryDaysRef = React.useRef(0);
  const startDateRef = React.useRef("");
  const endDateRef = React.useRef("");
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropdown open states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isExpiryOpen, setIsExpiryOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
      if (!target.closest("[data-filter-expiry]")) setIsExpiryOpen(false);
    };
    if (isCategoryOpen || isStatusOpen || isExpiryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen, isExpiryOpen]);

  const fetchLotsPage = async (
    page: number,
    search: string,
    warehouse: string,
    category: string,
    status: string,
  ) => {
    setLoading(true);
    try {
      const result = await getLots(page, LOT_PAGE_LIMIT, {
        search: search || undefined,
        warehouse: warehouse !== "ทั้งหมด" ? warehouse : undefined,
        category: category !== "ทั้งหมด" ? category : undefined,
        status: status !== "ALL" ? status : undefined,
        start_date: startDateRef.current || undefined,
        end_date: endDateRef.current || undefined,
        expiry_days: expiryDaysRef.current > 0 ? expiryDaysRef.current : undefined,
      });
      // Sort by status priority first (expired > near expiry > normal), then by createdAt descending
      const getStatusPriority = (lot: LotInterface.UiLot) => {
        const expiryStatus = calculateStatus(lot.expiryDate);
        if (expiryStatus === "หมดอายุ") return 0; // expired - highest priority
        if (expiryStatus === "ใกล้หมด") return 1; // near expiry
        return 2; // normal - lowest priority
      };
      
      const sortedLots = result.items.sort((a, b) => {
        const priorityA = getStatusPriority(a);
        const priorityB = getStatusPriority(b);
        if (priorityA !== priorityB) return priorityA - priorityB; // Sort by status priority
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Then by createdAt descending
      });
      setLots(sortedLots);
      setServerTotal(result.meta.total);
      setServerTotalPages(result.meta.totalPages);
    } catch (error: any) {
      const status_code = error?.status;
      let userMessage = error?.message || 'ไม่ทราบข้อผิดพลาด';
      if (status_code === 401 || status_code === 403) {
        userMessage = 'กรุณาเข้าสู่ระบบก่อน หรือ session หมดอายุ กรุณา Refresh หน้าเว็บ';
      } else if (status_code === 500) {
        userMessage = 'เซิร์ฟเวอร์มีข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      } else if (status_code === 0 || !status_code) {
        userMessage = 'ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบการเชื่อมต่อ';
      }
      console.error("Failed to fetch lots:", error);
      SweetAlertUtils.error('ไม่สามารถโหลดข้อมูลได้', userMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    // Fetch items & warehouses reference data + first page of lots
    try {
      const [itemsData, warehousesData] = await Promise.all([
        getInventoryItems().catch(err => {
          console.error("Failed to fetch items:", err);
          throw { endpoint: '/v1/items', ...err };
        }),
        getWarehousesOptions().catch(err => {
          console.error("Failed to fetch warehouses:", err);
          throw { endpoint: '/v1/warehouses/option', ...err };
        }),
      ]);
      if (itemsData && itemsData.length > 0) setItemsMaster(itemsData);
      if (warehousesData && warehousesData.length > 0) setWarehousesMaster(warehousesData);
    } catch (error: any) {
      const status = error?.status;
      let userMessage = error?.message || 'ไม่ทราบข้อผิดพลาด';
      if (status === 401 || status === 403) userMessage = 'กรุณาเข้าสู่ระบบก่อน หรือ session หมดอายุ กรุณา Refresh หน้าเว็บ';
      else if (status === 500) userMessage = 'เซิร์ฟเวอร์มีข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      else if (status === 0 || !status) userMessage = 'ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบการเชื่อมต่อ';
      console.error("Failed to fetch reference data:", error);
      SweetAlertUtils.error('ไม่สามารถโหลดข้อมูลได้', userMessage);
    }
  };

  useEffect(() => {
    const isItemsMissing = !itemsMaster || itemsMaster.length === 0;
    const isWarehousesMissing = !warehousesMaster || warehousesMaster.length === 0;
    if (isItemsMissing || isWarehousesMissing) fetchAllData();
    // Always fetch page 1 on mount to get server meta
    fetchLotsPage(1, "", "ทั้งหมด", "ทั้งหมด", "ALL");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLotsPageChange = (newPage: number) => {
    setCurrentPage(newPage);
    pageRef.current = newPage;
    fetchLotsPage(newPage, searchTermRef.current, warehouseRef.current, categoryRef.current, statusRef.current);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    searchTermRef.current = value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      pageRef.current = 1;
      fetchLotsPage(1, value, warehouseRef.current, categoryRef.current, statusRef.current);
    }, 300);
  };

  const handleWarehouseFilter = (value: string) => {
    setSelectedWarehouse(value);
    warehouseRef.current = value;
    setCurrentPage(1);
    pageRef.current = 1;
    fetchLotsPage(1, searchTermRef.current, value, categoryRef.current, statusRef.current);
  };

  const handleCategoryFilter = (value: string) => {
    setSelectedCategory(value);
    categoryRef.current = value;
    setCurrentPage(1);
    pageRef.current = 1;
    fetchLotsPage(1, searchTermRef.current, warehouseRef.current, value, statusRef.current);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    statusRef.current = value;
    setCurrentPage(1);
    pageRef.current = 1;
    fetchLotsPage(1, searchTermRef.current, warehouseRef.current, categoryRef.current, value);
  };

  const handleExpiryDaysFilter = (value: number) => {
    setExpiryDays(value);
    expiryDaysRef.current = value;
    setCurrentPage(1);
    pageRef.current = 1;
    fetchLotsPage(1, searchTermRef.current, warehouseRef.current, categoryRef.current, statusRef.current);
  };

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
        await fetchLotsPage(pageRef.current, searchTermRef.current, warehouseRef.current, categoryRef.current, statusRef.current);
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

  // Server already filters; lots is the current page's data
  const filteredData = lots;
  const currentItems = filteredData;

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
        await fetchLotsPage(pageRef.current, searchTermRef.current, warehouseRef.current, categoryRef.current, statusRef.current);
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
    if (newPage >= 1 && newPage <= serverTotalPages) handleLotsPageChange(newPage);
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(val);
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">

      <AdjustQuantityModal
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
          {selectedItems.size > 0 && (
            <button
              onClick={() => printLabels(Array.from(selectedItems.values()))}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์สติกเกอร์ ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
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
                      onClick={() => { handleCategoryFilter(c); setIsCategoryOpen(false); }}
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
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); setIsExpiryOpen(false); }}
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
                      onClick={() => { handleStatusFilter(s.value); setIsStatusOpen(false); }}
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

        {/* Expiry Days Dropdown */}
        <div className="relative" data-filter-expiry>
          <button
            type="button"
            onClick={() => { setIsExpiryOpen(!isExpiryOpen); setIsCategoryOpen(false); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[180px] justify-between"
          >
            <span className="text-slate-800 font-medium">
              {expiryDays === 0 ? "วันหมดอายุ" : `หมดใน ${expiryDays} วัน`}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpiryOpen ? "rotate-180" : ""}`} />
          </button>
          {isExpiryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {[{ value: 0, label: "ทั้งหมด" }, { value: 7, label: "หมดใน 7 วัน" }, { value: 30, label: "หมดใน 30 วัน" }, { value: 60, label: "หมดใน 60 วัน" }, { value: 90, label: "หมดใน 90 วัน" }].map(opt => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => { handleExpiryDaysFilter(opt.value); setIsExpiryOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${expiryDays === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Date range */}
        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          startDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันรับเข้า (เริ่มต้น)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              startDateRef.current = e.target.value;
              setCurrentPage(1); pageRef.current = 1;
              fetchLotsPage(1, searchTermRef.current, warehouseRef.current, categoryRef.current, statusRef.current);
            }}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>
        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          endDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันรับเข้า (สิ้นสุด)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              endDateRef.current = e.target.value;
              setCurrentPage(1); pageRef.current = 1;
              fetchLotsPage(1, searchTermRef.current, warehouseRef.current, categoryRef.current, statusRef.current);
            }}
            onFocus={() => setEndDateFocused(true)}
            onBlur={() => setEndDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>

        {/* Clear filters */}
        {(searchTerm || selectedWarehouse !== "ทั้งหมด" || selectedCategory !== "ทั้งหมด" || statusFilter !== "ALL" || expiryDays !== 0 || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm(""); searchTermRef.current = "";
              setSelectedWarehouse("ทั้งหมด"); warehouseRef.current = "ทั้งหมด";
              setSelectedCategory("ทั้งหมด"); categoryRef.current = "ทั้งหมด";
              setStatusFilter("ALL"); statusRef.current = "ALL";
              setExpiryDays(0); expiryDaysRef.current = 0;
              setStartDate(""); startDateRef.current = "";
              setEndDate(""); endDateRef.current = "";
              setCurrentPage(1); pageRef.current = 1;
              fetchLotsPage(1, "", "ทั้งหมด", "ทั้งหมด", "ALL");
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Content - Main Lot Management Table */}
      <div className="space-y-6">
        <div 
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col"
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
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 w-[44px] text-center">
                    <input
                      type="checkbox"
                      checked={lots.length > 0 && lots.every((l) => selectedItems.has(l.id))}
                      onChange={() => {
                        const allSel = lots.every((l) => selectedItems.has(l.id));
                        setSelectedItems((prev) => {
                          const s = new Map(prev);
                          if (allSel) {
                            lots.forEach((l) => s.delete(l.id));
                          } else {
                            lots.forEach((l) => {
                              const d = getEnrichedLotData(l);
                              s.set(l.id, { name: d.itemName, code: l.lotCode || l.id, subLabel: d.itemCode !== '-' ? d.itemCode : undefined });
                            });
                          }
                          return s;
                        });
                      }}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 w-[140px]">วันที่รับเข้า</th>
                  <th className="px-6 py-4 w-[120px]">รหัสสินค้า</th>
                  <th className="px-6 py-4 w-[100px]">รหัส LOT</th>
                  <th className="px-6 py-4 w-[200px]">ชื่อสินค้า</th>
                  <th className="px-6 py-4 w-[150px]">หมวดหมู่</th>
                  <th className="px-6 py-4 w-[120px]">คงเหลือ</th>
                   <th className="px-6 py-4 w-[120px]">หน่วย</th>
                  <th className="px-6 py-4 w-[120px]">วันหมดอายุ</th>
                  <th className="px-6 py-4 w-[120px]">สถานะ</th>
                  <th className="px-6 py-4 text-center w-[120px]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {currentItems.map((lot, idx) => {
                  const currentStatus = calculateStatus(lot.expiryDate);
                  const enrichedData = getEnrichedLotData(lot);
                  const rowNumber = (currentPage - 1) * LOT_PAGE_LIMIT + idx + 1;
                  return (
                    <tr key={lot.id || idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-2.5 w-[44px] text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(lot.id)}
                          onChange={() => {
                            const d = getEnrichedLotData(lot);
                            setSelectedItems((prev) => {
                              const s = new Map(prev);
                              s.has(lot.id)
                                ? s.delete(lot.id)
                                : s.set(lot.id, { name: d.itemName, code: lot.lotCode || lot.id, subLabel: d.itemCode !== '-' ? d.itemCode : undefined });
                              return s;
                            });
                          }}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-slate-600 line-clamp-2" title={formatDateTime(lot.createdAt)}>{formatDateTime(lot.createdAt)}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-slate-600 line-clamp-2" title={enrichedData.itemCode}>{enrichedData.itemCode}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-slate-600 line-clamp-2" title={lot.lotCode || lot.id}>{lot.lotCode || lot.id}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-slate-600 line-clamp-2" title={enrichedData.itemName}>{enrichedData.itemName}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-slate-600 line-clamp-2" title={enrichedData.category}>{enrichedData.category}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-slate-600 line-clamp-2" title={lot.quantity.toLocaleString()}>{lot.quantity.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="text-slate-600 line-clamp-2" title={enrichedData.unit}>{enrichedData.unit}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <div className={`line-clamp-2 ${currentStatus === 'หมดอายุ' ? 'text-red-600' : currentStatus === 'ใกล้หมด' ? 'text-orange-600' : 'text-slate-600'}`} title={formatDate(lot.expiryDate)}>{formatDate(lot.expiryDate)}</div>
                      </td>
                      <td className="px-6 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${lot.status !== 'ACTIVE' ? 'bg-red-100 text-red-500' : currentStatus === 'ปกติ' ? 'bg-green-100 text-green-500' : currentStatus === 'หมดอายุ' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                          {lot.status !== 'ACTIVE' ? 'ระงับการใช้งาน' : (currentStatus === 'ปกติ' ? 'ใช้งานได้' : currentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-center">
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
                    <td colSpan={11}>
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
          <p className="text-sm text-slate-500">แสดง {currentItems.length} จาก {serverTotal} รายการ</p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">หน้า {currentPage} / {serverTotalPages || 1}</span>
            <button
              disabled={currentPage >= serverTotalPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}