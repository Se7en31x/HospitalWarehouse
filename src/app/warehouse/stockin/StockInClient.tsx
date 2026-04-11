"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus, Eye, ChevronLeft, ChevronRight, ChevronDown,
  AlertCircle, X, Save, Loader2
} from "lucide-react";
import * as stockInService from "@/services/stockInService";
import { getcategoriesOptions } from "@/services/itemsService";
import ReceiveFormModal from "./ReceiveFormModal";

interface StockInRecord {
  id: string;
  date: string;
  docNo: string;
  supplier: string;
  poNumber?: string;
  totalAmount: number;
  type: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

interface Props {
  initialHistory?: StockInRecord[];
}

// Helper: Component สำหรับป้ายสถานะ
const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    COMPLETED: { color: "bg-emerald-100 text-emerald-700", label: "เสร็จสมบูรณ์" },
    PENDING: { color: "bg-amber-100 text-amber-700", label: "รอดำเนินการ" },
    CANCELLED: { color: "bg-red-100 text-red-700", label: "ยกเลิก" }
  }[status] || { color: "bg-gray-100 text-gray-700", label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'COMPLETED' ? 'bg-emerald-500' : status === 'PENDING' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
      {config.label}
    </span>
  );
};

// Helper: Map status from API to UI status
const mapStatus = (apiStatus: string): 'PENDING' | 'COMPLETED' | 'CANCELLED' => {
  const statusMap: Record<string, 'PENDING' | 'COMPLETED' | 'CANCELLED'> = {
    'ACTIVE': 'COMPLETED',
    'PENDING': 'PENDING',
    'DELETED': 'CANCELLED',
    'COMPLETED': 'COMPLETED'
  };
  return statusMap[apiStatus] || 'PENDING';
};

// Helper: Generate auto-incremented document number
const generateDocNumber = (index: number): string => {
  return `DOC-${String(index + 1).padStart(6, '0')}`;
};

