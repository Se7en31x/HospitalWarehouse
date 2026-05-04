"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Package, CheckCircle, Clock, XCircle, Loader2,
  User, MapPin, Phone, ChevronDown,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import { getRequisitionById, cancelRequisition } from "@/services/requisitionService";
import type { RequisitionHeader, RequisitionItem, BorrowerDetails, AllocatedLot, IssuedUnit } from "@/types/requisition_type";
import { fmtDate } from "@/utils/dateUtils";
import { RequisitionDetailPageSkeleton } from "@/components/skeletons/RequestPageSkeletons";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  BORROWING: "bg-green-100 text-green-700 border-green-200",
  APPROVED:  "bg-blue-100 text-blue-700 border-blue-200",
  PENDING:   "bg-amber-100 text-amber-700 border-amber-200",
  REJECTED:  "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:   "รออนุมัติ",
  APPROVED:  "อนุมัติแล้ว",
  COMPLETED: "เสร็จสิ้น",
  BORROWING: "กำลังยืม",
  REJECTED:  "ถูกปฏิเสธ",
  CANCELLED: "ยกเลิก",
};

// ─── Section heading with left-border accent ──────────────────────────────────

function SectionHeading({
  icon,
  title,
  color = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  color?: "blue" | "emerald" | "slate" | "amber";
}) {
  const border = {
    blue:    "border-blue-500",
    emerald: "border-emerald-500",
    slate:   "border-slate-400",
    amber:   "border-amber-400",
  }[color];
  const text = {
    blue:    "text-blue-600",
    emerald: "text-emerald-600",
    slate:   "text-slate-500",
    amber:   "text-amber-500",
  }[color];

  return (
    <div className={`flex items-center gap-2.5 border-l-4 ${border} pl-3 mb-5`}>
      <span className={text}>{icon}</span>
      <h2 className="text-sm font-bold text-slate-700">{title}</h2>
    </div>
  );
}

// ─── Info field ───────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="text-sm text-slate-800 font-medium">{value}</div>
    </div>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

type StepState = "done" | "active" | "pending" | "cancelled";

interface TimelineStep {
  label: string;
  state: StepState;
}

function buildTimeline(req: RequisitionHeader): TimelineStep[] {
  const { status, type } = req;
  const isBorrow = type === "BORROW";
  const isTerminated = status === "REJECTED" || status === "CANCELLED";

  const labels = isBorrow
    ? ["ยื่นคำขอแล้ว", "รออนุมัติ", "กำลังยืม", "คืนแล้ว"]
    : ["ยื่นคำขอแล้ว", "รออนุมัติ", "อนุมัติแล้ว", "รับของแล้ว"];

  const completedCount =
    status === "PENDING"    ? 1 :
    status === "APPROVED" || status === "BORROWING" ? 2 :
    status === "COMPLETED"  ? 4 : 1;

  const terminationLabel = status === "REJECTED" ? "ถูกปฏิเสธ" : "ยกเลิกแล้ว";

  return labels.map((label, i): TimelineStep => {
    if (i < completedCount) return { label, state: "done" };
    if (i === completedCount) {
      if (isTerminated) return { label: terminationLabel, state: "cancelled" };
      return { label, state: "active" };
    }
    return { label, state: "pending" };
  });
}

const CIRCLE_CLASS: Record<StepState, string> = {
  done:      "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200",
  active:    "bg-blue-500 border-blue-500 text-white ring-4 ring-blue-100",
  cancelled: "bg-red-500 border-red-500 text-white",
  pending:   "bg-white border-gray-300 text-gray-300",
};

const LABEL_CLASS: Record<StepState, string> = {
  done:      "text-blue-700 font-semibold",
  active:    "text-blue-600 font-bold",
  cancelled: "text-red-600 font-semibold",
  pending:   "text-gray-400",
};

function StepIcon({ state }: { state: StepState }) {
  if (state === "done")      return <CheckCircle className="w-4 h-4" />;
  if (state === "active")    return <Clock className="w-4 h-4 animate-pulse" />;
  if (state === "cancelled") return <XCircle className="w-4 h-4" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />;
}

