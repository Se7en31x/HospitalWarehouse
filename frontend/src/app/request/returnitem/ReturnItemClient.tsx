"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Package, CheckCircle, Clock, X } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import * as ReturnSvc from "@/services/returnsService";
import type * as Returns from "@/types/returns_type";

const MySwal = withReactContent(Swal);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// ✅ Mock Data สำหรับตาราง
const MOCK_BORROWED_ITEMS: Returns.UiReturn[] = [
  {
    id: "BRW-001",
    itemCode: "EQUIP-001",
    itemName: "เครื่องวัดความดัน (Blood Pressure Monitor)",
    category: "เครื่องแพทย์",
    unit: "ชิ้น",
    quantity: 2,
    borrowedBy: "นางสาว นันทนา จำเริญอุษา",
    borrowDate: "2026-02-15",
    dueDate: "2026-03-17",
    returnDate: undefined,
    status: "รอการคืน",
    notes: "ยืมไปใช้ที่หน่วยเวชศาสตร์",
    daysOverdue: 0,
  },
  {
    id: "BRW-002",
    itemCode: "EQUIP-002",
    itemName: "เครื่องวัดออกซิเจนในเลือด (Pulse Oximeter)",
    category: "เครื่องแพทย์",
    unit: "ชิ้น",
    quantity: 1,
    borrowedBy: "นายสมชาย วิชัยสิทธิ์",
    borrowDate: "2026-02-18",
    dueDate: "2026-03-20",
    returnDate: undefined,
    status: "รอการคืน",
    notes: "ยืมไปใช้ที่ห้องฉุกเฉิน",
    daysOverdue: 0,
  },
  {
    id: "BRW-003",
    itemCode: "EQUIP-003",
    itemName: "เตียงผู้ป่วย (Hospital Bed)",
    category: "อุปกรณ์เตียง",
    unit: "เตียง",
    quantity: 1,
    borrowedBy: "นางอรทัย ศิรินธร",
    borrowDate: "2026-02-20",
    dueDate: "2026-03-10",
    returnDate: undefined,
    status: "ค้างคืน",
    notes: "ยืมไปบ้านผู้ป่วย",
    daysOverdue: 7,
  },
  {
    id: "BRW-004",
    itemCode: "EQUIP-004",
    itemName: "กระป๋องออกซิเจน (Oxygen Tank)",
    category: "สิ้นเปลือง",
    unit: "ขวด",
    quantity: 3,
    borrowedBy: "นายกีรติ สมบูรณ์",
    borrowDate: "2026-02-25",
    dueDate: "2026-03-17",
    returnDate: "2026-03-16",
    status: "คืนแล้ว",
    notes: "ยืมไปใช้ในห้องผ่าตัด",
    daysOverdue: undefined,
  },
  {
    id: "BRW-005",
    itemCode: "EQUIP-005",
    itemName: "เครื่องชั่งน้ำหนัก (Weighing Scale)",
    category: "เครื่องชั่ง",
    unit: "ชิ้น",
    quantity: 1,
    borrowedBy: "นางสุชลา มงคลประสงค์",
    borrowDate: "2026-03-01",
    dueDate: "2026-03-31",
    returnDate: undefined,
    status: "รอการคืน",
    notes: "ยืมไปใช้ที่ห้องตรวจสุขภาพ",
    daysOverdue: 0,
  },
  {
    id: "BRW-006",
    itemCode: "EQUIP-006",
    itemName: "เครื่องวัดความสูง (Height Meter)",
    category: "เครื่องวัด",
    unit: "ชิ้น",
    quantity: 1,
    borrowedBy: "นายชัยชาญ บุญเจิด",
    borrowDate: "2026-01-28",
    dueDate: "2026-02-28",
    returnDate: undefined,
    status: "ค้างคืน",
    notes: "ยืมไปใช้ที่คลินิกสมุนไพร",
    daysOverdue: 17,
  },
  {
    id: "BRW-007",
    itemCode: "EQUIP-007",
    itemName: "เก้าอี้ลิฟท์ (Lift Chair)",
    category: "เฟอร์นิเจอร์",
    unit: "ชิ้น",
    quantity: 1,
    borrowedBy: "นางวนิดา ทองสุวรณ์",
    borrowDate: "2026-02-10",
    dueDate: "2026-03-12",
    returnDate: "2026-03-12",
    status: "คืนแล้ว",
    notes: "ยืมไปใช้ที่บ้านผู้ป่วยสูงอายุ",
    daysOverdue: undefined,
  },
  {
    id: "BRW-008",
    itemCode: "EQUIP-008",
    itemName: "ที่นอนลม (Air Mattress)",
    category: "อุปกรณ์นอน",
    unit: "ชิ้น",
    quantity: 2,
    borrowedBy: "นายปรัชญา รักษ์สงค์",
    borrowDate: "2026-03-05",
    dueDate: "2026-04-04",
    returnDate: undefined,
    status: "รอการคืน",
    notes: "ยืมไปป้องกันแผลกดทับ",
    daysOverdue: 0,
  },
];

