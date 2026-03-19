"use client";

import {
  X,
  Save,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import type {
  Category,
  CategoryPayload,
  Unit,
  UnitPayload,
  Warehouse,
  WarehousePayload,
} from "@/types/settings_type";

type TabType = "categories" | "units" | "warehouses";
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
  isSaving: boolean;
  onFormSubmit: () => void;

  // Delete Modal Props
  deleteModalOpen: boolean;
  itemToDelete: { id: string; type: TabType; name: string } | null;
  onDeleteModalClose: () => void;
  onConfirmDelete: () => void;
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
  isSaving,
  onFormSubmit,
  deleteModalOpen,
  itemToDelete,
  onDeleteModalClose,
  onConfirmDelete,
}: SettingsModalsProps) {
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
  const inputClass = "w-full border border-slate-300 bg-white rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm";

  return (
    <>
      {/* ================= ADD / EDIT FORM MODAL (POP-UP) ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
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

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการลบข้อมูล</h3>
              <p className="text-sm text-slate-500 mb-6">
                คุณต้องการลบ <span className="font-bold text-slate-800">{itemToDelete?.name}</span> ใช่หรือไม่?<br/>
                การกระทำนี้ไม่สามารถกู้คืนได้
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={onDeleteModalClose}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={onConfirmDelete}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-red-200 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {isSaving ? "กำลังลบ..." : "ลบข้อมูล"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
