"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Edit, Printer, Search, Trash2, X } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printLabels, type LabelData } from "@/lib/printLabel";

// ============ Constants ============

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "พร้อมใช้งาน",
  IN_USE: "กำลังใช้งาน",
  REPAIR: "ส่งซ่อม",
  DISPOSED: "จำหน่ายออก",
};

const CONDITION_LABEL: Record<string, string> = {
  GOOD: "ปกติ",
  DAMAGED: "ชำรุด",
  INCOMPLETE: "ไม่ครบ",
  LOST: "สูญหาย",
  BROKEN: "ชำรุดหนัก",
};

// ============ Helpers ============

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const getStatusLabel = (unit: reusableSvc.ReusableUnit) => {
  if (unit.status !== "IN_USE") return STATUS_LABEL[unit.status] || unit.status;
  if (unit.usage_context === "BORROW") return "ถูกยืม (อยู่ระหว่างการยืม)";
  if (unit.usage_context === "WITHDRAW") return "กำลังใช้งาน";
  return STATUS_LABEL.IN_USE;
};

function ConditionBadge({ condition }: { condition: string }) {
  const label = CONDITION_LABEL[condition] || condition;
  
  const getConditionColor = (c: string): string => {
    switch (c) {
      case "GOOD": return "bg-green-100 text-green-500";
      case "DAMAGED": return "bg-amber-100 text-amber-500";
      case "INCOMPLETE": return "bg-purple-100 text-purple-500";
      case "LOST": return "bg-red-100 text-red-500";
      case "BROKEN": return "bg-red-100 text-red-500";
      default: return "bg-slate-100 text-slate-500";
    }
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${getConditionColor(condition)}`}>
      {label}
    </span>
  );
}

function StatusBadge({ unit }: { unit: reusableSvc.ReusableUnit }) {
  const label = getStatusLabel(unit);
  
  const getStatusColor = (status: string, usage_context?: string): string => {
    if (status === "AVAILABLE") return "bg-green-100 text-green-500";
    if (status === "IN_USE") return "bg-blue-100 text-blue-500";
    if (status === "REPAIR") return "bg-amber-100 text-amber-500";
    if (status === "DISPOSED") return "bg-red-100 text-red-500";
    return "bg-slate-100 text-slate-500";
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${getStatusColor(unit.status, unit.usage_context)}`}>
      {label}
    </span>
  );
}


// ============ Props ============

interface ReusableRegistryClientProps {
  /** itemId is the item TYPE UUID — passed from the Server Component. */
  itemId: string;
  /** Item name pre-fetched on the server via GET /v1/items/:id */
  initialItemName: string;
  initialItemCode: string;
  /** Unit list pre-fetched on the server via GET /v1/reusable-items?item_id=... */
  initialUnits: reusableSvc.ReusableUnit[];
}

// ============ Main Component ============

