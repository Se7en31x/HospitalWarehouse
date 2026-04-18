"use client";

import {
  X,
  Save,
  ChevronDown,
  Mail,
  Phone,
  Landmark,
  CreditCard,
  User,
  Building2,
  UserRound,
} from "lucide-react";
import { useState, useEffect } from "react";
import type {
  Category,
  CategoryPayload,
  Unit,
  UnitPayload,
  Warehouse,
  WarehousePayload,
  Supplier,
  SupplierPayload,
} from "@/types/settings_type";

type TabType = "categories" | "units" | "warehouses" | "suppliers";
type FormMode = "create" | "edit";

interface SettingsModalsProps {
  // Form Modal Props
  isFormModalOpen: boolean;
  onFormModalClose: () => void;
  formTitle: string;
  formMode: FormMode;
  activeTab: TabType;
  categoryForm: CategoryPayload;
  onCategoryFormChange: (form: CategoryPayload) => void;
  unitForm: UnitPayload;
  onUnitFormChange: (form: UnitPayload) => void;
  warehouseForm: WarehousePayload;
  onWarehouseFormChange: (form: WarehousePayload) => void;
  supplierForm: SupplierPayload;
  onSupplierFormChange: (form: SupplierPayload) => void;
  isSaving: boolean;
  onFormSubmit: () => void;
}

