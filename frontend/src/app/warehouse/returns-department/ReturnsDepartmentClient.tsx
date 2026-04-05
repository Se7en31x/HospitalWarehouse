"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ChevronDown, Loader2, RefreshCw, Save, Trash2, X } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";

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

const RETURN_REQUEST_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "รอคลังรับงาน",
  PROCESSING: "กำลังตรวจรับ",
  COMPLETED: "ปิดงานแล้ว",
};

const CONDITION_LABEL: Record<string, string> = {
  GOOD: "ปกติ",
  DAMAGED: "ชำรุด",
  LOST: "สูญหาย",
};

export default function ReturnsDepartmentClient() {
  const [records, setRecords] = useState<reusableSvc.ReusableReturnRequest[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const [activeRequest, setActiveRequest] = useState<reusableSvc.ReusableReturnRequest | null>(null);
  const [forms, setForms] = useState<ProcessItemForm[]>([]);
  const [unitForms, setUnitForms] = useState<ProcessUnitForm[]>([]);
  const [processNote, setProcessNote] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);

  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-dept]")) setIsDeptOpen(false);
    };

    if (isDeptOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDeptOpen]);

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
    } catch {
      toast.error("ดึงใบคำขอคืนจากแผนกไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, [departmentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedDeptLabel = useMemo(() => {
    if (!departmentFilter) return "แผนกทั้งหมด";
    return departments.find((d) => String(d.id) === departmentFilter)?.name || "แผนกทั้งหมด";
  }, [departmentFilter, departments]);

  const openProcessModal = async (request: reusableSvc.ReusableReturnRequest) => {
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
      toast.error(error instanceof Error ? error.message : "ดึงรายละเอียดใบคำขอไม่สำเร็จ");
      setActiveRequest(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const updateForm = (itemId: string, patch: Partial<ProcessItemForm>) => {
    setForms((prev) => prev.map((row) => (row.item_id === itemId ? { ...row, ...patch } : row)));
  };

  const updateUnitForm = (unitId: string, patch: Partial<ProcessUnitForm>) => {
    setUnitForms((prev) => prev.map((row) => (row.unit_id === unitId ? { ...row, ...patch } : row)));
  };

  const handleProcess = async () => {
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
      setActiveRequest(null);
      setForms([]);
      setUnitForms([]);
      setProcessNote("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกผลตรวจรับไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = async (request: reusableSvc.ReusableReturnRequest) => {
    const confirmed = window.confirm(`ยืนยันลบคำขอ ${request.doc_no} ?`);
    if (!confirmed) return;

    setDeletingRequestId(request.id);
    try {
      await reusableSvc.deleteReusableReturnRequest(request.id);
      toast.success(`ลบคำขอ ${request.doc_no} เรียบร้อย`);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบคำขอไม่สำเร็จ");
    } finally {
      setDeletingRequestId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">รับคืนจากแผนก</h2>
          <p className="text-sm text-slate-500 mt-1">ทำงานจากใบคำขอคืน: คลังรับของ ตรวจสภาพ และอัปเดตสถานะรายชิ้นใน Reusable</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative" data-filter-dept>
          <button
            type="button"
            onClick={() => setIsDeptOpen((prev) => !prev)}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[220px] justify-between"
          >
            <span className="text-slate-800 font-medium truncate">{selectedDeptLabel}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDeptOpen ? "rotate-180" : ""}`} />
          </button>
          {isDeptOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
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

      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative">
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-[70px]">#</th>
                <th className="px-6 py-4 w-[170px]">เลขที่คำขอ</th>
                <th className="px-6 py-4 w-[180px]">แผนก</th>
                <th className="px-6 py-4 w-[180px]">นัดรับของ</th>
                <th className="px-6 py-4 w-[140px]">สถานะ</th>
                <th className="px-6 py-4 w-[120px] text-center">จำนวนรายการ</th>
                <th className="px-6 py-4">ผู้ประสานงาน</th>
                <th className="px-6 py-4 w-[160px] text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{idx + 1}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{rec.doc_no}</td>
                  <td className="px-6 py-4">{rec.department_name || "-"}</td>
                  <td className="px-6 py-4">{rec.preferred_pickup_at ? new Date(rec.preferred_pickup_at).toLocaleString("th-TH") : "-"}</td>
                  <td className="px-6 py-4">{RETURN_REQUEST_STATUS_LABEL[rec.status] || rec.status}</td>
                  <td className="px-6 py-4 text-center">{rec.items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0)}</td>
                  <td className="px-6 py-4">{rec.contact_name || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteRequest(rec)}
                        disabled={deletingRequestId === rec.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300 inline-flex items-center gap-1"
                      >
                        {deletingRequestId === rec.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        ลบคำขอ
                      </button>
                      <button
                        onClick={() => openProcessModal(rec)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        ตรวจรับและปิดงาน
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <p className="text-sm font-medium">ไม่พบใบคำขอคืนที่รอคลังดำเนินการ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setActiveRequest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">ตรวจรับคืนใบ {activeRequest.doc_no}</h3>
              <button onClick={() => setActiveRequest(null)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {isLoadingDetail && (
                <div className="py-10 flex items-center justify-center text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังโหลดรายละเอียดรายชิ้น...
                </div>
              )}

              {!isLoadingDetail && unitForms.length > 0 && (
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
                      {unitForms.map((row) => (
                        <tr key={row.unit_id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.unit_code}</td>
                          <td className="px-4 py-3">{row.serial_no}</td>
                          <td className="px-4 py-3 font-medium">{row.item_name}</td>
                          <td className="px-4 py-3">
                            <select
                              value={row.condition}
                              onChange={(e) => updateUnitForm(row.unit_id, { condition: e.target.value as ProcessUnitForm["condition"] })}
                              className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                            >
                              <option value="GOOD">{CONDITION_LABEL.GOOD}</option>
                              <option value="DAMAGED">{CONDITION_LABEL.DAMAGED}</option>
                              <option value="LOST">{CONDITION_LABEL.LOST}</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={row.note}
                              onChange={(e) => updateUnitForm(row.unit_id, { note: e.target.value })}
                              placeholder="หมายเหตุรายชิ้น"
                              className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!isLoadingDetail && unitForms.length === 0 && (
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
                    {forms.map((row) => (
                      <tr key={row.item_id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{row.item_name}</td>
                        <td className="px-4 py-3">{row.requested_qty}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={row.requested_qty}
                            value={row.return_qty}
                            onChange={(e) => updateForm(row.item_id, { return_qty: Math.max(0, Math.min(row.requested_qty, Number(e.target.value || 0))) })}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1.5"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.condition}
                            onChange={(e) => updateForm(row.item_id, { condition: e.target.value as ProcessItemForm["condition"] })}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                          >
                            <option value="GOOD">{CONDITION_LABEL.GOOD}</option>
                            <option value="DAMAGED">{CONDITION_LABEL.DAMAGED}</option>
                            <option value="LOST">{CONDITION_LABEL.LOST}</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={row.note}
                            onChange={(e) => updateForm(row.item_id, { note: e.target.value })}
                            placeholder="หมายเหตุ"
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              <div className="mt-4">
                <label className="text-xs text-slate-500">บันทึกการตรวจรับ (รวม)</label>
                <textarea
                  rows={2}
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="เช่น รับของครบตามนัด"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setActiveRequest(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100">
                ยกเลิก
              </button>
              <button
                onClick={handleProcess}
                disabled={isSaving}
                className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 flex items-center gap-2"
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
