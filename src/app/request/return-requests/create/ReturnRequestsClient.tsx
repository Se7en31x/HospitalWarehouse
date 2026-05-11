"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import { Plus, Search, X, ChevronDown, ArrowLeft, RotateCcw, Package, ListChecks } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";
import { uploadDepartmentReturnSubmitAttachments } from "@/services/returnAttachmentService";
import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import { LIST_TABLE_HEAD_ROW } from "@/lib/tableUi";
import MutationLoader from "@/components/feedback/MutationLoader";
import ReturnAttachmentUploader from "@/components/returns/ReturnAttachmentUploader";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as Record<string, unknown>).message);
  }
  return String(error);
};

interface SelectedItem {
  item_id: string;
  item_name: string;
  in_use_qty: number;
  requested_qty: number;
  selected_unit_codes: string[];
}

const getNowDateTimeParts = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

const scrollBoxStyle: CSSProperties = {
  overflowX: "auto",
  overflowY: "auto",
  scrollbarWidth: "auto",
  msOverflowStyle: "auto",
};

function ItemThumb({ src, label }: { src?: string | null; label: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-11 w-11 rounded-lg object-cover border border-slate-200 bg-white shadow-sm shrink-0"
        title={label}
      />
    );
  }
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400"
      title={label}
    >
      <Package className="h-5 w-5" aria-hidden />
    </div>
  );
}

