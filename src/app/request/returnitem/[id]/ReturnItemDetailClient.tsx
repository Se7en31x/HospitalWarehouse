"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  FileText, Package, Loader2, Minus, Plus, CheckCircle,
  ChevronDown, X, ClipboardList,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getRequisitionById, submitReturn, ReturnItemPayload } from "@/services/requisitionService";
import type { RequisitionHeader, OutstandingUnit, IssuedUnit } from "@/types/requisition_type";

const MySwal = withReactContent(Swal);
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UiStatus = "รอการคืน" | "คืนแล้ว" | "รออนุมัติ" | "รอตรวจรับคืน" | "ค้างคืน" | "ยกเลิก" | "ถูกปฏิเสธ";

const mapUiStatus = (header: RequisitionHeader): UiStatus => {
  if (header.status === "BORROWING") {
    if (header.due_date && new Date(header.due_date) < new Date()) return "ค้างคืน";
    return "รอการคืน";
  }
  if (header.status === "PENDING_RETURN_CHECK") return "รอตรวจรับคืน";
  if (header.status === "COMPLETED") return "คืนแล้ว";
  if (header.status === "PENDING") return "รออนุมัติ";
  if (header.status === "CANCELLED") return "ยกเลิก";
  if (header.status === "REJECTED") return "ถูกปฏิเสธ";
  return "รออนุมัติ";
};

const getDaysOverdue = (header: RequisitionHeader): number => {
  if (!header.due_date || header.status !== "BORROWING") return 0;
  const due = new Date(header.due_date);
  const today = new Date();
  if (due >= today) return 0;
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
};

const isExternal = (header: RequisitionHeader): boolean => !!header.borrower_details;

const getBorrowerDisplay = (header: RequisitionHeader): string => {
  const bd = header.borrower_details;
  if (bd) return [bd.firstname, bd.lastname].filter(Boolean).join(" ") || "บุคคลภายนอก";
  return header.requester || "ไม่ระบุ";
};

