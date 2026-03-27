"use client";

import { useState, useCallback, useRef } from "react";
import {
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  X,
  Package,
  Loader2,
  User,
  MapPin,
  Phone,
  MessageCircle,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ✅ Import Services และ Types
import * as ItemSvc from "@/services/itemsService";
import * as RequisitionSvc from "@/services/requisitionService";
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
  code: string;
  name: string;
}

interface ExternalPersonForm {
  fullName: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  returnDate: string;
  notes: string;
  document: File | null;
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
  selectedDeptId: string;
  departments: Department[];
  onDeptChange: (deptId: string) => void;
}

const initialExternalForm: ExternalPersonForm = {
  fullName: "",
  address: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  phone: "",
  returnDate: "",
  notes: "",
  document: null,
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
  const [activeTab, setActiveTab] = useState<"BORROW" | "EXTERNAL">("BORROW");
  // Step wizard for EXTERNAL tab: 1 = cart + return date, 2 = personal info form, 3 = summary
  const [externalStep, setExternalStep] = useState<1 | 2 | 3>(1);

  // ✅ State สำหรับ Loading ตอนกดปุ่ม
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Global Notes สำหรับ BORROW tab
  const [globalNotes, setGlobalNotes] = useState("");

  // ✅ External Person Form State
  const [externalForm, setExternalForm] =
    useState<ExternalPersonForm>(initialExternalForm);
  const [fileError, setFileError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            const newQty = item.quantity + delta;
            if (newQty > 0 && newQty <= item.stock)
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

  // ✅ Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("รองรับเฉพาะไฟล์ PDF, PNG, JPG เท่านั้น");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      setFileError("ขนาดไฟล์ต้องไม่เกิน 5 MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setExternalForm((prev) => ({ ...prev, document: file }));
  };

  // ✅ Remove uploaded file
  const removeFile = () => {
    setExternalForm((prev) => ({ ...prev, document: null }));
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    // หาชื่อแผนกจาก code
    const currentDept = departments.find((d) => d.code === selectedDeptId);
    const deptName = currentDept ? currentDept.name : "แผนกทั่วไป";

    const confirm = await MySwal.fire({
      title: "ยืนยันการยืม",
      html: `ยืมในนามแผนก: <b class="text-indigo-600">${deptName}</b><br/><br/>จำนวน: ${selectedItems.length} รายการ<br/>วันที่ต้องคืน: <strong class="text-indigo-600">${globalReturnDate}</strong>`,
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
      // ✅ จัดเตรียม Payload สำหรับ API (เปลี่ยน type เป็น BORROW)
      const payload: RequisitionPayload = {
        type: "BORROW",
        department_id: selectedDeptId,
        department_name: deptName,
        due_date: globalReturnDate, // ส่งวันที่ต้องคืนไปด้วย
        items: selectedItems.map((i) => ({
          item_id: i.id, // ใช้ ID (String UUID)
          qty: i.quantity,
          note: "",
        })),
        note: "ยืมออนไลน์ผ่านระบบ",
      };

      // ✅ ยิง API
      const res = await RequisitionSvc.createRequisition(payload);

      if (res.success) {
        await MySwal.fire({
          title: "สำเร็จ",
          text: "ส่งคำขอยืมเรียบร้อย รอการอนุมัติจากคลัง",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // ล้างข้อมูลและปิด Modal
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
    const { fullName, address, subdistrict, district, province, postalCode, phone, returnDate } = externalForm;

    if (!fullName || !address || !subdistrict || !district || !province || !postalCode || !phone || !returnDate) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รวมถึงวันที่คืนครุภัณฑ์)",
        icon: "warning",
      });
      return;
    }

    if (selectedItems.length === 0) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ",
        icon: "warning",
      });
      return;
    }

    const confirm = await MySwal.fire({
      title: "ยืนยันการยืม (บุคคลภายนอก)",
      html: `<b>${fullName}</b><br/>${district}, ${province}<br/><br/>จำนวน: ${selectedItems.length} รายการ`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#059669",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    try {
      // TODO: เชื่อม API สำหรับบุคคลภายนอก
      await new Promise((r) => setTimeout(r, 1200));
      await MySwal.fire({
        title: "สำเร็จ",
        text: "ส่งคำขอยืมสำหรับบุคคลภายนอกเรียบร้อยแล้ว",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      setExternalForm(initialExternalForm);
      setSelectedItems([]);
      setShowCartModal(false);
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
    "w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 outline-none transition-all placeholder:text-gray-400 disabled:bg-slate-100";

  const labelClass = "block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Tabs Header */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            className={`flex-1 py-4 font-bold text-center transition-colors text-sm ${activeTab === "BORROW" ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => { setActiveTab("BORROW"); }}
          >
            ตะกร้ายืม ({selectedItems.length})
          </button>
          <button
            className={`flex-1 py-4 font-bold text-center transition-colors text-sm ${activeTab === "EXTERNAL" ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => { setActiveTab("EXTERNAL"); setExternalStep(1); }}
          >
            ยืมบุคคลภายนอก
          </button>
          <button
            onClick={() => setShowCartModal(false)}
            disabled={isSubmitting}
            className="px-4 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/30">

          {/* --- TAB: BORROW --- */}
          {activeTab === "BORROW" && (
            <div className="space-y-4">

              {/* ✅ Department Selection Section */}
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm">
                <label className="text-[10px] font-bold text-indigo-600 uppercase mb-2 block">
                  ระบุแผนกที่ทำการยืม
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => onDeptChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 outline-none"
                >
                  <option value="">-- กรุณาเลือกแผนก --</option>
                  {(departments || []).map((d) => (
                    <option key={d.code} value={d.code}>
                      แผนก{d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes Section - BORROW */}
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> หมายเหตุ
                </label>
                <textarea
                  rows={2}
                  placeholder="ระบุวัตถุประสงค์หรือรายละเอียดเพิ่มเติม (ถ้ามี)"
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:bg-slate-100"
                />
              </div>

              {/* Return Date Section */}
              <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-indigo-600" /> วันที่คืนครุภัณฑ์ (สูงสุด 90 วัน)
                </label>
                <input
                  type="date"
                  disabled={isSubmitting}
                  className="w-full border border-indigo-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none mb-3 disabled:bg-slate-100"
                  value={globalReturnDate}
                  onChange={(e) => setGlobalReturnDate(e.target.value)}
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
                      disabled={isSubmitting}
                      onClick={() => {
                        const date = new Date();
                        date.setDate(date.getDate() + days);
                        setGlobalReturnDate(date.toISOString().split("T")[0]);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition disabled:opacity-50"
                    >
                      {days} วัน
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-gray-700">รายการที่ต้องการยืม</span>
                  <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{selectedItems.length} รายการ</span>
                </div>
                {selectedItems.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center">
                    <ShoppingCart className="w-10 h-10 text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm font-medium">ยังไม่มีรายการในตะกร้า</p>
                    <p className="text-xs text-gray-300 mt-1">กรุณาเลือกรายการจากหน้าระบบยืม</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase">
                          <th className="px-3 py-2.5 text-left w-14">รูป</th>
                          <th className="px-3 py-2.5 text-left">ชื่อรายการ</th>
                          <th className="px-3 py-2.5 text-left w-28">ประเภท</th>
                          <th className="px-3 py-2.5 text-center w-32">จำนวน</th>
                          <th className="px-3 py-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2.5">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                                {item.imageUrl
                                  ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                  : <Package className="w-5 h-5 text-gray-300" />}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                              <div className="text-xs text-gray-400">{item.code}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-gray-600">{item.category}</span>
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
                )}
              </div>
            </div>
          )}

          {/* --- TAB: EXTERNAL PERSON --- */}
          {activeTab === "EXTERNAL" && (
            <div className="space-y-4">

              {/* Step Indicator */}
              <div className="flex items-center gap-2 px-1 overflow-x-auto pb-2 mb-2 no-scrollbar">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  externalStep === 1 ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"
                }`}>
                  <span>1</span>
                  <span>ตะกร้า &amp; วันคืน</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  externalStep === 2 ? "bg-emerald-600 text-white" : externalStep > 2 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}>
                  <span>2</span>
                  <span>ข้อมูลผู้ยืม</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  externalStep === 3 ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  <span>3</span>
                  <span>สรุปข้อมูล</span>
                </div>
              </div>

              {/* Step 1: Cart Items + Return Date */}
              {externalStep === 1 && (
                <>
                  {/* Return Date Section */}
                  <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-gray-700">วันที่คืนครุภัณฑ์ (สูงสุด 90 วัน) <span className="text-red-500">*</span></span>
                    </div>
                    <div className="p-4 space-y-3">
                      <input
                        type="date"
                        disabled={isSubmitting}
                        className="w-full border border-emerald-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
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
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-100 text-emerald-700 font-semibold text-sm hover:bg-emerald-200 transition disabled:opacity-50"
                          >
                            {days} วัน
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-100 bg-emerald-50/40">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-gray-700">รายการที่ต้องการยืม</span>
                      <span className="ml-auto text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{selectedItems.length} รายการ</span>
                    </div>
                    {selectedItems.length === 0 ? (
                      <div className="text-center py-10 flex flex-col items-center">
                        <ShoppingCart className="w-10 h-10 text-gray-200 mb-2" />
                        <p className="text-gray-400 text-sm font-medium">ยังไม่มีรายการในตะกร้า</p>
                        <p className="text-xs text-gray-300 mt-1">กรุณาเลือกรายการจากหน้าระบบยืม</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase">
                              <th className="px-3 py-2.5 text-left w-14">รูป</th>
                              <th className="px-3 py-2.5 text-left">ชื่อรายการ</th>
                              <th className="px-3 py-2.5 text-left w-28">ประเภท</th>
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
                                <td className="px-3 py-2.5">
                                  <span className="text-xs text-gray-600">{item.category}</span>
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
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Personal Info Form */}
              {externalStep === 2 && (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-800 text-sm">ยืมสำหรับบุคคลภายนอก</p>
                      <p className="text-xs text-emerald-600">กรุณากรอกข้อมูลผู้ขอยืมให้ครบถ้วน</p>
                    </div>
                  </div>

                  {/* Personal Info Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-gray-700">ข้อมูลส่วนตัว</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className={labelClass}>
                          ชื่อ-นามสกุล <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="กรอกชื่อ-นามสกุล"
                          value={externalForm.fullName}
                          onChange={(e) => handleExternalFormChange("fullName", e.target.value)}
                          disabled={isSubmitting}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-gray-700">ที่อยู่</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className={labelClass}>
                          ที่อยู่ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="บ้านเลขที่ / หมู่ / ถนน / ซอย"
                          value={externalForm.address}
                          onChange={(e) => handleExternalFormChange("address", e.target.value)}
                          disabled={isSubmitting}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>
                            ตำบล <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="ตำบล / แขวง"
                            value={externalForm.subdistrict}
                            onChange={(e) => handleExternalFormChange("subdistrict", e.target.value)}
                            disabled={isSubmitting}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            อำเภอ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="อำเภอ / เขต"
                            value={externalForm.district}
                            onChange={(e) => handleExternalFormChange("district", e.target.value)}
                            disabled={isSubmitting}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            จังหวัด <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="จังหวัด"
                            value={externalForm.province}
                            onChange={(e) => handleExternalFormChange("province", e.target.value)}
                            disabled={isSubmitting}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            รหัสไปรษณีย์ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="00000"
                            maxLength={5}
                            value={externalForm.postalCode}
                            onChange={(e) =>
                              handleExternalFormChange("postalCode", e.target.value.replace(/\D/g, ""))
                            }
                            disabled={isSubmitting}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <Phone className="w-4 h-4 text-emerald-600" />
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
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-gray-700">อัปโหลดเอกสารสำเนาบัตรประชาชน</span>
                      <span className="ml-auto text-[10px] text-gray-400 font-medium">PDF / PNG / JPG · ไม่เกิน 5 MB</span>
                    </div>
                    <div className="p-4">
                      {externalForm.document ? (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {externalForm.document.type === "application/pdf" ? (
                              <FileText className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {externalForm.document.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatFileSize(externalForm.document.size)}
                            </p>
                          </div>
                          <button
                            onClick={removeFile}
                            disabled={isSubmitting}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label
                          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            fileError
                              ? "border-red-300 bg-red-50 hover:bg-red-50"
                              : "border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/30"
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                            className="sr-only"
                          />
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fileError ? "bg-red-100" : "bg-emerald-100"}`}>
                            {fileError ? (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Upload className="w-5 h-5 text-emerald-600" />
                            )}
                          </div>
                          <div className="text-center">
                            <p className={`text-sm font-semibold ${fileError ? "text-red-600" : "text-gray-700"}`}>
                              {fileError || "คลิกเพื่อเลือกไฟล์"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG · สูงสุด 5 MB</p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Notes Section - EXTERNAL */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-gray-700">หมายเหตุ</span>
                    </div>
                    <div className="p-4">
                      <textarea
                        rows={2}
                        placeholder="ระบุวัตถุประสงค์หรือรายละเอียดเพิ่มเติม (ถ้ามี)"
                        value={externalForm.notes}
                        onChange={(e) => handleExternalFormChange("notes", e.target.value)}
                        disabled={isSubmitting}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Confirmation Summary */}
              {externalStep === 3 && (
                <>
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-800 text-sm">ตรวจสอบข้อมูล</p>
                      <p className="text-xs text-emerald-600">กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันการยืม</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">ข้อมูลผู้ยืม</h4>
                      <div className="space-y-2">
                        <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">ชื่อ-นามสกุล:</span> <span className="font-semibold text-gray-800">{externalForm.fullName}</span></p>
                        <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">เบอร์โทรศัพท์:</span> <span className="font-semibold text-gray-800">{externalForm.phone}</span></p>
                        <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">ที่อยู่:</span> <span className="text-gray-800">{externalForm.address} อ.{externalForm.district} จ.{externalForm.province} {externalForm.postalCode}</span></p>
                        {externalForm.document && (
                          <p className="text-sm flex gap-2"><span className="text-gray-500 w-24 flex-shrink-0">เอกสารแนบ:</span> <span className="text-gray-800">{externalForm.document.name}</span></p>
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
          )}
        </div>

        {/* Footer */}
        {activeTab === "BORROW" && selectedItems.length > 0 && (
          <div className="p-5 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
              <span>รวมทั้งหมด</span>
              <span className="text-xl font-bold text-indigo-600">
                {selectedItems.reduce((a, b) => a + b.quantity, 0)}{" "}
                <span className="text-sm font-normal text-gray-500">ชิ้น</span>
              </span>
            </div>
            <button
              onClick={submitBorrow}
              disabled={isSubmitting || !selectedDeptId || !globalReturnDate}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
              {isSubmitting ? "กำลังส่งคำขอ..." : "ยืนยันการยืม"}
            </button>
          </div>
        )}

        {activeTab === "EXTERNAL" && externalStep === 1 && (
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
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-md transition flex items-center justify-center gap-2"
            >
              ถัดไป
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {activeTab === "EXTERNAL" && externalStep === 2 && (
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
                const { fullName, address, subdistrict, district, province, postalCode, phone } = externalForm;
                if (!fullName || !address || !subdistrict || !district || !province || !postalCode || !phone) {
                  MySwal.fire({ title: "แจ้งเตือน", text: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", icon: "warning" });
                  return;
                }
                setExternalStep(3);
              }}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-md transition flex items-center justify-center gap-2"
            >
              ถัดไป
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {activeTab === "EXTERNAL" && externalStep === 3 && (
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
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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