"use client";

import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Package,
  Save,
  Loader2,
  X,
  Upload,
} from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { useDropzone } from "react-dropzone";

interface FormData {
  name: string;
  category_id: string;
  unit_id: string;
  warehouse_id: string;
  min_stock: number;
  imageUrl: string;
}

interface FormErrors {
  name?: string;
  category_id?: string;
  unit_id?: string;
  warehouse_id?: string;
  min_stock?: string;
}

interface ItemFormModalProps {
  isOpen: boolean;
  isEdit?: boolean;
  initialData?: Item.UiItem | null;
  onCloseAction: () => void;
  onSuccessAction: () => void;
}

const INITIAL_FORM_DATA: FormData = {
  name: "",
  category_id: "",
  unit_id: "",
  warehouse_id: "",
  min_stock: 0,
  imageUrl: "",
};

export default function ItemFormModal({
  isOpen,
  isEdit = false,
  initialData,
  onCloseAction,
  onSuccessAction,
}: ItemFormModalProps) {
  const [options, setOptions] = useState<Item.AllOptions>({
    category: [],
    unit: [],
    warehouse: [],
  });
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);

  // Fetch options on mount
  useEffect(() => {
    if (isOpen) {
      const fetchOptions = async () => {
        try {
          const opts = await ItemSvc.getItemOptions();
          setOptions(opts || { category: [], unit: [], warehouse: [] });
        } catch (error) {
          console.error("Error fetching options:", error);
          toast.error("ไม่สามารถดึงข้อมูลได้");
        } finally {
          setIsFetchingOptions(false);
        }
      };

      fetchOptions();
    }
  }, [isOpen]);

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialData) {
        // For edit mode
        const foundCat = options.category?.find(
          (c) => c.name === initialData.category
        );
        const foundUnit = options.unit?.find(
          (u) => u.name === initialData.unit
        );
        const foundWarehouse = options.warehouse?.find(
          (w) => w.name === initialData.location
        );

        setFormData({
          name: initialData.name,
          category_id: foundCat ? foundCat.id.toString() : "",
          unit_id: foundUnit ? foundUnit.id.toString() : "",
          warehouse_id: foundWarehouse ? foundWarehouse.id.toString() : "",
          min_stock: initialData.minStock,
          imageUrl: initialData.imageUrl || "",
        });
      } else {
        // For add mode
        setFormData(INITIAL_FORM_DATA);
      }
      setFormErrors({});
    }
  }, [isOpen, isEdit, initialData, options]);

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.name) errors.name = "กรุณากรอกชื่อพัสดุ";
    if (!formData.category_id) errors.category_id = "กรุณาเลือกประเภท";
    if (!formData.unit_id) errors.unit_id = "กรุณาเลือกหน่วย";
    if (!formData.warehouse_id) errors.warehouse_id = "กรุณาเลือกคลัง";
    if (formData.min_stock < 0) errors.min_stock = "จำนวนขั้นต่ำต้องมากกว่าหรือเท่ากับ 0";
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const payload = isEdit
        ? ({
            name: formData.name,
            min_stock: Number(formData.min_stock),
            unit_id: formData.unit_id,
            warehouse_id: formData.warehouse_id,
            status: "ACTIVE",
            image_url: formData.imageUrl,
          } as Item.UpdatePayload)
        : ({
            name: formData.name,
            min_stock: Number(formData.min_stock),
            category_id: formData.category_id,
            unit_id: formData.unit_id,
            warehouse_id: formData.warehouse_id,
            status: "ACTIVE",
            image_url: formData.imageUrl,
          } as Item.CreatePayload);

      if (isEdit && initialData) {
        await ItemSvc.updateInventoryItem(initialData.id, payload as Item.UpdatePayload);
        toast.success("แก้ไขข้อมูลสำเร็จ");
      } else {
        await ItemSvc.createInventoryItem(payload as Item.CreatePayload);
        toast.success("บันทึกสำเร็จ");
      }

      onSuccessAction?.();
      onCloseAction?.();
    } catch (error) {
      toast.error(
        "เกิดข้อผิดพลาด: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [] },
    onDrop: (files) => {
      const file = files[0];
      if (file) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: URL.createObjectURL(file),
        }));
      }
    },
  });

  if (!isOpen) return null;

  return (
    <>
      <Toaster position="top-right" />
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        onClick={onCloseAction}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isEdit ? "แก้ไขข้อมูลพัสดุ" : "เพิ่มพัสดุใหม่"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isEdit
                    ? "อัปเดตข้อมูลพัสดุในระบบ"
                    : "บันทึกข้อมูลพัสดุใหม่เข้าคลัง"}
                </p>
              </div>
            </div>
            <button
              onClick={onCloseAction}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Form Section */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-500" />
                ข้อมูลพัสดุ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Item Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    ชื่อพัสดุ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="ระบุชื่อพัสดุ"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    ประเภท <span className="text-red-500">*</span>
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <select
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category_id: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- เลือกประเภท --</option>
                      {options.category?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.category_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.category_id}
                    </p>
                  )}
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    หน่วยนับ <span className="text-red-500">*</span>
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <select
                      value={formData.unit_id}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_id: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- เลือกหน่วย --</option>
                      {options.unit?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.unit_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.unit_id}
                    </p>
                  )}
                </div>

                {/* Warehouse */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    ตำแหน่งเก็บ (คลัง) <span className="text-red-500">*</span>
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <select
                      value={formData.warehouse_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warehouse_id: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- เลือกคลัง --</option>
                      {options.warehouse?.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.warehouse_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.warehouse_id}
                    </p>
                  )}
                </div>

                {/* Min Stock */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    จำนวนขั้นต่ำ (Min Stock)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_stock: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                  {formErrors.min_stock && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.min_stock}
                    </p>
                  )}
                </div>

                {/* Image Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    รูปภาพพัสดุ
                  </label>
                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50"
                  >
                    <input {...getInputProps()} />
                    {formData.imageUrl ? (
                      <img
                        src={formData.imageUrl}
                        className="h-32 mx-auto rounded-lg shadow-md"
                        alt="Preview"
                      />
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">
                          คลิกหรือลากรูปภาพมาวางที่นี่
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
            <button
              onClick={onCloseAction}
              className="px-6 py-2.5 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              disabled={isLoading}
              onClick={handleSubmit}
              className="px-8 py-2.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {isEdit ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