const getStatusBadgeColor = (status: UiStatus) => {
  switch (status) {
    case "รอการคืน":      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ค้างคืน":       return "bg-red-50 text-red-700 border-red-200";
    case "คืนแล้ว":       return "bg-blue-50 text-blue-700 border-blue-200";
    case "รออนุมัติ":     return "bg-blue-50 text-blue-700 border-blue-200";
    case "รอตรวจรับคืน":  return "bg-sky-50 text-sky-800 border-sky-200";
    case "ยกเลิก":        return "bg-gray-50 text-gray-600 border-gray-200";
    case "ถูกปฏิเสธ":     return "bg-rose-50 text-rose-700 border-rose-200";
    default:               return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const fmtDate = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

// ─── Condition options ────────────────────────────────────────────────────────

type ReturnCondition = "GOOD" | "DAMAGED" | "LOST" | "INCOMPLETE";

const conditionOptions: { value: ReturnCondition; label: string; badge: string }[] = [
  { value: "GOOD",       label: "สภาพดี",        badge: "bg-green-100 text-green-700 border-green-200" },
  { value: "DAMAGED",    label: "ชำรุด/เสียหาย", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "LOST",       label: "สูญหาย",        badge: "bg-red-100 text-red-700 border-red-200" },
  { value: "INCOMPLETE", label: "คืนไม่ครบ",     badge: "bg-purple-100 text-purple-700 border-purple-200" },
];

// ─── State types ──────────────────────────────────────────────────────────────

interface ConsumableReturnRow {
  req_item_id: number;
  qty_returned: number;
  condition: ReturnCondition;
  note: string;
  max: number;
  name: string;
  code: string;
  image_url?: string | null;
  isConditionOpen?: boolean;
}

interface UnitSelection {
  unit_id: string;
  unit_code: string;
  serial_no: string | null;
  condition: ReturnCondition;
  note: string;
  isConditionOpen?: boolean;
}

// ─── Unit Selection Modal ─────────────────────────────────────────────────────

function UnitSelectionModal({
  itemName,
  itemCode,
  outstandingUnits,
  initial,
  onConfirm,
  onClose,
}: {
  itemName: string;
  itemCode: string;
  outstandingUnits: OutstandingUnit[];
  initial: UnitSelection[];
  onConfirm: (selections: UnitSelection[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Map<string, UnitSelection>>(() => {
    const m = new Map<string, UnitSelection>();
    initial.forEach(s => m.set(s.unit_id, { ...s }));
    return m;
  });

  const toggle = (unit: OutstandingUnit) => {
    setDraft(prev => {
      const next = new Map(prev);
      if (next.has(unit.id)) {
        next.delete(unit.id);
      } else {
        next.set(unit.id, {
          unit_id: unit.id,
          unit_code: unit.unit_code,
          serial_no: unit.serial_no,
          condition: "GOOD",
          note: "",
          isConditionOpen: false,
        });
      }
      return next;
    });
  };

  const patch = (unit_id: string, update: Partial<UnitSelection>) => {
    setDraft(prev => {
      const next = new Map(prev);
      const cur = next.get(unit_id);
      if (cur) next.set(unit_id, { ...cur, ...update });
      return next;
    });
  };

  const selectedCount = draft.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">เลือกครุภัณฑ์ที่คืน</p>
            <h3 className="font-bold text-lg text-slate-800 leading-tight">{itemName}</h3>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{itemCode}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          <p className="text-xs text-slate-500 mb-3">
            ทำเครื่องหมายครุภัณฑ์ที่ต้องการคืน และระบุสภาพแต่ละชิ้น
          </p>

          {outstandingUnits.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">ไม่มีครุภัณฑ์ค้างอยู่</p>
            </div>
          )}

          {outstandingUnits.map(unit => {
            const sel = draft.get(unit.id);
            const isSel = !!sel;
            return (
              <div
                key={unit.id}
                className={`rounded-xl border transition-all ${isSel ? "border-blue-300 bg-blue-50/40 shadow-sm" : "border-slate-200 bg-white"}`}
              >
                {/* Unit toggle row */}
                <button
                  type="button"
                  onClick={() => toggle(unit)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"}`}>
                    {isSel && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-mono font-bold text-slate-700">{unit.unit_code}</span>
                  {unit.serial_no && (
                    <span className="text-xs text-slate-400">S/N: {unit.serial_no}</span>
                  )}
                  {isSel && sel!.condition !== "GOOD" && (
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${conditionOptions.find(o => o.value === sel!.condition)?.badge}`}>
                      {conditionOptions.find(o => o.value === sel!.condition)?.label}
                    </span>
                  )}
                </button>

                {/* Condition + note (visible when selected) */}
                {isSel && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 flex flex-wrap gap-3 items-start">
                    {/* Condition dropdown */}
                    <div className="relative">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">สภาพ</p>
                      <button
                        type="button"
                        onClick={() => patch(unit.id, { isConditionOpen: !sel!.isConditionOpen })}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-slate-300 shadow-sm min-w-[150px] justify-between"
                      >
                        <span className="font-semibold text-slate-800">
                          {conditionOptions.find(o => o.value === sel!.condition)?.label || "สภาพดี"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${sel!.isConditionOpen ? "rotate-180" : ""}`} />
                      </button>
                      {sel!.isConditionOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-40 min-w-[160px]">
                          {conditionOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => patch(unit.id, { condition: opt.value, isConditionOpen: false })}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${sel!.condition === opt.value ? "text-blue-700 font-semibold bg-blue-50" : "text-slate-700"}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">หมายเหตุ</p>
                      <input
                        type="text"
                        value={sel!.note}
                        onChange={e => patch(unit.id, { note: e.target.value })}
                        placeholder={sel!.condition === "LOST" ? "อธิบายสาเหตุการสูญหาย..." : "หมายเหตุ (ถ้ามี)"}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl flex-shrink-0">
          <p className="text-sm text-slate-600">
            คืน{" "}
            <span className="font-bold text-blue-600 text-base">{selectedCount}</span>
            {" "}จาก{" "}
            <span className="font-bold text-slate-700">{outstandingUnits.length}</span>
            {" "}ชิ้น
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => onConfirm(Array.from(draft.values()))}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              ยืนยัน{selectedCount > 0 ? ` (${selectedCount} ชิ้น)` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReturnItemDetailClientProps {
  returnId: string | number;
}

export default function ReturnItemDetailClient({ returnId }: ReturnItemDetailClientProps) {
  const router = useRouter();
  const [header, setHeader] = useState<RequisitionHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedId = useMemo(() => {
    if (typeof returnId === "number" && Number.isFinite(returnId)) return returnId;
    if (typeof returnId === "string" && returnId.trim() !== "") {
      const n = Number(returnId);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }, [returnId]);

  useEffect(() => {
    if (!parsedId) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: "รหัสการยืมไม่ถูกต้อง", icon: "error" })
        .then(() => router.push("/request/returnitem"));
      return;
    }
    const load = async () => {
      try {
        const res = await getRequisitionById(parsedId);
        if (res.success && res.data) {
          setHeader(res.data);
        } else {
          MySwal.fire({ title: "ข้อผิดพลาด", text: "ไม่พบข้อมูลการยืม", icon: "error" })
            .then(() => router.push("/request/returnitem"));
        }
      } catch (err) {
        MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" })
          .then(() => router.push("/request/returnitem"));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [parsedId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!header) return null;

  return <DetailContent header={header} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />;
}

// ─── Detail Content ───────────────────────────────────────────────────────────

function DetailContent({
  header,
  isSubmitting,
  setIsSubmitting,
}: {
  header: RequisitionHeader;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}) {
  const router = useRouter();
  const ext = isExternal(header);
  const uiStatus = mapUiStatus(header);
  const canReturn = header.status === "BORROWING";

  // ── Consumable rows ──
  const [consumableRows, setConsumableRows] = useState<ConsumableReturnRow[]>(() =>
    (header.items || [])
      .filter(item => item.itemType !== "REUSABLE" && (item.issued || 0) > (item.returned || 0))
      .map(item => ({
        req_item_id: item.id,
        qty_returned: 0,
        condition: "GOOD" as ReturnCondition,
        note: "",
        max: (item.issued || 0) - (item.returned || 0),
        name: item.name,
        code: item.code,
        image_url: item.image_url,
        isConditionOpen: false,
      }))
  );

  // ── Reusable: selections per req_item_id ──
  const [reusableSelections, setReusableSelections] = useState<Map<number, UnitSelection[]>>(new Map());
  const [modalItemId, setModalItemId] = useState<number | null>(null);

  const reusableItems = useMemo(
    () => (header.items || []).filter(item => item.itemType === "REUSABLE"),
    [header.items]
  );

  const modalItem = useMemo(
    () => (modalItemId != null ? header.items?.find(i => i.id === modalItemId) : null),
    [modalItemId, header.items]
  );

  // ── Submit ──
  const handleSubmit = async () => {
    const payload: ReturnItemPayload[] = [];

    consumableRows.filter(r => r.qty_returned > 0).forEach(r => {
      payload.push({
        req_item_id: r.req_item_id,
        qty_returned: r.qty_returned,
        condition: r.condition,
        note: r.note || undefined,
      });
    });

    reusableSelections.forEach((units, req_item_id) => {
      if (units.length === 0) return;
      payload.push({
        req_item_id,
        qty_returned: units.length,
        condition: "GOOD",
        units: units.map(u => ({
          unit_id: u.unit_id,
          condition: u.condition,
          note: u.note || undefined,
        })),
      });
    });

    if (payload.length === 0) {
      MySwal.fire({ title: "กรุณาเลือกรายการที่ต้องการคืน", icon: "warning", timer: 2000, showConfirmButton: false });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitReturn(header.id, payload);
      if (!result.success) throw new Error(result.message);
      await MySwal.fire({ title: "บันทึกสำเร็จ", text: "ส่งคืนสำเร็จ (รอคลังตรวจรับคืน)", icon: "success", timer: 2000, showConfirmButton: false });
      router.push("/request/returnitem");
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAnyReturn =
    consumableRows.some(r => r.qty_returned > 0) ||
    Array.from(reusableSelections.values()).some(s => s.length > 0);

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">รายละเอียดการยืม</h2>
        <button
          onClick={() => router.push("/request/returnitem")}
          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
        >
          ย้อนกลับ
        </button>
      </div>

      <div className="space-y-6 flex-1">

        {/* Document Info */}
        <section className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm shadow-slate-200/30">
          <div className="mb-5 flex items-center gap-2 text-slate-800 border-b border-slate-200/90 pb-4">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">ข้อมูลการยืม</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-slate-500">หมายเลขการยืม</p>
              <p className="font-mono text-base font-semibold text-slate-800">{header.doc_no}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ประเภท</p>
              <p className="text-base font-medium text-slate-800">{ext ? "บุคคลภายนอก" : "ภายในแผนก"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">สถานะ</p>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold items-center ${getStatusBadgeColor(uiStatus)}`}>
                {uiStatus}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">วันที่ทำรายการ</p>
              <p className="text-base text-slate-800">{fmtDate(header.request_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">กำหนดคืน</p>
              <p className={`text-base font-medium ${getDaysOverdue(header) > 0 ? "text-red-600" : "text-slate-800"}`}>
                {fmtDate(header.due_date)}
                {getDaysOverdue(header) > 0 && (
                  <span className="ml-2 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">
                    เกิน {getDaysOverdue(header)} วัน
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Borrower Info */}
        <section className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm shadow-slate-200/30">
          <div className="mb-5 flex items-center gap-2 text-slate-800 border-b border-slate-200/90 pb-4">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">ข้อมูลผู้ยืม</h2>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">ชื่อผู้ยืม</p>
                <p className="text-base text-slate-800">{getBorrowerDisplay(header)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">ผู้ทำรายการ</p>
                <p className="text-base text-slate-800">{header.requester ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">แผนก</p>
                <p className="text-base text-slate-800">{header.department_name ?? `แผนก ${header.department_id}`}</p>
              </div>
              {header.borrower_details?.phone && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">เบอร์โทร</p>
                  <p className="text-base text-slate-800">{header.borrower_details.phone}</p>
                </div>
              )}
              {header.borrower_details?.address && (
                <div className="md:col-span-2">
                  <p className="text-xs text-slate-500 mb-1">ที่อยู่</p>
                  <p className="text-base text-slate-800">
                    {header.borrower_details.address}
                    {header.borrower_details.subdistrict && `, ${header.borrower_details.subdistrict}`}
                    {header.borrower_details.district && ` อำเภอ${header.borrower_details.district}`}
                    {header.borrower_details.province && `, จังหวัด${header.borrower_details.province}`}
                    {header.borrower_details.zipcode && `, ${header.borrower_details.zipcode}`}
                  </p>
                </div>
              )}
            </div>
            {(header.borrower_details?.notes || header.note) && (
              <div>
                <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
                <p className="text-base text-slate-800">{header.borrower_details?.notes ?? header.note}</p>
              </div>
            )}
          </div>
        </section>

        {/* Items Section */}
        {canReturn ? (
          <section className="rounded-lg bg-white border border-slate-200 shadow-sm shadow-slate-200/30">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                รายการพัสดุ ({header.items?.length || 0} รายการ)
              </h2>
            </div>

            <div className="divide-y divide-slate-100">

              {/* ── CONSUMABLE items ── */}
              {consumableRows.map((row, idx) => (
                <div key={row.req_item_id} className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {row.image_url
                        ? <img src={row.image_url} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-5 h-5 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{row.name}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{row.code}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        คงค้าง <span className="font-bold text-slate-700">{row.max}</span> ชิ้น
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 items-start pl-16">
                    {/* qty stepper */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">จำนวนที่คืน</p>
                      <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                        <button
                          type="button"
                          onClick={() => setConsumableRows(prev => prev.map((r, i) => i === idx ? { ...r, qty_returned: Math.max(0, r.qty_returned - 1) } : r))}
                          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-l-lg"
                        >
                          <Minus className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <input
                          type="number"
                          value={row.qty_returned}
                          min={0}
                          max={row.max}
                          onChange={e => {
                            const v = Math.max(0, Math.min(row.max, Number(e.target.value)));
                            setConsumableRows(prev => prev.map((r, i) => i === idx ? { ...r, qty_returned: v } : r));
                          }}
                          className="w-12 text-center text-sm font-bold text-blue-700 bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setConsumableRows(prev => prev.map((r, i) => i === idx ? { ...r, qty_returned: Math.min(r.max, r.qty_returned + 1) } : r))}
                          className="w-9 h-9 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-r-lg"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* condition */}
                    <div className="relative">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">สภาพ</p>
                      <button
                        type="button"
                        onClick={() => setConsumableRows(prev => prev.map((r, i) => i === idx ? { ...r, isConditionOpen: !r.isConditionOpen } : r))}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-slate-300 shadow-sm min-w-[150px] justify-between"
                      >
                        <span className="font-semibold text-slate-800">
                          {conditionOptions.find(o => o.value === row.condition)?.label || "สภาพดี"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${row.isConditionOpen ? "rotate-180" : ""}`} />
                      </button>
                      {row.isConditionOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 min-w-[160px]">
                          {conditionOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setConsumableRows(prev => prev.map((r, i) => i === idx ? { ...r, condition: opt.value, isConditionOpen: false } : r))}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 ${row.condition === opt.value ? "text-blue-700 font-semibold bg-blue-50" : "text-slate-700"}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* note */}
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">หมายเหตุ</p>
                      <input
                        type="text"
                        value={row.note}
                        onChange={e => setConsumableRows(prev => prev.map((r, i) => i === idx ? { ...r, note: e.target.value } : r))}
                        placeholder="ระบุหมายเหตุ (ถ้ามี)"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* ── REUSABLE items ── */}
              {reusableItems.map(item => {
                const outstanding = item.outstanding_units || [];
                const selected = reusableSelections.get(item.id) || [];

                return (
                  <div key={item.id} className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image_url
                          ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          : <Package className="w-5 h-5 text-slate-300" />}
                      </div>

                      {/* Info + action */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{item.code}</p>

                        <div className="flex items-center gap-3 mt-2.5">
                          {outstanding.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setModalItemId(item.id)}
                              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-blue-200"
                            >
                              <ClipboardList className="w-4 h-4" />
                              {selected.length === 0 ? "เลือกครุภัณฑ์ที่คืน" : "แก้ไขรายการ"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">ไม่มีครุภัณฑ์ค้างอยู่</span>
                          )}

                          {selected.length > 0 && (
                            <span className="text-sm text-slate-600">
                              คืน{" "}
                              <span className="font-bold text-blue-600">{selected.length}</span>
                              {" "}/{" "}{outstanding.length} ชิ้น
                            </span>
                          )}
                        </div>

                        {/* Selected unit tags */}
                        {selected.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {selected.map(s => {
                              const cond = conditionOptions.find(o => o.value === s.condition);
                              return (
                                <span
                                  key={s.unit_id}
                                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono font-bold border ${cond?.badge || "bg-slate-100 text-slate-600 border-slate-200"}`}
                                >
                                  {s.unit_code}
                                  {s.condition !== "GOOD" && (
                                    <span className="font-normal opacity-75">· {cond?.label}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {consumableRows.length === 0 && reusableItems.length === 0 && (
                <div className="py-16 text-center">
                  <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">ไม่มีรายการที่ต้องคืน</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          /* ── Read-only view ── */
          <section className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm shadow-slate-200/30">
            <div className="mb-5 flex items-center gap-2 text-slate-800 border-b border-slate-200/90 pb-4">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">รายการพัสดุ ({header.items?.length || 0} รายการ)</h2>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-auto" style={{ maxHeight: "360px" }}>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200 sticky top-0 text-xs tracking-wide">
                  <tr>
                    <th className="px-5 py-3.5 w-10 text-center">#</th>
                    <th className="px-4 py-3.5 w-20 text-center">รูป</th>
                    <th className="px-5 py-3.5 w-32">รหัส</th>
                    <th className="px-5 py-3.5">รายการ</th>
                    <th className="px-5 py-3.5 w-24 text-right">ยืม</th>
                    <th className="px-5 py-3.5 w-24 text-right">คืนแล้ว</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(header.items || []).map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-center text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-4 text-center">
                        {item.image_url
                          ? <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover mx-auto border border-slate-200" />
                          : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto"><Package className="w-5 h-5 text-slate-300" /></div>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-mono text-slate-500">{item.code}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        {item.itemType === "REUSABLE" && (item.issued_units ?? []).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(item.issued_units as IssuedUnit[]).map((u, i) => (
                              <span key={i} className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {u.unit_code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-600">{item.issued || 0}</td>
                      <td className="px-5 py-4 text-right font-bold text-blue-600">{item.returned || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        {canReturn && (
          <div className="flex gap-3 justify-end mt-2">
            <button
              onClick={() => router.push("/request/returnitem")}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ปิด
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !hasAnyReturn}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              ส่งคืน (รอตรวจรับ)
            </button>
          </div>
        )}
      </div>

      {/* Unit Selection Modal */}
      {modalItemId != null && modalItem && (
        <UnitSelectionModal
          itemName={modalItem.name}
          itemCode={modalItem.code}
          outstandingUnits={modalItem.outstanding_units || []}
          initial={reusableSelections.get(modalItemId) || []}
          onConfirm={selections => {
            setReusableSelections(prev => {
              const next = new Map(prev);
              next.set(modalItemId, selections);
              return next;
            });
            setModalItemId(null);
          }}
          onClose={() => setModalItemId(null)}
        />
      )}
    </div>
  );
}
