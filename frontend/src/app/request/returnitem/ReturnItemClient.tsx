"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, Clock, X, Building2, User, Eye, FileText, MapPin, Phone,
  MessageCircle, Calendar, Package, Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import * as ReturnSvc from "@/services/returnsService";
import type * as Returns from "@/types/returns_type";

const MySwal = withReactContent(Swal);
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Types ───────────────────────────────────────────────────────────────────

type BorrowType = "INTERNAL" | "EXTERNAL";

interface BaseBorrowRecord {
  id: string;
  type: BorrowType;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: Returns.ReturnStatus;
  daysOverdue?: number;
  notes?: string;
}

interface InternalBorrowRecord extends BaseBorrowRecord {
  type: "INTERNAL";
  departmentName: string;
  departmentCode: string;
  borrowedBy: string; // ชื่อผู้ทำรายการ (เจ้าหน้าที่แผนก)
}

interface ExternalBorrowRecord extends BaseBorrowRecord {
  type: "EXTERNAL";
  staffName: string;      // เจ้าหน้าที่ที่ทำรายการ (ยืมให้)
  externalName: string;   // ชื่อผู้ยืมจริง (บุคคลภายนอก)
  externalAddress: string;
  externalSubdistrict: string;
  externalDistrict: string;
  externalProvince: string;
  externalPostalCode: string;
  externalPhone: string;
  externalOnlineContact?: string;
  documentName?: string;
}