const statusOptions = [
  { value: "ALL", label: "ทุกสถานะ" },
  { value: "COMPLETED", label: "เสร็จสมบูรณ์" },
  { value: "PENDING", label: "รอดำเนินการ" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

export default function StockInClient({ initialHistory = [] }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทุกหมวดหมู่");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [history, setHistory] = useState<StockInRecord[]>(initialHistory);
  const [isFetching, setIsFetching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<StockInRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editedQuantity, setEditedQuantity] = useState(0);
  const [orderedQuantity, setOrderedQuantity] = useState(0);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isReceiveFormModalOpen, setIsReceiveFormModalOpen] = useState(false);
  const [selectedFormRecord, setSelectedFormRecord] = useState<StockInRecord | null>(null);
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

  // Fetch category options
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getcategoriesOptions();
        setCategories(data || []);
      } catch (err) {
        console.error("Load categories options failed", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch data function
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    setApiError(null);
    try {
      console.log("Attempting to fetch stock in data...");
      const data = await stockInService.getAllStockIn();

      const transformedData = data.map((item: any) => ({
        id: item.id || '',
        date: item.date || new Date().toISOString().split('T')[0],
        docNo: item.docNo || item.id || '',
        supplier: item.supplier || 'ไม่ระบุ',
        poNumber: item.poNumber || item.po_number || '-',
        totalAmount: item.totalAmount || 0,
        type: item.type || 'PURCHASE',
        status: mapStatus(item.status)
      }));

      setHistory(transformedData);
      if (data.length === 0) {
        console.log("No stock in records found");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูล";
      console.error("Error fetching stock in data:", error);
      setApiError(errorMsg);
      toast.error("ไม่สามารถดึงข้อมูลได้: " + errorMsg);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (history.length === 0) {
      refreshData();
    }
  }, [refreshData]);

  // Handler: Open detail modal
  const handleOpenDetail = async (record: StockInRecord) => {
    setIsLoadingDetail(true);
    setSelectedRecord(record);

    try {
      const lotDetail = await stockInService.getLotDetail(record.id);

      if (lotDetail) {
        const quantityOrdered = lotDetail.total_value || lotDetail.quantityOrdered || 0;
        const quantityReceived = lotDetail.quantity || 0;

        setOrderedQuantity(quantityOrdered);
        setEditedQuantity(quantityReceived);

        console.log("Lot detail loaded:", { quantityOrdered, quantityReceived });
      } else {
        setOrderedQuantity(0);
        setEditedQuantity(0);
        toast.error("ไม่สามารถดึงข้อมูลรายละเอียดได้");
      }
    } catch (error) {
      console.error("Error loading lot detail:", error);
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
      setOrderedQuantity(0);
      setEditedQuantity(0);
    } finally {
      setIsLoadingDetail(false);
      setIsDetailModalOpen(true);
    }
  };

  // Handler: Close detail modal
  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedRecord(null);
    setEditedQuantity(0);
    setOrderedQuantity(0);
  };

  // Handler: Save edited quantity
  const handleSaveQuantity = async () => {
    if (!selectedRecord) return;

    setIsSavingDetail(true);
    try {
      console.log("Starting save with:", { lotId: selectedRecord.id, editedQuantity, orderedQuantity });

      const updateResponse = await stockInService.updateLotQuantity(selectedRecord.id, editedQuantity);
      console.log("Update response:", updateResponse);

      const isComplete = editedQuantity >= orderedQuantity;
      const newStatus: 'PENDING' | 'COMPLETED' | 'CANCELLED' = isComplete ? 'COMPLETED' : 'PENDING';

      console.log("New status:", newStatus, "isComplete:", isComplete);

      setHistory((prevHistory) => {
        const updatedHistory = prevHistory.map((item) =>
          item.id === selectedRecord.id
            ? { ...item, status: newStatus }
            : item
        );
        console.log("Updated history:", updatedHistory);
        return updatedHistory;
      });

      if (isComplete) {
        toast.success("ได้รับสินค้าครบแล้ว - สถานะเปลี่ยนเป็น เสร็จสมบูรณ์");
      } else {
        toast.success("บันทึกการแก้ไข - สถานะคงเป็น รอดำเนินการ");
      }

      handleCloseDetail();

      setTimeout(() => {
        console.log("Refreshing data from backend...");
        refreshData();
      }, 500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
      console.error("Error saving quantity:", error);
      toast.error("ไม่สามารถบันทึกได้: " + errorMsg);
    } finally {
      setIsSavingDetail(false);
    }
  };

  // --- Logic: Filter ข้อมูล ---
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.docNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === "ทุกหมวดหมู่" || item.type === selectedCategory;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      let matchesDate = true;
      if (startDate && endDate) {
        const itemDate = new Date(item.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        matchesDate = itemDate >= start && itemDate <= end;
      } else if (startDate) {
        const itemDate = new Date(item.date);
        const start = new Date(startDate);
        matchesDate = itemDate >= start;
      } else if (endDate) {
        const itemDate = new Date(item.date);
        const end = new Date(endDate);
        matchesDate = itemDate <= end;
      }

      return matchesSearch && matchesCat && matchesStatus && matchesDate;
    });
  }, [history, searchTerm, selectedCategory, statusFilter, startDate, endDate]);

  // --- Logic: Pagination ---
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filterCategories = ["ทุกหมวดหมู่", ...categories.map(c => c.name)];
  const statusLabel = statusOptions.find(s => s.value === statusFilter)?.label || "ทุกสถานะ";

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* API Error Alert */}
      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">ข้อผิดพลาดในการดึงข้อมูล</h3>
            <p className="text-sm text-red-700 mt-1">{apiError}</p>
            <button
              onClick={() => refreshData()}
              className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700 underline"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">รับพัสดุเข้าคลัง</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/warehouse/stockin/createform")}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> สร้างใบรับสินค้า
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Category Dropdown */}
        <div className="relative" data-filter-category>
          <button
            type="button"
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map(c => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(c); setIsCategoryOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {c}
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
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{statusLabel}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {statusOptions.map(s => (
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

        {/* Date Range */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
        />
        <span className="text-slate-400 text-sm">ถึง</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
        />
      </div>

      {/* Table Content */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[150px]">เลขที่เอกสาร</th>
                <th className="px-6 py-4 w-[150px]">วันที่รับ</th>
                <th className="px-6 py-4 w-[200px]">Lot Code</th>
                <th className="px-6 py-4 w-[200px]">PO/Invoice</th>
                <th className="px-6 py-4 w-[200px]">ผู้จำหน่าย</th>
                <th className="px-6 py-4 text-right w-[120px]">ยอดรวม</th>
                <th className="px-6 py-4 text-center w-[150px]">สถานะ</th>
                <th className="px-6 py-4 text-right w-[100px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedHistory.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 w-[50px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4">{generateDocNumber((currentPage - 1) * itemsPerPage + idx)}</td>
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-mono">{item.docNo || '-'}</td>
                  <td className="px-6 py-4">{item.poNumber}</td>
                  <td className="px-6 py-4">{item.supplier}</td>
                  <td className="px-6 py-4 text-right">฿{item.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedFormRecord(item);
                        setIsReceiveFormModalOpen(true);
                      }}
                      className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedHistory.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
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
        <p className="text-sm text-slate-500">แสดง {paginatedHistory.length} จาก {filteredHistory.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRecord && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            onClick={handleCloseDetail}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              {/* Header */}
              <div className="border-b border-slate-200 px-8 py-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  รายละเอียดการรับสินค้า
                </h2>
                <button
                  onClick={handleCloseDetail}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="ml-3 text-slate-600">กำลังดึงข้อมูล...</p>
                  </div>
                ) : (
                  <>
                    {/* Status indicator */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">สถานะการรับสินค้า</h3>
                        <StatusBadge status={selectedRecord.status} />
                      </div>

                      {/* Document info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">เลขที่เอกสาร</p>
                          <p className="font-semibold text-slate-900">{selectedRecord.id}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">วันที่รับ</p>
                          <p className="font-semibold text-slate-900">{selectedRecord.date}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Lot Code</p>
                          <p className="font-semibold text-slate-900">{selectedRecord.docNo || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">ผู้จำหน่าย</p>
                          <p className="font-semibold text-slate-900">{selectedRecord.supplier}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">PO/Invoice</p>
                          <p className="font-semibold text-slate-900">{selectedRecord.poNumber}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">ยอดรวม</p>
                          <p className="font-bold text-indigo-600">฿{selectedRecord.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quantity section */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="font-semibold text-slate-900 mb-4">ปรับปรุงจำนวนรับสินค้า</h3>

                      <div className="space-y-4">
                        {/* Display quantity ordered */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            จำนวนที่สั่งซื้อ
                          </label>
                          <input
                            type="number"
                            readOnly
                            value={orderedQuantity}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm bg-slate-100 text-slate-600 cursor-not-allowed opacity-70 outline-none"
                          />
                        </div>

                        {/* Editable quantity received */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            จำนวนที่รับจริง
                          </label>
                          <input
                            type="number"
                            value={editedQuantity}
                            onChange={(e) => setEditedQuantity(Number(e.target.value))}
                            min="0"
                            max={orderedQuantity}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm bg-indigo-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          {editedQuantity >= orderedQuantity && (
                            <p className="text-sm text-emerald-600 mt-2 font-semibold">
                              ✓ ได้รับสินค้าครบแล้ว - สถานะจะเป็น เสร็จสมบูรณ์
                            </p>
                          )}
                          {editedQuantity < orderedQuantity && (
                            <p className="text-sm text-amber-600 mt-2">
                              ⚠ ยังขาดลังหลายชิ้น - สถานะจะเป็น รอดำเนินการ
                            </p>
                          )}
                        </div>

                        {/* Difference indicator */}
                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                          <p className="text-sm text-slate-600 mb-1">ผลต่างจากสั่งซื้อ</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {orderedQuantity - editedQuantity} ชิ้น
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 px-8 py-4 flex justify-end gap-3">
                <button
                  onClick={handleCloseDetail}
                  disabled={isSavingDetail || isLoadingDetail}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors disabled:opacity-50"
                >
                  ปิด
                </button>
                <button
                  onClick={handleSaveQuantity}
                  disabled={isSavingDetail || isLoadingDetail}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDetail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editedQuantity >= orderedQuantity ? 'บันทึก - เปลี่ยนเป็น เสร็จสมบูรณ์' : 'บันทึก - คงเป็น รอดำเนินการ'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Receive Form Modal */}
      {selectedFormRecord && (
        <ReceiveFormModal
          isOpen={isReceiveFormModalOpen}
          onCloseAction={() => {
            setIsReceiveFormModalOpen(false);
            setSelectedFormRecord(null);
          }}
          onSuccessAction={() => {
            setIsReceiveFormModalOpen(false);
            setSelectedFormRecord(null);
            refreshData();
          }}
          mode="view"
          receiveData={{
            // ดึงค่าจาก selectedFormRecord มาใส่ให้ตรงกับ Interface ReceiveHeaderInfo
            id: selectedFormRecord.id,
            doc_no: (selectedFormRecord as any).doc_no || "-",
            type: (selectedFormRecord as any).type || "RECEIVE",
            supplier_id: (selectedFormRecord as any).supplier_id || "",
            status: (selectedFormRecord as any).status || "COMPLETED",
            items: [], // หรือใส่ (selectedFormRecord as any).items || [] ถ้ามีข้อมูล
            receive_date: selectedFormRecord.date,
          }}
          receiveHeaderId={selectedFormRecord.id}
        />
      )}
    </div>
  );
}