"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, PackageCheck, User, Loader2, Minus, Plus, ScanLine,
  Trash2, ArrowRight, X, Search, MapPin, Phone, ExternalLink, Shield, ChevronDown, MessageSquare,
} from "lucide-react";
import Swal from "sweetalert2";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  getRequisitionById,
  approveRequisition,
  rejectRequisition,
  completeRequisitionDelivery,
} from "../../../../services/requisitionService";
import {
  RequisitionHeader,
  RequisitionItem,
  RequisitionItemLots,
  RequisitionItemUnits,
  AllocatedLot,
  IssuedUnit,
  BorrowerDetails,
} from "../../../../types/requisition_type";
import { SweetAlertUtils } from "@/utils/sweetAlert";

export interface ItemAllocation {
  qty: number;
  lots: Record<string, number>;
  units: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DOC_EXTENSIONS = [".pdf", ".doc", ".docx"];

/**
 * Cloudinary stores PDFs/docs under /raw/upload/ but may return /image/upload/
 * for files uploaded with resource_type:"auto". This corrects the URL so the
 * browser can actually fetch the file.
 */
const formatCloudinaryUrl = (url: string): string => {
  const lower = url.toLowerCase();
  const isDoc = DOC_EXTENSIONS.some((ext) => lower.includes(ext));
  if (isDoc && url.includes("/image/upload/")) {
    return url.replace("/image/upload/", "/raw/upload/");
  }
  return url;
};

/** Returns true when the Cloudinary URL points to a PDF/doc document. */
const isPdfUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return DOC_EXTENSIONS.some((ext) => lower.includes(ext)) || lower.includes("/raw/upload/");
};

/**
 * Parses id_card_url which may be:
 *  - null / undefined  → []
 *  - a JSON array string → string[]
 *  - a plain single URL (legacy) → [url]
 */
const parseIdCardUrls = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean) as string[];
  } catch { /* not JSON — fall through */ }
  return [raw];
};

/** Formats all address parts into one clean Thai address string. */
const formatBorrowerAddress = (bd: BorrowerDetails): string => {
  const parts = [
    bd.address,
    bd.subdistrict ? `ต.${bd.subdistrict}` : "",
    bd.district ? `อ.${bd.district}` : "",
    bd.province ? `จ.${bd.province}` : "",
    bd.zipcode ?? "",
  ].filter(Boolean);
  return parts.join(" ") || "-";
};

// ── Status helpers ─────────────────────────────────────────────────────────────

const getStatusLabel = (status?: RequisitionHeader["status"]): string => {
  switch (status) {
    case "PENDING": return "รออนุมัติ";
    case "APPROVED": return "รอนำส่ง";
    case "COMPLETED": return "เสร็จสิ้น";
    case "BORROWING": return "อยุ่ระหว่างการยืม";
    case "PENDING_RETURN_CHECK": return "รอตรวจรับคืน";
    case "REJECTED": return "ปฏิเสธ";
    case "DRAFT": return "ร่าง";
    case "CANCELLED": return "ยกเลิก";
    default: return status || "-";
  }
};

const getStatusBadgeClass = (status?: RequisitionHeader["status"]): string => {
  switch (status) {
    case "COMPLETED": return "bg-green-100 text-green-500";
    case "APPROVED": return "bg-blue-100 text-blue-500";
    case "BORROWING": return "bg-green-100 text-green-500";
    case "PENDING_RETURN_CHECK": return "bg-sky-100 text-sky-800";
    case "REJECTED": return "bg-red-100 text-red-500";
    case "PENDING": return "bg-amber-100 text-amber-500";
    case "DRAFT":
    case "CANCELLED": return "bg-red-100 text-red-500";
    default: return "bg-slate-100 text-slate-700";
  }
};

// ── IssuedSummaryPanel ─────────────────────────────────────────────────────────

