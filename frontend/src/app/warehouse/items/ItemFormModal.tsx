"use client";

import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Package,
  Save,
  Loader2,
  X,
  Upload,
  Search,
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
  type: "CONSUMABLE",
  allowed_req: true,
  allowed_borrow: false,
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
          type: initialData.type || "CONSUMABLE",
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
      if (isEdit && initialData) {
        const updatePayload: Item.UpdatePayload = {
          name: formData.name,
          description: formData.description || undefined,
          min_stock: Number(formData.min_stock),
          unit_id: formData.unit_id,
          warehouse_id: formData.warehouse_id,
          status: "ACTIVE",
          type: formData.type,
          allowed_req: formData.allowed_req,
          allowed_borrow: formData.allowed_borrow,
        };
        console.log("Updating item - ID:", initialData.id, "Payload:", updatePayload);
        await ItemSvc.updateInventoryItem(String(initialData.id), updatePayload);

        if (imageFile) {
          await ItemSvc.updateItemImage(String(initialData.id), imageFile);
        } else if (imageRemoved && initialData.imageUrl) {
          await ItemSvc.removeItemImage(String(initialData.id));
        }

        toast.success("แก้ไขข้อมูลสำเร็จ");
      } else {
        const fd = new FormData();
        fd.append("name", formData.name);
        if (formData.description) fd.append("description", formData.description);
        fd.append("min_stock", String(formData.min_stock));
        fd.append("category_id", formData.category_id);
        fd.append("unit_id", formData.unit_id);
        fd.append("warehouse_id", formData.warehouse_id);
        fd.append("status", "ACTIVE");
        fd.append("type", formData.type);
        fd.append("allowed_req", String(formData.allowed_req));
        fd.append("allowed_borrow", String(formData.allowed_borrow));
        if (imageFile) fd.append("image", imageFile);
        console.log("Creating item with FormData");
        await ItemSvc.createInventoryItem(fd);
        toast.success("บันทึกสำเร็จ");
      }

      onSuccessAction?.();
      onCloseAction?.();
    } catch (error) {
      console.error("Submit error:", error);
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
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="ระบุชื่อพัสดุ"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    {formData.name && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, name: "" })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                      >
                        ✕
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
                    ประเภท <span className="text-red-500">*</span>
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                        <input
                          type="text"
                          value={
                            formData.category_id
                              ? categories.find((c) => c.id === formData.category_id)?.name || ""
                              : categorySearchQuery
                          }
                          onChange={(e) => {
                            setCategorySearchQuery(e.target.value);
                            setIsCategoryDropdownOpen(true);
                            if (formData.category_id) {
                              setFormData({ ...formData, category_id: "" });
                            }
                          }}
                          onFocus={() => setIsCategoryDropdownOpen(true)}
                          placeholder="ค้นหาประเภท..."
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        />
                        {categorySearchQuery && !formData.category_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setCategorySearchQuery("");
                              setIsCategoryDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                          >
                            ✕
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
                                        setFormData({ ...formData, category_id: c.id });
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
                      {formData.category_id && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, category_id: "" });
                            setCategorySearchQuery("");
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                        >
                          ✕
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
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
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        />
                        {unitSearchQuery && !formData.unit_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setUnitSearchQuery("");
                              setIsUnitDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                          >
                            ✕
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                        >
                          ✕
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
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
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        />
                        {warehouseSearchQuery && !formData.warehouse_id && (
                          <button
                            type="button"
                            onClick={() => {
                              setWarehouseSearchQuery("");
                              setIsWarehouseDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                          >
                            ✕
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                        >
                          ✕
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

                {/* Description */}
                <div className="md:col-span-2">
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
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none"
                  />
                </div>

                {/* Item Type */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2 text-slate-700">ประเภทสินค้า</label>
                  <div className="flex gap-3">
                    {[
                      { value: "CONSUMABLE", label: "วัสดุสิ้นเปลือง", desc: "จัดการแบบ Lot / มีจำนวนคงคลัง" },
                      { value: "ASSET", label: "ครุภัณฑ์", desc: "ติดตามรายชิ้น / มี Serial Number" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: opt.value })}
                        className={`flex-1 text-left px-4 py-3 rounded-xl border-2 transition-all ${formData.type === opt.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${formData.type === opt.value ? "border-indigo-500" : "border-slate-300"}`}>
                            {formData.type === opt.value && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </span>
                          <div>
                            <p className={`text-sm font-semibold ${formData.type === opt.value ? "text-indigo-700" : "text-slate-700"}`}>{opt.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-3 text-slate-700">สิทธิ์การใช้งาน</label>
                  <div className="flex gap-6">
                    {[
                      { key: "allowed_req" as const, label: "อนุญาตให้เบิก", desc: "ผู้ใช้สามารถสร้างคำขอเบิกได้" },
                      { key: "allowed_borrow" as const, label: "อนุญาตให้ยืม", desc: "ผู้ใช้สามารถสร้างคำขอยืมได้" },
                    ].map(({ key, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, [key]: !formData[key] })}
                        className="flex items-center gap-3 group"
                      >
                        <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${formData[key] ? "bg-indigo-500" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData[key] ? "translate-x-6" : "translate-x-0.5"}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-700">{label}</p>
                          <p className="text-xs text-slate-400">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
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
                    className="relative border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50"
                  >
                    <input {...getInputProps()} />
                    {formData.imageUrl ? (
                      <>
                        <img
                          src={formData.imageUrl}
                          className="h-32 mx-auto rounded-lg shadow-md"
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
                          className="absolute top-2 right-2 p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors"
                          title="ลบรูปภาพ"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
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
