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
import { SweetAlertUtils } from "@/utils/sweetAlert";
import type {
  Category,
  CategoryPayload,
  Unit,
  UnitPayload,
  Warehouse,
  WarehousePayload,
  Supplier,
  SupplierPayload,
  SystemSettingsMap,
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
  getSystemSettings,
  updateSystemSettings,
  updateCategory,
  updateUnit,
  updateWarehouse,
  updateSupplier,
} from "@/services/settingsService";

type TabType = "categories" | "units" | "warehouses" | "suppliers" | "notifications";
type FormMode = "create" | "edit";

const ITEMS_PER_PAGE = 10;

const cronDailyToTime = (cron: string): string | null => {
  const normalized = (cron || "").trim().replace(/\s+/g, " ");
  const m = normalized.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/);
  if (!m) return null;
  const minute = Number(m[1]);
  const hour = Number(m[2]);
  if (Number.isNaN(minute) || Number.isNaN(hour)) return null;
  if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${hh}:${mm}`;
};

const timeToDailyCron = (time: string): string | null => {
  const t = (time || "").trim();
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (Number.isNaN(minute) || Number.isNaN(hour)) return null;
  if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null;
  return `${minute} ${hour} * * *`;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("categories");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keywordByTab, setKeywordByTab] = useState<Record<TabType, string>>({
    categories: "",
    units: "",
    warehouses: "",
    suppliers: "",
    notifications: "",
  });
  const [pageByTab, setPageByTab] = useState<Record<TabType, number>>({
    categories: 1,
    units: 1,
    warehouses: 1,
    suppliers: 1,
    notifications: 1,
  });
  
  // Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsMap>({});
  const [systemSettingsDraft, setSystemSettingsDraft] = useState<Record<string, string>>({});

  const [categoryForm, setCategoryForm] = useState<CategoryPayload>({
    name: "",
    code_prefix: "",
    item_type: "CONSUMABLE",
    description: "",
  });
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
      const [cats, uns, whs, sups, sys] = await Promise.all([
        getCategories(),
        getUnits(),
        getWarehouses(),
        getSuppliers(),
        getSystemSettings(),
      ]);
      setCategories(cats || []);
      setUnits(uns || []);
      setWarehouses(whs || []);
      setSuppliers(sups || []);
      setSystemSettings(sys || {});
      const draft: Record<string, string> = {};
      for (const [k, v] of Object.entries(sys || {})) {
        draft[k] = v?.value ?? "";
      }
      setSystemSettingsDraft(draft);
    } catch (error) {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const sectionTitle = useMemo(() => {
    if (activeTab === "categories") return "รายการหมวดหมู่พัสดุ";
    if (activeTab === "units") return "รายการหน่วยนับ";
    if (activeTab === "warehouses") return "รายการคลังสินค้า";
    if (activeTab === "notifications") return "ตั้งค่าแจ้งเตือนและตารางเวลา";
    return "รายการผู้จำหน่าย";
  }, [activeTab]);

  const formTitle = useMemo(() => {
    if (activeTab === "categories") return formMode === "create" ? "เพิ่มหมวดหมู่พัสดุ" : "แก้ไขหมวดหมู่พัสดุ";
    if (activeTab === "units") return formMode === "create" ? "เพิ่มหน่วยนับ" : "แก้ไขหน่วยนับ";
    if (activeTab === "warehouses") return formMode === "create" ? "เพิ่มคลังสินค้า" : "แก้ไขคลังสินค้า";
    if (activeTab === "notifications") return "ตั้งค่าแจ้งเตือน";
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
      notifications: 1,
    }),
    [filteredCategories.length, filteredUnits.length, filteredWarehouses.length, filteredSuppliers.length]
  );

  const totalPagesByTab = useMemo(
    () => ({
      categories: Math.max(1, Math.ceil(totalByTab.categories / ITEMS_PER_PAGE)),
      units: Math.max(1, Math.ceil(totalByTab.units / ITEMS_PER_PAGE)),
      warehouses: Math.max(1, Math.ceil(totalByTab.warehouses / ITEMS_PER_PAGE)),
      suppliers: Math.max(1, Math.ceil(totalByTab.suppliers / ITEMS_PER_PAGE)),
      notifications: 1,
    }),
    [totalByTab]
  );

  const pageByTabSafe = useMemo(
    () => ({
      categories: Math.min(pageByTab.categories, totalPagesByTab.categories),
      units: Math.min(pageByTab.units, totalPagesByTab.units),
      warehouses: Math.min(pageByTab.warehouses, totalPagesByTab.warehouses),
      suppliers: Math.min(pageByTab.suppliers, totalPagesByTab.suppliers),
      notifications: 1,
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
    if (activeTab === "notifications") return "—";
    return "ค้นหาผู้จำหน่าย (ชื่อ, ผู้ติดต่อ, โทรศัพท์)";
  }, [activeTab]);

  const notificationKeys = useMemo(() => {
    return Object.entries(systemSettings)
      .filter(([, v]) => (v?.group || "") === "notification")
      .map(([k]) => k);
  }, [systemSettings]);

  const scheduleKeys = useMemo(() => {
    return Object.entries(systemSettings)
      .filter(([, v]) => (v?.group || "") === "schedule")
      .map(([k]) => k);
  }, [systemSettings]);

  const handleSaveSystemSettings = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, string | number | boolean> = {};
      for (const [key, meta] of Object.entries(systemSettings)) {
        const raw = systemSettingsDraft[key] ?? meta.value ?? "";
        if (meta.type === "boolean") payload[key] = raw === "true";
        else if (meta.type === "number") payload[key] = Number(raw || 0);
        else payload[key] = raw;
      }
      const updated = await updateSystemSettings(payload);
      setSystemSettings(updated || {});
      const draft: Record<string, string> = {};
      for (const [k, v] of Object.entries(updated || {})) draft[k] = v?.value ?? "";
      setSystemSettingsDraft(draft);
      SweetAlertUtils.success("สำเร็จ", "บันทึกการตั้งค่าเรียบร้อย");
    } catch (error) {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setPageByTab((prev) => ({
      categories: Math.min(prev.categories, totalPagesByTab.categories),
      units: Math.min(prev.units, totalPagesByTab.units),
      warehouses: Math.min(prev.warehouses, totalPagesByTab.warehouses),
      suppliers: Math.min(prev.suppliers, totalPagesByTab.suppliers),
      notifications: 1,
    }));
  }, [totalPagesByTab]);

  const handleOpenCreateForm = () => {
    if (activeTab === "notifications") return;
    setFormMode("create");
    if (activeTab === "categories") {
      setEditingCategoryId(null);
      setCategoryForm({ name: "", code_prefix: "", item_type: "CONSUMABLE", description: "" });
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
        SweetAlertUtils.success("สำเร็จ", "บันทึกข้อมูลเรียบร้อย");
      }
    } catch (error) {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  // การจัดการการลบผ่าน SweetAlert
  const confirmDelete = async (id: string, type: TabType, name: string) => {
    const result = await SweetAlertUtils.delete("ลบข้อมูล", `คุณต้องการลบ ${name} ใช่หรือไม่?`);
    if (!result.isConfirmed) return;
    
    setIsSaving(true);
    try {
      if (type === "categories") await deleteCategory(id);
      if (type === "units") await deleteUnit(id);
      if (type === "warehouses") await deleteWarehouse(id);
      if (type === "suppliers") await deleteSupplier(id);
      await loadAllData();
      SweetAlertUtils.success("สำเร็จ", "ลบข้อมูลเรียบร้อย");
    } catch (error) {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "ลบข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const getItemTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CONSUMABLE: "วัสดุสิ้นเปลือง",
      REUSABLE: "ของใช้ซ้ำรายชิ้น",
      MED_ASSET: "ครุภัณฑ์ภายในองค์กร",
    };
    return labels[type] || type;
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
          { id: "categories", label: "หมวดหมู่พัสดุ", icon: <Package className="w-4 h-4" /> },
          { id: "units", label: "หน่วยนับ", icon: <Ruler className="w-4 h-4" /> },
          { id: "warehouses", label: "คลังสินค้า", icon: <WarehouseIcon className="w-4 h-4" /> },
          { id: "suppliers", label: "ผู้จำหน่าย", icon: <Truck className="w-4 h-4" /> },
          { id: "notifications", label: "แจ้งเตือน", icon: <Settings className="w-4 h-4" /> },
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
        {activeTab !== "notifications" ? (
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={keywordByTab[activeTab]}
            onChange={(e) => {
              const keyword = e.target.value;
              setKeywordByTab((prev) => ({ ...prev, [activeTab]: keyword }));
              setPageByTab((prev) => ({ ...prev, [activeTab]: 1 }));
            }}
            className="w-72 border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
          />
        ) : (
          <div className="text-sm text-slate-600">{sectionTitle}</div>
        )}
        {activeTab !== "notifications" && (
          <button
            onClick={handleOpenCreateForm}
            className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการใหม่
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col mb-6" style={{ height: '50vh' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div 
          className="flex-1" 
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            msOverflowStyle: 'auto',
          } as React.CSSProperties}
        >
          <style>{`
            div::-webkit-scrollbar {
              width: 0;
              height: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            div::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          {activeTab === "categories" && (
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-[50px]">#</th>
                  <th className="px-6 py-4 w-[200px]">ชื่อประเภท</th>
                  <th className="px-6 py-4 w-[120px]">Prefix</th>
                  <th className="px-6 py-4 w-[150px]">ผูกประเภท</th>
                  <th className="px-6 py-4 w-[250px]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[100px]">สร้าง</th>
                  <th className="px-6 py-4 w-[100px]">แก้ไข</th>
                  <th className="px-6 py-4 w-[100px] text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedCategories.length > 0 ? (
                  pagedCategories.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 w-[50px]">{((pageByTabSafe.categories - 1) * ITEMS_PER_PAGE) + idx + 1}</td>
                      <td className="px-6 py-4 w-[200px]">{cat.name}</td>
                      <td className="px-6 py-4 w-[120px]">
                        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-100 text-indigo-700 rounded-md">
                          {cat.code_prefix}
                        </span>
                      </td>
                      <td className="px-6 py-4 w-[150px]">
                        {getItemTypeLabel(cat.item_type || "CONSUMABLE")}
                      </td>
                      <td className="px-6 py-4 w-[250px]">
                        {cat.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                      </td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(cat.created_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(cat.updated_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px] text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setFormMode("edit");
                              setEditingCategoryId(cat.id);
                              setCategoryForm({
                                name: cat.name,
                                code_prefix: cat.code_prefix,
                                item_type: (cat.item_type || "CONSUMABLE") as CategoryPayload["item_type"],
                                description: cat.description || "",
                              });
                              setIsFormModalOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => confirmDelete(cat.id, "categories", cat.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
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
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-[50px]">#</th>
                  <th className="px-6 py-4 w-[250px]">ชื่อหน่วยนับ</th>
                  <th className="px-6 py-4 w-[350px]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[100px]">สร้าง</th>
                  <th className="px-6 py-4 w-[100px]">แก้ไข</th>
                  <th className="px-6 py-4 w-[100px] text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedUnits.length > 0 ? (
                  pagedUnits.map((unit, idx) => (
                    <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 w-[50px]">{((pageByTabSafe.units - 1) * ITEMS_PER_PAGE) + idx + 1}</td>
                      <td className="px-6 py-4 w-[250px]">{unit.name}</td>
                      <td className="px-6 py-4 w-[350px]">
                        {unit.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                      </td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(unit.created_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(unit.updated_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px] text-center">
                        <div className="flex justify-center gap-1">
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
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => confirmDelete(unit.id, "units", unit.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
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

          {activeTab === "warehouses" && (
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-[50px]">#</th>
                  <th className="px-6 py-4 w-[180px]">ชื่อคลังสินค้า</th>
                  <th className="px-6 py-4 w-[180px]">สถานที่ตั้ง</th>
                  <th className="px-6 py-4 w-[250px]">รายละเอียด</th>
                  <th className="px-6 py-4 w-[100px]">สร้าง</th>
                  <th className="px-6 py-4 w-[100px]">แก้ไข</th>
                  <th className="px-6 py-4 w-[100px] text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedWarehouses.length > 0 ? (
                  pagedWarehouses.map((wh, idx) => (
                    <tr key={wh.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 w-[50px]">{((pageByTabSafe.warehouses - 1) * ITEMS_PER_PAGE) + idx + 1}</td>
                      <td className="px-6 py-4 w-[180px]">{wh.name}</td>
                      <td className="px-6 py-4 w-[180px]">{wh.location || "-"}</td>
                      <td className="px-6 py-4 w-[250px]">
                        {wh.description || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                      </td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(wh.created_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(wh.updated_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px] text-center">
                        <div className="flex justify-center gap-1">
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
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => confirmDelete(wh.id, "warehouses", wh.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
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
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-[50px]">#</th>
                  <th className="px-6 py-4 w-[180px]">ชื่อผู้จำหน่าย</th>
                  <th className="px-6 py-4 w-[150px]">ผู้ติดต่อ</th>
                  <th className="px-6 py-4 w-[130px]">โทรศัพท์</th>
                  <th className="px-6 py-4 w-[150px]">เลขผู้เสียภาษี</th>
                  <th className="px-6 py-4 w-[100px]">สร้าง</th>
                  <th className="px-6 py-4 w-[100px]">แก้ไข</th>
                  <th className="px-6 py-4 w-[100px] text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedSuppliers.length > 0 ? (
                  pagedSuppliers.map((sup, idx) => (
                    <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 w-[50px]">{((pageByTabSafe.suppliers - 1) * ITEMS_PER_PAGE) + idx + 1}</td>
                      <td className="px-6 py-4 w-[180px]">{sup.name}</td>
                      <td className="px-6 py-4 w-[150px]">{sup.contact || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4 w-[130px]">{sup.phone || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4 w-[150px]">{sup.tax_id || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(sup.created_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px]">
                        {formatThaiDateTime(sup.updated_at)}
                      </td>
                      <td className="px-6 py-4 w-[100px] text-center">
                        <div className="flex justify-center gap-1">
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
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => confirmDelete(sup.id, "suppliers", sup.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
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

          {activeTab === "notifications" && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">การแจ้งเตือน</h3>
                  <div className="space-y-4">
                    {notificationKeys.map((k) => {
                      const meta = systemSettings[k];
                      const value = systemSettingsDraft[k] ?? meta?.value ?? "";
                      if (!meta) return null;

                      if (meta.type === "boolean") {
                        return (
                          <label key={k} className="flex items-center justify-between gap-4">
                            <span className="text-sm text-slate-700">{meta.label}</span>
                            <input
                              type="checkbox"
                              checked={value === "true"}
                              onChange={(e) =>
                                setSystemSettingsDraft((prev) => ({ ...prev, [k]: e.target.checked ? "true" : "false" }))
                              }
                              className="h-5 w-5 accent-indigo-600"
                            />
                          </label>
                        );
                      }

                      if (meta.type === "number") {
                        return (
                          <div key={k} className="flex items-center justify-between gap-4">
                            <label className="text-sm text-slate-700">{meta.label}</label>
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => setSystemSettingsDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                              className="w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                              min={0}
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={k} className="flex items-center justify-between gap-4">
                          <label className="text-sm text-slate-700">{meta.label}</label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setSystemSettingsDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                            className="w-72 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">ตารางเวลาการทำงาน (Cron)</h3>
                  <div className="space-y-4">
                    {scheduleKeys.map((k) => {
                      const meta = systemSettings[k];
                      const value = systemSettingsDraft[k] ?? meta?.value ?? "";
                      if (!meta) return null;
                      const timeValue = cronDailyToTime(value);
                      return (
                        <div key={k} className="space-y-1">
                          <label className="text-sm text-slate-700">{meta.label}</label>
                          {timeValue ? (
                            <div className="flex items-center gap-3">
                              <input
                                type="time"
                                value={timeValue}
                                onChange={(e) => {
                                  const cron = timeToDailyCron(e.target.value);
                                  setSystemSettingsDraft((prev) => ({ ...prev, [k]: cron ?? value }));
                                }}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                              />
                              <div className="text-xs text-slate-500">
                                แสดงผลเป็น “ทุกวัน เวลา {timeValue}”
                              </div>
                            </div>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => setSystemSettingsDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                placeholder="รองรับรูปแบบรายวัน เช่น 5 0 * * *"
                              />
                              <div className="text-xs text-amber-700">
                                รูปแบบนี้ไม่ใช่ “รายวัน (นาที ชั่วโมง * * *)” จึงแสดงเป็นช่องกรอกขั้นสูง
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSaveSystemSettings}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-70"
                    >
                      {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
            (activeTab === "suppliers" && pagedSuppliers.length) ||
            (activeTab === "notifications" && 1)) ||
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
        activeTab={activeTab === "notifications" ? "categories" : activeTab}
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
      />
    </div>
  );
}