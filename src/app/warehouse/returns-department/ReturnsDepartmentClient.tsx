"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Save, Trash2, X, Package, Search, Eye, FilterX } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";
import { deptDisplayName } from "@/utils/departmentUtils";
import { socket } from "@/lib/socket";
import {
  UnitFormTable,
  ItemFormTable,
  type ProcessItemForm,
  type ProcessUnitForm,
  RETURN_REQUEST_STATUS_LABEL,
  showToast,
} from "./ReturnForms";
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fmtDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("th-TH");
};

const getTotalItems = (items: reusableSvc.ReusableReturnRequestItem[]): number => {
  return items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0);
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const displayStatus = RETURN_REQUEST_STATUS_LABEL[status] || status;
  
  const getStatusColor = (s: string): string => {
    switch (s) {
      case "REQUESTED": return "bg-amber-100 text-amber-500";
      case "COMPLETED": return "bg-green-100 text-green-500";
      case "CANCELLED": return "bg-red-100 text-red-500";
      default: return "bg-slate-100 text-slate-500";
    }
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${getStatusColor(status)}`}>
      {displayStatus}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnsDepartmentClient() {
  // State - Data & Fetch
  const [records, setRecords] = useState<reusableSvc.ReusableReturnRequest[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);

  // State - Filters & UI
  const [activeTab, setActiveTab] = useState<"REQUESTED" | "COMPLETED">("REQUESTED");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRef = useRef(1);

  // State - Modal
  const [activeRequest, setActiveRequest] = useState<reusableSvc.ReusableReturnRequest | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [forms, setForms] = useState<ProcessItemForm[]>([]);
  const [unitForms, setUnitForms] = useState<ProcessUnitForm[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanOk, setScanOk] = useState<boolean | null>(null);
  const [scanResolvedType, setScanResolvedType] = useState<"UNIT" | "LOT" | "ITEM" | null>(null);
  const [processNote, setProcessNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  // Fetch Data
  const fetchData = useCallback(async (page: number = 1, tabStatus?: "REQUESTED" | "COMPLETED") => {
    setIsFetching(true);
    try {
      const response = await reusableSvc.getReusableReturnRequests({
        page,
        limit: 10,
        department_id: departmentFilter || undefined,
        status: tabStatus ?? activeTab,
      });
      setRecords(response.items || []);
      setServerTotal(response.total || 0);
      setServerTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error("fetch return requests failed", err);
      showToast.error("ดึงใบคำขอคืนจากแผนกไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, [departmentFilter, activeTab]);

  // Initialize & Load Options
  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
    fetchData(1);
  }, [fetchData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current) return;
      if (activeRequest || isLoadingDetail || isSaving || deletingRequestId !== null) return;
      if (isRefreshingRef.current) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try {
          await fetchData(pageRef.current);
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 200);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REUSABLE_RETURN_REQUESTS") {
        scheduleRefresh();
      }
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchData, activeRequest, isLoadingDetail, isSaving, deletingRequestId]);

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
    const d = departments.find((dept) => String(dept.id) === departmentFilter);
    return d ? deptDisplayName(d.name || "") : "แผนกทั้งหมด";
  }, [departmentFilter, departments]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((rec) => {
      const matchesSearch =
        (rec.doc_no || "").toLowerCase().includes(term) ||
        (rec.department_name || "").toLowerCase().includes(term) ||
        (rec.requested_by_name || "").toLowerCase().includes(term);
      const matchDate =
        !startDate && !endDate
          ? true
          : (() => {
              const d = new Date(rec.preferred_pickup_at ?? "");
              const s = startDate ? new Date(startDate) : null;
              const e = endDate ? new Date(endDate) : null;
              return (!s || d >= s) && (!e || d <= e);
            })();
      return matchesSearch && matchDate;
    });
  }, [records, searchTerm, startDate, endDate]);

  // Event Handlers
  const openProcessModal = useCallback(async (request: reusableSvc.ReusableReturnRequest) => {
    setActiveRequest(request);
    setProcessNote("");
    setForms([]);
    setUnitForms([]);
    setScanInput("");
    setScanMessage("");
    setScanOk(null);
    setScanResolvedType(null);
    setCurrentPage(1);
    pageRef.current = 1;
    setIsLoadingDetail(true);

    try {
      const detail = await reusableSvc.getReusableReturnRequestById(request.id);
      setActiveRequest(detail);

      const unitRows: ProcessUnitForm[] = (detail.items || []).flatMap((item) =>
        (item.requested_units || []).map((unit) => ({
          unit_id: unit.id ? String(unit.id) : `CODE:${unit.unit_code}`,
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
      showToast.error(getErrorMessage(error) || "ดึงรายละเอียดใบคำขอไม่สำเร็จ");
      setActiveRequest(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const closeProcessModal = useCallback(() => {
    setActiveRequest(null);
    setForms([]);
    setUnitForms([]);
    setScanInput("");
    setScanMessage("");
    setScanOk(null);
    setScanResolvedType(null);
    setProcessNote("");
    setCurrentPage(1);
    pageRef.current = 1;
  }, []);

  const updateForm = useCallback((itemId: string, patch: Partial<ProcessItemForm>) => {
    setForms((prev) => prev.map((row) => (row.item_id === itemId ? { ...row, ...patch } : row)));
  }, []);

  const updateUnitForm = useCallback((unitId: string, patch: Partial<ProcessUnitForm>) => {
    setUnitForms((prev) => prev.map((row) => (row.unit_id === unitId ? { ...row, ...patch } : row)));
  }, []);

  const handleScanUnit = useCallback(() => {
    const run = async () => {
      const raw = scanInput.trim();
      if (!raw || !unitForms.length) return;

      const resolved = await reusableSvc.resolveReusableBarcode(raw, activeRequest?.department_id);
      setScanResolvedType(resolved?.type || null);

      if (resolved && resolved.type !== "UNIT") {
        setScanOk(false);
        setScanMessage(`สแกนได้เป็น ${resolved.type} แต่หน้านี้รองรับเฉพาะ UNIT`);
        return;
      }

      const resolvedUnitCode = resolved && resolved.type === "UNIT"
        ? resolved.unit.unit_code.toLowerCase()
        : "";
      const resolvedSerial = resolved && resolved.type === "UNIT"
        ? (resolved.unit.serial_no || "").toLowerCase()
        : "";

      const key = raw.toLowerCase();
      const target = unitForms.find((row) =>
        row.unit_code.toLowerCase() === key ||
        row.serial_no.toLowerCase() === key ||
        (resolvedUnitCode && row.unit_code.toLowerCase() === resolvedUnitCode) ||
        (resolvedSerial && row.serial_no.toLowerCase() === resolvedSerial)
      );

      if (!target) {
        setScanOk(false);
        setScanMessage(`ไม่พบรหัส ${raw} ในใบคำขอนี้`);
        return;
      }

      setUnitForms((prev) =>
        prev.map((row) => {
          if (row.unit_id !== target.unit_id) return row;
          const marker = `[SCN:${raw}]`;
          const nextNote = row.note?.includes(marker)
            ? row.note
            : [row.note, marker].filter(Boolean).join(" ");
          return {
            ...row,
            condition: "GOOD",
            note: nextNote,
          };
        })
      );

      setScanOk(true);
      setScanMessage(`พบ ${target.unit_code} และทำเครื่องหมายให้แล้ว`);
      setScanInput("");
    };

    void run();
  }, [scanInput, unitForms, activeRequest?.department_id]);

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
          showToast.error("กรุณาระบุจำนวนรับคืนอย่างน้อย 1 รายการ");
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

      showToast.success(`ปิดงานใบ ${activeRequest.doc_no} สำเร็จ`);
      closeProcessModal();
      fetchData(1);
    } catch (error) {
      showToast.error(getErrorMessage(error) || "บันทึกผลตรวจรับไม่สำเร็จ");
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
      showToast.success(`ลบคำขอ ${request.doc_no} เรียบร้อย`);
      fetchData(pageRef.current);
    } catch (error) {
      showToast.error(getErrorMessage(error) || "ลบคำขอไม่สำเร็จ");
    } finally {
      setDeletingRequestId(null);
    }
  }, [fetchData]);

  // Switch tab handler
  const handleTabChange = useCallback((tab: "REQUESTED" | "COMPLETED") => {
    setActiveTab(tab);
    setCurrentPage(1);
    pageRef.current = 1;
    setSearchTerm("");
    fetchData(1, tab);
  }, [fetchData]);

  // Render
  return (
    <div className="flex flex-col min-h-screen bg-white p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">รับคืนจากแผนก</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["REQUESTED", "COMPLETED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? tab === "REQUESTED"
                  ? "border-amber-500 text-amber-600 bg-amber-50"
                  : "border-green-500 text-green-600 bg-green-50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab === "REQUESTED" ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                รอดำเนินการ
                {activeTab === "REQUESTED" && serverTotal > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {serverTotal}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                เสร็จสิ้น
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา เลขที่ / แผนก / ผู้ขอ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
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
                      setCurrentPage(1);
                      pageRef.current = 1;
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
                        setCurrentPage(1);
                        pageRef.current = 1;
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${departmentFilter === String(d.id) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {deptDisplayName(d.name || "")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          startDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className={`absolute left-3 font-medium pointer-events-none transition-all duration-150 ${
            startDate || startDateFocused
              ? "-top-2 text-[10px] text-blue-500 bg-white px-1"
              : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
          }`}>วันที่เริ่มต้น</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light", opacity: startDate || startDateFocused ? 1 : 0 }}
          />
        </div>
        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          endDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className={`absolute left-3 font-medium pointer-events-none transition-all duration-150 ${
            endDate || endDateFocused
              ? "-top-2 text-[10px] text-blue-500 bg-white px-1"
              : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
          }`}>วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onFocus={() => setEndDateFocused(true)}
            onBlur={() => setEndDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light", opacity: endDate || endDateFocused ? 1 : 0 }}
          />
        </div>

        {/* Clear filters */}
        {(searchTerm || departmentFilter || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setDepartmentFilter("");
              setStartDate("");
              setEndDate("");
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: "65vh" }}>
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
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[140px]">เลขที่คำขอ</th>
                <th className="px-6 py-4 w-[150px]">แผนก</th>
                <th className="px-6 py-4 w-[140px]">ผู้ขอ</th>
                <th className="px-6 py-4 w-[155px]">เวลาคำขอ</th>
                <th className="px-6 py-4 w-[155px]">นัดรับของ</th>
                <th className="px-6 py-4 w-[90px]">รายการ</th>
                <th className="px-6 py-4 w-[110px]">สถานะ</th>
                <th className="px-6 py-4 w-[120px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-2.5 text-slate-700 text-xs">{idx + 1}</td>
                  <td className="px-6 py-2.5 font-mono text-sm text-black">{rec.doc_no}</td>
                  <td className="px-6 py-2.5 text-slate-700 text-sm">{deptDisplayName(rec.department_name || "")}</td>
                  <td className="px-6 py-2.5 text-slate-700 text-sm">{rec.requested_by_name || "-"}</td>
                  <td className="px-6 py-2.5 text-slate-600 text-xs">{fmtDateTime(rec.created_at)}</td>
                  <td className="px-6 py-2.5 text-slate-600 text-xs">{fmtDateTime(rec.preferred_pickup_at)}</td>
                  <td className="px-6 py-2.5 text-slate-700 text-sm text-left">{getTotalItems(rec.items)}</td>
                  <td className="px-6 py-2.5">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-6 py-2.5">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openProcessModal(rec)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="ดู"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {activeTab === "REQUESTED" && (
                        <button
                          onClick={() => handleDeleteRequest(rec)}
                          disabled={deletingRequestId === rec.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="ลบ"
                        >
                          {deletingRequestId === rec.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
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
        <p className="text-sm text-slate-500">แสดง {records.length} จาก {serverTotal} รายการ</p>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1} 
            onClick={() => {
              const newPage = currentPage - 1;
              setCurrentPage(newPage);
              pageRef.current = newPage;
              fetchData(newPage);
            }}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {currentPage} / {serverTotalPages || 1}</span>
          <button 
            disabled={currentPage >= serverTotalPages} 
            onClick={() => {
              const newPage = currentPage + 1;
              setCurrentPage(newPage);
              pageRef.current = newPage;
              fetchData(newPage);
            }}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed bg-white"
          >
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
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between flex-shrink-0">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">ตรวจรับคืนใบ {activeRequest.doc_no}</h3>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p><span className="font-medium">แผนก:</span> {deptDisplayName(activeRequest.department_name || "") || "-"}</p>
                  <p><span className="font-medium">ผู้ขอ:</span> {activeRequest.requested_by_name || '-'}</p>
                  <p><span className="font-medium">เวลาคำขอ:</span> {fmtDateTime(activeRequest.created_at)}</p>
                  <p><span className="font-medium">นัดรับ:</span> {fmtDateTime(activeRequest.preferred_pickup_at)}</p>
                </div>
              </div>
              <button 
                onClick={closeProcessModal} 
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition flex-shrink-0"
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

              {!isLoadingDetail && (
                <>
                  {/* Request Summary */}
                  <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">สรุปคำขอ</p>
                    <div className="grid grid-cols-2 gap-3 text-xs text-blue-800">
                      <div>
                        <span className="font-medium">เลขที่:</span> {activeRequest?.doc_no}
                      </div>
                      <div>
                        <span className="font-medium">สถานะ:</span> <StatusBadge status={activeRequest?.status || "REQUESTED"} />
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">จำนวนรายการ:</span> {getTotalItems(activeRequest?.items || [])} หน่วย
                      </div>
                      {activeRequest?.note && (
                        <div className="col-span-2">
                          <span className="font-medium">หมายเหตุ:</span> {activeRequest.note}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!isLoadingDetail && unitForms.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-3">รายชิ้นอุปกรณ์</p>
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label className="text-xs font-semibold text-slate-600">สแกนบาร์โค้ด (Unit Code / Serial)</label>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleScanUnit();
                          }
                        }}
                        placeholder="เช่น UNT-000123 หรือ SN-ABC"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleScanUnit}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        สแกน
                      </button>
                    </div>
                    {scanResolvedType && (
                      <div className="mt-2">
                        <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          TYPE: {scanResolvedType}
                        </span>
                      </div>
                    )}
                    {scanMessage && (
                      <p className={`mt-2 text-xs ${scanOk ? "text-emerald-700" : "text-rose-700"}`}>{scanMessage}</p>
                    )}
                  </div>
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
                {activeRequest.status === "COMPLETED" ? "ปิด" : "ยกเลิก"}
              </button>
              {activeRequest.status !== "COMPLETED" && (
                <button
                  onClick={handleProcess}
                  disabled={isSaving || isLoadingDetail}
                  className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 transition flex items-center gap-2 font-medium"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกผลตรวจรับ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