export default function ReusableRegistryClient({
  itemId,
  initialItemName,
  initialItemCode,
  initialUnits,
}: ReusableRegistryClientProps) {
  const router = useRouter();

  // Pre-populate records from server data — no loading flash.
  const [records, setRecords] = useState<reusableSvc.ReusableUnit[]>(initialUnits);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [masterItem, setMasterItem] = useState<{ name: string; code: string }>({
    name: initialItemName,
    code: initialItemCode,
  });

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("แผนกประจำการทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Refs for state tracking
  const pageRef = useRef(1);
  const keywordRef = useRef("");
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dropdown states
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<reusableSvc.ReusableUnit | null>(null);
  const [editSerialNo, setEditSerialNo] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editStatus, setEditStatus] = useState("AVAILABLE");
  const [editCondition, setEditCondition] = useState("GOOD");
  const [editNote, setEditNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Edit Modal Dropdown States
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [isEditConditionOpen, setIsEditConditionOpen] = useState(false);

  // Unit label selection
  const [selectedUnits, setSelectedUnits] = useState<Map<string, LabelData>>(new Map());

  const toggleSelectUnit = (rec: reusableSvc.ReusableUnit) =>
    setSelectedUnits((prev) => {
      const s = new Map(prev);
      s.has(rec.id)
        ? s.delete(rec.id)
        : s.set(rec.id, { name: masterItem.name, code: rec.unit_code, subLabel: rec.serial_no || undefined });
      return s;
    });

  const toggleSelectAllUnits = () => {
    const allSel = paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedUnits.has(r.id));
    setSelectedUnits((prev) => {
      const s = new Map(prev);
      allSel
        ? paginatedRecords.forEach((r) => s.delete(r.id))
        : paginatedRecords.forEach((r) => s.set(r.id, { name: masterItem.name, code: r.unit_code, subLabel: r.serial_no || undefined }));
      return s;
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-department]")) setIsDepartmentOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
    };
    if (isDepartmentOpen || isStatusOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDepartmentOpen, isStatusOpen]);

  // Close edit modal dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-edit-status]")) setIsEditStatusOpen(false);
      if (!target.closest("[data-edit-dept]")) setIsEditDeptOpen(false);
      if (!target.closest("[data-edit-condition]")) setIsEditConditionOpen(false);
    };
    if (isEditStatusOpen || isEditDeptOpen || isEditConditionOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEditStatusOpen, isEditDeptOpen, isEditConditionOpen]);

  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  // Fetch units with pagination
  const fetchPage = useCallback(async (page: number, keyword: string) => {
    if (!itemId) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await reusableSvc.getReusableUnits({ 
        item_id: itemId,
        keyword,
        page,
        limit: itemsPerPage
      });
      const units = response.items || [];
      setRecords(units);
      setServerTotal(response.total || 0);
      setServerTotalPages(response.totalPages || 0);
      if (units.length > 0) {
        setMasterItem({
          name: units[0].item_name || initialItemName,
          code: units[0].item_code || initialItemCode,
        });
      }
    } catch (err: any) {
      setRecords([]);
      setFetchError(err?.message || "ดึงข้อมูลทะเบียนรายชิ้นไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, [itemId, initialItemName, initialItemCode, itemsPerPage]);

  // Refresh data using stored refs
  const refreshData = useCallback(() => {
    fetchPage(pageRef.current, keywordRef.current);
  }, [fetchPage]);

  // hasMounted prevents React Strict Mode's double-invoke from firing two requests
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!itemId) return;
    if (hasMounted.current) return;
    hasMounted.current = true;
    // Always fetch to get correct totalPages, even if initialUnits is populated.
    // This ensures serverTotal and serverTotalPages are set for pagination.
    fetchPage(1, "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const handleSaveEdit = async () => {
    if (!editingUnit) return;
    setIsSaving(true);
    try {
      await reusableSvc.updateReusableUnit(editingUnit.id, {
        serial_no: editSerialNo || null,
        department_id: editDeptId && editDeptId !== "0" ? Number(editDeptId) : null,
        status: editStatus,
        condition: editCondition,
        note: editNote || null,
      });
      SweetAlertUtils.success("สำเร็จ", "อัปเดตข้อมูลเรียบร้อย");
      setIsEditModalOpen(false);
      setEditingUnit(null);
      refreshData();
    } catch (err) {
      SweetAlertUtils.error("ข้อผิดพลาด", getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, unitCode: string) => {
    const result = await SweetAlertUtils.delete("ลบรายชิ้น", "คุณต้องการลบรายการนี้ใช่หรือไม่?");
    if (!result.isConfirmed) return;
    try {
      await reusableSvc.deleteReusableUnit(id);
      SweetAlertUtils.success("สำเร็จ", "ลบรายการเรียบร้อย");
      refreshData();
    } catch (err) {
      SweetAlertUtils.error("ข้อผิดพลาด", getErrorMessage(err));
    }
  };

  const openEditModal = (unit: reusableSvc.ReusableUnit) => {
    setEditingUnit(unit);
    setEditSerialNo(unit.serial_no || "");
    setEditDeptId(unit.department_id ? String(unit.department_id) : "0");
    setEditStatus(unit.status || "AVAILABLE");
    setEditCondition(unit.condition || "GOOD");
    setEditNote(unit.note || "");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUnit(null);
    setEditSerialNo("");
    setEditDeptId("");
    setEditStatus("AVAILABLE");
    setEditCondition("GOOD");
    setEditNote("");
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    keywordRef.current = value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      pageRef.current = 1;
      fetchPage(1, value);
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    pageRef.current = newPage;
    fetchPage(newPage, keywordRef.current);
  };

  // Filter options
  const filterDepartments = ["แผนกประจำการทั้งหมด", ...departments.map(d => ({ id: d.id, name: d.name }))];
  const filterStatuses = [
    { value: "สถานะทั้งหมด", label: "สถานะทั้งหมด" },
    { value: "AVAILABLE", label: "พร้อมใช้งาน" },
    { value: "IN_USE", label: "กำลังใช้งาน/ถูกยืม" },
    { value: "REPAIR", label: "ส่งซ่อม" },
    { value: "DISPOSED", label: "จำหน่ายออก" },
  ];

  // Filter data (server handles keyword filtering, client handles additional filters)
  const filteredRecords = records.filter((record) => {
    const matchesDept = selectedDepartment === "แผนกประจำการทั้งหมด" || 
      (selectedDepartment && String(record.department_id) === selectedDepartment);
    const matchesStatus = selectedStatus === "สถานะทั้งหมด" || record.status === selectedStatus;

    return matchesDept && matchesStatus;
  });

  // Calculate pagination based on filtered records for this page
  const totalPages = Math.ceil(serverTotal / itemsPerPage);
  const paginatedRecords = filteredRecords;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">
            {masterItem?.name || "กำลังโหลด..."}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {selectedUnits.size > 0 && (
            <button
              onClick={() => printLabels(Array.from(selectedUnits.values()))}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์บาร์โค้ด ({selectedUnits.size})
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-semibold transition-colors"
          >
            ย้อนกลับ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา Unit Code / Serial..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        {/* Department Dropdown */}
        <div className="relative" data-filter-department>
          <button
            type="button"
            onClick={() => { setIsDepartmentOpen(!isDepartmentOpen); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedDepartment}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDepartmentOpen ? "rotate-180" : ""}`} />
          </button>
          {isDepartmentOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterDepartments.map((dept) => {
                  const deptValue = typeof dept === "string" ? dept : String(dept.id);
                  const deptLabel = typeof dept === "string" ? dept : dept.name;
                  return (
                    <li key={deptValue}>
                      <button
                        type="button"
                        onClick={() => { setSelectedDepartment(deptValue); setIsDepartmentOpen(false); setCurrentPage(1); pageRef.current = 1; fetchPage(1, keywordRef.current); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDepartment === deptValue ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        {deptLabel}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-filter-status>
          <button
            type="button"
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsDepartmentOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterStatuses.map((s) => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => { setSelectedStatus(s.value); setIsStatusOpen(false); setCurrentPage(1); pageRef.current = 1; fetchPage(1, keywordRef.current); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Clear filters */}
        {(searchTerm || selectedDepartment !== "แผนกประจำการทั้งหมด" || selectedStatus !== "สถานะทั้งหมด") && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm(""); keywordRef.current = "";
              setSelectedDepartment("แผนกประจำการทั้งหมด");
              setSelectedStatus("สถานะทั้งหมด");
              setCurrentPage(1); pageRef.current = 1;
              fetchPage(1, "");
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: "65vh" }}>
        {isFetching && (
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
                    checked={paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedUnits.has(r.id))}
                    onChange={toggleSelectAllUnits}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                    title="เลือกทั้งหมดในหน้านี้"
                  />
                </th>
                <th className="px-6 py-4 w-[140px]">Unit Code</th>
                <th className="px-6 py-4 w-[140px]">Serial</th>
                <th className="px-6 py-4 w-[140px]">แผนก</th>
                <th className="px-6 py-4 w-[140px]">สถานะ</th>
                <th className="px-6 py-4 w-[100px]">สภาพ</th>
                <th className="px-6 py-4 w-[150px]">เอกสารรับเข้า</th>
                <th className="px-6 py-4 w-[120px]">หมายเหตุ</th>
                <th className="px-6 py-4 w-[80px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {paginatedRecords.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-2.5 w-[44px] text-center">
                    <input
                      type="checkbox"
                      checked={selectedUnits.has(rec.id)}
                      onChange={() => toggleSelectUnit(rec)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-2.5 w-[140px] font-mono">{rec.unit_code}</td>
                  <td className="px-6 py-2.5 w-[140px] truncate">{rec.serial_no || "-"}</td>
                  <td className="px-6 py-2.5 w-[140px] truncate">{rec.department_name || "ส่วนกลาง"}</td>
                  <td className="px-6 py-2.5 w-[140px]"><StatusBadge unit={rec} /></td>
                  <td className="px-6 py-2.5 w-[100px]"><ConditionBadge condition={rec.condition} /></td>
                  <td className="px-6 py-2.5 w-[150px] text-xs truncate">{rec.receive_doc_no || "-"}</td>
                  <td className="px-6 py-2.5 w-[120px] truncate">{rec.note || "-"}</td>
                  <td className="px-6 py-2.5 w-[80px] text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => openEditModal(rec)}
                        className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id, rec.unit_code)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedRecords.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
                    {fetchError ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2 text-rose-400">
                        <AlertTriangle className="w-10 h-10 text-rose-300" />
                        <p className="text-sm font-medium">{fetchError}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                        <p className="text-sm font-medium">ไม่พบข้อมูลทะเบียนรายชิ้น</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {paginatedRecords.length} จาก {serverTotal} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingUnit && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all" 
          onClick={closeEditModal}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-300 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-2xl font-bold text-slate-900">
                แก้ไขข้อมูลรายชิ้น
              </h2>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="bg-white rounded-lg p-6 border border-slate-300 shadow-sm">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Unit Code</label>
                    <input 
                      type="text" 
                      value={editingUnit.unit_code} 
                      readOnly 
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-100 text-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Serial Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={editSerialNo} 
                        onChange={(e) => setEditSerialNo(e.target.value)} 
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white font-mono" 
                        placeholder="ระบุ Serial Number"
                      />
                      {editSerialNo && (
                        <button type="button" onClick={() => setEditSerialNo("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div data-edit-dept>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">แผนก</label>
                      <button
                        type="button"
                        onClick={() => { setIsEditDeptOpen(!isEditDeptOpen); setIsEditStatusOpen(false); setIsEditConditionOpen(false); }}
                        className="w-full flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm justify-between"
                      >
                        <span className="text-slate-800 font-medium">
                          {editDeptId === "0" ? "ส่วนกลาง / ไม่ระบุ" : departments.find(d => String(d.id) === editDeptId)?.name || "ส่วนกลาง / ไม่ระบุ"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEditDeptOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isEditDeptOpen && (
                        <div className="absolute mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-[250px] max-h-64 overflow-y-auto">
                          <ul className="py-1">
                            <li>
                              <button
                                type="button"
                                onClick={() => { setEditDeptId("0"); setIsEditDeptOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${editDeptId === "0" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                              >
                                ส่วนกลาง / ไม่ระบุ
                              </button>
                            </li>
                            {departments.map((d) => (
                              <li key={d.id}>
                                <button
                                  type="button"
                                  onClick={() => { setEditDeptId(String(d.id)); setIsEditDeptOpen(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${String(editDeptId) === String(d.id) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                >
                                  {d.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div data-edit-status>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">สถานะ</label>
                      <button
                        type="button"
                        onClick={() => { setIsEditStatusOpen(!isEditStatusOpen); setIsEditDeptOpen(false); setIsEditConditionOpen(false); }}
                        className="w-full flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm justify-between"
                      >
                        <span className="text-slate-800 font-medium">{STATUS_LABEL[editStatus] || editStatus}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEditStatusOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isEditStatusOpen && (
                        <div className="absolute mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-[250px] max-h-64 overflow-y-auto">
                          <ul className="py-1">
                            {Object.entries(STATUS_LABEL).map(([k, v]) => (
                              <li key={k}>
                                <button
                                  type="button"
                                  onClick={() => { setEditStatus(k); setIsEditStatusOpen(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${editStatus === k ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                >
                                  {v}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div data-edit-condition>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">สภาพ</label>
                    <button
                      type="button"
                      onClick={() => { setIsEditConditionOpen(!isEditConditionOpen); setIsEditStatusOpen(false); setIsEditDeptOpen(false); }}
                      className="w-full flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm justify-between"
                    >
                      <span className="text-slate-800 font-medium">{CONDITION_LABEL[editCondition] || editCondition}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEditConditionOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isEditConditionOpen && (
                      <div className="absolute mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-[250px] max-h-64 overflow-y-auto">
                        <ul className="py-1">
                          {Object.entries(CONDITION_LABEL).map(([k, v]) => (
                            <li key={k}>
                              <button
                                type="button"
                                onClick={() => { setEditCondition(k); setIsEditConditionOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${editCondition === k ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                              >
                                {v}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">หมายเหตุ</label>
                    <textarea 
                      value={editNote} 
                      onChange={(e) => setEditNote(e.target.value)} 
                      rows={3} 
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none" 
                      placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-white border-t border-slate-300 flex justify-end gap-3">
              <button onClick={closeEditModal} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="flex items-center gap-2 px-8 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
