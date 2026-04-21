"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  X,
  Package,
  RefreshCw,
  Loader2,
  User,
  MapPin,
  Phone,
  Upload,
  FileText,
  Check,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ✅ Import Services และ Types
import * as ItemSvc from "@/services/itemsService";
import * as RequisitionSvc from "@/services/requisitionService";
import * as LookupSvc from "@/services/lookupService";
import type { ProvinceOption, DistrictOption, SubdistrictOption, TitleOption } from "@/services/lookupService";
import { RequisitionPayload } from "@/types/requisition_type";

const MySwal = withReactContent(Swal);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

interface CartItem extends ItemSvc.UiItem {
  quantity: number;
  returnDate?: string;
}

interface BorrowHistory {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: "BORROWED" | "RETURNED" | "PARTIAL";
}

interface Department {
  id: number;
  code: string;
  name: string;
}
// Map English system names → Thai display names
const DEPT_TH: Record<string, string> = {
  "Emergency":       "แผนกฉุกเฉิน",
  "Dental":          "แผนกทันตกรรม",
  "Palliative":      "ศูนย์ชีวาภิบาล",
  "OPD":             "แผนกผู้ป่วยนอก",
  "IPD":             "แผนกผู้ป่วยใน",
  "MedicalRecords":  "แผนกเวชระเบียน",
  "Pharmacy":        "ห้องจ่ายยา",
  "Warehouse":       "คลังหลัก",
};
/** Returns Thai name or null if the department is not in the clinical mapping. */
const deptDisplayName = (name: string): string | null => DEPT_TH[name] ?? null;

interface ExternalPersonForm {
  titleCode: string;
  firstname: string;
  lastname: string;
  idCard: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  // IDs are used for chained API calls only — names above go into the submission
  provinceId: string;
  districtId: string;
  subdistrictId: string;
  postalCode: string;
  phone: string;
  returnDate: string;
  notes: string;
  documents: File[];
}

interface BorrowCartModalProps {
  showCartModal: boolean;
  setShowCartModal: (value: boolean) => void;
  selectedItems: CartItem[];
  setSelectedItems: (items: CartItem[]) => void;
  globalReturnDate: string;
  setGlobalReturnDate: (date: string) => void;
  history: BorrowHistory[];
  setHistory: (history: BorrowHistory[]) => void;
  // ✅ Props สำหรับแผนก
  selectedDeptId: number | null;
  departments: Department[];
  onDeptChange: (deptId: number) => void;
}

const initialExternalForm: ExternalPersonForm = {
  titleCode: "",
  firstname: "",
  lastname: "",
  idCard: "",
  address: "",
  subdistrict: "",
  district: "",
  province: "",
  provinceId: "",
  districtId: "",
  subdistrictId: "",
  postalCode: "",
  phone: "",
  returnDate: "",
  notes: "",
  documents: [],
};