export default function SettingsModals({
  isFormModalOpen,
  onFormModalClose,
  formTitle,
  activeTab,
  categoryForm,
  onCategoryFormChange,
  unitForm,
  onUnitFormChange,
  warehouseForm,
  onWarehouseFormChange,
  supplierForm,
  onSupplierFormChange,
  isSaving,
  onFormSubmit,
}: SettingsModalsProps) {
  const [isItemTypeOpen, setIsItemTypeOpen] = useState(false);
  
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
  const inputClass = "w-full border border-slate-300 bg-white rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm";
  
  const itemTypeOptions = [
    { value: "CONSUMABLE", label: "CONSUMABLE - วัสดุสิ้นเปลือง" },
    { value: "REUSABLE", label: "REUSABLE - ของใช้ซ้ำรายชิ้น" },
    { value: "MED_ASSET", label: "MED_ASSET - ครุภัณฑ์ภายในองค์กร" },
  ];
  
  const getItemTypeLabel = (value: string) => {
    return itemTypeOptions.find(opt => opt.value === value)?.label || value;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-item-type]")) setIsItemTypeOpen(false);
    };
    if (isItemTypeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isItemTypeOpen]);

  return (
    <>
      {/* ================= ADD / EDIT FORM MODAL (POP-UP) ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`bg-white rounded-lg shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] ${activeTab === "suppliers" ? "max-w-2xl" : "max-w-xl"}`}>
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">{formTitle}</h2>
              <button onClick={onFormModalClose} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeTab === "categories" && (
                  <>
                    <div className="md:col-span-1">
                      <label className={labelClass}>ชื่อประเภทพัสดุ <span className="text-red-500">*</span></label>
                      <input value={categoryForm.name} onChange={(e) => onCategoryFormChange({ ...categoryForm, name: e.target.value })} placeholder="ระบุชื่อประเภท" className={inputClass} />
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>Prefix Code <span className="text-red-500">*</span></label>
                      <input value={categoryForm.code_prefix} onChange={(e) => onCategoryFormChange({ ...categoryForm, code_prefix: e.target.value })} placeholder="ตัวอักษรย่อ (เช่น OFC)" className={`${inputClass} uppercase font-mono`} maxLength={5} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>ประเภทสินค้าเริ่มต้นของหมวดหมู่ <span className="text-red-500">*</span></label>
                      <div className="relative" data-filter-item-type>
                        <button
                          type="button"
                          onClick={() => setIsItemTypeOpen(!isItemTypeOpen)}
                          className="w-full flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm justify-between"
                        >
                          <span className="text-slate-800 font-medium text-left">{getItemTypeLabel(categoryForm.item_type || "CONSUMABLE")}</span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isItemTypeOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isItemTypeOpen && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 w-full max-h-64 overflow-y-auto">
                            <ul className="py-1">
                              {itemTypeOptions.map(opt => (
                                <li key={opt.value}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onCategoryFormChange({
                                        ...categoryForm,
                                        item_type: opt.value as "CONSUMABLE" | "REUSABLE" | "MED_ASSET",
                                      });
                                      setIsItemTypeOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                      (categoryForm.item_type || "CONSUMABLE") === opt.value
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>รายละเอียด (ไม่บังคับ)</label>
                      <textarea value={categoryForm.description || ""} onChange={(e) => onCategoryFormChange({ ...categoryForm, description: e.target.value })} placeholder="ระบุรายละเอียดเพิ่มเติม" className={`${inputClass} resize-none h-24`} />
                    </div>
                  </>
                )}

                {activeTab === "units" && (
                  <>
                    <div className="md:col-span-2">
                      <label className={labelClass}>ชื่อหน่วยนับ <span className="text-red-500">*</span></label>
                      <input value={unitForm.name} onChange={(e) => onUnitFormChange({ ...unitForm, name: e.target.value })} placeholder="เช่น กล่อง, ชิ้น" className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>รายละเอียด (ไม่บังคับ)</label>
                      <textarea value={unitForm.description || ""} onChange={(e) => onUnitFormChange({ ...unitForm, description: e.target.value })} placeholder="ระบุรายละเอียดเพิ่มเติม" className={`${inputClass} resize-none h-24`} />
                    </div>
                  </>
                )}

                {activeTab === "warehouses" && (
                  <>
                    <div className="md:col-span-1">
                      <label className={labelClass}>ชื่อคลังสินค้า <span className="text-red-500">*</span></label>
                      <input value={warehouseForm.name} onChange={(e) => onWarehouseFormChange({ ...warehouseForm, name: e.target.value })} placeholder="ระบุชื่อคลัง" className={inputClass} />
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>สถานที่ตั้ง</label>
                      <input value={warehouseForm.location || ""} onChange={(e) => onWarehouseFormChange({ ...warehouseForm, location: e.target.value })} placeholder="ระบุสถานที่" className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>รายละเอียด (ไม่บังคับ)</label>
                      <textarea value={warehouseForm.description || ""} onChange={(e) => onWarehouseFormChange({ ...warehouseForm, description: e.target.value })} placeholder="ระบุรายละเอียดเพิ่มเติม" className={`${inputClass} resize-none h-24`} />
                    </div>
                  </>
                )}

                {activeTab === "suppliers" && (
                  <>
                    {/* ข้อมูลทั่วไป */}
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-700">ข้อมูลทั่วไป</span>
                        <div className="flex-1 h-px bg-blue-100" />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>ชื่อผู้จำหน่าย <span className="text-red-500">*</span></label>
                      <input value={supplierForm.name} onChange={(e) => onSupplierFormChange({ ...supplierForm, name: e.target.value })} placeholder="ระบุชื่อผู้จำหน่าย" className={inputClass} />
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>ผู้ติดต่อ</label>
                      <input value={supplierForm.contact || ""} onChange={(e) => onSupplierFormChange({ ...supplierForm, contact: e.target.value })} placeholder="ชื่อผู้ติดต่อ" className={inputClass} />
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>เลขประจำตัวผู้เสียภาษี</label>
                      <input value={supplierForm.tax_id || ""} onChange={(e) => onSupplierFormChange({ ...supplierForm, tax_id: e.target.value })} placeholder="เลขประจำตัวผู้เสียภาษี" className={inputClass} />
                    </div>

                    {/* ข้อมูลการติดต่อ */}
                    <div className="md:col-span-2 mt-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-700">ข้อมูลการติดต่อ</span>
                        <div className="flex-1 h-px bg-blue-100" />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>อีเมล</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          type="email"
                          value={supplierForm.email || ""}
                          onChange={(e) => onSupplierFormChange({ ...supplierForm, email: e.target.value })}
                          placeholder="example@email.com"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>เบอร์โทรศัพท์บริษัท</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          value={supplierForm.phone || ""}
                          onChange={(e) => onSupplierFormChange({ ...supplierForm, phone: e.target.value })}
                          placeholder="02-XXX-XXXX"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>เบอร์ผู้ติดต่อ / ส่วนตัว</label>
                      <div className="relative">
                        <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          value={supplierForm.contact_phone || ""}
                          onChange={(e) => onSupplierFormChange({ ...supplierForm, contact_phone: e.target.value })}
                          placeholder="08X-XXX-XXXX"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    {/* ข้อมูลการชำระเงิน */}
                    <div className="md:col-span-2 mt-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Landmark className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-700">ข้อมูลการชำระเงิน</span>
                        <div className="flex-1 h-px bg-blue-100" />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>ธนาคาร</label>
                      <div className="relative">
                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          value={supplierForm.bank_name || ""}
                          onChange={(e) => onSupplierFormChange({ ...supplierForm, bank_name: e.target.value })}
                          placeholder="เช่น กรุงไทย, กสิกรไทย"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>เลขบัญชี</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          value={supplierForm.bank_account_number || ""}
                          onChange={(e) => onSupplierFormChange({ ...supplierForm, bank_account_number: e.target.value })}
                          placeholder="เลขบัญชีธนาคาร"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>ชื่อบัญชี</label>
                      <input
                        value={supplierForm.bank_account_name || ""}
                        onChange={(e) => onSupplierFormChange({ ...supplierForm, bank_account_name: e.target.value })}
                        placeholder="ชื่อเจ้าของบัญชีธนาคาร"
                        className={inputClass}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={onFormModalClose} disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors">
                ยกเลิก
              </button>
              <button onClick={onFormSubmit} disabled={isSaving} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 min-w-[120px]">
                {isSaving ? <div className="w-4 h-4 border-2 border-indigo-200 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
