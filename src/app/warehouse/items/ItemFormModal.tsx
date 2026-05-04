"use client";

import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import {
  Package,
  Save,
  Loader2,
  X,
  Upload,
  Search,
  PackagePlus,
} from "lucide-react";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { useDropzone } from "react-dropzone";

interface FormData {
  name: string;
  description: string;
  category_id: string;
  unit_id: string;
  warehouse_id: string;
  min_stock: number;
  imageUrl: string;
  type: string;
  allowed_req: boolean;
  allowed_borrow: boolean;
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
  categories?: Item.categoryOptions;
  warehouses?: Item.warehouseOptions;
  units?: Item.unitOptions;
}

const INITIAL_FORM_DATA: FormData = {
  name: "",
  description: "",
  category_id: "",
  unit_id: "",
  warehouse_id: "",
  min_stock: 0,
  imageUrl: "",
  type: "",
  allowed_req: true,
  allowed_borrow: false,
};

const normalizeItemType = (value?: string | null) => {
  const normalized = (value || "").toString().trim().toUpperCase();
  if (!normalized) return "CONSUMABLE";
  if (normalized === "ASSET") return "MED_ASSET";
  if (["CONSUMABLE", "REUSABLE", "MED_ASSET"].includes(normalized)) return normalized;
  return "CONSUMABLE";
};

const getItemTypeLabel = (type?: string) => {
  if (!type || !type.toString().trim()) return "ยังไม่ได้เลือกหมวดหมู่";
  const normalized = normalizeItemType(type);
  if (normalized === "REUSABLE") return "ของใช้ซ้ำรายชิ้น";
  if (normalized === "MED_ASSET") return "ครุภัณฑ์ภายในองค์กร";
  return "วัสดุสิ้นเปลือง";
};

const mapItemErrorMessage = (message: string) => {
  const normalized = (message || "").toLowerCase();

  if (normalized.includes("cannot change category") && normalized.includes("transactions")) {
    return "ไม่สามารถเปลี่ยนหมวดหมู่ได้ เนื่องจากพัสดุนี้มีประวัติการใช้งานแล้ว";
  }

  if (normalized.includes("type is controlled by category")) {
    return "ไม่สามารถแก้ไขประเภทพัสดุโดยตรงได้ ระบบจะกำหนดประเภทตามหมวดหมู่ที่เลือก";
  }

  if (normalized.includes("category id not found")) {
    return "ไม่พบหมวดหมู่ที่เลือก กรุณาเลือกหมวดหมู่ใหม่อีกครั้ง";
  }

  if (normalized.includes("item id not found")) {
    return "ไม่พบข้อมูลพัสดุที่ต้องการแก้ไข";
  }

  return message;
};