export default function ReturnRequestsClient() {
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [summaryItems, setSummaryItems] = useState<reusableSvc.ReturnableSummaryItem[]>([]);
  const [selectedUnitsByItem, setSelectedUnitsByItem] = useState<Record<string, reusableSvc.ReusableUnit[]>>({});

  const [pickupDate, setPickupDate] = useState(() => getNowDateTimeParts().date);
  const [pickupTime, setPickupTime] = useState(() => getNowDateTimeParts().time);
  const [note, setNote] = useState("");

  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKeyword, setPickerKeyword] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerItem, setPickerItem] = useState<reusableSvc.ReturnableSummaryItem | null>(null);
  const [pickerUnits, setPickerUnits] = useState<reusableSvc.ReusableUnit[]>([]);
  const [isDeptOpen, setIsDeptOpen] = useState(false);

  // Return attachments — uploaded after createReusableReturnRequest
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    departmentService.getDepartmentOptions().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!isDeptOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-department]")) {
        setIsDeptOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDeptOpen]);

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
        toast.error(getErrorMessage(error) || "ดึงรายการที่ส่งคืนได้ไม่สำเร็จ");
        setSummaryItems([]);
      })
      .finally(() => setIsLoadingSummary(false));
  }, [departmentId]);

  useEffect(() => {
    if (!isSubmitting) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isSubmitting]);

  const totalReturnable = useMemo(() => {
    return (summaryItems || []).reduce((sum, item) => sum + Number(item.in_use_qty || 0), 0);
  }, [summaryItems]);

  const sortedSummaryItems = useMemo(() => {
    return [...(summaryItems || [])].sort((a, b) => {
      const nameCompare = (a.item_name || "").localeCompare(b.item_name || "", "th");
      if (nameCompare !== 0) return nameCompare;
      return (a.item_code || "").localeCompare(b.item_code || "", "th");
    });
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

  const selectedDeptName = departments.find((d) => String(d.id) === departmentId)?.name || "-- กรุณาเลือกแผนก --";

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
        limit: 10,
        department_id: departmentId,
        status: "IN_USE",
        item_id: item.item_id,
      });

      const returnableUnits = (res.items || []).filter((unit) => unit.usage_context === "WITHDRAW");
      setPickerUnits(returnableUnits);
    } catch (error) {
      toast.error(getErrorMessage(error) || "ดึงรายการย่อยไม่สำเร็จ");
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

    if (!pickupDate?.trim() || !pickupTime?.trim()) {
      toast.error("กรุณาระบุวันที่และเวลานัดรับของ");
      return;
    }
    const pickupAt = new Date(`${pickupDate}T${pickupTime}`);
    if (Number.isNaN(pickupAt.getTime())) {
      toast.error("วันเวลานัดรับของไม่ถูกต้อง");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await reusableSvc.createReusableReturnRequest({
        department_id: departmentId,
        preferred_pickup_at: pickupAt.toISOString(),
        note: note || undefined,
        items: selectedList.map((item) => ({
          item_id: item.item_id,
          requested_qty: item.requested_qty,
          note: item.selected_unit_codes.length ? `UNITS:${item.selected_unit_codes.join(",")}` : undefined,
        })),
      });

      // Upload attachments (best-effort)
      let attachmentWarning: string | null = null;
      if (pendingFiles.length > 0 && created?.id) {
        try {
          await uploadDepartmentReturnSubmitAttachments(created.id, pendingFiles);
        } catch (uploadErr) {
          attachmentWarning = getErrorMessage(uploadErr);
        }
      }

      setIsSubmitting(false);

      if (attachmentWarning) {
        await Swal.fire({
          title: "สร้างคำขอสำเร็จ แต่อัปโหลดไฟล์ไม่ครบ",
          text: `${created.doc_no ? `เลขที่ ${created.doc_no} • ` : ""}${attachmentWarning}`,
          icon: "warning",
          confirmButtonText: "ตกลง",
        });
      } else {
        await Swal.fire({
          title: "สำเร็จ!",
          text: created.doc_no
            ? `บันทึกคำขอคืนคลังเรียบร้อย เลขที่ ${created.doc_no}`
            : "บันทึกคำขอคืนคลังเรียบร้อย",
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
      }

      setSelectedUnitsByItem({});
      setNote("");
      setPendingFiles([]);
      const next = getNowDateTimeParts();
      setPickupDate(next.date);
      setPickupTime(next.time);
      await reusableSvc.getReturnableWithdrawSummary(departmentId).then((res) => setSummaryItems(res.items || []));
    } catch (error) {
      toast.error(getErrorMessage(error) || "สร้างคำขอคืนไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">
      <Toaster position="top-right" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <PageHeadingIconBox icon={RotateCcw} tone="amber" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">ส่งคืนอุปกรณ์ทางการแพทย์</h2>
            <p className="text-sm text-slate-500 mt-0.5">เลือกอุปกรณ์ที่ต้องการคืนและกรอกข้อมูลการส่งคืน</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/request/return-requests")}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:self-start disabled:opacity-50 disabled:pointer-events-none"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          ย้อนกลับ
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm p-4 sm:p-5 md:p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">รายการที่ส่งคืนได้</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 md:items-stretch">
          <div className="border border-slate-200 rounded-lg p-4 h-full min-h-0 flex flex-col bg-slate-50/40">
            <div className="relative flex-1 min-h-0" data-filter-department>
              <label className="text-sm font-bold text-slate-800 uppercase mb-3 block">
                แผนก <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsDeptOpen(!isDeptOpen)}
                className="flex items-center justify-between gap-2 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm"
              >
                <span className="text-slate-800 font-medium truncate text-left">{selectedDeptName}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isDeptOpen ? "rotate-180" : ""}`} />
              </button>

              {isDeptOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-30 overflow-y-auto max-h-56"
                >
                  <ul className="py-1">
                    {departments.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setDepartmentId(String(d.id));
                            setIsDeptOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            String(d.id) === departmentId
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
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

          <div className="border border-slate-200 rounded-lg p-4 h-full min-h-0 flex flex-col bg-slate-50/40">
            <p className="text-sm font-bold text-slate-800 uppercase mb-3 shrink-0">วันเวลานัดรับของ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0 content-start">
              <div>
                <label htmlFor="return-pickup-date" className="text-xs text-slate-600 font-medium block mb-1.5">
                  วันที่
                </label>
                <input
                  id="return-pickup-date"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors hover:border-slate-400"
                />
              </div>
              <div>
                <label htmlFor="return-pickup-time" className="text-xs text-slate-600 font-medium block mb-1.5">
                  เวลา
                </label>
                <input
                  id="return-pickup-time"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors hover:border-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="return-request-note" className="text-sm font-bold text-slate-800 uppercase mb-3 block">
            หมายเหตุ
          </label>
          <textarea
            id="return-request-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="รายละเอียดเพิ่มเติม"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <div className="mb-4 border border-slate-200 rounded-lg p-4 bg-slate-50/40">
          <ReturnAttachmentUploader
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
            label="ภาพ/เอกสารแนบ (ไม่บังคับ)"
            helperText="แนบรูปสภาพอุปกรณ์ก่อนส่งคืน หรือเอกสารส่งมอบ — รองรับ JPEG, PNG, WEBP, HEIC, PDF (ไม่เกิน 10 MB)"
            disabled={isSubmitting}
          />
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          {departmentId && isLoadingSummary ? (
            <div className="max-h-96 min-h-[16rem] overflow-hidden flex flex-col">
              <span className="sr-only">กำลังโหลดรายการคืนได้</span>
              <DataTableSkeleton
                headers={["#", "รูป", "รหัส", "รายการ", "หมวดหมู่", "ถือใช้งานอยู่", "เลือกรายการย่อย"]}
                rowCount={8}
                ariaLabel="กำลังโหลดรายการคืนได้"
                minHeight="min-h-[12rem]"
                thClassName="px-2.5 py-2.5 whitespace-nowrap text-sm font-medium uppercase tracking-wide"
                tdClassName="px-2.5 py-2.5"
                theadClassName="bg-slate-50 text-slate-700 sticky top-0 z-10 shadow-[inset_0_-1px_0_0_#e2e8f0]"
              />
            </div>
          ) : (
            <div className="return-req-summary-scroll max-h-96 overflow-y-auto overflow-x-auto" style={scrollBoxStyle}>
              <style>{`
                .return-req-summary-scroll::-webkit-scrollbar { width: 0; height: 8px; }
                .return-req-summary-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
                .return-req-summary-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .return-req-summary-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
              `}</style>
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "32%" }} />
                </colgroup>
                <thead className={LIST_TABLE_HEAD_ROW}>
                  <tr>
                    <th className="px-2.5 py-3.5 text-center whitespace-nowrap">#</th>
                    <th className="px-2.5 py-3.5 text-center whitespace-nowrap">รูป</th>
                    <th className="px-2.5 py-3.5 whitespace-nowrap">รหัส</th>
                    <th className="px-2.5 py-3.5 whitespace-nowrap">รายการ</th>
                    <th className="px-2.5 py-3.5 whitespace-nowrap">หมวดหมู่</th>
                    <th className="px-2.5 py-3.5 text-center whitespace-nowrap">ถือใช้งานอยู่</th>
                    <th className="px-2.5 py-3.5 whitespace-nowrap">เลือกรายการย่อย</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-sm">
                  {!departmentId && (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <p className="text-sm font-medium">เลือกแผนกก่อน เพื่อแสดงรายการที่ส่งคืนได้</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {departmentId && !isLoadingSummary && sortedSummaryItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <p className="text-sm font-medium">ไม่มีรายการ Reusable ที่กำลังใช้งานจากการเบิกจ่าย</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {departmentId &&
                    !isLoadingSummary &&
                    sortedSummaryItems.map((item, idx) => (
                      <tr
                        key={item.item_id}
                        className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-2.5 py-2.5 text-center text-slate-500 tabular-nums align-middle">{idx + 1}</td>
                        <td className="px-2.5 py-2.5 align-middle">
                          <div className="flex justify-center">
                            <ItemThumb src={item.image_url} label={item.item_name || item.item_code || ""} />
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 font-mono text-slate-700 truncate align-middle" title={item.item_code || undefined}>
                          {item.item_code || "-"}
                        </td>
                        <td className="px-2.5 py-2.5 min-w-0 max-w-0 align-middle">
                          <p className="text-slate-800 truncate leading-snug" title={item.item_name || undefined}>
                            {item.item_name || "-"}
                          </p>
                        </td>
                        <td className="px-2.5 py-2.5 text-slate-700 truncate min-w-0 align-middle" title={item.category_name || undefined}>
                          {item.category_name || "-"}
                        </td>
                        <td className="px-2.5 py-2.5 text-center tabular-nums text-slate-800 align-middle">{item.in_use_qty}</td>
                        <td className="px-2.5 py-2.5 align-middle">
                          <button
                            type="button"
                            onClick={() => openItemPicker(item)}
                            disabled={isSubmitting}
                            className="group inline-flex w-full max-w-full items-center gap-2 rounded-lg border border-indigo-200/90 bg-gradient-to-b from-white to-indigo-50/80 px-3 py-2 text-left text-sm font-semibold text-indigo-950 shadow-sm transition-all hover:border-indigo-300 hover:to-indigo-100 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm group-hover:bg-indigo-700">
                              <ListChecks className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 truncate">เลือกรายการย่อย</span>
                            <span className="inline-flex min-w-[1.75rem] shrink-0 items-center justify-center rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white tabular-nums group-hover:bg-indigo-700">
                              {selectedUnitsByItem[item.item_id]?.length || 0}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            รวมทั้งหมดที่ส่งคืนได้: {totalReturnable} ชิ้น | เลือกแล้ว {selectedList.length} รายการใหญ่ ({selectedQtyTotal}{" "}
            รายการย่อย)
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedList.length || !departmentId}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-800 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Plus className="w-4 h-4 shrink-0" />
            ส่งคำขอคืนคลัง
          </button>
        </div>
      </div>

      <MutationLoader open={isSubmitting} message="กำลังส่งคำขอคืน..." />

      {pickerOpen && pickerItem && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-[52.8rem] max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/80">
              <div className="flex min-w-0 items-center gap-3">
                <ItemThumb src={pickerItem.image_url} label={pickerItem.item_name || pickerItem.item_code || ""} />
                <h3 className="text-lg font-bold text-slate-900 truncate">เลือกรายการย่อยที่จะส่งคืน</h3>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-transparent hover:border-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="relative w-full mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ค้นหา Unit Code / Serial..."
                  value={pickerKeyword}
                  onChange={(e) => setPickerKeyword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
                />
              </div>

              <div
                className="border border-slate-200 rounded-lg overflow-hidden bg-white h-[min(52vh,28rem)] min-h-[280px] overflow-y-auto overflow-x-auto"
                style={scrollBoxStyle}
              >
                {pickerLoading ? (
                  <div className="h-full min-h-[280px] p-1 bg-slate-50/30">
                    <span className="sr-only">กำลังโหลดรายการย่อย</span>
                    <DataTableSkeleton
                      headers={["", "รูป", "รายการพัสดุ", "รหัส", "Unit Code", "Serial"]}
                      rowCount={6}
                      ariaLabel="กำลังโหลดรายการย่อย"
                      minHeight="min-h-[260px]"
                      thClassName="px-2 py-3 whitespace-nowrap text-sm font-semibold uppercase tracking-wide"
                      tdClassName="px-2 py-2.5"
                      theadClassName="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0 z-10 shadow-[inset_0_-1px_0_0_#e2e8f0]"
                    />
                  </div>
                ) : (
                  <table className="w-full min-w-[44rem] table-fixed text-left text-sm">
                    <colgroup>
                      <col style={{ width: "2.75rem" }} />
                      <col style={{ width: "3.25rem" }} />
                      <col style={{ width: "26%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "auto" }} />
                    </colgroup>
                    <thead className={LIST_TABLE_HEAD_ROW}>
                      <tr>
                        <th className="px-3 py-3.5 text-center whitespace-nowrap" aria-label="เลือก" />
                        <th className="px-2 py-3.5 text-center whitespace-nowrap">รูป</th>
                        <th className="px-3 py-3.5 whitespace-nowrap">รายการพัสดุ</th>
                        <th className="px-3 py-3.5 whitespace-nowrap">รหัส</th>
                        <th className="px-3 py-3.5 whitespace-nowrap">Unit Code</th>
                        <th className="px-3 py-3.5 whitespace-nowrap">Serial</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 text-sm">
                      {filteredPickerUnits.map((unit) => {
                        const checked = (selectedUnitsByItem[pickerItem.item_id] || []).some((u) => u.id === unit.id);
                        return (
                          <tr key={unit.id} className="bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                            <td className="px-3 py-3 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleUnitSelection(unit)}
                                className="rounded border-slate-300"
                              />
                            </td>
                            <td className="px-2 py-3 align-middle">
                              <div className="flex justify-center">
                                <ItemThumb
                                  src={unit.item_image_url ?? pickerItem.image_url}
                                  label={unit.item_name || pickerItem.item_name || ""}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 min-w-0 max-w-0 truncate align-middle" title={unit.item_name || undefined}>
                              {unit.item_name || "-"}
                            </td>
                            <td className="px-3 py-3 font-mono truncate align-middle">{unit.item_code || "-"}</td>
                            <td className="px-3 py-3 font-mono truncate align-middle">{unit.unit_code}</td>
                            <td className="px-3 py-3 truncate align-middle">{unit.serial_no || "-"}</td>
                          </tr>
                        );
                      })}

                      {filteredPickerUnits.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-14 text-center text-slate-400 text-sm font-medium">
                            ไม่พบรายการย่อยที่ตรงเงื่อนไข
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="shrink-0 px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-slate-500">
                เลือกแล้ว {(selectedUnitsByItem[pickerItem.item_id] || []).length} รายการย่อย
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold transition-colors shadow-sm"
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