export default function BorrowCartModal({
  showCartModal,
  setShowCartModal,
  selectedItems,
  setSelectedItems,
  globalReturnDate,
  setGlobalReturnDate,
  history,
  setHistory,
  selectedDeptId,
  departments,
  onDeptChange,
}: BorrowCartModalProps) {
  const [externalStep, setExternalStep] = useState<1 | 2 | 3>(1);

  // ✅ State สำหรับ Loading ตอนกดปุ่ม
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ แผนกของผู้ดำเนินการ (EXTERNAL tab)
  const [externalOperatorDeptId, setExternalOperatorDeptId] = useState<number | null>(null);
  const [isDeptOpen, setIsDeptOpen] = useState(false);

  // ✅ External Person Form State
  const [externalForm, setExternalForm] =
    useState<ExternalPersonForm>(initialExternalForm);
  const [fileError, setFileError] = useState<string>("");
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Title combobox state ─────────────────────────────────────────────────
  const [isTitleOpen, setIsTitleOpen] = useState(false);
  const [titleSearch, setTitleSearch] = useState("");
  const titleTriggerRef = useRef<HTMLDivElement>(null);
  const titleDropdownRef = useRef<HTMLDivElement>(null);
  const [titleDropdownStyle, setTitleDropdownStyle] = useState<React.CSSProperties>({});

  // ── Dept dropdown inline state ────────────────────────────────────────────
  const deptWrapperRef = useRef<HTMLDivElement>(null);

  // ── Address lookup state ─────────────────────────────────────────────────
  const [provinces, setProvinces]             = useState<ProvinceOption[]>([]);
  const [districts, setDistricts]             = useState<DistrictOption[]>([]);
  const [subdistricts, setSubdistricts]       = useState<SubdistrictOption[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubs, setLoadingSubs]           = useState(false);

  // Guards against stale async responses when the user changes province/district
  // before the previous fetch completes (classic race condition).
  const expectedProvinceRef = useRef<string>("");
  const expectedDistrictRef = useRef<string>("");

  // ── Tabbed address picker state ──────────────────────────────────────────
  const [isAddressOpen, setIsAddressOpen]       = useState(false);
  const [addressTab, setAddressTab]             = useState<'province' | 'district' | 'subdistrict'>('province');
  const [addressSearch, setAddressSearch]       = useState("");
  const addressPickerRef                        = useRef<HTMLDivElement>(null);

  // ✅ Handle click-outside to close dept dropdown
  React.useEffect(() => {
    if (!isDeptOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (deptWrapperRef.current && !deptWrapperRef.current.contains(e.target as Node)) {
        setIsDeptOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isDeptOpen]);

  // ✅ Close dropdown when modal closes
  React.useEffect(() => {
    if (!showCartModal) {
      setIsDeptOpen(false);
      setIsAddressOpen(false);
    }
  }, [showCartModal]);

  // ✅ Close title combobox on outside click (trigger + portal)
  React.useEffect(() => {
    if (!isTitleOpen) return;
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!titleTriggerRef.current?.contains(t) && !titleDropdownRef.current?.contains(t)) {
        setIsTitleOpen(false);
        setTitleSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isTitleOpen]);

  // ✅ Close address picker on outside click
  React.useEffect(() => {
    if (!isAddressOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (addressPickerRef.current && !addressPickerRef.current.contains(e.target as Node)) {
        setIsAddressOpen(false);
        setAddressSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isAddressOpen]);

  // --- [Helper Actions] ---
  const removeFromCart = useCallback(
    (id: string) => {
      setSelectedItems(selectedItems.filter((i) => i.id !== id));
    },
    [selectedItems, setSelectedItems]
  );

  const updateCartQuantity = useCallback(
    (id: string, delta: number) => {
      setSelectedItems(
        selectedItems.map((item) => {
          if (item.id === id) {
            const maxQty = item.type === "REUSABLE"
              ? (typeof item.availableStock === "number" ? item.availableStock : item.stock)
              : item.stock;
            const newQty = item.quantity + delta;
            if (newQty > 0 && newQty <= maxQty)
              return { ...item, quantity: newQty };
          }
          return item;
        })
      );
    },
    [selectedItems, setSelectedItems]
  );

  // ✅ Handle External Form Field Change
  const handleExternalFormChange = (
    field: keyof ExternalPersonForm,
    value: string
  ) => {
    setExternalForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Load provinces + titles once when modal opens ───────────────────────
  React.useEffect(() => {
    if (!showCartModal) return;
    if (provinces.length === 0) {
      setLoadingProvinces(true);
      LookupSvc.getProvinces()
        .then(setProvinces)
        .catch(() => {})
        .finally(() => setLoadingProvinces(false));
    }
    if (titles.length === 0) {
      LookupSvc.getTitles().then(setTitles).catch(() => {});
    }
  }, [showCartModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chained pickers (called directly, not via <select> onChange) ─────────

  const pickProvince = async (id: string) => {
    const name = provinces.find((p) => p.id === id)?.name ?? "";
    expectedProvinceRef.current = id;
    setExternalForm((prev) => ({
      ...prev,
      provinceId: id, province: name,
      districtId: "", district: "",
      subdistrictId: "", subdistrict: "",
      postalCode: "",                    // clear zip on province change
    }));
    setDistricts([]);
    setSubdistricts([]);
    setAddressSearch("");
    setAddressTab("district");
    setLoadingDistricts(true);
    try {
      const data = await LookupSvc.getDistricts(id);
      if (expectedProvinceRef.current === id) setDistricts(data);
    } catch { /* ignore */ } finally {
      if (expectedProvinceRef.current === id) setLoadingDistricts(false);
    }
  };

  const pickDistrict = async (id: string) => {
    const found = districts.find((d) => d.id === id);
    const name  = found?.name ?? "";
    expectedDistrictRef.current = id;
    setExternalForm((prev) => ({
      ...prev,
      districtId: id, district: name,
      subdistrictId: "", subdistrict: "",
      postalCode: "",                    // clear zip on district change; fills only on subdistrict pick
    }));
    setSubdistricts([]);
    setAddressSearch("");
    setAddressTab("subdistrict");
    setLoadingSubs(true);
    try {
      const data = await LookupSvc.getSubdistricts(id);
      if (expectedDistrictRef.current === id) setSubdistricts(data);
    } catch { /* ignore */ } finally {
      if (expectedDistrictRef.current === id) setLoadingSubs(false);
    }
  };

  const pickSubdistrict = (id: string) => {
    const found   = subdistricts.find((s) => s.id === id);
    const name    = found?.name    ?? "";
    const zipCode = found?.zip_code ?? "";   // zip from subdistrict row
    setExternalForm((prev) => ({
      ...prev,
      subdistrictId: id,
      subdistrict: name,
      postalCode: zipCode || prev.postalCode,
    }));
    setAddressSearch("");
    setIsAddressOpen(false);
  };

  // ── Filtered title list ──────────────────────────────────────────────────
  const filteredTitles = useMemo(() => {
    const q = titleSearch.trim().toLowerCase();
    if (!q) return titles;
    return titles.filter((t) =>
      (t.short_name || t.name).toLowerCase().includes(q) ||
      t.title_code.toLowerCase().includes(q)
    );
  }, [titles, titleSearch]);

  const selectedTitle = titles.find((t) => t.title_code === externalForm.titleCode);

  const openTitleDropdown = () => {
    if (titleTriggerRef.current) {
      const rect = titleTriggerRef.current.getBoundingClientRect();
      setTitleDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
        zIndex: 9999,
      });
    }
    setTitleSearch(selectedTitle ? (selectedTitle.short_name || selectedTitle.name) : "");
    setIsTitleOpen(true);
  };

  // ── Filtered lists for current tab+search ────────────────────────────────
  const filteredProvinces = useMemo(() => {
    const q = addressSearch.trim().toLowerCase();
    return q ? provinces.filter((p) => p.name.toLowerCase().includes(q)) : provinces;
  }, [provinces, addressSearch]);

  const filteredDistricts = useMemo(() => {
    const q = addressSearch.trim().toLowerCase();
    return q ? districts.filter((d) => d.name.toLowerCase().includes(q)) : districts;
  }, [districts, addressSearch]);

  const filteredSubdistricts = useMemo(() => {
    const q = addressSearch.trim().toLowerCase();
    return q ? subdistricts.filter((s) => s.name.toLowerCase().includes(q)) : subdistricts;
  }, [subdistricts, addressSearch]);

  // ── Address summary pill label ────────────────────────────────────────────
  const addressSummary = useMemo(() => {
    const parts = [
      externalForm.province,
      externalForm.district,
      externalForm.subdistrict,
    ].filter(Boolean);
    return parts.join(", ") || null;
  }, [externalForm.province, externalForm.district, externalForm.subdistrict]);

  const ALLOWED_DOC_TYPES = new Set([
    "application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  ]);
  const MAX_DOC_SIZE = 10 * 1024 * 1024;
  const MAX_DOC_COUNT = 5;

  // ✅ Handle File Upload (multiple)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    setFileError("");
    if (!incoming.length) return;

    const current = externalForm.documents;
    if (current.length + incoming.length > MAX_DOC_COUNT) {
      setFileError(`อัปโหลดได้สูงสุด ${MAX_DOC_COUNT} ไฟล์`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    for (const file of incoming) {
      if (!ALLOWED_DOC_TYPES.has(file.type)) {
        setFileError("รองรับ PDF, JPG, PNG, WEBP, HEIC/HEIF เท่านั้น");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_DOC_SIZE) {
        setFileError(`${file.name}: ขนาดไฟล์ต้องไม่เกิน 10 MB`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setExternalForm((prev) => ({ ...prev, documents: [...prev.documents, ...incoming] }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ✅ Remove one uploaded file by index
  const removeFile = (index: number) => {
    setExternalForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
    setFileError("");
  };

  // ✅ Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // --- [Submit API: ยืมของ] ---
  const submitBorrow = async () => {
    if (selectedItems.length === 0) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ",
        icon: "warning",
      });
      return;
    }

    if (!selectedDeptId) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาระบุแผนกที่ทำการยืม",
        icon: "warning",
      });
      return;
    }

    if (!globalReturnDate) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาระบุวันที่คืนครุภัณฑ์",
        icon: "warning",
      });
      return;
    }

    const confirm = await MySwal.fire({
      title: "ยืนยันการยืม",
      html: `จำนวน: ${selectedItems.length} รายการ<br/>วันที่ต้องคืน: <strong class="text-indigo-600">${globalReturnDate}</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยันการยืม",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#4f46e5",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);

    try {
      const payload: RequisitionPayload = {
        type: "BORROW",
        department_id: selectedDeptId as number,
        due_date: globalReturnDate,
        items: selectedItems.map((i) => ({
          item_id: i.id,
          qty: i.quantity,
          note: "",
        })),
        note: "ยืมออนไลน์ผ่านระบบ",
      };

      const res = await RequisitionSvc.createRequisition(payload);

      if (res.success) {
        await MySwal.fire({
          title: "สำเร็จ",
          text: "ส่งคำขอยืมเรียบร้อย รอการอนุมัติจากคลัง",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        setSelectedItems([]);
        setGlobalReturnDate("");
        localStorage.removeItem("borrow_cart");
        localStorage.removeItem("borrow_return_date");
        setShowCartModal(false);
      } else {
        throw new Error(res.message || "เกิดข้อผิดพลาดในการสร้างใบยืม");
      }
    } catch (error) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: getErrorMessage(error),
        icon: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- [Submit: ยืมบุคคลภายนอก] ---
  const submitExternalBorrow = async () => {
    const { firstname, lastname, address, subdistrict, district, province, postalCode, phone, returnDate } = externalForm;

    if (externalOperatorDeptId === null) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาระบุแผนกของผู้ดำเนินการ", icon: "warning" });
      return;
    }

    if (!firstname || !lastname || !address || !subdistrict || !district || !province || !postalCode || !phone || !returnDate) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รวมถึงวันที่คืนครุภัณฑ์)", icon: "warning" });
      return;
    }

    if (selectedItems.length === 0) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ", icon: "warning" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RequisitionPayload = {
        type: "BORROW",
        department_id: externalOperatorDeptId as number,
        due_date: returnDate,
        items: selectedItems.map((i) => ({ item_id: i.id, qty: i.quantity, note: "" })),
        note: externalForm.notes || "ยืมโดยบุคคลภายนอก",
        borrower: {
          title_code: externalForm.titleCode || undefined,
          firstname,
          lastname,
          id_card: externalForm.idCard || undefined,
          phone,
          address,
          subdistrict,
          district,
          province,
          zipcode: postalCode,
          notes: externalForm.notes || undefined,
        },
      };

      const res = await RequisitionSvc.createRequisition(payload);
      if (!res.success) throw new Error(res.message || "เกิดข้อผิดพลาดในการสร้างใบยืม");

      // Upload all documents to borrowers folder
      const borrowerId = res.data?.borrower_details?.id;
      if (externalForm.documents.length > 0 && borrowerId) {
        try {
          const fd = new FormData();
          externalForm.documents.forEach((file) => fd.append("document", file));
          await RequisitionSvc.uploadBorrowerDocument(borrowerId, fd);
        } catch {
          console.warn("Document upload failed — requisition was still created");
        }
      }

      await MySwal.fire({
        title: "สำเร็จ",
        text: "ส่งคำขอยืมสำหรับบุคคลภายนอกเรียบร้อยแล้ว",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      setExternalForm(initialExternalForm);
      setExternalOperatorDeptId(null);
      setSelectedItems([]);
      localStorage.removeItem("borrow_cart");
      localStorage.removeItem("borrow_return_date");
      setShowCartModal(false);
      setExternalStep(1);
    } catch (error) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: getErrorMessage(error),
        icon: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showCartModal) return null;

  const inputClass =
    "w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400 disabled:bg-slate-100";

  const labelClass = "block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[650px] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 flex-shrink-0 px-5 py-4 bg-white">
          <h2 className="text-lg font-bold text-gray-900">
            ยืมบุคคลภายนอก
          </h2>
          <button
            onClick={() => setShowCartModal(false)}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/30">

          {/* --- TAB: EXTERNAL PERSON --- */}
          <div className="space-y-4">

              {/* Step Indicator */}
              <div className="flex items-center gap-2 px-1 overflow-x-auto pb-2 mb-2 no-scrollbar">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  externalStep === 1 ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                }`}>
                  <span>1</span>
                  <span>ตะกร้า &amp; วันคืน</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  externalStep === 2 ? "bg-blue-600 text-white" : externalStep > 2 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}>
                  <span>2</span>
                  <span>ข้อมูลผู้ยืม</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  externalStep === 3 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  <span>3</span>
                  <span>สรุปข้อมูล</span>
                </div>
              </div>

              {/* Step 1: Cart Items + Return Date */}
              {externalStep === 1 && (
                <div className="flex flex-col gap-2 flex-1">
                  {/* Return Date Section */}
                  <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">วันที่คืนครุภัณฑ์ (สูงสุด 90 วัน) <span className="text-red-500">*</span></span>
                    </div>
                    <div className="p-4 space-y-3">
                      <input
                        type="date"
                        disabled={isSubmitting}
                        className="w-full border border-blue-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                        value={externalForm.returnDate}
                        onChange={(e) => handleExternalFormChange("returnDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        max={(() => {
                          const maxDate = new Date();
                          maxDate.setDate(maxDate.getDate() + 90);
                          return maxDate.toISOString().split("T")[0];
                        })()}
                      />
                      <div className="flex gap-2">
                        {[30, 60, 90].map((days) => (
                          <button
                            key={days}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                              const date = new Date();
                              date.setDate(date.getDate() + days);
                              handleExternalFormChange("returnDate", date.toISOString().split("T")[0]);
                            }}
                            className="flex-1 py-2 px-3 rounded-lg bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition disabled:opacity-50"
                          >
                            {days} วัน
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-100 bg-blue-50/40">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">รายการที่ต้องการยืม</span>
                      <span className="ml-auto text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{selectedItems.length} รายการ</span>
                    </div>
                    {selectedItems.length === 0 ? (
                      <div className="text-center py-10 flex flex-col items-center justify-center flex-1">
                        <ShoppingCart className="w-10 h-10 text-gray-200 mb-2" />
                        <p className="text-gray-400 text-sm font-medium">ยังไม่มีรายการในตะกร้า</p>
                        <p className="text-xs text-gray-300 mt-1">กรุณาเลือกรายการจากหน้าระบบยืม</p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto flex-1 h-full">
                        <div className="overflow-x-auto h-full">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase">
                              <th className="px-3 py-2.5 text-left w-14">รูป</th>
                              <th className="px-3 py-2.5 text-left">ชื่อรายการ</th>
                              <th className="px-3 py-2.5 text-left w-28">หมวดหมู่</th>
                              <th className="px-3 py-2.5 text-center w-32">จำนวน</th>
                              <th className="px-3 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedItems.map((item) => (
                              <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                                <td className="px-3 py-2.5">
                                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                                    {item.imageUrl
                                      ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                      : <Package className="w-5 h-5 text-gray-300" />}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                  <div className="text-xs text-gray-400">{item.code}</div>
                                </td>
                                <td className="px-3 py-2.5 text-left">
                                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg">
                                    {item.category || (item.type === "REUSABLE" ? "ครุภัณฑ์" : "วัสดุ")}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-1">
                                    <button disabled={isSubmitting} onClick={() => updateCartQuantity(item.id, -1)}
                                      className="w-6 h-6 flex items-center justify-center hover:bg-white rounded disabled:opacity-50">
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-sm text-gray-800">{item.quantity}</span>
                                    <button disabled={isSubmitting} onClick={() => updateCartQuantity(item.id, 1)}
                                      className="w-6 h-6 flex items-center justify-center hover:bg-white rounded disabled:opacity-50">
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <button disabled={isSubmitting} onClick={() => removeFromCart(item.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Personal Info Form */}
              {externalStep === 2 && (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-800 text-sm">ยืมสำหรับบุคคลภายนอก</p>
                      <p className="text-xs text-blue-600">กรุณากรอกข้อมูลผู้ขอยืมให้ครบถ้วน</p>
                    </div>
                  </div>

                  {/* Operator Department Section */}
                  <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-slate-700">
                        แผนกของผู้ดำเนินการ <span className="text-red-500">*</span>
                      </span>
                    </div>
                    <div className="p-4">
                      {/* Inline wrapper — dropdown flows in document, never drifts on scroll */}
                      <div ref={deptWrapperRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDeptOpen((o) => !o)}
                          disabled={isSubmitting}
                          className={`flex items-center justify-between gap-2 w-full border rounded-lg px-4 py-2.5 text-sm bg-white transition-colors disabled:opacity-50 ${
                            isDeptOpen
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-slate-200 hover:border-blue-400"
                          }`}
                        >
                          <span className={externalOperatorDeptId !== null ? "text-slate-800 font-medium" : "text-gray-400"}>
                            {externalOperatorDeptId !== null
                              ? (departments.find((d) => d.id === externalOperatorDeptId)?.name ?? "-- เลือกแผนก --")
                              : "-- เลือกแผนก --"}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isDeptOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Inline dropdown — anchored to trigger, scrolls with page */}
                        {isDeptOpen && (
                          <div className="absolute left-0 right-0 mt-1 z-50 border border-slate-200 rounded-xl bg-white shadow-xl overflow-hidden">
                            <ul className="overflow-y-auto" style={{ maxHeight: "220px" }}>
                              {(departments || []).map((d) => (
                                <li key={d.id}>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setExternalOperatorDeptId(d.id);
                                      setIsDeptOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-l-4 ${
                                      d.id === externalOperatorDeptId
                                        ? "bg-indigo-50 border-indigo-600 text-indigo-700 font-bold"
                                        : "border-transparent text-slate-700 hover:bg-slate-50"
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
                  </div>

                  {/* Personal Info Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">ข้อมูลส่วนตัว</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Title + Name row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div ref={titleTriggerRef}>
                          <label className={labelClass}>คำนำหน้า</label>
                          {/* Searchable input trigger */}
                          <div className={`flex items-center border rounded-lg bg-white transition-colors ${
                            isTitleOpen ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"
                          } ${isSubmitting ? "opacity-60 bg-slate-100" : ""}`}>
                            <input
                              type="text"
                              placeholder="-"
                              disabled={isSubmitting}
                              value={isTitleOpen ? titleSearch : (selectedTitle ? (selectedTitle.short_name || selectedTitle.name) : "")}
                              onFocus={() => { if (!isTitleOpen) openTitleDropdown(); }}
                              onChange={(e) => {
                                setTitleSearch(e.target.value);
                                if (!isTitleOpen) openTitleDropdown();
                              }}
                              onKeyDown={(e) => { if (e.key === "Escape") { setIsTitleOpen(false); setTitleSearch(""); } }}
                              className="flex-1 min-w-0 px-2.5 py-2 text-sm bg-transparent outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                            />
                            <ChevronDown
                              onClick={() => isTitleOpen ? (setIsTitleOpen(false), setTitleSearch("")) : openTitleDropdown()}
                              className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 mr-2 cursor-pointer transition-transform ${isTitleOpen ? "rotate-180" : ""}`}
                            />
                          </div>
                          {/* Portal dropdown */}
                          {isTitleOpen && typeof document !== "undefined" && createPortal(
                            <div
                              ref={titleDropdownRef}
                              style={titleDropdownStyle}
                              className="border border-slate-200 rounded-xl bg-white shadow-xl overflow-hidden"
                            >
                              <div className="overflow-y-auto" style={{ maxHeight: "260px" }}>
                                {/* Clear option */}
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => { handleExternalFormChange("titleCode", ""); setIsTitleOpen(false); setTitleSearch(""); }}
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                    !externalForm.titleCode ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-400 hover:bg-slate-50"
                                  }`}
                                >
                                  -
                                </button>
                                {filteredTitles.length === 0 ? (
                                  <div className="px-3 py-4 text-xs text-gray-400 text-center">ไม่พบคำนำหน้า</div>
                                ) : filteredTitles.map((t) => (
                                  <button
                                    key={t.title_code}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { handleExternalFormChange("titleCode", t.title_code); setIsTitleOpen(false); setTitleSearch(""); }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                      externalForm.titleCode === t.title_code
                                        ? "bg-blue-50 text-blue-700 font-semibold"
                                        : "text-gray-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    {t.short_name || t.name}
                                  </button>
                                ))}
                              </div>
                            </div>,
                            document.body
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>ชื่อ <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            placeholder="ชื่อ"
                            value={externalForm.firstname}
                            onChange={(e) => handleExternalFormChange("firstname", e.target.value)}
                            disabled={isSubmitting}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>นามสกุล <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            placeholder="นามสกุล"
                            value={externalForm.lastname}
                            onChange={(e) => handleExternalFormChange("lastname", e.target.value)}
                            disabled={isSubmitting}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      {/* ID Card */}
                      <div>
                        <label className={labelClass}>เลขบัตรประชาชน</label>
                        <input
                          type="text"
                          placeholder="X-XXXX-XXXXX-XX-X"
                          maxLength={13}
                          value={externalForm.idCard}
                          onChange={(e) => handleExternalFormChange("idCard", e.target.value.replace(/\D/g, ""))}
                          disabled={isSubmitting}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">ที่อยู่</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className={labelClass}>
                          ที่อยู่ <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          placeholder="บ้านเลขที่ / หมู่ / ถนน / ซอย"
                          value={externalForm.address}
                          onChange={(e) => handleExternalFormChange("address", e.target.value)}
                          disabled={isSubmitting}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400 disabled:bg-slate-100 resize-none"
                        />
                      </div>

                      {/* ── Tabbed Address Picker (inline — no absolute, no clipping) ── */}
                      <div ref={addressPickerRef}>
                        <label className={labelClass}>
                          จังหวัด, เขต/อำเภอ, แขวง/ตำบล <span className="text-red-500">*</span>
                        </label>

                        {/* Trigger button */}
                        <button
                          type="button"
                          disabled={isSubmitting || loadingProvinces}
                          onClick={() => {
                            setIsAddressOpen((o) => !o);
                            if (!isAddressOpen) {
                              if (!externalForm.provinceId) setAddressTab('province');
                              else if (!externalForm.districtId) setAddressTab('district');
                              else setAddressTab('subdistrict');
                              setAddressSearch('');
                            }
                          }}
                          className={`flex items-center justify-between w-full border rounded-lg px-3 py-2.5 text-sm bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            isAddressOpen
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          <span className={addressSummary ? 'text-gray-800 font-medium truncate mr-2' : 'text-gray-400'}>
                            {loadingProvinces
                              ? 'กำลังโหลด...'
                              : addressSummary || '-- เลือกจังหวัด / อำเภอ / ตำบล --'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {loadingProvinces && (
                              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            )}
                            {externalForm.postalCode && !loadingProvinces && (
                              <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {externalForm.postalCode}
                              </span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isAddressOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>   
                        {/* Inline picker panel — flows in document, never clipped */}
                        {isAddressOpen && (
                          <div className="mt-2 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">

                            {/* Breadcrumb chips */}
                            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-0 flex-wrap">
                              {externalForm.province && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {externalForm.province}
                                </span>
                              )}
                              {externalForm.district && (
                                <>
                                  <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {externalForm.district}
                                    {externalForm.postalCode && (
                                      <span className="text-blue-500">{externalForm.postalCode}</span>
                                    )}
                                  </span>
                                </>
                              )}
                              {externalForm.subdistrict && (
                                <>
                                  <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                    {externalForm.subdistrict}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-100 mt-2">
                              {(['province', 'district', 'subdistrict'] as const).map((tab) => {
                                const labels  = { province: 'จังหวัด', district: 'เขต/อำเภอ', subdistrict: 'แขวง/ตำบล' };
                                const loading = tab === 'district' ? loadingDistricts : tab === 'subdistrict' ? loadingSubs : loadingProvinces;
                                const disabled = tab === 'district' ? !externalForm.provinceId : tab === 'subdistrict' ? !externalForm.districtId : false;
                                return (
                                  <button
                                    key={tab}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => { setAddressTab(tab); setAddressSearch(''); }}
                                    className={`flex-1 py-2 text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-1 ${
                                      addressTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : disabled
                                        ? 'border-transparent text-gray-300 cursor-not-allowed'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    {labels[tab]}
                                    {loading && addressTab === tab && (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Search */}
                            <div className="px-3 pt-2 pb-1">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="ค้นหา..."
                                  value={addressSearch}
                                  onChange={(e) => setAddressSearch(e.target.value)}
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* List — fixed height with scroll, never clips */}
                            <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>

                              {/* Province list */}
                              {addressTab === 'province' && (
                                loadingProvinces ? (
                                  <div className="py-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดจังหวัด...
                                  </div>
                                ) : filteredProvinces.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-gray-400">ไม่พบจังหวัด</div>
                                ) : filteredProvinces.map((p) => (
                                  <button key={p.id} type="button" onClick={() => pickProvince(p.id)}
                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                      externalForm.provinceId === p.id
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {p.name}
                                  </button>
                                ))
                              )}

                              {/* District list — name only, zip is on subdistrict */}
                              {addressTab === 'district' && (
                                loadingDistricts ? (
                                  <div className="py-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดอำเภอ...
                                  </div>
                                ) : filteredDistricts.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-gray-400">
                                    {externalForm.provinceId ? 'ไม่พบอำเภอ' : 'กรุณาเลือกจังหวัดก่อน'}
                                  </div>
                                ) : filteredDistricts.map((d) => (
                                  <button key={d.id} type="button" onClick={() => pickDistrict(d.id)}
                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                      externalForm.districtId === d.id
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {d.name}
                                  </button>
                                ))
                              )}

                              {/* Subdistrict list — shows zip_code alongside name */}
                              {addressTab === 'subdistrict' && (
                                loadingSubs ? (
                                  <div className="py-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดตำบล...
                                  </div>
                                ) : filteredSubdistricts.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-gray-400">
                                    {externalForm.districtId ? 'ไม่พบตำบล' : 'กรุณาเลือกอำเภอก่อน'}
                                  </div>
                                ) : filteredSubdistricts.map((s) => (
                                  <button key={s.id} type="button" onClick={() => pickSubdistrict(s.id)}
                                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                                      externalForm.subdistrictId === s.id
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>{s.name}</span>
                                    {s.zip_code && (
                                      <span className="text-[11px] text-gray-400 font-mono ml-2 flex-shrink-0">
                                        {s.zip_code}
                                      </span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>

                            {/* Close button */}
                            <div className="px-3 py-2 border-t border-slate-100 flex justify-end">
                              <button
                                type="button"
                                onClick={() => { setIsAddressOpen(false); setAddressSearch(''); }}
                                className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                ปิด
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Summary chip — shown after full address picked */}
                        {!isAddressOpen && externalForm.postalCode && (
                          <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="text-xs text-blue-700 flex-1 truncate">
                              {[externalForm.subdistrict, externalForm.district, externalForm.province].filter(Boolean).join(' › ')}
                            </span>
                            <span className="text-xs font-bold text-blue-800 bg-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
                              {externalForm.postalCode}
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Contact Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">ช่องทางติดต่อ</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className={labelClass}>
                          เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            placeholder="0XX-XXX-XXXX"
                            maxLength={10}
                            value={externalForm.phone}
                            onChange={(e) =>
                              handleExternalFormChange("phone", e.target.value.replace(/\D/g, ""))
                            }
                            disabled={isSubmitting}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">อัปโหลดเอกสาร</span>
                      <span className="ml-auto text-[10px] text-gray-400 font-medium">PDF / JPG / PNG / WEBP / HEIC · ไม่เกิน 10 MB · สูงสุด 5 ไฟล์</span>
                    </div>
                    <div className="px-4 pb-3 pt-2 space-y-0">
                      {/* File list */}
                      {externalForm.documents.map((file, idx) => {
                        const isPdf = file.type === "application/pdf";
                        const isImage = file.type.startsWith("image/");
                        return (
                          <div key={idx} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                            {/* File type icon */}
                            {isPdf ? (
                              <div className="w-7 h-7 bg-red-50 border border-red-100 rounded-md flex items-center justify-center flex-shrink-0">
                                <FileText className="w-3.5 h-3.5 text-red-500" />
                              </div>
                            ) : isImage ? (
                              <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 border border-slate-200">
                                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center flex-shrink-0">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            )}
                            <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0 w-16 text-right">{formatFileSize(file.size)}</span>
                            <button
                              onClick={() => removeFile(idx)}
                              disabled={isSubmitting}
                              className="p-0.5 text-gray-400 hover:text-red-500 transition disabled:opacity-50 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      {/* Upload button — hide when max reached */}
                      {externalForm.documents.length < MAX_DOC_COUNT && (
                        <label className={`flex items-center gap-3 mt-2 p-3 border border-dashed rounded-lg cursor-pointer transition-all ${
                          fileError ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/30"
                        }`}>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                            multiple
                            className="sr-only"
                          />
                          {fileError
                            ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            : <Upload className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          <span className={`text-sm ${fileError ? "text-red-600" : "text-gray-500"}`}>
                            {fileError || "คลิกเพื่อเพิ่มไฟล์"}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            {externalForm.documents.length}/{MAX_DOC_COUNT}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Notes Section - EXTERNAL */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">หมายเหตุ</span>
                    </div>
                    <div className="p-4">
                      <textarea
                        rows={2}
                        placeholder="ระบุวัตถุประสงค์หรือรายละเอียดเพิ่มเติม (ถ้ามี)"
                        value={externalForm.notes}
                        onChange={(e) => handleExternalFormChange("notes", e.target.value)}
                        disabled={isSubmitting}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Confirmation Summary */}
              {externalStep === 3 && (
                <>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-800 text-sm">ตรวจสอบข้อมูล</p>
                      <p className="text-xs text-blue-600">กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันการยืม</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">ข้อมูลผู้ยืม</h4>
                      <div className="space-y-2">
                        <p className="text-sm flex gap-2">
                          <span className="text-gray-500 w-24 flex-shrink-0">ชื่อ-นามสกุล:</span>
                          <span className="font-semibold text-gray-800">
                            {[titles.find(t => t.title_code === externalForm.titleCode)?.short_name, externalForm.firstname, externalForm.lastname].filter(Boolean).join(" ")}
                          </span>
                        </p>
                        {externalForm.idCard && (
                          <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">บัตรประชาชน:</span> <span className="font-mono text-gray-800">{externalForm.idCard}</span></p>
                        )}
                        <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">เบอร์โทรศัพท์:</span> <span className="font-semibold text-gray-800">{externalForm.phone}</span></p>
                        <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">ที่อยู่:</span> <span className="text-gray-800">{externalForm.address} อ.{externalForm.district} จ.{externalForm.province} {externalForm.postalCode}</span></p>
                        {externalForm.documents.length > 0 && (
                          <p className="text-sm flex gap-2">
                            <span className="text-gray-500 w-24 flex-shrink-0">เอกสารแนบ:</span>
                            <span className="text-gray-800">{externalForm.documents.length} ไฟล์</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">รายละเอียดการยืม</h4>
                      <div className="space-y-2">
                        <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">รายการทั้งหมด:</span> <span className="font-semibold text-indigo-600">{selectedItems.length} รายการ ({selectedItems.reduce((a, b) => a + b.quantity, 0)} ชิ้น)</span></p>
                        <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">วันที่คืน:</span> <span className="font-semibold text-emerald-600">{externalForm.returnDate}</span></p>
                        {externalForm.notes && (
                          <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">หมายเหตุ:</span> <span className="text-gray-800">{externalForm.notes}</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
        </div>

        {/* Footer */}
        {externalStep === 1 && (
          <div className="p-5 border-t border-gray-200 bg-white flex-shrink-0">
            <button
              onClick={() => {
                if (selectedItems.length === 0) {
                  MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาเลือกรายการที่ต้องการยืมอย่างน้อย 1 รายการ", icon: "warning" });
                  return;
                }
                if (!externalForm.returnDate) {
                  MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาระบุวันที่คืนครุภัณฑ์", icon: "warning" });
                  return;
                }
                setExternalStep(2);
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2"
            >
              ถัดไป
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {externalStep === 2 && (
          <div className="p-5 border-t border-gray-200 bg-white flex-shrink-0 flex gap-3">
            <button
              onClick={() => setExternalStep(1)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              ย้อนกลับ
            </button>
            <button
              onClick={() => {
                const { firstname, lastname, address, subdistrict, district, province, postalCode, phone } = externalForm;
                if (!firstname || !lastname || !address || !subdistrict || !district || !province || !postalCode || !phone) {
                  MySwal.fire({ title: "แจ้งเตือน", text: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", icon: "warning" });
                  return;
                }
                setExternalStep(3);
              }}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2"
            >
              ถัดไป
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {externalStep === 3 && (
          <div className="p-5 border-t border-gray-200 bg-white flex-shrink-0 flex gap-3">
            <button
              onClick={() => setExternalStep(2)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              ย้อนกลับ
            </button>
            <button
              onClick={submitExternalBorrow}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {isSubmitting ? "กำลังส่งคำขอ..." : "ยืนยันการยืม"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
