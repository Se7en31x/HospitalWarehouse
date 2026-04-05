"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Save, Trash2, X, Package, Search } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";

// ─── Types & Interfaces ───────────────────────────────────────────────────────

interface ProcessItemForm {
  item_id: string;
  item_name: string;
  requested_qty: number;
  return_qty: number;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note: string;
}

interface ProcessUnitForm {
  unit_id: string;
  unit_code: string;
  serial_no: string;
  item_id: string;
  item_name: string;
  condition: "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";
  note: string;
}

interface UnitFormTableProps {
  unitForms: ProcessUnitForm[];
  onUpdate: (unitId: string, patch: Partial<ProcessUnitForm>) => void;
}

interface ItemFormTableProps {
  forms: ProcessItemForm[];
  onUpdate: (itemId: string, patch: Partial<ProcessItemForm>) => void;
}

type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

// ─── Constants ────────────────────────────────────────────────────────────────

const RETURN_REQUEST_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "รอคลังรับงาน",
  PROCESSING: "กำลังตรวจรับ",
  COMPLETED: "ปิดงานแล้ว",
};

const CONDITION_LABEL: Record<string, string> = {
  GOOD: "ปกติ",
  DAMAGED: "ชำรุด",
  LOST: "สูญหาย",
  INCOMPLETE: "คืนไม่ครบ",
};

const conditionOptions: { value: ReturnCondition; label: string }[] = [
  { value: "GOOD", label: CONDITION_LABEL.GOOD },
  { value: "DAMAGED", label: CONDITION_LABEL.DAMAGED },
  { value: "LOST", label: CONDITION_LABEL.LOST },
  { value: "INCOMPLETE", label: CONDITION_LABEL.INCOMPLETE },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fmtDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("th-TH");
};

