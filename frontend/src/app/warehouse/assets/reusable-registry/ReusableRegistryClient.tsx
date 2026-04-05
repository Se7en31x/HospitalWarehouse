"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { ChevronDown, ChevronLeft, ChevronRight, Edit, Loader2, Search, X } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "พร้อมใช้งาน",
  IN_USE: "กำลังใช้งาน",
  REPAIR: "ส่งซ่อม",
  DISPOSED: "จำหน่ายออก",
};

const getStatusLabel = (unit: reusableSvc.ReusableUnit) => {
  if (unit.status !== "IN_USE") return STATUS_LABEL[unit.status] || unit.status;
  if (unit.usage_context === "BORROW") return "ถูกยืม (อยู่ระหว่างการยืม)";
  if (unit.usage_context === "WITHDRAW") return "กำลังใช้งาน";
  return STATUS_LABEL.IN_USE;
};

const CONDITION_LABEL: Record<string, string> = {
  GOOD: "ปกติ",
  DAMAGED: "ชำรุด",
  INCOMPLETE: "ไม่ครบ",
  LOST: "สูญหาย",
  BROKEN: "ชำรุดหนัก",
};

export default function ReusableRegistryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("itemId") || "";

  const [records, setRecords] = useState<reusableSvc.ReusableUnit[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [keyword, setKeyword] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const limit = 10;

  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const [editingUnit, setEditingUnit] = useState<reusableSvc.ReusableUnit | null>(null);
  const [editPayload, setEditPayload] = useState({
    serial_no: "",
    department_id: "",
    status: "AVAILABLE",
    condition: "GOOD",
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-dept]")) setIsDeptOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
    };

    if (isDeptOpen || isStatusOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDeptOpen, isStatusOpen]);

  const fetchData = useCallback(async () => {
    if (!itemId) return;

    setIsFetching(true);
    try {
      const response = await reusableSvc.getReusableUnits({
        page,
        limit,
        keyword: keyword || undefined,
        department_id: departmentFilter || undefined,
        status: statusFilter || undefined,
        item_id: itemId,
      });

      setRecords(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch {
      toast.error("ดึงข้อมูลทะเบียนรายชิ้นไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  }, [page, keyword, departmentFilter, statusFilter, itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedDeptLabel = useMemo(() => {
    if (!departmentFilter) return "แผนกทั้งหมด";
    return departments.find((d) => String(d.id) === departmentFilter)?.name || "แผนกทั้งหมด";
  }, [departmentFilter, departments]);

  const selectedStatusLabel = statusFilter
    ? statusFilter === "IN_USE"
      ? "กำลังใช้งาน/ถูกยืม"
      : STATUS_LABEL[statusFilter] || "ทุกสถานะ"
    : "ทุกสถานะ";

  const title = records[0]?.item_name || "ทะเบียนของใช้ซ้ำรายชิ้น";
  const code = records[0]?.item_code || itemId || "-";

  const openEdit = (unit: reusableSvc.ReusableUnit) => {
    setEditingUnit(unit);
    setEditPayload({
      serial_no: unit.serial_no || "",
      department_id: unit.department_id ? String(unit.department_id) : "",
      status: unit.status || "AVAILABLE",
      condition: unit.condition || "GOOD",
      note: unit.note || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUnit) return;

    setIsSaving(true);
    try {
      await reusableSvc.updateReusableUnit(editingUnit.id, {
        serial_no: editPayload.serial_no || null,
        department_id: editPayload.department_id ? Number(editPayload.department_id) : null,
        status: editPayload.status,
        condition: editPayload.condition,
        note: editPayload.note || null,
      });

      toast.success("บันทึกข้อมูลรายชิ้นสำเร็จ");
      setEditingUnit(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  if (!itemId) {
    return <div className="p-20 text-center font-bold text-slate-300">ไม่พบรายการที่ต้องการ</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">รหัส: {code} — ทะเบียนของใช้ซ้ำรายชิ้น</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
        >
          ย้อนกลับ
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา Unit Code / Serial..."
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        <div className="relative" data-filter-dept>
          <button
            type="button"
            onClick={() => {
              setIsDeptOpen(!isDeptOpen);
              setIsStatusOpen(false);
            }}
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
                      setPage(1);
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
                        setPage(1);
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

        <div className="relative" data-filter-status>
          <button
            type="button"
            onClick={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsDeptOpen(false);
            }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[220px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatusLabel}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("");
                      setIsStatusOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!statusFilter ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    ทุกสถานะ
                  </button>
                </li>
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter(key);
                        setIsStatusOpen(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${statusFilter === key ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>

      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[60px]">#</th>
                <th className="px-6 py-4 w-[160px]">Unit Code</th>
                <th className="px-6 py-4 w-[170px]">Serial</th>
                <th className="px-6 py-4 w-[170px]">แผนก</th>
                <th className="px-6 py-4 w-[130px]">สถานะ</th>
                <th className="px-6 py-4 w-[130px]">สภาพ</th>
                <th className="px-6 py-4 w-[170px]">เอกสารรับเข้า</th>
                <th className="px-6 py-4">หมายเหตุ</th>
                <th className="px-6 py-4 w-[90px] text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{(page - 1) * limit + idx + 1}</td>
                  <td className="px-6 py-4 font-mono text-xs">{rec.unit_code}</td>
                  <td className="px-6 py-4">{rec.serial_no || "-"}</td>
                  <td className="px-6 py-4">{rec.department_name || "ส่วนกลาง"}</td>
                  <td className="px-6 py-4">{getStatusLabel(rec)}</td>
                  <td className="px-6 py-4">{CONDITION_LABEL[rec.condition] || rec.condition}</td>
                  <td className="px-6 py-4">{rec.receive_doc_no || "-"}</td>
                  <td className="px-6 py-4">{rec.note || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(rec)}
                      className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <p className="text-sm font-medium">ไม่พบข้อมูลทะเบียนรายชิ้น</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUnit && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setEditingUnit(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">แก้ไขข้อมูลรายชิ้น</h3>
              <button onClick={() => setEditingUnit(null)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Unit Code</label>
                <input value={editingUnit.unit_code} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Serial No</label>
                <input
                  value={editPayload.serial_no}
                  onChange={(e) => setEditPayload((prev) => ({ ...prev, serial_no: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">แผนก</label>
                <select
                  value={editPayload.department_id}
                  onChange={(e) => setEditPayload((prev) => ({ ...prev, department_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">ส่วนกลาง</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">สถานะ</label>
                <select
                  value={editPayload.status}
                  onChange={(e) => setEditPayload((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="AVAILABLE">พร้อมใช้งาน</option>
                  <option value="IN_USE">กำลังใช้งาน/ถูกยืม</option>
                  <option value="REPAIR">ส่งซ่อม</option>
                  <option value="DISPOSED">จำหน่ายออก</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">สภาพ</label>
                <select
                  value={editPayload.condition}
                  onChange={(e) => setEditPayload((prev) => ({ ...prev, condition: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="GOOD">ปกติ</option>
                  <option value="DAMAGED">ชำรุด</option>
                  <option value="LOST">สูญหาย</option>
                  <option value="BROKEN">ชำรุดหนัก</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1">หมายเหตุ</label>
                <textarea
                  rows={3}
                  value={editPayload.note}
                  onChange={(e) => setEditPayload((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setEditingUnit(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100">
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {records.length} จาก {total} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-2 border rounded-lg disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">หน้า {page} / {totalPages || 1}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 border rounded-lg disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
