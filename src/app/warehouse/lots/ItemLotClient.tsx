"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search,
  Wrench,
  ChevronLeft, ChevronRight, ChevronDown,
  ToggleRight, ToggleLeft, Printer, X, Layers, Ban
} from "lucide-react";

import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import {
  LIST_TABLE_HEAD_ROW,
  LIST_TABLE_TH_COMPACT,
  LIST_TABLE_TH_WIDE,
  LIST_TABLE_TBODY,
} from "@/lib/tableUi";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";

import { socket } from "../../../lib/socket";
import AdjustQuantityModal from "@/app/warehouse/lots/AdjustQuantityModal";
import { getLots, toggleLotStatus, adjustLot, markLotUnusable } from "@/services/lotservice";
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

/** ค่าว่าง = ไม่กรอง */
const FILTER_ALL_ID = "";

type LotsStatusFilter = "ALL" | "NEAR" | "EXPIRED" | "ACTIVE" | "SUSPENDED" | "DEPLETED" | "DISPOSED";

const LOT_STATUS_FILTER_OPTIONS: { value: LotsStatusFilter; label: string }[] = [
  { value: "ALL", label: "สถานะทั้งหมด" },
  { value: "NEAR", label: "ใกล้หมดอายุ (ตามการแจ้งเตือน)" },
  { value: "EXPIRED", label: "หมดอายุ (ตามวันที่)" },
  { value: "ACTIVE", label: "พร้อมจ่าย (ACTIVE)" },
  { value: "SUSPENDED", label: "ระงับชั่วคราว" },
  { value: "DEPLETED", label: "เบิกหมด" },
  { value: "DISPOSED", label: "จำหน่ายทิ้ง" },
];

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
  const [selectedCategoryId, setSelectedCategoryId] = useState(FILTER_ALL_ID);
  const [statusFilter, setStatusFilter] = useState<LotsStatusFilter>("ALL");
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
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

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

  /** หมวดจากหมวดหมู่ที่ผูกกับพัสดุประเภท CONSUMABLE (วัสดุสิ้นเปลือง) — สอดคล้องกับล็อตในหน้านี้ */
  const consumableCategoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of itemsMaster) {
      if (i.type !== "CONSUMABLE") continue;
      const cid = i.categoryId?.trim();
      const cname = (i.category || "").trim();
      if (!cid || !cname || cname === "-") continue;
      if (!map.has(cid)) map.set(cid, cname);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [itemsMaster]);

  // โหลดข้อมูลทั้งหมดมาครั้งเดียว แล้วทำ filter + pagination ใน client
  const fetchAllLots = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await getLots(1, 9999);
      const sortedLots = [...result.items].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setAllLots(sortedLots);
    } catch (error: any) {
      if (!silent) {
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
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchAllData = async () => {
    try {
      const [itemsData, warehousesData] = await Promise.all([
        getInventoryItems({ type: "CONSUMABLE", limit: 1000 }).catch(err => {
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

  useEffect(() => {
    isVisibleRef.current = document.visibilityState === "visible";
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) fetchAllLots(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current || isRefreshingRef.current) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try { await fetchAllLots(true); }
        finally { isRefreshingRef.current = false; refreshTimerRef.current = null; }
      }, 220);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "LOTS" || message === "ITEMS") scheduleRefresh();
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchAllLots]);

  // --- [Client-side Filtering] ---
  const filteredLots = allLots.filter((lot) => {
    const keyword = searchTerm.toLowerCase();
    const enriched = getEnrichedLotData(lot);

    const matchesSearch = !keyword ||
      enriched.itemName.toLowerCase().includes(keyword) ||
      enriched.itemCode.toLowerCase().includes(keyword) ||
      (lot.lotCode || '').toLowerCase().includes(keyword);

    const matchesCategory =
      !selectedCategoryId || (lot.categoryId && lot.categoryId === selectedCategoryId);

    const currentStatus = calculateStatus(lot.expiryDate);
    const matchesStatus = (() => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "EXPIRED") return currentStatus === "หมดอายุ";
      if (statusFilter === "NEAR") return currentStatus === "ใกล้หมด";
      if (statusFilter === "ACTIVE") return lot.status === "ACTIVE";
      if (statusFilter === "SUSPENDED") return lot.status === "SUSPENDED";
      if (statusFilter === "DEPLETED") return lot.status === "DEPLETED";
      if (statusFilter === "DISPOSED") return lot.status === "DISPOSED";
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

    return matchesSearch && matchesCategory && matchesStatus && matchesExpiryDays && matchesStartDate && matchesEndDate;
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

  const handleCategoryFilter = (value: string) => {
    setSelectedCategoryId(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: LotsStatusFilter) => {
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
      const payload: LotInterface.AdjustLotPayload = {
        new_quantity: newQty,
        reason: reason,
        user_name: "Admin",
      };
      if (adjustingLot.status === "DISPOSED" && newQty > 0) {
        payload.status = "ACTIVE";
      }

      const result = await adjustLot(adjustingLot.id, payload);

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

  const handleMarkLotDisposed = async (lot: LotInterface.UiLot) => {
    if (lot.status === "DISPOSED" || lot.status === "DEPLETED" || lot.status === "CANCELLED") return;

    const confirmResult = await SweetAlertUtils.custom({
      title: "จำหน่ายทิ้งล็อต?",
      html: `<p class="text-left text-sm text-slate-600 mb-1">ล็อต <strong>${lot.lotCode || lot.id}</strong> จะไม่ถูกเลือกในการจ่าย และไม่สลับกลับด้วยปุ่มระงับ — แก้ภายหลังได้ผ่านปุ่มปรับยอด (เมื่อยอด &gt; 0 ระบบจะกลับมาใช้งานได้ตามเงื่อนไข)</p>`,
      icon: "warning",
      input: "textarea",
      inputLabel: "เหตุผล / หมายเหตุ (จำเป็น)",
      inputPlaceholder: "เช่น หมดอายุ, ชำรุด/เสียหาย, ไม่ผ่าน QC, ทำลายตามนโยบาย ฯลฯ",
      inputAttributes: { "aria-label": "หมายเหตุการจำหน่ายทิ้ง", rows: "4" },
      showCancelButton: true,
      confirmButtonText: "ยืนยันจำหน่ายทิ้ง",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#6b7280",
      inputValidator: (value: string | undefined) => {
        const t = String(value ?? "").trim();
        if (!t) return "กรุณาระบุเหตุผลหรือหมายเหตุ";
        if (t.length < 3) return "กรุณาระบุอย่างน้อย 3 ตัวอักษร";
        return undefined;
      },
    });
    if (!confirmResult.isConfirmed || typeof confirmResult.value !== "string") return;

    const reason = confirmResult.value.trim();

    try {
      const out = await markLotUnusable(lot.id, { reason });
      await fetchAllLots();
      SweetAlertUtils.success("บันทึกแล้ว", out.message || "ตั้งล็อตเป็นจำหน่ายทิ้งแล้ว");
    } catch (error: unknown) {
      const msg = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "ไม่สามารถจำหน่ายทิ้งล็อตได้";
      SweetAlertUtils.error("ผิดพลาด", msg);
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

    if (lot.status === "DEPLETED") {
      await SweetAlertUtils.warning(
        "ล็อตเบิกหมดแล้ว",
        "กรุณาปรับเพิ่มจำนวนสต็อก (ปุ่มประแจ) ก่อน ระบบจึงจะเปิดใช้งานล็อตให้จ่ายต่อได้"
      );
      return;
    }

    if (lot.status === "DISPOSED") {
      await SweetAlertUtils.warning(
        "จำหน่ายทิ้งแล้ว (ห้ามใช้ถาวร)",
        "ล็อตนี้ถูกตั้งเป็นห้ามใช้แบบถาวรแล้ว — ถ้าต้องนำกลับมาใช้ ให้เปิดปรับยอด (ปุ่มประแจ) ใส่จำนวนที่ถูกต้องและบันทึก ระบบจะตั้งกลับเป็นใช้งานได้เมื่อยอดมากกว่า 0"
      );
      return;
    }

    const isCurrentlyActive = lot.status === "ACTIVE";
    const nextActionText = isCurrentlyActive ? "ระงับชั่วคราว" : "เปิดใช้งาน";

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
        <div className="flex items-center gap-4">
          <PageHeadingIconBox icon={Layers} tone="violet" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">ล็อตสินค้า</h2>
            <p className="text-sm text-slate-500 mt-0.5">ล็อตของใช้แล้วหมดไป — วันหมดอายุและยอดคงเหลือตามล็อต</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkPrint}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์บาร์โค้ด ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหา รหัส / ชื่อพัสดุ / Lot..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
        </div>

        {/* Category: หมวดของพัสดุ CONSUMABLE เท่านั้น */}
        <div className="relative w-full sm:w-auto" data-filter-category>
          <button
            type="button"
            onClick={() => {
              setIsCategoryOpen(!isCategoryOpen);
              setIsStatusOpen(false);
              setIsExpiryOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[240px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">
              {!selectedCategoryId
                ? "หมวดหมู่ทั้งหมด"
                : (consumableCategoryOptions.find((c) => c.id === selectedCategoryId)?.name ?? "หมวดหมู่")}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                <li key="__all_cat__">
                  <button
                    type="button"
                    onClick={() => { handleCategoryFilter(FILTER_ALL_ID); setIsCategoryOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!selectedCategoryId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    หมวดหมู่ทั้งหมด
                  </button>
                </li>
                {consumableCategoryOptions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => { handleCategoryFilter(c.id); setIsCategoryOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategoryId === c.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="relative w-full sm:w-auto" data-filter-status>
          <button
            type="button"
            onClick={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsCategoryOpen(false);
              setIsExpiryOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[260px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">
              {LOT_STATUS_FILTER_OPTIONS.find((s) => s.value === statusFilter)?.label ?? "สถานะทั้งหมด"}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-72 overflow-y-auto">
              <ul className="py-1">
                {LOT_STATUS_FILTER_OPTIONS.map((s) => (
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

        {/* Expiry window (คนละอย่างกับ «ใกล้หมด» ที่ตาม notify_expiring_days) */}
        <div className="relative w-full sm:w-auto" data-filter-expiry>
          <button
            type="button"
            onClick={() => {
              setIsExpiryOpen(!isExpiryOpen);
              setIsCategoryOpen(false);
              setIsStatusOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">
              {expiryDays === 0 ? "กำหนดช่วงหมดอายุ" : `เหลือไม่เกิน ${expiryDays} วัน`}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isExpiryOpen ? "rotate-180" : ""}`} />
          </button>
          {isExpiryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {[
                  { value: 0, label: "ไม่กรองช่วงหมดอายุ" },
                  { value: 7, label: "เหลือไม่เกิน 7 วัน" },
                  { value: 30, label: "เหลือไม่เกิน 30 วัน" },
                  { value: 60, label: "เหลือไม่เกิน 60 วัน" },
                  { value: 90, label: "เหลือไม่เกิน 90 วัน" },
                ].map((opt) => (
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
        {(searchTerm || selectedCategoryId || statusFilter !== "ALL" || expiryDays !== 0 || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategoryId(FILTER_ALL_ID);
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
          <div className="flex flex-col flex-1 min-h-[22rem]">
            <span className="sr-only">กำลังโหลดล็อต</span>
            <DataTableSkeleton
              headers={["", "รหัสรายการ", "รหัส LOT", "ชื่อพัสดุ", "หมวดหมู่", "คงเหลือ", "หน่วย", "วันที่รับเข้า", "วันหมดอายุ", "สถานะ", "จัดการ"]}
              rowCount={10}
              showPaginationFooter
              ariaLabel="กำลังโหลดล็อต"
              thClassName="px-3 py-4 whitespace-nowrap text-base font-semibold"
              tdClassName="px-3 py-3"
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
                <thead className={LIST_TABLE_HEAD_ROW}>
                  <tr>
                    <th className="px-4 py-3.5 text-center">
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
                    <th className={LIST_TABLE_TH_WIDE}>รหัสรายการ</th>
                    <th className={LIST_TABLE_TH_WIDE}>รหัส LOT</th>
                    <th className={LIST_TABLE_TH_COMPACT}>ชื่อพัสดุ</th>
                    <th className={LIST_TABLE_TH_WIDE}>หมวดหมู่</th>
                    <th className={LIST_TABLE_TH_WIDE}>คงเหลือ</th>
                    <th className={LIST_TABLE_TH_WIDE}>หน่วย</th>
                    <th className={LIST_TABLE_TH_WIDE}>วันที่รับเข้า</th>
                    <th className={LIST_TABLE_TH_WIDE}>วันหมดอายุ</th>
                    <th className={LIST_TABLE_TH_WIDE}>สถานะ</th>
                    <th className={`${LIST_TABLE_TH_WIDE} w-[140px] min-w-[140px] max-w-[140px] text-center`}>จัดการ</th>
                  </tr>
                </thead>
                <tbody className={LIST_TABLE_TBODY}>
                  {currentItems.map((lot, idx) => {
                    const currentStatus = calculateStatus(lot.expiryDate);
                    const isExpiredLot = currentStatus === "หมดอายุ";
                    const isDepleted = lot.status === "DEPLETED";
                    const isDisposed = lot.status === "DISPOSED";
                    const isSuspended = lot.status === "SUSPENDED";
                    const statusLabel = isExpiredLot
                      ? "หมดอายุ"
                      : isDisposed
                        ? "จำหน่ายทิ้ง (ห้ามใช้ถาวร)"
                      : isDepleted
                        ? "เบิกหมดแล้ว"
                      : isSuspended
                        ? "ระงับชั่วคราว"
                      : lot.status !== "ACTIVE"
                        ? "อื่น ๆ"
                        : currentStatus === "ปกติ"
                          ? "ใช้งานได้"
                          : currentStatus;
                    const statusBadgeClass = isExpiredLot
                      ? "bg-red-100 text-red-600"
                      : isDisposed
                        ? "bg-stone-200 text-stone-800 border border-stone-300"
                      : isDepleted
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                      : isSuspended
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                      : lot.status !== "ACTIVE"
                        ? "bg-red-100 text-red-500"
                        : currentStatus === "ปกติ"
                          ? "bg-green-100 text-green-500"
                          : currentStatus === "ใกล้หมด"
                            ? "bg-amber-100 text-amber-500"
                            : "bg-slate-100 text-slate-600";
                    const enrichedData = getEnrichedLotData(lot);
                    const toggleDisabled = isExpiredLot || lot.status === "DEPLETED" || lot.status === "DISPOSED";
                    const markDisposedDisabled = lot.status !== "ACTIVE" && lot.status !== "SUSPENDED";
                    const markDisposedTitle = markDisposedDisabled
                      ? lot.status === "DISPOSED"
                        ? "จำหน่ายทิ้งแล้ว — ใช้ปุ่มปรับยอดหากต้องแก้ไข"
                        : lot.status === "DEPLETED"
                          ? "เบิกหมด — จำหน่ายทิ้งได้เฉพาะเมื่อสถานะพร้อมจ่ายหรือระงับชั่วคราว"
                          : lot.status === "CANCELLED"
                            ? "ล็อตถูกยกเลิกแล้ว"
                            : "จำหน่ายทิ้งได้เฉพาะเมื่อสถานะพร้อมจ่ายหรือระงับชั่วคราว"
                      : "จำหน่ายทิ้งล็อต — ห้ามใช้ถาวร (ไม่สลับกลับด้วยปุ่มนี้)";
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
                        <td className="px-2 py-2.5 text-center w-[140px] min-w-[140px] max-w-[140px] align-middle">
                          <div className="inline-flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              disabled={toggleDisabled}
                              onClick={() => handleToggleStatus(lot)}
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${toggleDisabled ? "text-slate-300 cursor-not-allowed opacity-50" : lot.status === "ACTIVE" ? "text-green-500 hover:bg-green-50" : "text-red-400 hover:bg-red-50"}`}
                              title={
                                isExpiredLot
                                  ? "ล็อตหมดอายุ — แก้วันหมดอายุก่อนจึงจะเปิดใช้งานได้"
                                  : lot.status === "DEPLETED"
                                    ? "ล็อตเบิกหมดแล้ว — ปรับเพิ่มจำนวนก่อน"
                                  : lot.status === "DISPOSED"
                                    ? "จำหน่ายทิ้งแล้ว — ห้ามสลับสถานะจากที่นี่"
                                  : lot.status === "ACTIVE"
                                    ? "กดเพื่อระงับชั่วคราว"
                                    : "กดเพื่อเปิดใช้งาน"
                              }
                            >
                              {lot.status === "ACTIVE" ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            <button
                              type="button"
                              disabled={markDisposedDisabled}
                              onClick={() => void handleMarkLotDisposed(lot)}
                              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent transition-colors ${markDisposedDisabled ? "text-slate-300 cursor-not-allowed opacity-50" : "text-amber-800 hover:bg-amber-50 hover:border-amber-200"}`}
                              title={markDisposedTitle}
                            >
                              <Ban className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openAdjustModal(lot)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50"
                              title="ปรับยอด / แก้ข้อมูลล็อต"
                            >
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
