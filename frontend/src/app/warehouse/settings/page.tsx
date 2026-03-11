"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Plus,
  Ruler,
  Settings,
  Warehouse as WarehouseIcon,
  Edit2,
  Trash2,
  Save,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type {
  Category,
  CategoryPayload,
  Unit,
  UnitPayload,
  Warehouse,
  WarehousePayload,
} from "@/types/settings_type";
import {
  createCategory,
  createUnit,
  createWarehouse,
  deleteCategory,
  deleteUnit,
  deleteWarehouse,
  getCategories,
  getUnits,
  getWarehouses,
  updateCategory,
  updateUnit,
  updateWarehouse,
} from "@/services/settingsService";

type TabType = "categories" | "units" | "warehouses";
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
  });
  const [pageByTab, setPageByTab] = useState<Record<TabType, number>>({
    categories: 1,
    units: 1,
    warehouses: 1,
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

  const [categoryForm, setCategoryForm] = useState<CategoryPayload>({ name: "", code_prefix: "", description: "" });
  const [unitForm, setUnitForm] = useState<UnitPayload>({ name: "", description: "" });
  const [warehouseForm, setWarehouseForm] = useState<WarehousePayload>({ name: "", location: "", description: "" });

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [cats, uns, whs] = await Promise.all([
        getCategories(),
        getUnits(),
        getWarehouses(),
      ]);
      setCategories(cats || []);
      setUnits(uns || []);
      setWarehouses(whs || []);
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
    return "รายการคลังสินค้า";
  }, [activeTab]);

  const formTitle = useMemo(() => {
    if (activeTab === "categories") return formMode === "create" ? "เพิ่มประเภทพัสดุ" : "แก้ไขประเภทพัสดุ";
    if (activeTab === "units") return formMode === "create" ? "เพิ่มหน่วยนับ" : "แก้ไขหน่วยนับ";
    return formMode === "create" ? "เพิ่มคลังสินค้า" : "แก้ไขคลังสินค้า";
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

  const totalByTab = useMemo(
    () => ({
      categories: filteredCategories.length,
      units: filteredUnits.length,
      warehouses: filteredWarehouses.length,
    }),
    [filteredCategories.length, filteredUnits.length, filteredWarehouses.length]
  );

  const totalPagesByTab = useMemo(
    () => ({
      categories: Math.max(1, Math.ceil(totalByTab.categories / ITEMS_PER_PAGE)),
      units: Math.max(1, Math.ceil(totalByTab.units / ITEMS_PER_PAGE)),
      warehouses: Math.max(1, Math.ceil(totalByTab.warehouses / ITEMS_PER_PAGE)),
    }),
    [totalByTab]
  );

  const pageByTabSafe = useMemo(
    () => ({
      categories: Math.min(pageByTab.categories, totalPagesByTab.categories),
      units: Math.min(pageByTab.units, totalPagesByTab.units),
      warehouses: Math.min(pageByTab.warehouses, totalPagesByTab.warehouses),
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

  const activeTotal = totalByTab[activeTab];
  const activePage = pageByTabSafe[activeTab];
  const activeTotalPages = totalPagesByTab[activeTab];

  const searchPlaceholder = useMemo(() => {
    if (activeTab === "categories") return "ค้นหาประเภท (ชื่อ, prefix, รายละเอียด)";
    if (activeTab === "units") return "ค้นหาหน่วย (ชื่อ, รายละเอียด)";
    return "ค้นหาคลัง (ชื่อ, สถานที่, รายละเอียด)";
  }, [activeTab]);

  useEffect(() => {
    setPageByTab((prev) => ({
      categories: Math.min(prev.categories, totalPagesByTab.categories),
      units: Math.min(prev.units, totalPagesByTab.units),
      warehouses: Math.min(prev.warehouses, totalPagesByTab.warehouses),
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
      await loadAllData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "ลบข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // CSS Classes ที่ใช้งานบ่อย
  const tableThClass = "px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-200/60 border-y border-slate-200";
  const tableTdClass = "px-6 py-4 text-sm text-slate-700 border-b border-slate-100 truncate";
  const inputClass = "w-full border border-slate-300 bg-white rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <Settings className="w-8 h-8 text-indigo-600" />
        <h1 className="text-3xl font-bold text-indigo-600">การตั้งค่าระบบ</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { id: "categories", label: "ประเภทพัสดุ", icon: <Package className="w-4 h-4" /> },
          { id: "units", label: "หน่วยนับ", icon: <Ruler className="w-4 h-4" /> },
          { id: "warehouses", label: "คลังสินค้า", icon: <WarehouseIcon className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
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
          className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-colors"
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
                  <th className="px-6 py-4 w-[30%]">ชื่อประเภทพัสดุ</th>
                  <th className="px-6 py-4 w-[15%]">Prefix Code</th>
                  <th className="px-6 py-4 w-[40%]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[15%] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 flex-1">
                {pagedCategories.length > 0 ? (
                  pagedCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold">{cat.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-100 text-indigo-700 rounded-md">
                          {cat.code_prefix}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cat.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
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
                    <td colSpan={4} className="text-center py-10 text-slate-500">
                      ไม่พบข้อมูล
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
                  <th className="px-6 py-4 w-[35%]">ชื่อหน่วยนับ</th>
                  <th className="px-6 py-4 w-[50%]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[15%] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedUnits.length > 0 ? (
                  pagedUnits.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold">{unit.name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {unit.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
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
                    <td colSpan={3} className="text-center py-10 text-slate-500">
                      ไม่พบข้อมูล
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
                  <th className="px-6 py-4 w-[25%]">ชื่อคลังสินค้า</th>
                  <th className="px-6 py-4 w-[25%]">สถานที่ตั้ง</th>
                  <th className="px-6 py-4 w-[35%]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[15%] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedWarehouses.length > 0 ? (
                  pagedWarehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold">{wh.name}</td>
                      <td className="px-6 py-4 text-slate-600">{wh.location || "-"}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {wh.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
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
                    <td colSpan={4} className="text-center py-10 text-slate-500">
                      ไม่พบข้อมูล
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
            (activeTab === "warehouses" && pagedWarehouses.length)) ||
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

      {/* ================= ADD / EDIT FORM MODAL (POP-UP) ================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">{formTitle}</h2>
              <button onClick={() => setIsFormModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeTab === "categories" && (
                  <>
                    <div className="md:col-span-1">
                      <label className={labelClass}>ชื่อประเภทพัสดุ <span className="text-red-500">*</span></label>
                      <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="ระบุชื่อประเภท" className={inputClass} />
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>Prefix Code <span className="text-red-500">*</span></label>
                      <input value={categoryForm.code_prefix} onChange={(e) => setCategoryForm({ ...categoryForm, code_prefix: e.target.value })} placeholder="ตัวอักษรย่อ (เช่น OFC)" className={`${inputClass} uppercase font-mono`} maxLength={5} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>รายละเอียด (ไม่บังคับ)</label>
                      <textarea value={categoryForm.description || ""} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="ระบุรายละเอียดเพิ่มเติม" className={`${inputClass} resize-none h-24`} />
                    </div>
                  </>
                )}

                {activeTab === "units" && (
                  <>
                    <div className="md:col-span-2">
                      <label className={labelClass}>ชื่อหน่วยนับ <span className="text-red-500">*</span></label>
                      <input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="เช่น กล่อง, ชิ้น" className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>รายละเอียด (ไม่บังคับ)</label>
                      <textarea value={unitForm.description || ""} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })} placeholder="ระบุรายละเอียดเพิ่มเติม" className={`${inputClass} resize-none h-24`} />
                    </div>
                  </>
                )}

                {activeTab === "warehouses" && (
                  <>
                    <div className="md:col-span-1">
                      <label className={labelClass}>ชื่อคลังสินค้า <span className="text-red-500">*</span></label>
                      <input value={warehouseForm.name} onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} placeholder="ระบุชื่อคลัง" className={inputClass} />
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>สถานที่ตั้ง</label>
                      <input value={warehouseForm.location || ""} onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })} placeholder="ระบุสถานที่" className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>รายละเอียด (ไม่บังคับ)</label>
                      <textarea value={warehouseForm.description || ""} onChange={(e) => setWarehouseForm({ ...warehouseForm, description: e.target.value })} placeholder="ระบุรายละเอียดเพิ่มเติม" className={`${inputClass} resize-none h-24`} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsFormModalOpen(false)} disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleFormSubmit} disabled={isSaving} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 min-w-[120px]">
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
                  onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={executeDelete}
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
    </div>
  );
}