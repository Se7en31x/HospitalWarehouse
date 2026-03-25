"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Plus,
  Ruler,
  Settings,
  Warehouse as WarehouseIcon,
  Truck,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import SettingsModals from "./SettingsModals";
import { formatThaiDateTime } from "@/utils/formatters";
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
import {
  createCategory,
  createUnit,
  createWarehouse,
  createSupplier,
  deleteCategory,
  deleteUnit,
  deleteWarehouse,
  deleteSupplier,
  getCategories,
  getUnits,
  getWarehouses,
  getSuppliers,
  updateCategory,
  updateUnit,
  updateWarehouse,
  updateSupplier,
} from "@/services/settingsService";

type TabType = "categories" | "units" | "warehouses" | "suppliers";
type FormMode = "create" | "edit";

const ITEMS_PER_PAGE = 10;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("categories");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keywordByTab, setKeywordByTab] = useState<Record<TabType, string>>({
    categories: "",
    units: "",
    warehouses: "",
    suppliers: "",
  });
  const [pageByTab, setPageByTab] = useState<Record<TabType, number>>({
    categories: 1,
    units: 1,
    warehouses: 1,
    suppliers: 1,
  });
  
  // Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: TabType; name: string } | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [categoryForm, setCategoryForm] = useState<CategoryPayload>({ name: "", code_prefix: "", description: "" });
  const [unitForm, setUnitForm] = useState<UnitPayload>({ name: "", description: "" });
  const [warehouseForm, setWarehouseForm] = useState<WarehousePayload>({ name: "", location: "", description: "" });
  const [supplierForm, setSupplierForm] = useState<SupplierPayload>({ name: "", contact: "", address: "", phone: "", tax_id: "" });

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [cats, uns, whs, sups] = await Promise.all([
        getCategories(),
        getUnits(),
        getWarehouses(),
        getSuppliers(),
      ]);
      setCategories(cats || []);
      setUnits(uns || []);
      setWarehouses(whs || []);
      setSuppliers(sups || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const sectionTitle = useMemo(() => {
    if (activeTab === "categories") return "รายการประเภทพัสดุ";
    if (activeTab === "units") return "รายการหน่วยนับ";
    if (activeTab === "warehouses") return "รายการคลังสินค้า";
    return "รายการผู้จำหน่าย";
  }, [activeTab]);

  const formTitle = useMemo(() => {
    if (activeTab === "categories") return formMode === "create" ? "เพิ่มประเภทพัสดุ" : "แก้ไขประเภทพัสดุ";
    if (activeTab === "units") return formMode === "create" ? "เพิ่มหน่วยนับ" : "แก้ไขหน่วยนับ";
    if (activeTab === "warehouses") return formMode === "create" ? "เพิ่มคลังสินค้า" : "แก้ไขคลังสินค้า";
    return formMode === "create" ? "เพิ่มผู้จำหน่าย" : "แก้ไขผู้จำหน่าย";
  }, [formMode, activeTab]);

  const filteredCategories = useMemo(() => {
    const keyword = keywordByTab.categories.trim().toLowerCase();
    if (!keyword) return categories;
    return categories.filter((cat) =>
      [cat.name, cat.code_prefix, cat.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [categories, keywordByTab.categories]);

  const filteredUnits = useMemo(() => {
    const keyword = keywordByTab.units.trim().toLowerCase();
    if (!keyword) return units;
    return units.filter((unit) =>
      [unit.name, unit.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [units, keywordByTab.units]);

  const filteredWarehouses = useMemo(() => {
    const keyword = keywordByTab.warehouses.trim().toLowerCase();
    if (!keyword) return warehouses;
    return warehouses.filter((wh) =>
      [wh.name, wh.location || "", wh.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [warehouses, keywordByTab.warehouses]);

  const filteredSuppliers = useMemo(() => {
    const keyword = keywordByTab.suppliers.trim().toLowerCase();
    if (!keyword) return suppliers;
    return suppliers.filter((sup) =>
      [sup.name, sup.contact || "", sup.address || "", sup.phone || "", sup.tax_id || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [suppliers, keywordByTab.suppliers]);

  const totalByTab = useMemo(
    () => ({
      categories: filteredCategories.length,
      units: filteredUnits.length,
      warehouses: filteredWarehouses.length,
      suppliers: filteredSuppliers.length,
    }),
    [filteredCategories.length, filteredUnits.length, filteredWarehouses.length, filteredSuppliers.length]
  );

  const totalPagesByTab = useMemo(
    () => ({
      categories: Math.max(1, Math.ceil(totalByTab.categories / ITEMS_PER_PAGE)),
      units: Math.max(1, Math.ceil(totalByTab.units / ITEMS_PER_PAGE)),
      warehouses: Math.max(1, Math.ceil(totalByTab.warehouses / ITEMS_PER_PAGE)),
      suppliers: Math.max(1, Math.ceil(totalByTab.suppliers / ITEMS_PER_PAGE)),
    }),
    [totalByTab]
  );

  const pageByTabSafe = useMemo(
    () => ({
      categories: Math.min(pageByTab.categories, totalPagesByTab.categories),
      units: Math.min(pageByTab.units, totalPagesByTab.units),
      warehouses: Math.min(pageByTab.warehouses, totalPagesByTab.warehouses),
      suppliers: Math.min(pageByTab.suppliers, totalPagesByTab.suppliers),
    }),
    [pageByTab, totalPagesByTab]
  );

  const pagedCategories = useMemo(() => {
    const start = (pageByTabSafe.categories - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCategories, pageByTabSafe.categories]);

  const pagedUnits = useMemo(() => {
    const start = (pageByTabSafe.units - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnits, pageByTabSafe.units]);

  const pagedWarehouses = useMemo(() => {
    const start = (pageByTabSafe.warehouses - 1) * ITEMS_PER_PAGE;
    return filteredWarehouses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWarehouses, pageByTabSafe.warehouses]);

  const pagedSuppliers = useMemo(() => {
    const start = (pageByTabSafe.suppliers - 1) * ITEMS_PER_PAGE;
    return filteredSuppliers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSuppliers, pageByTabSafe.suppliers]);

  const activeTotal = totalByTab[activeTab];
  const activePage = pageByTabSafe[activeTab];
  const activeTotalPages = totalPagesByTab[activeTab];

  const searchPlaceholder = useMemo(() => {
    if (activeTab === "categories") return "ค้นหาประเภท (ชื่อ, prefix, รายละเอียด)";
    if (activeTab === "units") return "ค้นหาหน่วย (ชื่อ, รายละเอียด)";
    if (activeTab === "warehouses") return "ค้นหาคลัง (ชื่อ, สถานที่, รายละเอียด)";
    return "ค้นหาผู้จำหน่าย (ชื่อ, ผู้ติดต่อ, โทรศัพท์)";
  }, [activeTab]);

  useEffect(() => {
    setPageByTab((prev) => ({
      categories: Math.min(prev.categories, totalPagesByTab.categories),
      units: Math.min(prev.units, totalPagesByTab.units),
      warehouses: Math.min(prev.warehouses, totalPagesByTab.warehouses),
      suppliers: Math.min(prev.suppliers, totalPagesByTab.suppliers),
    }));
  }, [totalPagesByTab]);

  const handleOpenCreateForm = () => {
    setFormMode("create");
    if (activeTab === "categories") {
      setEditingCategoryId(null);
      setCategoryForm({ name: "", code_prefix: "", description: "" });
    }
    if (activeTab === "units") {
      setEditingUnitId(null);
      setUnitForm({ name: "", description: "" });
    }
    if (activeTab === "warehouses") {
      setEditingWarehouseId(null);
      setWarehouseForm({ name: "", location: "", description: "" });
    }
    if (activeTab === "suppliers") {
      setEditingSupplierId(null);
      setSupplierForm({ name: "", contact: "", address: "", phone: "", tax_id: "" });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async () => {
    let success = false;
    setIsSaving(true);
    try {
      if (activeTab === "categories") {
        if (!categoryForm.name.trim() || !categoryForm.code_prefix.trim()) throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
        if (editingCategoryId) await updateCategory(editingCategoryId, categoryForm);
        else await createCategory(categoryForm);
        success = true;
      }
      if (activeTab === "units") {
        if (!unitForm.name.trim()) throw new Error("กรุณากรอกชื่อหน่วย");
        if (editingUnitId) await updateUnit(editingUnitId, unitForm);
        else await createUnit(unitForm);
        success = true;
      }
      if (activeTab === "warehouses") {
        if (!warehouseForm.name.trim()) throw new Error("กรุณากรอกชื่อคลัง");
        if (editingWarehouseId) await updateWarehouse(editingWarehouseId, warehouseForm);
        else await createWarehouse(warehouseForm);
        success = true;
      }
      if (activeTab === "suppliers") {
        if (!supplierForm.name.trim()) throw new Error("กรุณากรอกชื่อผู้จำหน่าย");
        if (editingSupplierId) await updateSupplier(editingSupplierId, supplierForm);
        else await createSupplier(supplierForm);
        success = true;
      }
      if (success) {
        await loadAllData();
        setIsFormModalOpen(false);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  // การจัดการการลบผ่าน Modal
  const confirmDelete = (id: string, type: TabType, name: string) => {
    setItemToDelete({ id, type, name });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    setIsSaving(true);
    try {
      if (itemToDelete.type === "categories") await deleteCategory(itemToDelete.id);
      if (itemToDelete.type === "units") await deleteUnit(itemToDelete.id);
      if (itemToDelete.type === "warehouses") await deleteWarehouse(itemToDelete.id);
      if (itemToDelete.type === "suppliers") await deleteSupplier(itemToDelete.id);
      await loadAllData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "ลบข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">ตั้งค่าระบบ</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { id: "categories", label: "ประเภทพัสดุ", icon: <Package className="w-4 h-4" /> },
          { id: "units", label: "หน่วยนับ", icon: <Ruler className="w-4 h-4" /> },
          { id: "warehouses", label: "คลังสินค้า", icon: <WarehouseIcon className="w-4 h-4" /> },
          { id: "suppliers", label: "ผู้จำหน่าย", icon: <Truck className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search/Filter */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={keywordByTab[activeTab]}
          onChange={(e) => {
            const keyword = e.target.value;
            setKeywordByTab((prev) => ({ ...prev, [activeTab]: keyword }));
            setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }));
          }}
          className="w-72 border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
        />
        <button
          onClick={handleOpenCreateForm}
          className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          เพิ่มรายการใหม่
        </button>
      </div>

      {/* Table Container */}
      <div className="h-[60vh] rounded-xl bg-white shadow-lg overflow-hidden relative border border-slate-100 mb-6">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        )}
        <div className="overflow-x-auto h-full flex flex-col">
          {activeTab === "categories" && (
            <table className="w-full text-sm text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 w-[22%]">ชื่อประเภทพัสดุ</th>
                  <th className="px-6 py-4 w-[10%]">Prefix Code</th>
                  <th className="px-6 py-4 w-[22%]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[13%]">วันที่สร้าง</th>
                  <th className="px-6 py-4 w-[13%]">วันที่แก้ไข</th>
                  <th className="px-6 py-4 w-[20%] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 flex-1">
                {pagedCategories.length > 0 ? (
                  pagedCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{cat.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-100 text-indigo-700 rounded-md">
                          {cat.code_prefix}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cat.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                      </td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(cat.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(cat.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setFormMode("edit");
                              setEditingCategoryId(cat.id);
                              setCategoryForm({
                                name: cat.name,
                                code_prefix: cat.code_prefix,
                                description: cat.description || "",
                              });
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(cat.id, "categories", cat.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
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
          )}

          {activeTab === "units" && (
            <table className="w-full text-sm text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 w-[30%]">ชื่อหน่วยนับ</th>
                  <th className="px-6 py-4 w-[32%]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[13%]">วันที่สร้าง</th>
                  <th className="px-6 py-4 w-[13%]">วันที่แก้ไข</th>
                  <th className="px-6 py-4 w-[12%] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedUnits.length > 0 ? (
                  pagedUnits.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{unit.name}</td>
                      <td className="px-6 py-4">
                        {unit.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                      </td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(unit.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(unit.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setFormMode("edit");
                              setEditingUnitId(unit.id);
                              setUnitForm({
                                name: unit.name,
                                description: unit.description || "",
                              });
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(unit.id, "units", unit.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
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
          )}

          {activeTab === "warehouses" && (
            <table className="w-full text-sm text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 w-[18%]">ชื่อคลังสินค้า</th>
                  <th className="px-6 py-4 w-[18%]">สถานที่ตั้ง</th>
                  <th className="px-6 py-4 w-[23%]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[12%]">วันที่สร้าง</th>
                  <th className="px-6 py-4 w-[12%]">วันที่แก้ไข</th>
                  <th className="px-6 py-4 w-[17%] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedWarehouses.length > 0 ? (
                  pagedWarehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{wh.name}</td>
                      <td className="px-6 py-4">{wh.location || "-"}</td>
                      <td className="px-6 py-4">
                        {wh.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                      </td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(wh.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(wh.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setFormMode("edit");
                              setEditingWarehouseId(wh.id);
                              setWarehouseForm({
                                name: wh.name,
                                location: wh.location || "",
                                description: wh.description || "",
                              });
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(wh.id, "warehouses", wh.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
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
          )}

          {activeTab === "suppliers" && (
            <table className="w-full text-sm text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 w-[18%]">ชื่อผู้จำหน่าย</th>
                  <th className="px-6 py-4 w-[14%]">ผู้ติดต่อ</th>
                  <th className="px-6 py-4 w-[12%]">โทรศัพท์</th>
                  <th className="px-6 py-4 w-[12%]">เลขผู้เสียภาษี</th>
                  <th className="px-6 py-4 w-[12%]">วันที่สร้าง</th>
                  <th className="px-6 py-4 w-[12%]">วันที่แก้ไข</th>
                  <th className="px-6 py-4 w-[20%] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedSuppliers.length > 0 ? (
                  pagedSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{sup.name}</td>
                      <td className="px-6 py-4">{sup.contact || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4">{sup.phone || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4">{sup.tax_id || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(sup.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {formatThaiDateTime(sup.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setFormMode("edit");
                              setEditingSupplierId(sup.id);
                              setSupplierForm({
                                name: sup.name,
                                contact: sup.contact || "",
                                address: sup.address || "",
                                phone: sup.phone || "",
                                tax_id: sup.tax_id || "",
                              });
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(sup.id, "suppliers", sup.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
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
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          แสดง{" "}
          {((activeTab === "categories" && pagedCategories.length) ||
            (activeTab === "units" && pagedUnits.length) ||
            (activeTab === "warehouses" && pagedWarehouses.length) ||
            (activeTab === "suppliers" && pagedSuppliers.length)) ||
            0}{" "}
          จาก {activeTotal} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={activePage === 1}
            onClick={() =>
              setPageByTab((prev) => ({
                ...prev,
                [activeTab]: Math.max(1, prev[activeTab] - 1),
              }))
            }
            className="p-2 border rounded-lg border-slate-300 disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            หน้า {activePage} / {activeTotalPages || 1}
          </span>
          <button
            disabled={activePage >= activeTotalPages}
            onClick={() =>
              setPageByTab((prev) => ({
                ...prev,
                [activeTab]: Math.min(totalPagesByTab[activeTab], prev[activeTab] + 1),
              }))
            }
            className="p-2 border rounded-lg border-slate-300 disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      <SettingsModals
        // Form Modal Props
        isFormModalOpen={isFormModalOpen}
        onFormModalClose={() => setIsFormModalOpen(false)}
        formTitle={formTitle}
        formMode={formMode}
        activeTab={activeTab}
        categoryForm={categoryForm}
        onCategoryFormChange={setCategoryForm}
        unitForm={unitForm}
        onUnitFormChange={setUnitForm}
        warehouseForm={warehouseForm}
        onWarehouseFormChange={setWarehouseForm}
        supplierForm={supplierForm}
        onSupplierFormChange={setSupplierForm}
        isSaving={isSaving}
        onFormSubmit={handleFormSubmit}
        // Delete Modal Props
        deleteModalOpen={deleteModalOpen}
        itemToDelete={itemToDelete}
        onDeleteModalClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirmDelete={executeDelete}
      />
    </div>
  );
}