export default function ItemFormModal({
  isOpen,
  isEdit = false,
  initialData,
  onCloseAction,
  onSuccessAction,
}: ItemFormModalProps) {
  const [categories, setCategories] = useState<Item.categoryOptions>([]);
  const [warehouses, setWarehouses] = useState<Item.warehouseOptions>([]);
  const [units, setUnits] = useState<Item.unitOptions>([]);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  // Search states for dropdowns
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState("");
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const isReusableType = normalizeItemType(formData.type) === "REUSABLE";
  const isMedAssetType = normalizeItemType(formData.type) === "MED_ASSET";

  // Fetch options on mount
  useEffect(() => {
    if (isOpen) {
      const fetchAllOptions = async () => {
        try {
          const [catData, whData, unitData] = await Promise.all([
            ItemSvc.getcategoriesOptions(),
            ItemSvc.getWarehousesOptions(),
            ItemSvc.getUnitsOptions(),
          ]);
          setCategories(catData || []);
          setWarehouses(whData || []);
          setUnits(unitData || []);
        } catch (error) {
          console.error("Error fetching options:", error);
          toast.error("ไม่สามารถดึงข้อมูลได้");
        } finally {
          setIsFetchingOptions(false);
        }
      };

      setIsFetchingOptions(true);
      fetchAllOptions();
    }
  }, [isOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("[data-category-dropdown]") &&
        !target.closest("[data-unit-dropdown]") &&
        !target.closest("[data-warehouse-dropdown]")
      ) {
        setIsCategoryDropdownOpen(false);
        setIsUnitDropdownOpen(false);
        setIsWarehouseDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen || isUnitDropdownOpen || isWarehouseDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryDropdownOpen, isUnitDropdownOpen, isWarehouseDropdownOpen]);

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialData) {
        // For edit mode - use IDs directly from initialData
        setFormData({
          name: initialData.name,
          description: initialData.description || "",
          category_id: initialData.categoryId || "",
          unit_id: initialData.unitId || "",
          warehouse_id: initialData.warehouseId || "",
          min_stock: initialData.minStock,
          imageUrl: initialData.imageUrl || "",
          type: normalizeItemType(initialData.type),
          allowed_req: initialData.allowed_req ?? true,
          allowed_borrow: initialData.allowed_borrow ?? false,
        });
        setImageFile(null);
        setImageRemoved(false);
      } else {
        setFormData(INITIAL_FORM_DATA);
        setImageFile(null);
        setImageRemoved(false);
      }
      setFormErrors({});
    }
  }, [isOpen, isEdit, initialData, categories, warehouses, units]);

  useEffect(() => {
    if (!isReusableType && formData.allowed_borrow) {
      setFormData((prev) => ({ ...prev, allowed_borrow: false }));
    }
    if (isMedAssetType && (formData.allowed_req || formData.allowed_borrow)) {
      setFormData((prev) => ({ ...prev, allowed_req: false, allowed_borrow: false }));
    }
  }, [isReusableType, isMedAssetType, formData.allowed_borrow, formData.allowed_req]);

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

    // Log debug info
    console.log("=== DEBUG INFO ===");
    console.log("isEdit:", isEdit);
    console.log("initialData:", initialData);
    console.log("initialData?.id:", initialData?.id);

    // Validate edit mode has ID
    if (isEdit && !initialData?.id) {
      console.error("Error: initialData is missing or has no ID");
      toast.error("ข้อผิดพลาด: ไม่พบ ID ของรายการ");
      return;
    }

    setIsLoading(true);
    try {
      const effectiveAllowedBorrow = isReusableType ? formData.allowed_borrow : false;

      if (isEdit && initialData) {
        const updatePayload: Item.UpdatePayload = {
          name: formData.name,
          description: formData.description || undefined,
          min_stock: Number(formData.min_stock),
          unit_id: formData.unit_id,
          warehouse_id: formData.warehouse_id,
          status: "ACTIVE",
          allowed_req: formData.allowed_req,
          allowed_borrow: effectiveAllowedBorrow,
        };
        console.log("Updating item - ID:", initialData.id, "Payload:", updatePayload);
        await ItemSvc.updateInventoryItem(String(initialData.id), updatePayload);

        if (imageFile) {
          await ItemSvc.updateItemImage(String(initialData.id), imageFile);
        } else if (imageRemoved && initialData.imageUrl) {
          await ItemSvc.removeItemImage(String(initialData.id));
        }

        await Swal.fire({
          title: "สำเร็จ!",
          text: "แก้ไขข้อมูลสำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          didClose: () => {
            onSuccessAction?.();
          },
        });
        onCloseAction?.();
        return;
      } else {
        const fd = new FormData();
        fd.append("name", formData.name);
        if (formData.description) fd.append("description", formData.description);
        fd.append("min_stock", String(formData.min_stock));
        fd.append("category_id", formData.category_id);
        fd.append("unit_id", formData.unit_id);
        fd.append("warehouse_id", formData.warehouse_id);
        fd.append("status", "ACTIVE");
        fd.append("allowed_req", String(formData.allowed_req));
        fd.append("allowed_borrow", String(effectiveAllowedBorrow));
        if (imageFile) fd.append("image", imageFile);
        console.log("Creating item with FormData");
        await ItemSvc.createInventoryItem(fd);
        
        await Swal.fire({
          title: "สำเร็จ!",
          text: "บันทึกข้อมูลสำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          didClose: () => {
            onSuccessAction?.();
          },
        });
        onCloseAction?.();
        return;
      }
    } catch (error) {
      console.error("Submit error:", error);
      const rawMessage = error instanceof Error ? error.message : "Unknown error";
      const friendlyMessage = mapItemErrorMessage(rawMessage);
      toast.error(
        "เกิดข้อผิดพลาด: " + friendlyMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles, fileRejections) => {
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          toast.error("ไฟล์มีขนาดใหญ่เกินไป (ไม่เกิน 5 MB)");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          toast.error("รองรับเฉพาะไฟล์ PNG และ JPG เท่านั้น");
        } else {
          toast.error("ไฟล์ไม่ถูกต้อง");
        }
        return;
      }

      const file = acceptedFiles[0];
      if (file) {
        setImageFile(file);
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
        onClick={() => {
          if (!isLoading) onCloseAction();
        }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto pointer-events-auto">
          {isLoading ? (
            <div
              className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 rounded-lg bg-white/85 backdrop-blur-sm"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader2 className="h-10 w-10 animate-spin text-[#0055FF]" strokeWidth={2.25} />
              <p className="text-sm font-medium text-slate-600">กำลังบันทึก...</p>
            </div>
          ) : null}
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isEdit ? "แก้ไขข้อมูลพัสดุ" : "เพิ่มพัสดุใหม่"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseAction}
              disabled={isLoading}
              className="p-2 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">

            {/* Form Section */}
            <div className="">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-500" />
                ข้อมูลพัสดุ
              </h3>

              <div className="space-y-6">
                {/* Top section: Image + Fields */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image Upload - Left side */}
                  <div className="w-full md:w-52 flex-shrink-0">
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      รูปภาพพัสดุ
                    </label>
                    <div
                      {...getRootProps()}
                      className="relative border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-white h-[180px] w-full flex flex-col items-center justify-center overflow-hidden"
                    >
                      <input {...getInputProps()} />
                      {formData.imageUrl ? (
                        <div className="relative h-full w-full flex items-center justify-center">
                          <img
                            src={formData.imageUrl}
                            className="max-h-full max-w-full rounded-lg shadow-md object-contain"
                            alt="Preview"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageFile(null);
                              setImageRemoved(true);
                              setFormData((prev) => ({ ...prev, imageUrl: "" }));
                            }}
                            className="absolute -top-1 -right-1 p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-colors z-10 shadow-sm"
                            title="ลบรูปภาพ"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                          <p className="text-sm text-slate-500 font-medium">
                            คลิกหรือลากรูปภาพมาวางที่นี่
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-red-500 font-medium mt-3 text-center">
                      *รองรับไฟล์รูป PNG JPG ขนาดไม่เกิน 5 MB
                    </p>
                  </div>

                  {/* Fields - Right side */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Item Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        ชื่อพัสดุ <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="ระบุชื่อพัสดุ"
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                        />
                        {formData.name && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, name: "" })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {formErrors.name && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                <div data-category-dropdown>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    ประเภท {!isEdit && <span className="text-red-500">*</span>}
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          disabled={isEdit}
                          value={
                            formData.category_id
                              ? categories.find((c) => c.id === formData.category_id)?.name || ""
                              : categorySearchQuery
                          }
                          onChange={(e) => {
                            if (isEdit) return;
                            setCategorySearchQuery(e.target.value);
                            setIsCategoryDropdownOpen(true);
                            if (formData.category_id) {
                              setFormData({ ...formData, category_id: "" });
                            }
                          }}
                          onFocus={() => {
                            if (!isEdit) setIsCategoryDropdownOpen(true);
                          }}
                          placeholder="ค้นหาประเภท..."
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500 shadow-sm"
                        />
                        {categorySearchQuery && !formData.category_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setCategorySearchQuery("");
                              setIsCategoryDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Category Dropdown Menu */}
                      {isCategoryDropdownOpen && !formData.category_id && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                          {categories
                            .filter((c) =>
                              c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                            )
                            .length > 0 ? (
                            <ul className="py-1">
                              {categories
                                .filter((c) =>
                                  c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                                )
                                .map((c) => (
                                  <li key={c.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextType = normalizeItemType(c.item_type);
                                        setFormData({
                                          ...formData,
                                          category_id: c.id,
                                          type: nextType,
                                          allowed_req: nextType === "MED_ASSET" ? false : formData.allowed_req,
                                          allowed_borrow: nextType === "REUSABLE" ? formData.allowed_borrow : false,
                                        });
                                        setCategorySearchQuery("");
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm text-slate-900 focus:outline-none focus:bg-indigo-50 transition-colors"
                                    >
                                      {c.name}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          ) : categorySearchQuery ? (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              ไม่พบประเภท
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              พิมพ์เพื่อค้นหา
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clear category selection button */}
                      {formData.category_id && !isEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, category_id: "", type: "", allowed_borrow: false });
                            setCategorySearchQuery("");
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {formErrors.category_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.category_id}
                    </p>
                  )}
                </div>

                {/* Unit */}
                <div data-unit-dropdown>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    หน่วยนับ <span className="text-red-500">*</span>
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={
                            formData.unit_id
                              ? units.find((u) => u.id === formData.unit_id)?.name || ""
                              : unitSearchQuery
                          }
                          onChange={(e) => {
                            setUnitSearchQuery(e.target.value);
                            setIsUnitDropdownOpen(true);
                            if (formData.unit_id) {
                              setFormData({ ...formData, unit_id: "" });
                            }
                          }}
                          onFocus={() => setIsUnitDropdownOpen(true)}
                          placeholder="ค้นหาหน่วย..."
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                        />
                        {unitSearchQuery && !formData.unit_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setUnitSearchQuery("");
                              setIsUnitDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Unit Dropdown Menu */}
                      {isUnitDropdownOpen && !formData.unit_id && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                          {units
                            .filter((u) =>
                              u.name.toLowerCase().includes(unitSearchQuery.toLowerCase())
                            )
                            .length > 0 ? (
                            <ul className="py-1">
                              {units
                                .filter((u) =>
                                  u.name.toLowerCase().includes(unitSearchQuery.toLowerCase())
                                )
                                .map((u) => (
                                  <li key={u.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, unit_id: u.id });
                                        setUnitSearchQuery("");
                                        setIsUnitDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm text-slate-900 focus:outline-none focus:bg-indigo-50 transition-colors"
                                    >
                                      {u.name}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          ) : unitSearchQuery ? (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              ไม่พบหน่วย
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              พิมพ์เพื่อค้นหา
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clear unit selection button */}
                      {formData.unit_id && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, unit_id: "" });
                            setUnitSearchQuery("");
                            setIsUnitDropdownOpen(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {formErrors.unit_id && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.unit_id}
                    </p>
                  )}
                </div>

                {/* Warehouse */}
                <div data-warehouse-dropdown>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    ตำแหน่งเก็บ (คลัง) <span className="text-red-500">*</span>
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={
                            formData.warehouse_id
                              ? warehouses.find((w) => w.id === formData.warehouse_id)?.name || ""
                              : warehouseSearchQuery
                          }
                          onChange={(e) => {
                            setWarehouseSearchQuery(e.target.value);
                            setIsWarehouseDropdownOpen(true);
                            if (formData.warehouse_id) {
                              setFormData({ ...formData, warehouse_id: "" });
                            }
                          }}
                          onFocus={() => setIsWarehouseDropdownOpen(true)}
                          placeholder="ค้นหาคลัง..."
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                        />
                        {warehouseSearchQuery && !formData.warehouse_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setWarehouseSearchQuery("");
                              setIsWarehouseDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Warehouse Dropdown Menu */}
                      {isWarehouseDropdownOpen && !formData.warehouse_id && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                          {warehouses
                            .filter((w) =>
                              w.name.toLowerCase().includes(warehouseSearchQuery.toLowerCase())
                            )
                            .length > 0 ? (
                            <ul className="py-1">
                              {warehouses
                                .filter((w) =>
                                  w.name.toLowerCase().includes(warehouseSearchQuery.toLowerCase())
                                )
                                .map((w) => (
                                  <li key={w.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, warehouse_id: w.id });
                                        setWarehouseSearchQuery("");
                                        setIsWarehouseDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm text-slate-900 focus:outline-none focus:bg-indigo-50 transition-colors"
                                    >
                                      {w.name}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          ) : warehouseSearchQuery ? (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              ไม่พบคลัง
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              พิมพ์เพื่อค้นหา
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clear warehouse selection button */}
                      {formData.warehouse_id && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, warehouse_id: "" });
                            setWarehouseSearchQuery("");
                            setIsWarehouseDropdownOpen(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
                    จำนวนขั้นต่ำ
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
                </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    รายละเอียด
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none shadow-sm"
                  />
                </div>

                {/* Item Type */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">ประเภทพัสดุ</label>
                  <div className="bg-white rounded-lg p-3 border border-slate-300 shadow-sm">
                    <p className="text-sm font-semibold text-slate-700">{getItemTypeLabel(formData.type)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ระบบกำหนดประเภทจากหมวดหมู่ที่เลือกอัตโนมัติ เพื่อป้องกันข้อมูลไม่สอดคล้องกัน
                    </p>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700">สิทธิ์การใช้งาน</label>
                  <div className="flex gap-6">
                    {isMedAssetType && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 w-full">
                        ครุภัณฑ์ประจำแผนก ไม่อนุญาตให้เบิกหรือยืม — เป็นครุภัณฑ์ที่ประจำแผนกโดยเฉพาะ
                      </p>
                    )}
                    {[
                      {
                        key: "allowed_req" as const,
                        label: "อนุญาตให้เบิก",
                        desc: isMedAssetType ? "ปิดสำหรับครุภัณฑ์ประจำแผนก" : "ผู้ใช้สามารถสร้างคำขอเบิกได้",
                      },
                      {
                        key: "allowed_borrow" as const,
                        label: "อนุญาตให้ยืม",
                        desc: isMedAssetType
                          ? "ปิดสำหรับครุภัณฑ์ประจำแผนก"
                          : isReusableType
                          ? "ผู้ใช้สามารถสร้างคำขอยืมได้"
                          : "ใช้ได้เฉพาะของใช้ซ้ำ (REUSABLE)",
                      },
                    ].map(({ key, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (isMedAssetType) return;
                          if (key === "allowed_borrow" && !isReusableType) return;
                          setFormData({ ...formData, [key]: !formData[key] });
                        }}
                        disabled={isMedAssetType || (key === "allowed_borrow" && !isReusableType)}
                        className="flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 relative ${formData[key] ? "bg-[#0055FF]" : "bg-gray-200"}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${formData[key] ? "translate-x-5" : "translate-x-0"}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-700">{label}</p>
                          <p className="text-xs text-slate-400">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 py-3 px-8 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-lg">
            <button
              type="button"
              onClick={onCloseAction}
              disabled={isLoading}
              className="px-6 py-2.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSubmit}
              className="px-8 py-2.5 font-semibold text-white bg-[#0055FF] hover:bg-[#0044DD] disabled:bg-gray-300 rounded-lg shadow-md transition-colors disabled:pointer-events-none"
            >
              {isEdit ? "บันทึก" : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
