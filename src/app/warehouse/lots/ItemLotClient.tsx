"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Wrench,
  ChevronLeft, ChevronRight, ChevronDown,
  ToggleRight, ToggleLeft, Printer, X
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import { socket } from "../../../lib/socket";
import AdjustQuantityModal from "@/app/warehouse/lots/AdjustQuantityModal";
import { getLots, toggleLotStatus, adjustLot } from "@/services/lotservice";
import { getInventoryItems, getWarehousesOptions } from "@/services/itemsService";
import { getSystemSettings } from "@/services/settingsService";
import { saveLots } from "@/services/stockInService";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printLabels, type LabelData } from "@/lib/printLabel";
import type * as LotInterface from "@/types/lot_type";
import type * as ItemInterface from "@/types/items_type";
import type * as StockIn from "@/types/stockin_type";
import { fmtDate, fmtDateTime } from "@/utils/dateUtils";

// --- [Types & Interfaces] ---
interface LotClientProps {
  initialLots: LotInterface.UiLot[];
  initialItems: ItemInterface.UiItem[];
  initialWarehouses: ItemInterface.Option[];
  initialSuppliers: LotInterface.MasterSupplier[];
  /** จาก GET /v1/settings → notify_expiring_days (แจ้งเตือนล็อตหมดอายุล่วงหน้ากี่วัน) */
  initialNotifyExpiringDays?: number;
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

const LOT_PAGE_LIMIT = 10;

// =======================
// 2. Main Client Component
// =======================
export default function LotClient({
  initialLots,
  initialItems,
  initialWarehouses,
  initialSuppliers,
  initialNotifyExpiringDays = 30,
}: LotClientProps) {

  const nearExpiryThresholdRef = React.useRef(
    Math.max(0, Math.min(3650, Number(initialNotifyExpiringDays) || 30))
  );

  const [allLots, setAllLots] = useState<LotInterface.UiLot[]>(initialLots);
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
  const [expiryDays, setExpiryDays] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"all" | "summary" | "stockin">("all");
  const [stockinForm, setStockinForm] = useState<StockinFormData>(INITIAL_STOCKIN_FORM);
  const [isSavingStockIn, setIsSavingStockIn] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, LabelData>>(new Map());

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);

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

