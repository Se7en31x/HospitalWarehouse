"use client";

import { useState, useCallback, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  MoreVertical,
  Settings,
  Wrench,
  AlertTriangle,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import Cookies from "js-cookie";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { socket } from "../../../lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const makeApiCall = async (path: string, method: string, body?: any) => {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.message || "Request failed");
  }

  return res.json();
};

interface AdjustmentFormData {
  quantity: number;
  reason: string;
}

interface DamagedFormData {
  quantity: number;
  reason: string;
  imageUrl: string;
}

interface ExpiredFormData {
  lotNumber: string;
  quantity: number;
  expiryDate: string;
  remarks: string;
}

const INITIAL_ADJUSTMENT_FORM: AdjustmentFormData = {
  quantity: 0,
  reason: "",
};

const INITIAL_DAMAGED_FORM: DamagedFormData = {
  quantity: 0,
  reason: "",
  imageUrl: "",
};

const INITIAL_EXPIRED_FORM: ExpiredFormData = {
  lotNumber: "",
  quantity: 0,
  expiryDate: "",
  remarks: "",
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export default function AdjustmentsClient({ initialItems }: { initialItems: Item.UiItem[] }) {
  // ✅ State สำหรับรายการสินค้า
  const [items, setItems] = useState<Item.UiItem[]>(initialItems || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // ✅ State สำหรับ Options (Dropdowns)
  const [options, setOptions] = useState<Item.AllOptions>({
    category: [],
    unit: [],
    warehouse: [],
  });

  // --- [Data Fetching Logic] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems();
      setItems(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Real-time Socket.io Connection] ---
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS") {
        console.log("⚡ Socket: Received Refresh Signal -> Reloading Data...");
        refreshData();
      }
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [refreshData]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await ItemSvc.getItemOptions();
        setOptions(data || { category: [], unit: [], warehouse: [] });
      } catch (err) {
        console.error("Load options failed", err);
      }
    };
    fetchOptions();

    if (!initialItems || initialItems.length === 0) {
      refreshData();
    }
  }, [initialItems, refreshData]);

  // --- [Search & Filter States] ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // --- [Modal States] ---
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDamagedModalOpen, setIsDamagedModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item.UiItem | null>(null);
  const [menuItem, setMenuItem] = useState<Item.UiItem | null>(null);

  // --- [Form States] ---
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormData>(INITIAL_ADJUSTMENT_FORM);
  const [damagedForm, setDamagedForm] = useState<DamagedFormData>(INITIAL_DAMAGED_FORM);
  const [expiredForm, setExpiredForm] = useState<ExpiredFormData>(INITIAL_EXPIRED_FORM);

  // --- [Filter Logic] ---
  const filterCategories = ["ทั้งหมด", ...(options.category || []).map((c) => c.name)];
  const filterStatuses = ["ทั้งหมด", "ปกติ", "ต่ำ", "หมด"];

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.code || "").toLowerCase().includes(term) ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term);

    const matchesCat = selectedCategory === "ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- [Handlers] ---
  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustmentForm.reason.trim()) {
      toast.error("กรุณากรอกสาเหตุการปรับยอด");
      return;
    }

    setIsLoading(true);
    try {
      await makeApiCall("/v1/adjustments/stock", "POST", {
        itemId: selectedItem.id,
        quantity: adjustmentForm.quantity,
        reason: adjustmentForm.reason,
      });

      toast.success("บันทึกปรับยอดเรียบร้อย");
      handleCloseAllModals();
      refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportDamaged = async () => {
    if (!selectedItem || !damagedForm.quantity || !damagedForm.reason.trim()) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsLoading(true);
    try {
      await makeApiCall("/v1/adjustments/damaged", "POST", {
        itemId: selectedItem.id,
        quantity: damagedForm.quantity,
        reason: damagedForm.reason,
        imageUrl: damagedForm.imageUrl || null,
      });

      toast.success("บันทึกพัสดุชำรุดเรียบร้อย");
      handleCloseAllModals();
      refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportExpired = async () => {
    if (
      !selectedItem ||
      !expiredForm.lotNumber.trim() ||
      !expiredForm.quantity ||
      !expiredForm.expiryDate
    ) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsLoading(true);
    try {
      await makeApiCall("/v1/adjustments/expired", "POST", {
        itemId: selectedItem.id,
        lotNumber: expiredForm.lotNumber,
        quantity: expiredForm.quantity,
        expiryDate: expiredForm.expiryDate,
        remarks: expiredForm.remarks || null,
      });

      toast.success("บันทึกของหมดอายุเรียบร้อย");
      handleCloseAllModals();
      refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const openAdjustModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    setAdjustmentForm(INITIAL_ADJUSTMENT_FORM);
    setIsAdjustModalOpen(true);
    setIsMenuOpen(false);
  };

  const openDamagedModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    setDamagedForm(INITIAL_DAMAGED_FORM);
    setIsDamagedModalOpen(true);
    setIsMenuOpen(false);
  };

  const openExpiredModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    setExpiredForm(INITIAL_EXPIRED_FORM);
    setIsExpiredModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleCloseAllModals = () => {
    setSelectedItem(null);
    setIsAdjustModalOpen(false);
    setIsDamagedModalOpen(false);
    setIsExpiredModalOpen(false);
    setAdjustmentForm(INITIAL_ADJUSTMENT_FORM);
    setDamagedForm(INITIAL_DAMAGED_FORM);
    setExpiredForm(INITIAL_EXPIRED_FORM);
  };

  const handleToggleMenu = (item: Item.UiItem) => {
    setMenuItem(item);
    setIsMenuOpen(isMenuOpen && menuItem?.id === item.id ? false : true);
  };

  // --- [UI Components] ---
  const Badge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      "ปกติ": "bg-green-100 text-green-800",
      "ต่ำ": "bg-yellow-100 text-yellow-800",
      "หมด": "bg-red-100 text-red-800",
      "ระงับ": "bg-gray-200 text-gray-500",
      "ACTIVE": "bg-green-100 text-green-800",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          styles[status] || "bg-gray-100"
        }`}
      >
        {status}
      </span>
    );
  };

  const Button = ({ children, variant = "primary", disabled = false, onClick, className = "" }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 ${
        variant === "outline"
          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      } ${className}`}
    >
      {children}
    </button>
  );

  const IconButton = ({ children, onClick, className = "" }: any) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Package className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-indigo-600">บันทึกการนำเข้า</h2>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหารหัส, ชื่อ หรือหมวดหมู่..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
          />
        </div>
        <div className="flex-shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
          >
            {filterCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
          >
            {filterStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-lg border bg-white shadow-sm flex-1 flex flex-col overflow-hidden mb-6">
        <div className="relative w-full overflow-auto flex-1">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 bg-white z-10">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[120px]">
                  รหัสพัสดุ
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[200px]">
                  ชื่อพัสดุ
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[150px]">
                  หมวดหมู่
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[150px]">
                  จำนวนคงเหลือ
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[150px]">
                  สถานะ
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-gray-500 w-[80px]">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="border-b transition-colors hover:bg-gray-50">
                    <td className="p-4 align-middle font-medium text-gray-900 min-w-[120px]">
                      {item.code}
                    </td>
                    <td className="p-4 align-middle min-w-[200px]">{item.name}</td>
                    <td className="p-4 align-middle text-gray-500 min-w-[150px]">
                      {item.category}
                    </td>
                    <td className="p-4 align-middle font-semibold min-w-[150px]">
                      {item.stock} {item.unit}
                    </td>
                    <td className="p-4 align-middle min-w-[150px]">
                      <Badge status={item.status} />
                    </td>
                    <td className="p-4 align-middle text-right relative w-[80px]">
                      <IconButton onClick={() => handleToggleMenu(item)}>
                        <MoreVertical className="h-4 w-4" />
                      </IconButton>
                      {isMenuOpen && menuItem?.id === item.id && (
                        <div className="absolute right-0 top-full mt-2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-56 space-y-1">
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="flex items-center gap-3 p-2 w-full text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Settings className="h-5 w-5 text-blue-500" />
                            <span className="text-sm font-medium">ปรับยอด</span>
                          </button>
                          <button
                            onClick={() => openDamagedModal(item)}
                            className="flex items-center gap-3 p-2 w-full text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Wrench className="h-5 w-5 text-orange-500" />
                            <span className="text-sm font-medium">แจ้งชำรุด</span>
                          </button>
                          <button
                            onClick={() => openExpiredModal(item)}
                            className="flex items-center gap-3 p-2 w-full text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium">แจ้งหมดอายุ</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b transition-colors hover:bg-gray-50">
                  <td colSpan={6} className="h-24 text-center text-gray-500">
                    ไม่พบรายการพัสดุที่ตรงกับที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm h-16">
        <div className="text-sm text-gray-600">
          แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1 text-sm text-gray-700">
            หน้า {currentPage} จาก {totalPages}
          </div>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                ปรับยอดพัสดุ: {selectedItem.name}
              </h3>
              <button
                onClick={handleCloseAllModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  จำนวนปัจจุบัน
                </label>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedItem.stock} {selectedItem.unit}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ปรับยอด
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={adjustmentForm.quantity}
                    onChange={(e) =>
                      setAdjustmentForm({
                        ...adjustmentForm,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="flex-grow px-3 py-2 rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    placeholder="0"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAdjustmentForm({
                          ...adjustmentForm,
                          quantity: adjustmentForm.quantity + 1,
                        })
                      }
                      className="p-2 rounded-md border border-gray-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAdjustmentForm({
                          ...adjustmentForm,
                          quantity: Math.max(0, adjustmentForm.quantity - 1),
                        })
                      }
                      className="p-2 rounded-md border border-gray-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สาเหตุ
                </label>
                <textarea
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      reason: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  placeholder="ระบุเหตุผลในการปรับยอด (เช่น ตรวจนับ, คืนของ)"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  onClick={handleAdjustStock}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Damaged Modal */}
      {isDamagedModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                แจ้งพัสดุชำรุด: {selectedItem.name}
              </h3>
              <button
                onClick={handleCloseAllModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  จำนวนที่ชำรุด
                </label>
                <input
                  type="number"
                  value={damagedForm.quantity}
                  onChange={(e) =>
                    setDamagedForm({
                      ...damagedForm,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  placeholder="ระบุจำนวน"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สาเหตุการชำรุด
                </label>
                <textarea
                  value={damagedForm.reason}
                  onChange={(e) =>
                    setDamagedForm({
                      ...damagedForm,
                      reason: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  placeholder="โปรดระบุสาเหตุโดยละเอียด"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รูปภาพประกอบ (ถ้ามี)
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDamagedForm({
                        ...damagedForm,
                        imageUrl: URL.createObjectURL(file),
                      });
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  onClick={handleReportDamaged}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Expired Modal */}
      {isExpiredModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                แจ้งของหมดอายุ: {selectedItem.name}
              </h3>
              <button
                onClick={handleCloseAllModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเลขล็อต
                </label>
                <input
                  type="text"
                  value={expiredForm.lotNumber}
                  onChange={(e) =>
                    setExpiredForm({
                      ...expiredForm,
                      lotNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm"
                  placeholder="LOT-XXX-YYYYMM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  จำนวนที่หมดอายุ
                </label>
                <input
                  type="number"
                  value={expiredForm.quantity}
                  onChange={(e) =>
                    setExpiredForm({
                      ...expiredForm,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่หมดอายุ
                </label>
                <input
                  type="date"
                  value={expiredForm.expiryDate}
                  onChange={(e) =>
                    setExpiredForm({
                      ...expiredForm,
                      expiryDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเหตุ
                </label>
                <textarea
                  value={expiredForm.remarks}
                  onChange={(e) =>
                    setExpiredForm({
                      ...expiredForm,
                      remarks: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm"
                  placeholder="หมายเหตุเพิ่มเติม"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  onClick={handleReportExpired}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