const getTotalItems = (items: any[]): number => {
  return items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0);
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, string> = {
    REQUESTED: "รอคลังรับงาน",
    PROCESSING: "กำลังตรวจรับ",
    COMPLETED: "ปิดงานแล้ว",
  };

  const styles: Record<string, string> = {
    "รอคลังรับงาน": "bg-amber-50 text-amber-700 border-amber-200",
    "กำลังตรวจรับ": "bg-blue-50 text-blue-700 border-blue-200",
    "ปิดงานแล้ว": "bg-green-50 text-green-700 border-green-200",
  };

  const displayStatus = statusMap[status] || status;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${styles[displayStatus] || "bg-gray-50"}`}>
      {displayStatus}
    </span>
  );
}

function UnitFormTable({ unitForms, onUpdate }: UnitFormTableProps) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left w-[180px]">Unit Code</th>
            <th className="px-4 py-3 text-left w-[180px]">Serial</th>
            <th className="px-4 py-3 text-left">รายการ</th>
            <th className="px-4 py-3 text-left w-[160px]">ผลตรวจสภาพ</th>
            <th className="px-4 py-3 text-left">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {unitForms.map((row: ProcessUnitForm) => (
            <tr key={row.unit_id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.unit_code}</td>
              <td className="px-4 py-3">{row.serial_no}</td>
              <td className="px-4 py-3 font-medium">{row.item_name}</td>
              <td className="px-4 py-3">
                <select
                  value={row.condition}
                  onChange={(e) => onUpdate(row.unit_id, { condition: e.target.value as ReturnCondition })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {conditionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <input
                  value={row.note}
                  onChange={(e) => onUpdate(row.unit_id, { note: e.target.value })}
                  placeholder="หมายเหตุรายชิ้น"
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemFormTable({ forms, onUpdate }: ItemFormTableProps) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left">รายการ</th>
            <th className="px-4 py-3 text-left w-[140px]">จำนวนที่ขอคืน</th>
            <th className="px-4 py-3 text-left w-[150px]">รับคืนจริง</th>
            <th className="px-4 py-3 text-left w-[160px]">ผลตรวจสภาพ</th>
            <th className="px-4 py-3 text-left">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {forms.map((row: ProcessItemForm) => (
            <tr key={row.item_id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium">{row.item_name}</td>
              <td className="px-4 py-3">{row.requested_qty}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  max={row.requested_qty}
                  value={row.return_qty}
                  onChange={(e) => onUpdate(row.item_id, { return_qty: Math.max(0, Math.min(row.requested_qty, Number(e.target.value || 0))) })}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <select
                  value={row.condition}
                  onChange={(e) => onUpdate(row.item_id, { condition: e.target.value as ReturnCondition })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {conditionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <input
                  value={row.note}
                  onChange={(e) => onUpdate(row.item_id, { note: e.target.value })}
                  placeholder="หมายเหตุ"
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnsDepartmentClient() {
  // State - Data & Fetch
  const [records, setRecords] = useState<reusableSvc.ReusableReturnRequest[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // State - Filters & UI
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // State - Modal
  const [activeRequest, setActiveRequest] = useState<reusableSvc.ReusableReturnRequest | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [forms, setForms] = useState<ProcessItemForm[]>([]);
  const [unitForms, setUnitForms] = useState<ProcessUnitForm[]>([]);
  const [processNote, setProcessNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);

  // Fetch Data
  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await reusableSvc.getReusableReturnRequests({
        page: 1,
        limit: 50,
        department_id: departmentFilter || undefined,
        status: "REQUESTED",
      });
      setRecords(response.items || []);
    } catch (err) {
      console.error("fetch return requests failed", err);
      toast.error("ดึงใบคำขอคืนจากแผนกไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, [departmentFilter]);

  // Initialize & Load Options
  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
    fetchData();
  }, [fetchData]);

  // Handle click outside dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filter-dept]")) setIsDeptOpen(false);
    };
    if (isDeptOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isDeptOpen]);

  // Computed Values
  const selectedDeptLabel = useMemo(() => {
    if (!departmentFilter) return "แผนกทั้งหมด";
    return departments.find((d) => String(d.id) === departmentFilter)?.name || "แผนกทั้งหมด";
  }, [departmentFilter, departments]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((rec) => {
      const matchesSearch =
        (rec.doc_no || "").toLowerCase().includes(term) ||
        (rec.department_name || "").toLowerCase().includes(term) ||
        (rec.contact_name || "").toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [records, searchTerm]);

  // Event Handlers
  const openProcessModal = useCallback(async (request: reusableSvc.ReusableReturnRequest) => {
    setActiveRequest(request);
    setProcessNote("");
    setForms([]);
    setUnitForms([]);
    setIsLoadingDetail(true);

    try {
      const detail = await reusableSvc.getReusableReturnRequestById(request.id);
      setActiveRequest(detail);

      const unitRows: ProcessUnitForm[] = (detail.items || []).flatMap((item) =>
        (item.requested_units || [])
          .filter((unit) => Boolean(unit.id))
          .map((unit) => ({
            unit_id: String(unit.id),
            unit_code: unit.unit_code || "-",
            serial_no: unit.serial_no || "-",
            item_id: item.item_id,
            item_name: item.item_name || "-",
            condition: "GOOD",
            note: "",
          }))
      );

      if (unitRows.length) {
        setUnitForms(unitRows);
        setForms([]);
      } else {
        setForms(
          (detail.items || []).map((item) => ({
            item_id: item.item_id,
            item_name: item.item_name || "-",
            requested_qty: item.requested_qty,
            return_qty: item.requested_qty,
            condition: "GOOD",
            note: "",
          }))
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error) || "ดึงรายละเอียดใบคำขอไม่สำเร็จ");
      setActiveRequest(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const closeProcessModal = useCallback(() => {
    setActiveRequest(null);
    setForms([]);
    setUnitForms([]);
    setProcessNote("");
  }, []);

  const updateForm = useCallback((itemId: string, patch: Partial<ProcessItemForm>) => {
    setForms((prev) => prev.map((row) => (row.item_id === itemId ? { ...row, ...patch } : row)));
  }, []);

  const updateUnitForm = useCallback((unitId: string, patch: Partial<ProcessUnitForm>) => {
    setUnitForms((prev) => prev.map((row) => (row.unit_id === unitId ? { ...row, ...patch } : row)));
  }, []);

  const handleProcess = useCallback(async () => {
    if (!activeRequest) return;

    setIsSaving(true);
    try {
      if (unitForms.length) {
        await reusableSvc.processReusableReturnRequest(activeRequest.id, {
          units: unitForms.map((row) => ({
            unit_id: row.unit_id,
            condition: row.condition,
            note: row.note || undefined,
          })),
          complete: true,
          note: processNote || undefined,
        });
      } else {
        const validItems = forms.filter((row) => row.return_qty > 0);
        if (!validItems.length) {
          toast.error("กรุณาระบุจำนวนรับคืนอย่างน้อย 1 รายการ");
          setIsSaving(false);
          return;
        }

        await reusableSvc.processReusableReturnRequest(activeRequest.id, {
          items: validItems.map((row) => ({
            item_id: row.item_id,
            return_qty: Math.min(row.return_qty, row.requested_qty),
            condition: row.condition,
            note: row.note || undefined,
          })),
          complete: true,
          note: processNote || undefined,
        });
      }

      toast.success(`ปิดงานใบ ${activeRequest.doc_no} สำเร็จ`);
      closeProcessModal();
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error) || "บันทึกผลตรวจรับไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }, [activeRequest, unitForms, forms, processNote, closeProcessModal, fetchData]);

  const handleDeleteRequest = useCallback(async (request: reusableSvc.ReusableReturnRequest) => {
    const confirmed = window.confirm(`ยืนยันลบคำขอ ${request.doc_no} ?`);
    if (!confirmed) return;

    setDeletingRequestId(request.id);
    try {
      await reusableSvc.deleteReusableReturnRequest(request.id);
      toast.success(`ลบคำขอ ${request.doc_no} เรียบร้อย`);
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error) || "ลบคำขอไม่สำเร็จ");
    } finally {
      setDeletingRequestId(null);
    }
  }, [fetchData]);

  // Render
  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">รับคืนจากแผนก</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่ / แผนก / ผู้ประสานงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        <div className="relative" data-filter-dept>
          <button
            type="button"
            onClick={() => setIsDeptOpen((prev) => !prev)}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[220px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">{selectedDeptLabel}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDeptOpen ? "rotate-180" : ""}`} />
          </button>
          {isDeptOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentFilter("");
                      setIsDeptOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!departmentFilter ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    แผนกทั้งหมด
                  </button>
                </li>
                {departments.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDepartmentFilter(String(d.id));
                        setIsDeptOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${departmentFilter === String(d.id) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {d.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          </div>
        )}
        <div
          className="flex-1"
          style={{
            overflowX: "auto",
            overflowY: "auto",
            scrollbarWidth: "auto",
            msOverflowStyle: "auto",
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
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[140px]">เลขที่คำขอ</th>
                <th className="px-6 py-4 w-[160px]">แผนก</th>
                <th className="px-6 py-4 w-[150px]">นัดรับของ</th>
                <th className="px-6 py-4 w-[120px]">สถานะ</th>
                <th className="px-6 py-4 w-[100px] text-center">จำนวนรายการ</th>
                <th className="px-6 py-4 w-[140px]">ผู้ประสานงาน</th>
                <th className="px-6 py-4 w-[140px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-indigo-700">{rec.doc_no}</td>
                  <td className="px-6 py-4 text-slate-700 text-sm">{rec.department_name || "-"}</td>
                  <td className="px-6 py-4 text-slate-700 text-sm">{fmtDateTime(rec.preferred_pickup_at)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-slate-700 text-sm">{getTotalItems(rec.items)}</td>
                  <td className="px-6 py-4 text-slate-700 text-sm">{rec.contact_name || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => openProcessModal(rec)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        ตรวจรับ
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(rec)}
                        disabled={deletingRequestId === rec.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="ลบ"
                      >
                        {deletingRequestId === rec.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <Package className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-medium">{searchTerm ? "ไม่พบผลการค้นหา" : "ไม่พบใบคำขอคืนที่รอคลังดำเนินการ"}</p>
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
        <p className="text-sm text-slate-500">แสดง {filteredRecords.length} จาก {records.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า 1 / 1</span>
          <button className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed bg-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Process Modal */}
      {activeRequest && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" 
          onClick={closeProcessModal}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">ตรวจรับคืนใบ {activeRequest.doc_no}</h3>
              <button 
                onClick={closeProcessModal} 
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6 flex-1">
              {isLoadingDetail && (
                <div className="py-10 flex items-center justify-center text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  กำลังโหลดรายละเอียด...
                </div>
              )}

              {!isLoadingDetail && unitForms.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-3">รายชิ้นอุปกรณ์</p>
                  <div className="mb-6">
                    <UnitFormTable unitForms={unitForms} onUpdate={updateUnitForm} />
                  </div>
                </>
              )}

              {!isLoadingDetail && unitForms.length === 0 && (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-3">รายการพัสดุ</p>
                  <div className="mb-6">
                    <ItemFormTable forms={forms} onUpdate={updateForm} />
                  </div>
                </>
              )}

              {!isLoadingDetail && (
                <div>
                  <label className="text-xs text-slate-500 font-semibold">บันทึกการตรวจรับ (รวม)</label>
                  <textarea
                    rows={2}
                    value={processNote}
                    onChange={(e) => setProcessNote(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="เช่น รับของครบตามนัด"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={closeProcessModal}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleProcess}
                disabled={isSaving || isLoadingDetail}
                className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 transition flex items-center gap-2 font-medium"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                บันทึกผลตรวจรับ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