type BorrowRecord = InternalBorrowRecord | ExternalBorrowRecord;

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RECORDS: BorrowRecord[] = [
  {
    id: "BRW-001", type: "INTERNAL",
    itemCode: "EQUIP-001", itemName: "เครื่องวัดความดัน (Blood Pressure Monitor)",
    category: "เครื่องแพทย์", unit: "ชิ้น", quantity: 2,
    departmentName: "เวชศาสตร์ฟื้นฟู", departmentCode: "REHAB",
    borrowedBy: "นางสาว นันทนา จำเริญอุษา",
    borrowDate: "2026-02-15", dueDate: "2026-03-17",
    status: "รอการคืน", daysOverdue: 0, notes: "ยืมไปใช้ที่หน่วยเวชศาสตร์",
  },
  {
    id: "BRW-002", type: "INTERNAL",
    itemCode: "EQUIP-002", itemName: "เครื่องวัดออกซิเจนในเลือด (Pulse Oximeter)",
    category: "เครื่องแพทย์", unit: "ชิ้น", quantity: 1,
    departmentName: "ห้องฉุกเฉิน", departmentCode: "ER",
    borrowedBy: "นายสมชาย วิชัยสิทธิ์",
    borrowDate: "2026-02-18", dueDate: "2026-03-20",
    status: "รอการคืน", daysOverdue: 0, notes: "ยืมไปใช้ที่ห้องฉุกเฉิน",
  },
  {
    id: "BRW-003", type: "INTERNAL",
    itemCode: "EQUIP-003", itemName: "เตียงผู้ป่วย (Hospital Bed)",
    category: "อุปกรณ์เตียง", unit: "เตียง", quantity: 1,
    departmentName: "ผู้ป่วยนอก", departmentCode: "OPD",
    borrowedBy: "นางอรทัย ศิรินธร",
    borrowDate: "2026-02-20", dueDate: "2026-03-10",
    status: "ค้างคืน", daysOverdue: 7, notes: "ยืมไปบ้านผู้ป่วย",
  },
  {
    id: "BRW-004", type: "EXTERNAL",
    itemCode: "EQUIP-004", itemName: "กระเป๋าน้ำร้อน",
    category: "อุปกรณ์ทั่วไป", unit: "ชิ้น", quantity: 1,
    staffName: "นายกีรติ สมบูรณ์",        // เจ้าหน้าที่ที่ทำรายการ
    externalName: "นายวิชัย ทองดี",        // ผู้ยืมจริง
    externalAddress: "123 ถ.สุขุมวิท",
    externalSubdistrict: "คลองเตย",
    externalDistrict: "คลองเตย",
    externalProvince: "กรุงเทพมหานคร",
    externalPostalCode: "10110",
    externalPhone: "0812345678",
    externalOnlineContact: "LINE: vichai.t",
    documentName: "สำเนาบัตรประชาชน.pdf",
    borrowDate: "2026-02-25", dueDate: "2026-03-26",
    status: "รอการคืน", daysOverdue: 0, notes: "ยืมเพื่อพยาบาลผู้ป่วยที่บ้าน",
  },
  {
    id: "BRW-005", type: "EXTERNAL",
    itemCode: "EQUIP-005", itemName: "เครื่องชั่งน้ำหนัก (Weighing Scale)",
    category: "เครื่องชั่ง", unit: "ชิ้น", quantity: 1,
    staffName: "นางสุชลา มงคลประสงค์",
    externalName: "นางมาลี รักดี",
    externalAddress: "56/2 หมู่ 3",
    externalSubdistrict: "บางรัก",
    externalDistrict: "บางรัก",
    externalProvince: "กรุงเทพมหานคร",
    externalPostalCode: "10500",
    externalPhone: "0898765432",
    externalOnlineContact: "Facebook: malee.rd",
    borrowDate: "2026-03-01", dueDate: "2026-03-31",
    status: "รอการคืน", daysOverdue: 0, notes: "ยืมไปใช้ที่บ้าน",
  },
  {
    id: "BRW-006", type: "INTERNAL",
    itemCode: "EQUIP-006", itemName: "เครื่องวัดความสูง (Height Meter)",
    category: "เครื่องวัด", unit: "ชิ้น", quantity: 1,
    departmentName: "คลินิกสมุนไพร", departmentCode: "HERB",
    borrowedBy: "นายชัยชาญ บุญเจิด",
    borrowDate: "2026-01-28", dueDate: "2026-02-28",
    status: "ค้างคืน", daysOverdue: 17, notes: "ยืมไปใช้ที่คลินิกสมุนไพร",
  },
  {
    id: "BRW-007", type: "INTERNAL",
    itemCode: "EQUIP-007", itemName: "เก้าอี้ลิฟท์ (Lift Chair)",
    category: "เฟอร์นิเจอร์", unit: "ชิ้น", quantity: 1,
    departmentName: "ผู้ป่วยสูงอายุ", departmentCode: "GERI",
    borrowedBy: "นางวนิดา ทองสุวรรณ์",
    borrowDate: "2026-02-10", dueDate: "2026-03-12", returnDate: "2026-03-12",
    status: "คืนแล้ว", notes: "ยืมไปใช้ที่บ้านผู้ป่วยสูงอายุ",
  },
  {
    id: "BRW-008", type: "EXTERNAL",
    itemCode: "EQUIP-008", itemName: "ที่นอนลม (Air Mattress)",
    category: "อุปกรณ์นอน", unit: "ชิ้น", quantity: 2,
    staffName: "นายปรัชญา รักษ์สงค์",
    externalName: "นางสมหมาย ใจดี",
    externalAddress: "789 ซ.ลาดพร้าว 10",
    externalSubdistrict: "จตุจักร",
    externalDistrict: "จตุจักร",
    externalProvince: "กรุงเทพมหานคร",
    externalPostalCode: "10900",
    externalPhone: "0856789012",
    borrowDate: "2026-03-05", dueDate: "2026-04-04",
    status: "รอการคืน", daysOverdue: 0, notes: "ยืมไปป้องกันแผลกดทับ",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusBadgeColor = (status: Returns.ReturnStatus | "กำลังดำเนินการ") => {
  switch (status) {
    case "รอการคืน": return "bg-amber-50 text-amber-700 border-amber-200";
    case "กำลังดำเนินการ": return "bg-blue-50 text-blue-700 border-blue-200";
    case "คืนแล้ว":  return "bg-green-50 text-green-700 border-green-200";
    case "ค้างคืน":  return "bg-red-50 text-red-700 border-red-200";
    case "ยกเลิก":   return "bg-gray-50 text-gray-600 border-gray-200";
    default:          return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const getStatusIcon = (status: Returns.ReturnStatus | "กำลังดำเนินการ") => {
  switch (status) {
    case "รอการคืน": return <Clock className="w-3 h-3" />;
    case "กำลังดำเนินการ": return <Loader2 className="w-3 h-3 animate-spin" />;
    case "คืนแล้ว":  return <CheckCircle className="w-3 h-3" />;
    case "ค้างคืน":  return <AlertCircle className="w-3 h-3" />;
    case "ยกเลิก":   return <X className="w-3 h-3" />;
    default: return null;
  }
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ record, onClose }: { record: BorrowRecord; onClose: () => void }) {
  const isExternal = record.type === "EXTERNAL";
  const ext = isExternal ? (record as ExternalBorrowRecord) : null;
  const int_ = !isExternal ? (record as InternalBorrowRecord) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className={`px-6 py-4 flex items-center justify-between flex-shrink-0 ${isExternal ? "bg-emerald-600" : "bg-indigo-600"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              {isExternal ? <User className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-white font-bold text-sm">รายละเอียดการยืม</p>
              <p className="text-white/70 text-xs">{isExternal ? "ยืมสำหรับบุคคลภายนอก" : "ยืมภายในแผนก"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Borrow Type Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isExternal ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
            {isExternal ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            {isExternal ? "บุคคลภายนอก" : `แผนก${int_?.departmentName} (${int_?.departmentCode})`}
          </div>

          {/* Borrower Info */}
          {isExternal && ext ? (
            <>
              {/* Staff who processed */}
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">เจ้าหน้าที่ผู้ทำรายการยืมให้</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-indigo-800 text-sm">{ext.staffName}</span>
                </div>
              </div>

              {/* External person details */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-700">ข้อมูลผู้ยืม (บุคคลภายนอก)</span>
                </div>
                <div className="p-4 space-y-2">
                  <Row icon={<User className="w-3.5 h-3.5" />} label="ชื่อ-นามสกุล" value={ext.externalName} />
                  <Row icon={<MapPin className="w-3.5 h-3.5" />} label="ที่อยู่" value={ext.externalAddress} />
                  <div className="grid grid-cols-2 gap-2">
                    <MiniRow label="ตำบล" value={ext.externalSubdistrict} />
                    <MiniRow label="อำเภอ" value={ext.externalDistrict} />
                    <MiniRow label="จังหวัด" value={ext.externalProvince} />
                    <MiniRow label="รหัสไปรษณีย์" value={ext.externalPostalCode} />
                  </div>
                  <Row icon={<Phone className="w-3.5 h-3.5" />} label="เบอร์โทร" value={ext.externalPhone} />
                  {ext.externalOnlineContact && (
                    <Row icon={<MessageCircle className="w-3.5 h-3.5" />} label="ออนไลน์" value={ext.externalOnlineContact} />
                  )}
                  {ext.documentName && (
                    <Row icon={<FileText className="w-3.5 h-3.5" />} label="เอกสาร" value={ext.documentName} highlight />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-gray-700">ข้อมูลผู้ยืม</span>
              </div>
              <div className="p-4 space-y-2">
                <Row icon={<User className="w-3.5 h-3.5" />} label="ผู้ทำรายการ" value={int_?.borrowedBy ?? ""} />
                <Row icon={<Building2 className="w-3.5 h-3.5" />} label="แผนก" value={`${int_?.departmentName} (${int_?.departmentCode})`} />
              </div>
            </div>
          )}

          {/* Item Info */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Package className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">รายละเอียดครุภัณฑ์</span>
            </div>
            <div className="p-4 space-y-2">
              <Row icon={<Package className="w-3.5 h-3.5" />} label="รหัส" value={record.itemCode} />
              <Row icon={<Package className="w-3.5 h-3.5" />} label="ชื่อรายการ" value={record.itemName} />
              <div className="grid grid-cols-2 gap-2">
                <MiniRow label="ประเภท" value={record.category} />
                <MiniRow label="จำนวน" value={`${record.quantity} ${record.unit}`} />
              </div>
              {record.notes && <Row icon={<FileText className="w-3.5 h-3.5" />} label="หมายเหตุ" value={record.notes} />}
            </div>
          </div>

          {/* Date Info */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">วันที่</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              <MiniRow label="วันที่ยืม" value={record.borrowDate} />
              <MiniRow label="กำหนดคืน" value={record.dueDate} alert={!!record.daysOverdue && record.daysOverdue > 0} />
              {record.returnDate && <MiniRow label="วันที่คืนแล้ว" value={record.returnDate} />}
              {record.daysOverdue && record.daysOverdue > 0
                ? <MiniRow label="ค้างคืน" value={`${record.daysOverdue} วัน`} alert />
                : null}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm text-gray-500 font-medium">สถานะ</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(record.status)}`}>
              {getStatusIcon(record.status)} {record.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 flex-shrink-0 w-24">{label}</span>
      <span className={`font-medium flex-1 ${highlight ? "text-emerald-700" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}

function MiniRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${alert ? "text-red-600" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnItemClient() {
  const [records, setRecords] = useState<BorrowRecord[]>(MOCK_RECORDS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Returns.ReturnStatus | "กำลังดำเนินการ" | "ทั้งหมด">("ทั้งหมด");
  const [selectedType, setSelectedType] = useState<BorrowType | "ทั้งหมด">("ทั้งหมด");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingRecord, setViewingRecord] = useState<BorrowRecord | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const statusOptions: (Returns.ReturnStatus | "กำลังดำเนินการ" | "ทั้งหมด")[] = ["ทั้งหมด", "รอการคืน", "กำลังดำเนินการ", "ค้างคืน", "คืนแล้ว", "ยกเลิก"];
  const typeOptions: { value: BorrowType | "ทั้งหมด"; label: string }[] = [
    { value: "ทั้งหมด", label: "ทุกประเภท" },
    { value: "INTERNAL", label: "ยืมภายในแผนก" },
    { value: "EXTERNAL", label: "ยืมบุคคลภายนอก" },
  ];

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const term = searchTerm.toLowerCase();
      const borrowerName = r.type === "EXTERNAL"
        ? (r as ExternalBorrowRecord).externalName
        : (r as InternalBorrowRecord).borrowedBy;

      const matchesSearch =
        r.itemCode.toLowerCase().includes(term) ||
        r.itemName.toLowerCase().includes(term) ||
        borrowerName.toLowerCase().includes(term) ||
        (r.type === "EXTERNAL" && (r as ExternalBorrowRecord).staffName.toLowerCase().includes(term));

      const matchesStatus = selectedStatus === "ทั้งหมด" || r.status === selectedStatus;
      const matchesType = selectedType === "ทั้งหมด" || r.type === selectedType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [records, searchTerm, selectedStatus, selectedType]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const displayRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const submitSingleReturn = useCallback(async (record: BorrowRecord) => {
    const confirm = await MySwal.fire({
      title: "ยืนยันการคืน",
      html: `คืน <b>${record.itemName}</b><br/><small class="text-gray-500">${record.quantity} ${record.unit}</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยันคืน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#16a34a",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await ReturnSvc.recordReturn(record.id, today, record.quantity, "บันทึกการคืนจากหน้า returnitem");
      setRecords((prev) => prev.map((r) => r.id === record.id ? { ...r, status: "กำลังดำเนินการ" as any, returnDate: today } : r));
      await MySwal.fire({ title: "รับเรื่องเรียบร้อย", text: "สถานะเปลี่ยนเป็นกำลังดำเนินการ", icon: "success", timer: 2000, showConfirmButton: false });
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">คืนครุภัณฑ์ที่ยืมมา</h2>
          <p className="text-sm text-gray-500 mt-1">จัดการการคืนครุภัณฑ์ทั้งภายในแผนกและบุคคลภายนอก</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหา รหัส ชื่อ หรือผู้ยืม..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>

        {/* Type Dropdown */}
        <div className="relative" data-type-dropdown>
          <button
            onClick={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsStatusDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">
              {typeOptions.find(t => t.value === selectedType)?.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {typeOptions.map((t) => (
                  <li key={t.value}>
                    <button
                      onClick={() => { setSelectedType(t.value); setIsTypeDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedType === t.value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-status-dropdown>
          <button
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsTypeDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">สถานะ: {selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
              <ul className="py-1">
                {statusOptions.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => { setSelectedStatus(s); setIsStatusDropdownOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[110px]">รหัส</th>
                <th className="px-6 py-4 w-[200px]">ชื่อรายการ</th>
                <th className="px-6 py-4 w-[100px]">จำนวน</th>
                <th className="px-6 py-4 w-[150px]">ผู้ยืม</th>
                <th className="px-6 py-4 w-[150px]">ผู้ทำรายการ</th>
                <th className="px-6 py-4 w-[110px]">กำหนดคืน</th>
                <th className="px-6 py-4 w-[120px]">สถานะ</th>
                <th className="px-6 py-4 text-center w-[110px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayRecords.map((r, idx) => {
                const isExternal = r.type === "EXTERNAL";
                const ext = isExternal ? (r as ExternalBorrowRecord) : null;
                const int_ = !isExternal ? (r as InternalBorrowRecord) : null;
                const canReturn = r.status === "รอการคืน" || r.status === "ค้างคืน";

                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{r.itemCode}</td>
                    <td className="px-6 py-4 font-medium text-slate-800 truncate">{r.itemName}</td>
                    <td className="px-6 py-4 text-slate-600">{r.quantity} {r.unit}</td>
                    <td className="px-6 py-4">
                      {isExternal && ext ? (
                        <div className="font-semibold text-gray-800 text-sm truncate">{ext.externalName}</div>
                      ) : (
                        <div className="font-semibold text-gray-800 text-sm truncate">
                          แผนก{int_?.departmentName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700 text-sm truncate">
                        {isExternal && ext ? ext.staffName : int_?.borrowedBy}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">{r.dueDate}</div>
                      {r.daysOverdue && r.daysOverdue > 0
                        ? <div className="text-xs text-red-600 font-bold">ค้าง {r.daysOverdue} วัน</div>
                        : null}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeColor(r.status)}`}>
                        {getStatusIcon(r.status)} {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingRecord(r)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canReturn && (
                          <button
                            onClick={() => submitSingleReturn(r)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="คืนครุภัณฑ์"
                          >
                            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            คืน
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayRecords.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
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
        <p className="text-sm text-slate-600">
          แสดง {displayRecords.length} จาก {filteredRecords.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>



      {/* Detail Modal */}
      {viewingRecord && (
        <DetailModal record={viewingRecord} onClose={() => setViewingRecord(null)} />
      )}
    </div>
  );
}