export default function ReturnItemClient() {
  // ✅ State สำหรับรายการยืมที่รอการคืน
  const [borrowedItems, setBorrowedItems] = useState<Returns.UiReturn[]>(MOCK_BORROWED_ITEMS);

  // ✅ State สำหรับ UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Returns.ReturnStatus | "ทั้งหมด">("ทั้งหมด");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // ✅ State สำหรับการเลือกรายการและคืน
  const [selectedReturns, setSelectedReturns] = useState<Map<string, { quantity: number; returnDate: string }>>(new Map());
  const [isReturningBouncing, setIsReturningBouncing] = useState(false);

  // --- [Data Fetching Logic] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      // ใช้ Mock Data แทน API
      setBorrowedItems(MOCK_BORROWED_ITEMS);
    } catch (error) {
      console.error("Fetch error:", error);
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลได้",
        icon: "error",
      });
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Initialize Data] ---
  useEffect(() => {
    setIsMounted(true);
    refreshData();
  }, []);

  // --- [Filter Logic] ---
  const statusOptions: (Returns.ReturnStatus | "ทั้งหมด")[] = ["ทั้งหมด", "รอการคืน", "คืนแล้ว", "ค้างคืน", "ยกเลิก"];

  const filteredItems = useMemo(() => {
    return borrowedItems.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (item.itemCode || "").toLowerCase().includes(term) ||
        (item.itemName || "").toLowerCase().includes(term) ||
        (item.borrowedBy || "").toLowerCase().includes(term);

      const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [borrowedItems, selectedStatus, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const displayItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // --- [Helper Actions] ---
  const toggleItemSelection = useCallback((itemId: string, quantity: number) => {
    setSelectedReturns((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(itemId)) {
        newMap.delete(itemId);
      } else {
        const today = new Date().toISOString().split('T')[0];
        newMap.set(itemId, { quantity, returnDate: today });
      }
      return newMap;
    });
  }, []);

  const handleReturnQuantityChange = useCallback((itemId: string, newQuantity: number, maxQuantity: number) => {
    if (newQuantity > 0 && newQuantity <= maxQuantity) {
      setSelectedReturns((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(itemId);
        if (current) {
          newMap.set(itemId, { ...current, quantity: newQuantity });
        }
        return newMap;
      });
    }
  }, []);

  const handleReturnDateChange = useCallback((itemId: string, newDate: string) => {
    setSelectedReturns((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, { ...current, returnDate: newDate });
      }
      return newMap;
    });
  }, []);

  const submitReturns = async () => {
    if (selectedReturns.size === 0) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกรายการคืนอย่างน้อยหนึ่งรายการ",
        icon: "warning",
      });
      return;
    }

    try {
      const returnedItems = Array.from(selectedReturns.entries()).map(([itemId, data]) => {
        const item = borrowedItems.find(i => i.id === itemId);
        return {
          id: itemId,
          itemName: item?.itemName,
          quantity: data.quantity,
          returnDate: data.returnDate,
        };
      });

      await MySwal.fire({
        title: "ยืนยันการคืน",
        html: `คุณต้องการคืนสินค้า ${returnedItems.length} รายการหรือไม่<br/><br/><small>รวมทั้งหมด ${returnedItems.reduce((a, b) => a + b.quantity, 0)} ชิ้น</small>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
      });

      // Submit each return
      for (const [itemId, data] of selectedReturns) {
        await ReturnSvc.recordReturn(itemId, data.returnDate, "บันทึกการคืนจากหน้า returnitem");
      }

      setSelectedReturns(new Map());
      setIsReturningBouncing(true);
      setTimeout(() => setIsReturningBouncing(false), 300);

      await MySwal.fire({
        title: "สำเร็จ",
        text: "บันทึกการคืนเรียบร้อย",
        icon: "success",
      });

      refreshData();
    } catch (error) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: getErrorMessage(error),
        icon: "error",
      });
    }
  };

  const getStatusBadgeColor = (status: Returns.ReturnStatus) => {
    switch (status) {
      case "รอการคืน":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "คืนแล้ว":
        return "bg-green-50 text-green-700 border-green-200";
      case "ค้างคืน":
        return "bg-red-50 text-red-700 border-red-200";
      case "ยกเลิก":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusBadgeIcon = (status: Returns.ReturnStatus) => {
    switch (status) {
      case "รอการคืน":
        return <Clock className="w-4 h-4" />;
      case "คืนแล้ว":
        return <CheckCircle className="w-4 h-4" />;
      case "ค้างคืน":
        return <AlertCircle className="w-4 h-4" />;
      case "ยกเลิก":
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes return-bounce { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } .animate-bounce-custom { animation: return-bounce 0.3s ease-in-out; }`,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <RefreshCw className="w-8 h-8 text-green-600" />
          <h2 className="text-3xl font-bold text-green-600">คืนครุภัณฑ์ที่ยืมมา</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา รหัส ชื่อ หรือผู้ยืม..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-green-500 shadow-sm outline-none"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-status-dropdown>
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">สถานะ: {selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Status Dropdown Menu */}
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {statusOptions.map((status) => (
                  <li key={status}>
                    <button
                      onClick={() => {
                        setSelectedStatus(status);
                        setIsStatusDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === status ? "bg-green-50 text-green-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {status}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">เลือก</th>
                <th className="px-6 py-4 w-[80px]">#</th>
                <th className="px-6 py-4 w-[100px]">รหัสครุภัณฑ์</th>
                <th className="px-6 py-4 w-[250px]">ชื่อรายการ</th>
                <th className="px-6 py-4 w-[120px]">จำนวน</th>
                <th className="px-6 py-4 w-[150px]">ผู้ยืม</th>
                <th className="px-6 py-4 w-[120px]">วันยืม</th>
                <th className="px-6 py-4 w-[120px]">วันครบกำหนด</th>
                <th className="px-6 py-4 w-[100px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[80px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayItems.map((item, idx) => (
                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedReturns.has(item.id) ? 'bg-green-50' : ''}`}>
                  <td className="px-6 py-4 w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedReturns.has(item.id)}
                      onChange={() => toggleItemSelection(item.id, item.quantity)}
                      disabled={item.status !== "รอการคืน"}
                      className="w-4 h-4 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-6 py-4 w-[80px] text-slate-400 text-sm">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="px-6 py-4 w-[100px] font-medium text-slate-800">
                    {item.itemCode || '-'}
                  </td>
                  <td className="px-6 py-4 w-[250px] text-sm font-medium text-slate-800 truncate">
                    {item.itemName}
                  </td>
                  <td className="px-6 py-4 w-[120px] text-sm text-slate-600">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-6 py-4 w-[150px] text-sm text-slate-600">{item.borrowedBy}</td>
                  <td className="px-6 py-4 w-[120px] text-sm text-slate-600">{item.borrowDate}</td>
                  <td className="px-6 py-4 w-[120px] text-sm font-medium">
                    {item.dueDate}
                    {item.daysOverdue && item.daysOverdue > 0 && (
                      <div className="text-red-600 font-bold text-xs">ค้าง {item.daysOverdue} วัน</div>
                    )}
                  </td>
                  <td className="px-6 py-4 w-[100px]">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeColor(item.status)}`}>
                      {getStatusBadgeIcon(item.status)}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center w-[80px]">
                    {item.status === "รอการคืน" && selectedReturns.has(item.id) && (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-500 text-sm">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-600">
          แสดง {displayItems.length} จาก {filteredItems.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Return Details Panel */}
      {selectedReturns.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl p-6 animate-in slide-in-from-bottom-2">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-green-700 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> รายการที่เลือก ({selectedReturns.size})
              </h3>
              <button
                onClick={() => setSelectedReturns(new Map())}
                className="text-sm px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                ล้างการเลือก
              </button>
            </div>

            <div className="overflow-x-auto mb-4 max-h-40">
              <div className="flex gap-2">
                {Array.from(selectedReturns.entries()).map(([itemId, data]) => {
                  const item = borrowedItems.find(i => i.id === itemId);
                  return (
                    <div key={itemId} className="flex-shrink-0 bg-green-50 border border-green-200 rounded-lg p-3 min-w-fit">
                      <div className="text-sm font-semibold text-green-900">{item?.itemName}</div>
                      <div className="text-xs text-green-600 mt-1">จำนวน: {data.quantity} {item?.unit}</div>
                      <div className="text-xs text-green-600">วันคืน: {data.returnDate}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitReturns}
                disabled={selectedReturns.size === 0}
                className={`flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 ${isReturningBouncing ? "animate-bounce-custom" : ""
                  } ${selectedReturns.size === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
              >
                <RefreshCw className="w-5 h-5" /> ยืนยันการคืน ({selectedReturns.size} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed bottom panel */}
      {selectedReturns.size > 0 && <div className="h-32" />}
    </div>
  );
}
