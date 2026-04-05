"use client";

import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Plus, RefreshCw, Search, X } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";

interface SelectedItem {
  item_id: string;
  item_name: string;
  in_use_qty: number;
  requested_qty: number;
  selected_unit_codes: string[];
}

const toInputDateTimeLocal = (date = new Date()) => {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ReturnRequestsClient() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [summaryItems, setSummaryItems] = useState<reusableSvc.ReturnableSummaryItem[]>([]);
  const [selectedUnitsByItem, setSelectedUnitsByItem] = useState<Record<string, reusableSvc.ReusableUnit[]>>({});

  const [preferredPickupAt, setPreferredPickupAt] = useState(toInputDateTimeLocal());
  const [note, setNote] = useState("");

  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKeyword, setPickerKeyword] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerItem, setPickerItem] = useState<reusableSvc.ReturnableSummaryItem | null>(null);
  const [pickerUnits, setPickerUnits] = useState<reusableSvc.ReusableUnit[]>([]);

  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setSummaryItems([]);
      setSelectedUnitsByItem({});
      return;
    }

    setIsLoadingSummary(true);
    reusableSvc
      .getReturnableWithdrawSummary(departmentId)
      .then((res) => {
        setSummaryItems(res.items || []);
        setSelectedUnitsByItem({});
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "ดึงรายการที่ส่งคืนได้ไม่สำเร็จ");
        setSummaryItems([]);
      })
      .finally(() => setIsLoadingSummary(false));
  }, [departmentId]);

  const totalReturnable = useMemo(() => {
    return (summaryItems || []).reduce((sum, item) => sum + Number(item.in_use_qty || 0), 0);
  }, [summaryItems]);

  const summaryMap = useMemo(() => {
    return new Map((summaryItems || []).map((item) => [item.item_id, item]));
  }, [summaryItems]);

  const selectedList = useMemo(() => {
    return Object.entries(selectedUnitsByItem)
      .filter(([, units]) => (units || []).length > 0)
      .map(([itemId, units]) => {
        const item = summaryMap.get(itemId);
        return {
          item_id: itemId,
          item_name: item?.item_name || "-",
          in_use_qty: Number(item?.in_use_qty || 0),
          requested_qty: units.length,
          selected_unit_codes: units.map((u) => u.unit_code).filter(Boolean),
        } as SelectedItem;
      });
  }, [selectedUnitsByItem, summaryMap]);

  const selectedQtyTotal = useMemo(() => {
    return selectedList.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0);
  }, [selectedList]);

  const openItemPicker = async (item: reusableSvc.ReturnableSummaryItem) => {
    if (!departmentId) {
      toast.error("กรุณาเลือกแผนกก่อน");
      return;
    }

    setPickerItem(item);
    setPickerKeyword("");
    setPickerUnits([]);
    setPickerOpen(true);
    setPickerLoading(true);

    try {
      const res = await reusableSvc.getReusableUnits({
        page: 1,
        limit: 100,
        department_id: departmentId,
        status: "IN_USE",
        item_id: item.item_id,
      });

      const returnableUnits = (res.items || []).filter((unit) => unit.usage_context === "WITHDRAW");
      setPickerUnits(returnableUnits);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ดึงรายการย่อยไม่สำเร็จ");
      setPickerOpen(false);
    } finally {
      setPickerLoading(false);
    }
  };

  const toggleUnitSelection = (unit: reusableSvc.ReusableUnit) => {
    if (!pickerItem) return;
    const itemId = pickerItem.item_id;

    setSelectedUnitsByItem((prev) => {
      const current = prev[itemId] || [];
      const exists = current.some((u) => u.id === unit.id);

      if (exists) {
        return {
          ...prev,
          [itemId]: current.filter((u) => u.id !== unit.id),
        };
      }

      return {
        ...prev,
        [itemId]: [...current, unit],
      };
    });
  };

  const filteredPickerUnits = useMemo(() => {
    const keyword = pickerKeyword.toLowerCase();
    return (pickerUnits || []).filter((unit) => {
      return (unit.unit_code || "").toLowerCase().includes(keyword) || (unit.serial_no || "").toLowerCase().includes(keyword);
    });
  }, [pickerKeyword, pickerUnits]);

  const handleSubmit = async () => {
    if (!departmentId) {
      toast.error("กรุณาเลือกแผนก");
      return;
    }

    if (!selectedList.length) {
      toast.error("กรุณาเลือกรายการย่อยอย่างน้อย 1 รายการ");
      return;
    }

    if (preferredPickupAt) {
      const pickupDate = new Date(preferredPickupAt);
      if (Number.isNaN(pickupDate.getTime())) {
        toast.error("วันเวลานัดรับของไม่ถูกต้อง");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const created = await reusableSvc.createReusableReturnRequest({
        department_id: Number(departmentId),
        preferred_pickup_at: preferredPickupAt ? new Date(preferredPickupAt).toISOString() : undefined,
        note: note || undefined,
        items: selectedList.map((item) => ({
          item_id: item.item_id,
          requested_qty: item.requested_qty,
          note: item.selected_unit_codes.length ? `UNITS:${item.selected_unit_codes.join(",")}` : undefined,
        })),
      });

      toast.success(`สร้างคำขอคืนสำเร็จ: ${created.doc_no}`);
      setSelectedUnitsByItem({});
      setNote("");
      await reusableSvc.getReturnableWithdrawSummary(departmentId).then((res) => setSummaryItems(res.items || []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สร้างคำขอคืนไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 gap-6">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">ส่งคืนคลัง (Reusable)</h2>
          <p className="text-sm text-slate-500 mt-1">เลือกรายการใหญ่ก่อน แล้วเข้าไปเลือกรายการย่อยรายตัวที่จะส่งคืน</p>
        </div>
        <button
          onClick={() => {
            if (departmentId) {
              reusableSvc.getReturnableWithdrawSummary(departmentId).then((res) => setSummaryItems(res.items || []));
            }
          }}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> รีเฟรช
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">รายการที่ส่งคืนได้</h3>

        <div className="max-w-md mb-4">
          <label className="text-xs text-slate-500">แผนก</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">เลือกแผนก</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">รายการ</th>
                <th className="text-left px-4 py-3 w-48">รหัสรายการ</th>
                <th className="text-left px-4 py-3 w-36">ถือใช้งานอยู่</th>
                <th className="text-left px-4 py-3 w-56">เลือกรายการย่อย</th>
              </tr>
            </thead>
            <tbody>
              {!departmentId && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">เลือกแผนกก่อน เพื่อแสดงรายการที่ส่งคืนได้</td>
                </tr>
              )}

              {departmentId && isLoadingSummary && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">กำลังโหลด...</td>
                </tr>
              )}

              {departmentId && !isLoadingSummary && summaryItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">ไม่มีรายการ Reusable ที่กำลังใช้งานจากการเบิกจ่าย</td>
                </tr>
              )}

              {departmentId &&
                !isLoadingSummary &&
                summaryItems.map((item) => (
                  <tr key={item.item_id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.item_name || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.item_code || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{item.in_use_qty}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openItemPicker(item)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        เลือกรายการย่อย ({selectedUnitsByItem[item.item_id]?.length || 0})
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            รวมทั้งหมดที่ส่งคืนได้: {totalReturnable} ชิ้น | เลือกแล้ว {selectedList.length} รายการใหญ่ ({selectedQtyTotal} รายการย่อย)
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">2) รายละเอียดคำขอคืน</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-500">วันเวลานัดรับของ</label>
            <input
              type="datetime-local"
              value={preferredPickupAt}
              onChange={(e) => setPreferredPickupAt(e.target.value)}
              className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-500">หมายเหตุ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="รายละเอียดเพิ่มเติม"
            className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedList.length || !departmentId}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:bg-slate-300 inline-flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} ส่งคำขอคืนคลัง
          </button>
        </div>
      </div>

      {pickerOpen && pickerItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">เลือกรายการย่อยที่จะส่งคืน</h3>
                <p className="text-xs text-slate-500 mt-0.5">{pickerItem.item_name || "-"} ({pickerItem.item_code || "-"})</p>
              </div>
              <button onClick={() => setPickerOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="relative w-full mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ค้นหา Unit Code / Serial..."
                  value={pickerKeyword}
                  onChange={(e) => setPickerKeyword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 w-12"></th>
                      <th className="text-left px-4 py-3 w-[220px]">Unit Code</th>
                      <th className="text-left px-4 py-3">Serial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerLoading && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500">กำลังโหลด...</td>
                      </tr>
                    )}

                    {!pickerLoading &&
                      filteredPickerUnits.map((unit) => {
                        const checked = (selectedUnitsByItem[pickerItem.item_id] || []).some((u) => u.id === unit.id);
                        return (
                          <tr key={unit.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={checked} onChange={() => toggleUnitSelection(unit)} />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{unit.unit_code}</td>
                            <td className="px-4 py-3">{unit.serial_no || "-"}</td>
                          </tr>
                        );
                      })}

                    {!pickerLoading && filteredPickerUnits.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400">ไม่พบรายการย่อยที่ตรงเงื่อนไข</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">เลือกแล้ว {(selectedUnitsByItem[pickerItem.item_id] || []).length} รายการย่อย</p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