  const calculateStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return "ปกติ";
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    const threshold = nearExpiryThresholdRef.current;
    if (diffDays < 0) return "หมดอายุ";
    if (diffDays <= threshold) return "ใกล้หมด";
    return "ปกติ";
  };

  // โหลดข้อมูลทั้งหมดมาครั้งเดียว แล้วทำ filter + pagination ใน client
  const fetchAllLots = async () => {
    setLoading(true);
    try {
      const result = await getLots(1, 9999);
      const sortedLots = [...result.items].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setAllLots(sortedLots);
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
    const boot = async () => {
      try {
        const settings = await getSystemSettings();
        const raw = settings?.notify_expiring_days?.value;
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          nearExpiryThresholdRef.current = Math.max(0, Math.min(3650, n));
        }
      } catch {
        /* keep SSR / default threshold */
      }

      const isItemsMissing = !itemsMaster || itemsMaster.length === 0;
      const isWarehousesMissing = !warehousesMaster || warehousesMaster.length === 0;
      if (isItemsMissing || isWarehousesMissing) await fetchAllData();
      await fetchAllLots();
    };
    void boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- [Client-side Filtering] ---
  const filteredLots = allLots.filter((lot) => {
    const keyword = searchTerm.toLowerCase();
    const enriched = getEnrichedLotData(lot);

    const matchesSearch = !keyword ||
      enriched.itemName.toLowerCase().includes(keyword) ||
      enriched.itemCode.toLowerCase().includes(keyword) ||
      (lot.lotCode || '').toLowerCase().includes(keyword);

    const matchesWarehouse = selectedWarehouse === "ทั้งหมด" || enriched.warehouse === selectedWarehouse;
    const matchesCategory = selectedCategory === "ทั้งหมด" || enriched.category === selectedCategory;

    const currentStatus = calculateStatus(lot.expiryDate);
    const matchesStatus = (() => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "EXPIRED") return currentStatus === "หมดอายุ";
      if (statusFilter === "NEAR") return currentStatus === "ใกล้หมด";
      if (statusFilter === "ACTIVE") return lot.status === "ACTIVE";
      if (statusFilter === "INACTIVE") return lot.status !== "ACTIVE";
      return true;
    })();

    const matchesExpiryDays = (() => {
      if (expiryDays <= 0 || !lot.expiryDate) return true;
      const now = new Date();
      const expiry = new Date(lot.expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return diffDays >= 0 && diffDays <= expiryDays;
    })();

    const matchesStartDate = !startDate || (lot.createdAt && lot.createdAt >= startDate);
    const matchesEndDate = !endDate || (lot.createdAt && lot.createdAt.slice(0, 10) <= endDate);

    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus && matchesExpiryDays && matchesStartDate && matchesEndDate;
  });

  const totalPages = Math.ceil(filteredLots.length / LOT_PAGE_LIMIT);
  const currentItems = filteredLots.slice((currentPage - 1) * LOT_PAGE_LIMIT, currentPage * LOT_PAGE_LIMIT);

  // --- [Handlers] ---
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleWarehouseFilter = (value: string) => {
    setSelectedWarehouse(value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleExpiryDaysFilter = (value: number) => {
    setExpiryDays(value);
    setCurrentPage(1);
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
        await fetchAllLots();
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
    if (calculateStatus(lot.expiryDate) === "หมดอายุ") {
      await SweetAlertUtils.warning(
        "ล็อตหมดอายุ",
        "ล็อตนี้หมดอายุแล้วและถูกระงับการใช้งาน กรุณาปรับวันหมดอายุผ่านการรับของ/ปรับข้อมูลก่อนจึงจะเปิดใช้งานได้"
      );
      return;
    }

    const isCurrentlyActive = lot.status === "ACTIVE";
    const nextActionText = isCurrentlyActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน';

    const confirmResult = await SweetAlertUtils.question(
      `ยืนยันการ${nextActionText}?`,
      `คุณต้องการ${nextActionText} Lot: ${lot.lotCode || lot.id} ใช่หรือไม่?`
    );

    if (confirmResult.isConfirmed) {
      try {
        const updatedLot = await toggleLotStatus(lot.id);
        setAllLots(prev => prev.map(l => l.id === updatedLot.id ? updatedLot : l));
        SweetAlertUtils.success('สำเร็จ!', `Lot ถูกเปลี่ยนสถานะเป็น ${nextActionText} เรียบร้อยแล้ว`);
      } catch (error: any) {
        SweetAlertUtils.error('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถทำการเปลี่ยนสถานะได้');
      }
    }
  };

  const handleStockinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockinForm.productId || !stockinForm.lotId || !stockinForm.quantity || !stockinForm.unit || !stockinForm.warehouseId) {
      SweetAlertUtils.warning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลจำเป็นให้ครบถ้วน');
      return;
    }

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

        await saveLots([lotData]);

        SweetAlertUtils.success('บันทึกสำเร็จ', 'บันทึกข้อมูลสินค้าเข้าเรียบร้อยแล้ว');
        setStockinForm(INITIAL_STOCKIN_FORM);
        await fetchAllLots();
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


  const handleBulkPrint = () => {
    printLabels(Array.from(selectedItems.values()));
  };

  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">

      <AdjustQuantityModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={handleConfirmAdjust}
        lot={adjustingLot}
        isAdjusting={isAdjusting}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">ล็อตสินค้า</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkPrint}
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
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
        </div>

        {/* Category Dropdown */}
        <div className="relative w-full sm:w-auto" data-filter-category>
          <button
            type="button"
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
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
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
        <div className="relative w-full sm:w-auto" data-filter-status>
          <button
            type="button"
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); setIsExpiryOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
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
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${statusFilter === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
        <div className="relative w-full sm:w-auto" data-filter-expiry>
          <button
            type="button"
            onClick={() => { setIsExpiryOpen(!isExpiryOpen); setIsCategoryOpen(false); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[180px] justify-between"
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
        <div className={`relative border rounded-lg px-4 shadow-sm w-full sm:w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          startDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันรับเข้า (เริ่มต้น)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>
        <div className={`relative border rounded-lg px-4 shadow-sm w-full sm:w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          endDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันรับเข้า (สิ้นสุด)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
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
              setSearchTerm("");
              setSelectedWarehouse("ทั้งหมด");
              setSelectedCategory("ทั้งหมด");
              setStatusFilter("ALL");
              setExpiryDays(0);
              setStartDate("");
              setEndDate("");
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <DotLottieReact
              src="https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie"
              loop
              autoplay
              style={{ width: 160, height: 160 }}
            />
          </div>
        ) : (
          <>
            <div
              className="flex-1"
              style={{ overflowX: "auto", overflowY: "auto", scrollbarWidth: "auto", msOverflowStyle: "auto" } as React.CSSProperties}
            >
              <style>{`
                div::-webkit-scrollbar { width: 0; height: 8px; }
                div::-webkit-scrollbar-track { background: #f1f5f9; }
                div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
              `}</style>
              <table className="w-full min-w-[960px] text-sm text-left table-fixed">
                <colgroup>
                  <col className="w-[44px]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[7%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={currentItems.length > 0 && currentItems.every((l) => selectedItems.has(l.id))}
                        onChange={() => {
                          const allSel = currentItems.every((l) => selectedItems.has(l.id));
                          setSelectedItems((prev) => {
                            const s = new Map(prev);
                            if (allSel) {
                              currentItems.forEach((l) => s.delete(l.id));
                            } else {
                              currentItems.forEach((l) => {
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
                    <th className="px-6 py-4 whitespace-nowrap">รหัสรายการ</th>
                    <th className="px-6 py-4 whitespace-nowrap">รหัส LOT</th>
                    <th className="px-3 py-4 whitespace-nowrap">ชื่อพัสดุ</th>
                    <th className="px-6 py-4 whitespace-nowrap">หมวดหมู่</th>
                    <th className="px-6 py-4 whitespace-nowrap">คงเหลือ</th>
                    <th className="px-6 py-4 whitespace-nowrap">หน่วย</th>
                    <th className="px-6 py-4 whitespace-nowrap">วันที่รับเข้า</th>
                    <th className="px-6 py-4 whitespace-nowrap">วันหมดอายุ</th>
                    <th className="px-6 py-4 whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {currentItems.map((lot, idx) => {
                    const currentStatus = calculateStatus(lot.expiryDate);
                    const isExpiredLot = currentStatus === "หมดอายุ";
                    const statusLabel = isExpiredLot
                      ? "หมดอายุ"
                      : lot.status !== "ACTIVE"
                        ? "ระงับการใช้งาน"
                        : currentStatus === "ปกติ"
                          ? "ใช้งานได้"
                          : currentStatus;
                    const statusBadgeClass = isExpiredLot
                      ? "bg-red-100 text-red-600"
                      : lot.status !== "ACTIVE"
                        ? "bg-red-100 text-red-500"
                        : currentStatus === "ปกติ"
                          ? "bg-green-100 text-green-500"
                          : currentStatus === "ใกล้หมด"
                            ? "bg-amber-100 text-amber-500"
                            : "bg-slate-100 text-slate-600";
                    const enrichedData = getEnrichedLotData(lot);
                    return (
                      <tr key={lot.id || idx} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-2.5 text-center">
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
                          <div className="text-slate-600 truncate" title={enrichedData.itemCode}>{enrichedData.itemCode}</div>
                        </td>
                        <td className="px-6 py-2.5">
                          <div className="text-slate-600 truncate" title={lot.lotCode || lot.id}>{lot.lotCode || lot.id}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="block truncate text-slate-600" title={enrichedData.itemName}>{enrichedData.itemName}</span>
                        </td>
                        <td className="px-6 py-2.5 truncate text-slate-600">{enrichedData.category}</td>
                        <td className="px-6 py-2.5 text-slate-600">{lot.quantity.toLocaleString()}</td>
                        <td className="px-6 py-2.5 text-slate-600 truncate max-w-[6rem]" title={enrichedData.unit}>{enrichedData.unit}</td>
                        <td className="px-6 py-2.5">
                          <div className="text-slate-600 truncate" title={fmtDateTime(lot.createdAt)}>{fmtDateTime(lot.createdAt)}</div>
                        </td>
                        <td className="px-6 py-2.5">
                          <span className={`${currentStatus === 'หมดอายุ' ? 'text-red-600' : currentStatus === 'ใกล้หมด' ? 'text-orange-600' : 'text-slate-600'}`}>
                            {fmtDate(lot.expiryDate)}
                          </span>
                        </td>
                        <td className="px-6 py-2.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusBadgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-2.5 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              disabled={isExpiredLot}
                              onClick={() => handleToggleStatus(lot)}
                              className={`p-2 rounded-lg transition-colors ${isExpiredLot ? "text-slate-300 cursor-not-allowed opacity-50" : lot.status === "ACTIVE" ? "text-green-500 hover:bg-green-50" : "text-red-400 hover:bg-red-50"}`}
                              title={
                                isExpiredLot
                                  ? "ล็อตหมดอายุ — แก้วันหมดอายุก่อนจึงจะเปิดใช้งานได้"
                                  : lot.status === "ACTIVE"
                                    ? "กดเพื่อระงับการใช้งาน"
                                    : "กดเพื่อเปิดใช้งาน"
                              }
                            >
                              {lot.status === "ACTIVE" ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            <button onClick={() => openAdjustModal(lot)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Wrench className="w-5 h-5" />
                            </button>
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

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
              <p className="text-sm text-slate-500">
                แสดง {currentItems.length} จาก {filteredLots.length} รายการ
                {filteredLots.length !== allLots.length && (
                  <span className="text-slate-400"> (ทั้งหมด {allLots.length} รายการ)</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1 || loading}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
                <button
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