function IssuedSummaryPanel({ item }: { item: RequisitionItem }) {
  const isReusable = (item.itemType || "").toUpperCase() === "REUSABLE";
  const lots: AllocatedLot[] = item.allocated_lots ?? [];
  const units: IssuedUnit[] = item.issued_units ?? [];

  if (isReusable) {
    return (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center gap-2 mb-1">
          <PackageCheck size={16} className="text-emerald-500" />
          <p className="text-xs font-bold text-slate-600">จ่ายออกแล้ว {item.issued} ชิ้น</p>
        </div>
        {units.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">ไม่มีข้อมูลครุภัณฑ์ที่จ่ายออก</p>
        ) : (
          <div className="flex flex-col gap-2">
            {units.map((u, i) => (
              <div key={u.id ?? i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                  <span className="text-sm font-mono font-semibold text-slate-700">{u.unit_code ?? "-"}</span>
                </div>
                {u.serial_no && (
                  <span className="text-[11px] text-slate-400 font-mono">{u.serial_no}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Consumable
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 mb-1">
        <PackageCheck size={16} className="text-emerald-500" />
        <p className="text-xs font-bold text-slate-600">จ่ายออกแล้ว {item.issued} ชิ้น</p>
      </div>
      {lots.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">ไม่มีข้อมูลล็อตที่จ่ายออก</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lots.map((lot, i) => {
            const isExp = lot.expired_at ? new Date(lot.expired_at) < new Date() : false;
            return (
              <div key={lot.lot_id ?? i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                    <span className="text-sm font-mono font-semibold text-slate-700">{lot.lot_code ?? "-"}</span>
                    {isExp && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">หมดอายุ</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-blue-600">{lot.qty} ชิ้น</span>
                </div>
                {lot.expired_at && (
                  <p className="text-[10px] text-slate-400 mt-1 ml-7">
                    หมดอายุ {new Date(lot.expired_at).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function RequisitionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const reqId = parseInt(unwrappedParams.id, 10);

  const [requisition, setRequisition] = useState<RequisitionHeader | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [allocations, setAllocations] = useState<Record<number, ItemAllocation>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [isBorrowerDetailsOpen, setIsBorrowerDetailsOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);

  const isPending = requisition?.status === "PENDING";
  const isApproved = requisition?.status === "APPROVED";
  const canCompleteDelivery =
    isApproved && (requisition?.type === "WITHDRAW" || requisition?.type === "BORROW");

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchRequisition = async () => {
    setIsFetching(true);
    try {
      const res = await getRequisitionById(reqId);
      if (res.success && res.data) {
        setRequisition(res.data);
      } else {
        SweetAlertUtils.error("เกิดข้อผิดพลาด", res.message || "ไม่สามารถโหลดรายละเอียดได้");
        router.push("/warehouse/requests");
      }
    } catch {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!isNaN(reqId)) fetchRequisition();
  }, [reqId]);

  // ── Allocation initialisation ───────────────────────────────────────────────

  useEffect(() => {
    if (requisition?.items && Object.keys(allocations).length === 0) {
      const initialAllocs: Record<number, ItemAllocation> = {};
      requisition.items.forEach((item: RequisitionItem) => {
        initialAllocs[item.id] = { qty: 0, lots: {}, units: [] };
      });
      setAllocations(initialAllocs);
      if (requisition.items.length > 0) setSelectedItemId(requisition.items[0].id);
    }
  }, [requisition]);

  useEffect(() => {
    if (!requisition || !isPending) return;
    setAllocations((prev) => {
      const next = { ...prev };
      let changed = false;
      requisition.items.forEach((item: RequisitionItem) => {
        if (item.itemType === "REUSABLE") return;
        const alloc = next[item.id];
        if (alloc && alloc.qty === 0 && Object.keys(alloc.lots).length === 0 && item.available_lots) {
          let remaining = item.qty || 0;
          const autoLots: Record<string, number> = {};
          let totalTaken = 0;
          item.available_lots.forEach((lot: RequisitionItemLots) => {
            if (remaining <= 0 || lot.quantity <= 0) return;
            const take = Math.min(remaining, lot.quantity);
            autoLots[lot.id.toString()] = take;
            remaining -= take;
            totalTaken += take;
          });
          next[item.id] = { qty: totalTaken, lots: autoLots, units: [] };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [requisition, isPending]);

  // ── Allocation handlers ─────────────────────────────────────────────────────

  const updateAllocation = (id: number, val: ItemAllocation) => {
    setAllocations((prev) => ({ ...prev, [id]: val }));
  };

  const handleUpdateLotQty = (
    id: number,
    lotId: string,
    newQty: number,
    maxLotQty: number,
    itemQty: number
  ) => {
    const alloc = allocations[id];
    if (!alloc) return;
    const newLots = { ...alloc.lots };
    const otherTotal = Object.entries(newLots)
      .filter(([k]) => k !== lotId)
      .reduce((s, [, q]) => s + q, 0);
    const capped = Math.max(0, Math.min(newQty, Math.min(maxLotQty, itemQty - otherTotal)));
    newLots[lotId] = capped;
    updateAllocation(id, { ...alloc, qty: Object.values(newLots).reduce((s, q) => s + q, 0), lots: newLots });
  };

  const handleScanUnit = (currentItem: RequisitionItem) => {
    const raw = scanInput.trim();
    if (!raw) return;
    const alloc = allocations[currentItem.id];
    if (!alloc) return;
    if (alloc.qty >= currentItem.qty) {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", "ยิงบาร์โค้ดครบจำนวนที่ขอแล้ว");
      setScanInput("");
      return;
    }
    const foundUnit = currentItem.available_units?.find(
      (u: RequisitionItemUnits) => u.unit_code.toLowerCase() === raw.toLowerCase()
    );
    if (!foundUnit) {
      SweetAlertUtils.error("ไม่พบบาร์โค้ด", `ไม่พบบาร์โค้ด ${raw} ในรายการที่พร้อมใช้งาน`);
      setScanInput("");
      return;
    }
    if (alloc.units.includes(foundUnit.id)) {
      SweetAlertUtils.error("สแกนซ้ำ", `สแกนบาร์โค้ด ${raw} ไปแล้ว`);
      setScanInput("");
      return;
    }
    const newUnits = [...alloc.units, foundUnit.id];
    updateAllocation(currentItem.id, { ...alloc, qty: newUnits.length, units: newUnits });
    setScanInput("");
  };

  // ── Action handlers ─────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!requisition) return;
    if (Object.values(allocations).every((a) => a.qty === 0)) {
      SweetAlertUtils.warning("กรุณาระบุจำนวนที่จะจ่ายอย่างน้อย 1 รายการ");
      return;
    }
    const confirmed = await SweetAlertUtils.confirm(
      "ยืนยันการอนุมัติ",
      "คุณต้องการอนุมัติรายการนี้และตัดสต็อกตามจำนวนที่ระบุใช่หรือไม่?"
    );
    if (!confirmed.isConfirmed) return;

    Swal.fire({ allowOutsideClick: false, allowEscapeKey: false, background: 'transparent', html: '', didOpen: () => Swal.showLoading() });
    setIsLoading(true);
    try {
      const payload: Record<string, ItemAllocation> = {};
      Object.entries(allocations).forEach(([k, v]) => { if (v.qty > 0) payload[k] = v; });
      const res = await approveRequisition(requisition.id, payload);
      if (res.success) {
        Swal.close();
        await SweetAlertUtils.success("สำเร็จ", "อนุมัติและตัดสต็อกเรียบร้อยแล้ว");
        fetchRequisition();
      } else throw new Error(res.message || "เกิดข้อผิดพลาดจากระบบ");
    } catch (err: unknown) {
      Swal.close();
      SweetAlertUtils.error("เกิดข้อผิดพลาด", err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอนุมัติ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requisition) return;
    const confirmReason = await SweetAlertUtils.custom({
      title: "ระบุเหตุผลที่ปฏิเสธการเบิก",
      input: "text",
      inputPlaceholder: "กรอกเหตุผลที่ปฏิเสธ",
      showCancelButton: true,
      confirmButtonText: "ปฏิเสธ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      inputValidator: (value: string) => (!value?.trim() ? "กรุณาระบุเหตุผล" : undefined),
    });
    if (!confirmReason.isConfirmed) return;
    const reason = String(confirmReason.value || "").trim();
    if (!reason) return;

    Swal.fire({ title: "กำลังดำเนินการ...", allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    setIsLoading(true);
    try {
      const res = await rejectRequisition(requisition.id, reason);
      if (res.success) {
        Swal.close();
        await SweetAlertUtils.success("สำเร็จ", "ปฏิเสธรายการแล้ว");
        router.push("/warehouse/requests");
      } else throw new Error(res.message || "ไม่สามารถดำเนินการได้");
    } catch (err: unknown) {
      Swal.close();
      SweetAlertUtils.error("เกิดข้อผิดพลาด", err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!requisition) return;
    const isBorrow = requisition.type === "BORROW";
    const confirmTitle = isBorrow ? "ยืนยันการส่งมอบ" : "ยืนยันการนำส่ง";
    const confirmText = isBorrow
      ? `ยืนยันการส่งมอบใบ ${requisition.doc_no} แล้วใช่หรือไม่?`
      : `ยืนยันการนำส่งใบ ${requisition.doc_no} แล้วใช่หรือไม่?`;
    const successText = isBorrow ? "บันทึกการส่งมอบเรียบร้อย" : "บันทึกการนำส่งเรียบร้อย";

    const confirmed = await SweetAlertUtils.confirm(confirmTitle, confirmText);
    if (!confirmed.isConfirmed) return;

    Swal.fire({ allowOutsideClick: false, allowEscapeKey: false, background: 'transparent', html: '', didOpen: () => Swal.showLoading() });
    setIsLoading(true);
    try {
      const res = await completeRequisitionDelivery(requisition.id);
      if (res.success) {
        Swal.close();
        await SweetAlertUtils.success("สำเร็จ", successText);
        router.push("/warehouse/requests");
      } else throw new Error(res.message || "ไม่สามารถบันทึกการนำส่งได้");
    } catch (err: unknown) {
      Swal.close();
      SweetAlertUtils.error("เกิดข้อผิดพลาด", err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Memos ────────────────────────────────────────────────────────────────────

  const selectedItem = useMemo(
    () => requisition?.items?.find((i: RequisitionItem) => i.id === selectedItemId),
    [requisition, selectedItemId]
  );

  const filteredAvailableUnits = useMemo(() => {
    const units = selectedItem?.available_units || [];
    const q = barcodeSearch.trim().toLowerCase();
    return q ? units.filter((u) => u.unit_code.toLowerCase().includes(q)) : units;
  }, [selectedItem, barcodeSearch]);

  // ── Loading / empty states ───────────────────────────────────────────────────

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa] gap-4">
        <DotLottieReact
          src="https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie"
          loop
          autoplay
          style={{ width: 160, height: 160 }}
        />
      </div>
    );
  }

  if (!requisition) return null;

  const bd = requisition.borrower_details;
  const isBorrow = requisition.type === "BORROW";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-[#fafafa]">

      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-5 p-3 sm:p-4 md:p-6">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {isBorrow ? "รายละเอียดคำขอยืมครุภัณฑ์" : "รายละเอียดคำขอเบิกพัสดุ"}
            </h1>
          </div>
          {/* Right: action group */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push("/warehouse/requests")}
              className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>

        {/* ── Summary Bar ───────────────────────────────────────────────────── */}
        <section className="flex-shrink-0 rounded-xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex items-center gap-2.5 border-l-4 border-blue-500 pl-3 pb-0">
            <FileText className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">
              ข้อมูลการ{isBorrow ? "ยืม" : "เบิก"}
            </h3>
          </div>
          <div className="border-b border-gray-100 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">เลขที่คำขอ</p>
              <p className="font-mono text-sm text-slate-700 font-semibold">{requisition.doc_no}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ประเภท</p>
              <p className="text-sm text-slate-700">{isBorrow ? "ยืมครุภัณฑ์" : "เบิกของสิ้นเปลือง"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">สถานะ</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(requisition.status)}`}>
                {getStatusLabel(requisition.status)}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">วันที่ทำรายการ</p>
              <p className="text-sm text-slate-700">
                {new Date(requisition.request_date).toLocaleDateString("th-TH")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ผู้ทำรายการ</p>
              <p className="text-sm text-slate-700 font-medium">{requisition.requester ?? "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">แผนก</p>
              <p className="text-sm text-slate-700">{requisition.department_name ?? "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ผู้อนุมัติ</p>
              <p className="text-sm text-slate-700 font-medium">{requisition.approver ?? "-"}</p>
            </div>
            {isBorrow && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">กำหนดคืน</p>
                <p className="text-sm text-slate-700">
                  {requisition.due_date
                    ? new Date(requisition.due_date).toLocaleDateString("th-TH")
                    : "-"}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Borrower Details — BORROW type only ───────────────────────────── */}
        {isBorrow && bd && (
          <section className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {/* Header with toggle */}
            <button
              onClick={() => setIsBorrowerDetailsOpen(!isBorrowerDetailsOpen)}
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5 border-l-4 border-emerald-500 pl-3">
                <User className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-700">ข้อมูลผู้ยืม</h3>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isBorrowerDetailsOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Content (collapsible) */}
            {isBorrowerDetailsOpen && (
              <div className="p-6 space-y-6 animate-in fade-in duration-300">

                {/* ── Personal Information ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  {/* Name (with title prefix) */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ชื่อ-นามสกุล</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {[bd.lookup_titles?.short_name, bd.firstname, bd.lastname].filter(Boolean).join(" ") || "-"}
                    </p>
                  </div>

                  {/* ID Card Number */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">เลขบัตรประชาชน</p>
                    <p className="text-sm font-mono text-slate-700 tracking-wider">{bd.id_card || "-"}</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">เบอร์โทรศัพท์</p>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <p className="text-sm font-mono text-slate-700">{bd.phone || "-"}</p>
                    </div>
                  </div>

                  {/* Address — full width */}
                  <div className="md:col-span-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ที่อยู่</p>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-700 leading-relaxed">{formatBorrowerAddress(bd)}</p>
                    </div>
                  </div>
                </div>

                {/* ── Divider ──────────────────────────────────────────────────── */}
                <div className="border-t border-slate-100" />

                {/* ── Attachments + Notes ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Left: Attachments (collapsible) */}
                  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    {/* Collapsible header */}
                    <button
                      onClick={() => setIsAttachmentsOpen(!isAttachmentsOpen)}
                      className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-slate-700">หลักฐานและเอกสาร</h4>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isAttachmentsOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Collapsible content */}
                    {isAttachmentsOpen && (
                      <div className="p-4 animate-in fade-in duration-300">
                        {(() => {
                          const urls = parseIdCardUrls(bd.id_card_url);
                          if (urls.length === 0) {
                            return (
                              <div className="text-center py-6 text-slate-400">
                                <p className="text-sm">ไม่มีไฟล์แนบ</p>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-2">
                              {urls.map((rawUrl, idx) => {
                                const url = formatCloudinaryUrl(rawUrl);
                                const fileName = url.split('/').pop()?.split('?')[0] || `ไฟล์ ${idx + 1}`;
                                const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                                const isImage = /^(jpg|jpeg|png|gif|webp)$/.test(fileExt);
                                const isPdf = /^pdf$/.test(fileExt);
                                const isVideo = /^(mp4|webm|mov|avi)$/.test(fileExt);
                                
                                // Estimate file size (in real scenario, get from server)
                                let sizeText = "—";
                                if (fileName.includes('picture') || isImage) sizeText = "8.1 Kb";
                                else if (fileName.includes('movie') || isVideo) sizeText = "311 Kb";
                                
                                let iconColor = "text-slate-400";
                                let bgColor = "bg-slate-100";
                                if (isImage) { iconColor = "text-blue-600"; bgColor = "bg-blue-50"; }
                                else if (isPdf) { iconColor = "text-red-600"; bgColor = "bg-red-50"; }
                                else if (isVideo) { iconColor = "text-purple-600"; bgColor = "bg-purple-50"; }
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      if (isImage) {
                                        setPreviewImage({ url, name: fileName });
                                      } else {
                                        window.open(url, '_blank');
                                      }
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                                        {isImage ? (
                                          <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                                          </svg>
                                        ) : isPdf ? (
                                          <FileText className={`w-5 h-5 ${iconColor}`} />
                                        ) : isVideo ? (
                                          <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                          </svg>
                                        ) : (
                                          <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.414l4 4V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="min-w-0 text-left">
                                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{fileName}</p>
                                        <p className="text-xs text-slate-400">{sizeText}</p>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isImage) {
                                            setPreviewImage({ url, name: fileName });
                                          } else {
                                            window.open(url, '_blank');
                                          }
                                        }}
                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="เปิดดู"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </button>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>


                  {/* Right: Notes (collapsible) */}
                  {bd.notes && (
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      {/* Collapsible header */}
                      <div className="px-4 py-3.5 border-b border-slate-200 bg-white">
                        <div className="flex items-center gap-2.5 border-l-4 border-amber-500 pl-3">
                          <MessageSquare className="w-4 h-4 text-amber-600" />
                          <h4 className="text-sm font-bold text-slate-700">หมายเหตุ</h4>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{bd.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Main Split Layout ────────────────────────────────────────────── */}
        
          <div className="flex-1 min-h-0 flex overflow-hidden gap-5">

            {/* ── Left Panel (60%) — Items table ───────────────────────────── */}
            <div className="flex-[3_1_0%] min-w-0 flex flex-col rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm relative">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm border-l-4 border-blue-500 pl-3">
                  รายการที่ต้องเบิกจ่าย
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {requisition.items?.length || 0}
                  </span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full table-fixed text-sm text-left">
                  <colgroup>
                    <col className="w-[80px]" />
                    <col />
                    <col className="w-[110px]" />
                    <col className="w-[110px]" />
                    <col className="w-[140px]" />
                    <col className="w-[48px]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-700 text-base font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-[inset_0_-1px_0_0_#e2e8f0]">
                    <tr>
                      <th className="px-5 py-4 text-left whitespace-nowrap">รูป</th>
                      <th className="px-5 py-4 text-left whitespace-nowrap">รายละเอียดสินค้า</th>
                      <th className="px-5 py-4 text-right whitespace-nowrap">ยอดคงคลัง</th>
                      <th className="px-5 py-4 text-right whitespace-nowrap">ยอดที่ขอ</th>
                      <th className="px-5 py-4 text-right whitespace-nowrap">ยอดเตรียมจ่าย</th>
                      <th className="px-3 py-4 w-[48px]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requisition.items?.map((item: RequisitionItem) => {
                      const alloc = allocations[item.id] || { qty: 0, lots: {}, units: [] };
                      const isSel = selectedItemId === item.id;
                      const isComplete = alloc.qty === item.qty;
                      const isOver = alloc.qty > item.qty;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`cursor-pointer transition-colors group ${isSel ? "bg-blue-50/80" : "bg-white hover:bg-slate-50"}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-stretch gap-2">
                              <div className={`w-1 rounded-full transition-opacity ${isSel ? "bg-blue-600 opacity-100" : "bg-transparent opacity-0"}`} />
                              <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 border border-slate-100 flex-shrink-0">
                                {item.image_url
                                  ? <img src={item.image_url} className="w-full h-full object-cover" alt=""
                                    onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: item.image_url!, name: item.name }); }} />
                                  : <PackageCheck className="w-5 h-5 text-slate-300" />}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-xs text-slate-400 font-mono">{item.code}</p>
                              {item.category_name && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                  {item.category_name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-bold text-sm ${item.current_stock > 0 ? "text-slate-600" : "text-rose-500"}`}>
                              {item.current_stock}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="font-black text-slate-400 text-lg">{item.qty}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {isPending ? (
                              <span className={`font-black text-xl ${isComplete ? "text-blue-600" : isOver ? "text-rose-600" : alloc.qty > 0 ? "text-blue-600" : "text-slate-300"}`}>
                                {alloc.qty}
                              </span>
                            ) : (
                              <span className="font-black text-lg text-blue-600">{item.issued}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${isSel ? "bg-blue-600 text-white" : "text-slate-300 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}`}>
                              <ArrowRight size={14} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Right Panel (40%) — Allocator ────────────────────────────── */}
            <div className="flex-[2_1_0%] min-w-0 flex flex-col z-0 h-full overflow-hidden">
              {selectedItem ? (() => {
                const alloc = allocations[selectedItem.id] || { qty: 0, lots: {}, units: [] };
                const isReusable = selectedItem.itemType === "REUSABLE";
                return (
                  <div className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden border border-slate-200">
                    {/* Info header */}
                    <div className="p-4 border-b bg-white flex-shrink-0">
                      <p className="text-[10px] font-bold text-blue-400 tracking-wider uppercase mb-1">กำลังจัดการ</p>
                      <h4 className="font-black text-base text-slate-900 leading-tight mb-2">{selectedItem.name}</h4>
                      <div className="flex bg-slate-50 rounded-lg border border-slate-200 p-2 gap-4">
                        <div className="flex-1 text-center border-r border-slate-200">
                          <p className="text-[10px] text-slate-400 font-bold">ยอดขอ</p>
                          <p className="font-black text-lg text-slate-700">{selectedItem.qty}</p>
                        </div>
                        <div className="flex-1 text-center border-r border-slate-200">
                          <p className="text-[10px] text-slate-400 font-bold">คงเหลือในคลัง</p>
                          <p className="font-black text-lg text-slate-700">{selectedItem.current_stock}</p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-blue-500 font-bold">เตรียมจ่าย</p>
                          <p className="font-black text-lg text-blue-600">{alloc.qty}</p>
                        </div>
                      </div>
                    </div>

                    {/* Allocator body */}
                    <div className="flex-1 overflow-y-auto p-4 bg-white">
                      {!isPending ? (
                        <IssuedSummaryPanel item={selectedItem} />
                      ) : isReusable ? (
                        <div className="flex h-full min-h-0 flex-col gap-4">
                          {/* Barcode scanner */}
                          <div className="flex-shrink-0 bg-white border border-slate-200 rounded-[14px] p-4 shadow-sm">
                            <label className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                              <ScanLine size={14} />
                              แสกนบาร์โค้ดเพิ่ม ({alloc.units.length}/{selectedItem.qty})
                            </label>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                              <input
                                type="text"
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScanUnit(selectedItem); } }}
                                placeholder="ยิงที่นี่..."
                                className="w-full bg-transparent border-none text-slate-700 placeholder:text-slate-400 px-3 py-1.5 focus:ring-0 outline-none text-sm font-mono"
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Unit list */}
                          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-3">
                            <div className="mb-2 flex flex-shrink-0 items-center justify-between gap-3">
                              <p className="text-xs font-bold text-slate-500 ml-1">บาร์โค้ดจากรายการที่ว่าง</p>
                              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-500 min-w-0 flex-1 sm:flex-initial sm:w-auto">
                                <Search size={14} className="flex-shrink-0" />
                                <input
                                  type="text"
                                  value={barcodeSearch}
                                  onChange={(e) => setBarcodeSearch(e.target.value)}
                                  placeholder="ค้นบาร์โค้ด"
                                className="w-full sm:w-36 bg-transparent text-xs outline-none placeholder:text-slate-400"
                                />
                                {barcodeSearch && (
                                  <button type="button" onClick={() => setBarcodeSearch("")} className="text-slate-400 hover:text-slate-600">
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(5 * 44px + 4 * 8px)" }}>
                              {filteredAvailableUnits.map((unit: RequisitionItemUnits) => {
                                const isSel2 = alloc.units.includes(unit.id);
                                const isMaxed = alloc.qty >= selectedItem.qty;
                                const isDisabled = isMaxed && !isSel2;
                                return (
                                  <button
                                    key={unit.id}
                                    onClick={() => {
                                      if (isSel2) {
                                        const nu = alloc.units.filter((id) => id !== unit.id);
                                        updateAllocation(selectedItem.id, { ...alloc, qty: nu.length, units: nu });
                                      } else {
                                        if (alloc.qty >= selectedItem.qty) return SweetAlertUtils.error("เกิดข้อผิดพลาด", "เลือกครบกดยอดแล้ว");
                                        const nu = [...alloc.units, unit.id];
                                        updateAllocation(selectedItem.id, { ...alloc, qty: nu.length, units: nu });
                                      }
                                    }}
                                    disabled={isDisabled}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border text-sm font-bold transition-all ${isSel2
                                      ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                      : isDisabled
                                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400"
                                      }`}
                                  >
                                    <span className="font-mono text-xs">{unit.unit_code}</span>
                                    {isSel2 ? <Trash2 size={14} className="text-white/60 hover:text-white" /> : <Plus size={14} className="text-slate-300" />}
                                  </button>
                                );
                              })}
                              {!selectedItem.available_units?.length && (
                                <p className="text-center text-xs text-rose-500 font-bold p-4">❌ สินค้าหมดคลัง (ไม่มีให้ยืม)</p>
                              )}
                              {selectedItem.available_units && selectedItem.available_units.length > 0 && filteredAvailableUnits.length === 0 && (
                                <p className="text-center text-xs text-slate-400 font-bold p-4">ไม่พบบาร์โค้ดที่ค้นหา</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Lot allocator */
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-700 text-sm">
                            เลือกล็อตที่ต้องการจ่ายออก (ล็อตทั้งหมด {selectedItem.available_lots?.length || 0})
                          </h4>
                          {selectedItem.available_lots && selectedItem.available_lots.length > 0 ? (
                            <div
                              className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1"
                              style={{ maxHeight: "calc(4 * 5.5rem + 3 * 0.75rem)" }}
                            >
                              {selectedItem.available_lots.map((lot: RequisitionItemLots) => {
                                const lotQty = alloc.lots[lot.id.toString()] || 0;
                                const isExpired = new Date(lot.expired_at) < new Date();
                                const isActive = lotQty > 0;
                                return (
                                  <div
                                    key={lot.id}
                                    className={`bg-white rounded-xl border p-3 transition-colors ${isActive ? "border-blue-500 ring-1 ring-blue-500/20 shadow-sm" : "border-slate-200"}`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-700 text-sm">{lot.lot_code}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <p className={`text-xs font-bold ${isExpired ? "text-rose-500" : "text-slate-400"}`}>
                                            หมด: {new Date(lot.expired_at).toLocaleDateString("th-TH")}
                                          </p>
                                          <p className="text-xs text-slate-400">คงเหลือ: <span className="font-black text-slate-600">{lot.quantity}</span></p>
                                        </div>
                                      </div>
                                      <div className="flex w-[180px] flex-shrink-0 items-center bg-slate-50 border rounded-lg h-9 ml-auto">
                                        <button
                                          autoFocus={false}
                                          onClick={() => handleUpdateLotQty(selectedItem.id, lot.id.toString(), lotQty - 1, lot.quantity, selectedItem.qty)}
                                          className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded-l-lg transition-colors"
                                        >
                                          <Minus size={14} strokeWidth={3} />
                                        </button>
                                        <input
                                          type="number"
                                          value={lotQty}
                                          onChange={(e) => handleUpdateLotQty(selectedItem.id, lot.id.toString(), Number(e.target.value) || 0, lot.quantity, selectedItem.qty)}
                                          className="flex-1 w-full bg-transparent text-center font-black text-base outline-none text-blue-700"
                                        />
                                        <button
                                          autoFocus={false}
                                          onClick={() => handleUpdateLotQty(selectedItem.id, lot.id.toString(), lotQty + 1, lot.quantity, selectedItem.qty)}
                                          className="w-10 h-full flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-r-lg transition-colors"
                                        >
                                          <Plus size={14} strokeWidth={3} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                              <p className="text-rose-600 font-bold text-sm">ไม่มี Lot ที่สามารถจ่ายได้</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="flex-1 flex flex-col items-center justify-center text-center bg-white rounded-lg border border-slate-200 shadow-sm">
                  <ArrowRight className="text-slate-300 w-10 h-10 mb-3 animate-bounce flex-shrink-0" />
                  <p className="font-bold text-slate-500 mb-1">คลิกเลือกรายการที่ฝั่งซ้ายมือ</p>
                  <p className="text-xs text-slate-400">เพื่อเปิดแผงควบคุมการตัดสต็อก</p>
                </div>
              )}
            </div>
          </div>

        {(isPending || canCompleteDelivery) && (
        <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3.5 flex flex-col sm:flex-row justify-end items-center gap-3 rounded-b-xl">
          <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
            {isPending && (
              <>
                <button
                  onClick={handleReject}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  ปฏิเสธ
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="px-7 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  อนุมัติ
                </button>
              </>
            )}
            {canCompleteDelivery && (
              <button
                onClick={handleCompleteDelivery}
                disabled={isLoading}
                className="px-7 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackageCheck size={18} />}
                {requisition.type === "BORROW" ? "ยืนยันการส่งมอบ" : "ยืนยันการนำส่ง"}
              </button>
            )}
          </div>
        </div>
        )}
      </div>{/* end scrollable body */}
      {/* ── Image lightbox ─────────────────────────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold hover:text-rose-400 transition-colors"
            >
              ปิดรูปภาพ <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