function StatusTimeline({ req }: { req: RequisitionHeader }) {
  const steps = buildTimeline(req);
  return (
    <div className="flex items-start w-full px-2">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-2.5 flex-shrink-0">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${CIRCLE_CLASS[step.state]}`}>
              <StepIcon state={step.state} />
            </div>
            <span className={`text-xs text-center w-[72px] leading-tight ${LABEL_CLASS[step.state]}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mt-5 mx-2 rounded-full transition-colors ${
              steps[i + 1].state === "done" || step.state === "done" ? "bg-blue-300" : "bg-gray-200"
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const reqId = parseInt(id, 10);

  const [requisition, setRequisition] = useState<RequisitionHeader | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [borrowerOpen, setBorrowerOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItemExpand = (id: number) =>
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  useEffect(() => {
    const load = async () => {
      setIsFetching(true);
      try {
        const res = await getRequisitionById(reqId);
        if (res.success && res.data) {
          setRequisition(res.data);
        } else {
          toast.error(res.message ?? "ไม่สามารถโหลดรายละเอียดได้");
          router.push("/request/history");
        }
      } catch {
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        router.push("/request/history");
      } finally {
        setIsFetching(false);
      }
    };
    if (!isNaN(reqId)) load();
  }, [reqId, router]);

  const handleCancel = async () => {
    if (!requisition) return;
    const result = await Swal.fire({
      title: "ยืนยันการยกเลิก",
      text: `คุณต้องการยกเลิกคำขอ ${requisition.doc_no} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ไม่ยกเลิก",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });
    if (!result.isConfirmed) return;

    setIsCancelling(true);
    try {
      const res = await cancelRequisition(requisition.id);
      if (res.success) {
        toast.success("ยกเลิกคำขอเรียบร้อยแล้ว");
        router.push("/request/history");
      } else {
        toast.error(res.message ?? "ไม่สามารถยกเลิกได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isFetching) {
    return <RequisitionDetailPageSkeleton />;
  }

  if (!requisition) return null;

  const isPending       = requisition.status === "PENDING";
  const isApproved      = requisition.status === "APPROVED";
  const isBorrow        = requisition.type   === "BORROW";
  const bd              = requisition.borrower_details as BorrowerDetails | null | undefined;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Toaster position="top-right" />

      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-5 p-6 sm:p-8">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
          {/* Left: doc no + title */}
          <div className="flex-1 min-w-0">

            <div className="flex items-center gap-3">
              <PageHeadingIconBox icon={FileText} tone="blue" className="shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {isBorrow ? "รายละเอียดคำร้องยืมครุภัณฑ์" : "รายละเอียดคำร้องเบิกพัสดุ"}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isBorrow ? "ดูสถานะและรายละเอียดคำร้องยืมครุภัณฑ์ทางการแพทย์" : "ดูสถานะและรายละเอียดคำร้องเบิกพัสดุ"}
                </p>
              </div>
            </div>
          </div>
          {/* Right: action group */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {(isPending || isApproved) && (
              <button
                onClick={isPending ? handleCancel : undefined}
                disabled={isCancelling || isApproved}
                title={isApproved ? "ไม่สามารถยกเลิกได้หลังจากอนุมัติแล้ว" : undefined}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                ยกเลิกคำขอ
              </button>
            )}
            <button
              onClick={() => router.push("/request/history")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>

        {/* ── Document Info ─────────────────────────────────────────────────── */}
        <section className="flex-shrink-0 rounded-xl bg-white border border-gray-200 shadow-sm p-5">
          <div className="mb-4 flex items-center gap-2.5 border-l-4 border-blue-500 pl-3">
            <FileText className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">ข้อมูลเอกสาร</h3>
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
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE[requisition.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {STATUS_LABEL[requisition.status] ?? requisition.status}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">วันที่ทำรายการ</p>
              <p className="text-sm text-slate-700">{fmtDate(requisition.request_date)}</p>
            </div>
            {isBorrow && requisition.due_date && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">กำหนดคืน</p>
                <p className="text-sm text-slate-700">{fmtDate(requisition.due_date)}</p>
              </div>
            )}
            {requisition.note && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">หมายเหตุ</p>
                <p className="text-sm text-slate-700 leading-relaxed">{requisition.note}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Status Timeline ───────────────────────────────────────────────── */}
        <section className="flex-shrink-0 rounded-xl bg-white border border-gray-200 shadow-sm p-5">
          <div className="mb-5 flex items-center gap-2.5 border-l-4 border-blue-500 pl-3">
            <Clock className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">ขั้นตอนการดำเนินการ</h3>
          </div>
          <div className="border-b border-gray-100 mb-5" />
          <StatusTimeline req={requisition} />
        </section>

        {/* ── People Involved ───────────────────────────────────────────────── */}
        <section className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          {/* Requester + Approver */}
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2.5 border-l-4 border-slate-400 pl-3">
              <User className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-700">ผู้เกี่ยวข้อง</h3>
            </div>
            <div className="border-b border-gray-100 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
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
                {requisition.approver ? (
                  <p className="text-sm text-slate-700 font-medium">{requisition.approver}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">รอการอนุมัติ</p>
                )}
              </div>
            </div>
          </div>

          {/* Borrower sub-section — BORROW only */}
          {isBorrow && bd && (
            <>
              <div className="border-t border-gray-100" />
              <button
                onClick={() => setBorrowerOpen(!borrowerOpen)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 border-l-4 border-emerald-500 pl-3">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-700">ข้อมูลผู้ยืม</h3>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${borrowerOpen ? "rotate-180" : ""}`} />
              </button>
              {borrowerOpen && (
                <div className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ชื่อ-นามสกุล</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {[bd.lookup_titles?.short_name, bd.firstname, bd.lastname].filter(Boolean).join(" ") || "-"}
                      </p>
                    </div>
                    {bd.id_card && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">เลขบัตรประชาชน</p>
                        <p className="text-sm font-mono text-slate-700 tracking-wider">{bd.id_card}</p>
                      </div>
                    )}
                    {bd.phone && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">เบอร์โทรศัพท์</p>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <p className="text-sm font-mono text-slate-700">{bd.phone}</p>
                        </div>
                      </div>
                    )}
                    {bd.address && (
                      <div className="md:col-span-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ที่อยู่</p>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {[bd.address, bd.subdistrict && `ต.${bd.subdistrict}`, bd.district && `อ.${bd.district}`, bd.province && `จ.${bd.province}`, bd.zipcode].filter(Boolean).join(" ")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {bd.id_card_url && (
                    <>
                      <div className="border-t border-slate-100" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">เอกสารแนบ</p>
                        <a
                          href={bd.id_card_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          ดูเอกสารแนบ
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Items Table ───────────────────────────────────────────────────── */}
        <section className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm border-l-4 border-blue-500 pl-3">
              รายการพัสดุ
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {requisition.items?.length ?? 0}
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3 text-center w-14">รูป</th>
                  <th className="px-4 py-3 text-left w-32">รหัสรายการ</th>
                  <th className="px-4 py-3 text-left">รายการ</th>
                  <th className="px-4 py-3 text-left w-36">หมวดหมู่</th>
                  <th className="px-4 py-3 text-center w-24">จำนวนขอ</th>
                  <th className="px-4 py-3 text-center w-24">อนุมัติ</th>
                  <th className="px-4 py-3 text-center w-24">จ่าย</th>
                  {isBorrow && <th className="px-4 py-3 text-center w-24">คืน</th>}
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(requisition.items ?? []).map((item: RequisitionItem, idx) => {
                  const hasAllocInfo =
                    (item.itemType === "REUSABLE"
                      ? (item.issued_units ?? []).length > 0
                      : (item.allocated_lots ?? []).length > 0) && item.issued > 0;
                  const isExpanded = expandedItems.has(item.id);

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`transition-colors ${hasAllocInfo ? "cursor-pointer hover:bg-slate-50" : ""}`}
                        onClick={() => hasAllocInfo && toggleItemExpand(item.id)}
                      >
                        <td className="px-4 py-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 text-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 mx-auto"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
                              <Package className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-slate-500">{item.code}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{item.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-500">{item.category_name ?? "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-slate-700 text-sm">
                            {item.qty}
                            {item.unit_name && <span className="font-normal text-slate-400 text-xs ml-1">{item.unit_name}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600 text-sm">{item.approved ?? "-"}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600 text-sm">{item.issued ?? "-"}</td>
                        {isBorrow && (
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-sm ${item.returned >= item.issued && item.issued > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                              {item.returned ?? "-"}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          {hasAllocInfo && (
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 mx-auto ${isExpanded ? "rotate-180" : ""}`}
                            />
                          )}
                        </td>
                      </tr>

                      {/* Expandable allocation detail row */}
                      {hasAllocInfo && isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={isBorrow ? 10 : 9} className="px-6 py-3">
                            {item.itemType === "REUSABLE" ? (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">รหัสครุภัณฑ์ที่ได้รับ</p>
                                <div className="flex flex-wrap gap-2">
                                  {(item.issued_units as IssuedUnit[]).map((u, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold border border-blue-200">
                                      {u.unit_code}
                                      {u.serial_no && <span className="font-normal text-blue-500">· {u.serial_no}</span>}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ตัดจากล็อต</p>
                                <div className="flex flex-wrap gap-2">
                                  {(item.allocated_lots as AllocatedLot[]).map((lot, i) => (
                                    <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs">
                                      <span className="font-mono font-bold text-slate-700">{lot.lot_code ?? "-"}</span>
                                      <span className="text-blue-600 font-bold">{lot.qty} ชิ้น</span>
                                      {lot.expired_at && (
                                        <span className="text-slate-400">หมด {new Date(lot.expired_at).toLocaleDateString("th-TH")}</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!requisition.items?.length && (
                  <tr>
                    <td colSpan={isBorrow ? 10 : 9} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Package className="w-10 h-10 text-slate-300" />
                        <p className="text-sm font-medium">ไม่มีรายการพัสดุ</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>{/* end scrollable body */}
    </div>
  );
}
