import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { Calendar, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";

import * as ReceiveSvc from "@/services/receiveService";
import * as ItemSvc from "@/services/itemsService";
import * as DeptSvc from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";
import * as StockIn from "@/types/stockin_type";
import { FormData, FormErrors } from "@/types/stockin_form_type";

const INITIAL_FORM_DATA: FormData = {
  itemId: "",
  itemName: "",
  categoryId: "",
  category: "",
  poNumber: "",
  quantityOrdered: 0,
  quantityReceived: 0,
  unitId: "",
  unit: "",
  supplierId: "",
  costPrice: 0,
  mfgDate: "",
  expiryDate: "",
  warehouseId: "",
  warehouseName: "",
  lotCode: "",
};

interface Props {
  onChangeType: (type: "purchase" | "donation" | "purchase-asset" | "reusable-unit") => void;
}

export default function ReusableReceiveForm({ onChangeType }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<StockIn.StockInItem[]>([]);
  const [itemsList, setItemsList] = useState<StockIn.ItemOption[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [receiveDate, setReceiveDate] = useState("");
  const [note, setNote] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        const [itemsData, suppliersData, deptsData] = await Promise.all([
          ItemSvc.getInventoryItems(),
          ReceiveSvc.getSuppliers(),
          DeptSvc.getDepartmentOptions(),
        ]);

        const reusableItems = (itemsData || []).filter((item) => (item.type || "").toUpperCase() === "REUSABLE");

        const itemOptions: StockIn.ItemOption[] = reusableItems.map((item) => ({
          id: item.id,
          name: item.name || "ไม่ระบุชื่อ",
          category: item.category || "ไม่ระบุหมวดหมู่",
          categoryId: item.categoryId || "",
          unit: item.unit || "หน่วย",
          unitId: item.unitId || "",
          warehouseId: item.warehouseId || "",
          warehouseName: item.location || "ไม่ระบุคลัง",
        }));

        setItemsList(itemOptions);
        setSuppliers(suppliersData || []);
        setDepartments(deptsData || []);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", error);
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        setItemsList([]);
        setSuppliers([]);
        setDepartments([]);
      } finally {
        setIsFetchingOptions(false);
      }
    };

    setIsFetchingOptions(true);
    fetchAllOptions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-item-dropdown]")) setIsItemDropdownOpen(false);
      if (!target.closest("[data-supplier-dropdown]")) setIsSupplierDropdownOpen(false);
      if (!target.closest("[data-dept-dropdown]")) setIsDeptDropdownOpen(false);
    };

    if (isItemDropdownOpen || isSupplierDropdownOpen || isDeptDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isItemDropdownOpen, isSupplierDropdownOpen, isDeptDropdownOpen]);

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
    if (formData.quantityOrdered <= 0) errors.quantityOrdered = "จำนวนต้องมากกว่า 0";
    return errors;
  };

  const handleItemSelect = (itemId: string) => {
    const selectedItem = itemsList.find((item) => item.id === itemId);
    if (!selectedItem) return;

    setFormData((prev) => ({
      ...prev,
      itemId,
      itemName: selectedItem.name || "",
      categoryId: selectedItem.categoryId || "",
      category: selectedItem.category || "",
      unitId: selectedItem.unitId || "",
      unit: selectedItem.unit || "",
      warehouseId: selectedItem.warehouseId || "",
      warehouseName: selectedItem.warehouseName || "",
    }));

    setItemSearchQuery("");
    setIsItemDropdownOpen(false);
  };

  const handleSupplierSelect = (supplierId: string) => {
    setFormData({ ...formData, supplierId });
    setSupplierSearchQuery("");
    setIsSupplierDropdownOpen(false);
  };

  const handleAddItem = () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const selectedItem = itemsList.find((item) => item.id === formData.itemId);
    if (!selectedItem) {
      toast.error("ไม่พบสินค้าที่เลือก");
      return;
    }

    const newItem: StockIn.StockInItem = {
      ...formData,
      itemName: selectedItem.name,
    };

    setItems([...items, newItem]);
    setFormData({ ...INITIAL_FORM_DATA, supplierId: formData.supplierId, poNumber: formData.poNumber });
    setFormErrors({});
    toast.success("เพิ่มรายการสำเร็จ");
  };

  const handleSaveAll = async () => {
    if (items.length === 0) {
      toast.error("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
      return;
    }

    setIsSaving(true);
    try {
      const created = await ReceiveSvc.createReusableReceive({
        doc_no: `RUI-${Date.now()}`,
        supplier_id: formData.supplierId || null,
        receive_date: receiveDate ? new Date(receiveDate).toISOString() : new Date().toISOString(),
        note: note || null,
        items: items.map((item) => ({
          item_id: item.itemId,
          cost_price: item.costPrice || 0,
          units: Array.from({ length: Number(item.quantityOrdered || 0) }).map(() => ({
            department_id: selectedDepartmentId || undefined,
            status: "AVAILABLE",
            condition: "GOOD",
          })),
        })),
      });

      toast.success(`รับเข้าของใช้ซ้ำสำเร็จ (${created.total_units} ชิ้น)`);
      setTimeout(() => router.push("/warehouse/receives"), 1200);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error("เกิดข้อผิดพลาด: " + errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = itemsList.filter((item) =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-white p-10">
      <Toaster position="top-right" />
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-semibold text-gray-800">รับของใช้ซ้ำรายชิ้น</h2>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            ย้อนกลับ
          </button>
        </div>

        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">ประเภทการรับเข้า</p>
            <div className="flex flex-wrap gap-2">
              {[
                { type: "purchase" as const, label: "รับพัสดุจากการจัดซื้อ" },
                { type: "donation" as const, label: "รับพัสดุจากการบริจาค" },
                { type: "purchase-asset" as const, label: "รับครุภัณฑ์ภายในองค์กร" },
                { type: "reusable-unit" as const, label: "รับของใช้ซ้ำรายชิ้น" },
              ].map(({ type, label }) => {
                const active = type === "reusable-unit";
                return (
                  <button
                    key={type}
                    onClick={() => onChangeType(type)}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
                      active
                        ? "bg-blue-600 text-white border-blue-800"
                        : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-slate-400 mt-2.5 border-t border-slate-100 pt-2.5">
              สำหรับของใช้ซ้ำ เช่น เตียง รถเข็น เก็บแบบรายชิ้น 1 ชิ้นต่อ 1 แถว แยกจากระบบ med asset
            </p>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">ข้อมูลเอกสาร</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">วันที่รับเข้า</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div data-supplier-dropdown>
                <label className="block text-sm font-medium text-slate-600 mb-2">ผู้จำหน่าย</label>
                {isFetchingOptions ? (
                  <div className="flex items-center justify-center h-11 bg-slate-50 rounded-lg border border-slate-300">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={
                        formData.supplierId
                          ? suppliers.find((s) => s.id === formData.supplierId)?.name || ""
                          : supplierSearchQuery
                      }
                      onChange={(e) => {
                        setSupplierSearchQuery(e.target.value);
                        setIsSupplierDropdownOpen(true);
                        if (formData.supplierId) setFormData({ ...formData, supplierId: "" });
                      }}
                      onFocus={() => setIsSupplierDropdownOpen(true)}
                      placeholder="ค้นหาผู้จำหน่าย..."
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isSupplierDropdownOpen && !formData.supplierId && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                        {filteredSuppliers.length > 0 ? (
                          <ul className="py-1">
                            {filteredSuppliers.map((supplier) => (
                              <li key={supplier.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSupplierSelect(supplier.id)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                                >
                                  {supplier.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="px-5 py-3.5 text-sm text-slate-400 text-center">พิมพ์เพื่อค้นหา</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div data-dept-dropdown>
                <label className="block text-sm font-medium text-slate-600 mb-2">แผนกรับผิดชอบเริ่มต้น</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={
                      selectedDepartmentId
                        ? departments.find((d) => d.id === selectedDepartmentId)?.name || ""
                        : deptSearchQuery
                    }
                    onChange={(e) => {
                      setDeptSearchQuery(e.target.value);
                      setIsDeptDropdownOpen(true);
                      if (selectedDepartmentId) setSelectedDepartmentId(null);
                    }}
                    onFocus={() => setIsDeptDropdownOpen(true)}
                    placeholder="ค้นหาแผนก..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isDeptDropdownOpen && !selectedDepartmentId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                      {departments
                        .filter((d) => d.name?.toLowerCase().includes(deptSearchQuery.toLowerCase()))
                        .map((dept) => (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => {
                              setSelectedDepartmentId(dept.id);
                              setIsDeptDropdownOpen(false);
                              setDeptSearchQuery("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                          >
                            {dept.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-2">หมายเหตุ</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ชุดรถเข็นใหม่สำหรับหอผู้ป่วย"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">เพิ่มรายการของใช้ซ้ำ</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2" data-item-dropdown>
                <label className="block text-sm font-medium text-slate-600 mb-2">ชื่อสินค้า</label>
                {isFetchingOptions ? (
                  <div className="flex items-center justify-center h-11 bg-slate-50 rounded-lg border border-slate-300">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="text"
                      value={formData.itemId ? formData.itemName : itemSearchQuery}
                      onChange={(e) => {
                        if (!formData.itemId) {
                          setItemSearchQuery(e.target.value);
                          setIsItemDropdownOpen(true);
                        }
                      }}
                      onFocus={() => {
                        if (!formData.itemId) setIsItemDropdownOpen(true);
                      }}
                      placeholder="ค้นหาสินค้า (type = REUSABLE)..."
                      readOnly={!!formData.itemId}
                      className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                        formData.itemId ? "bg-slate-50 cursor-not-allowed text-slate-600" : "bg-white"
                      }`}
                    />
                    {isItemDropdownOpen && !formData.itemId && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                        {filteredItems.length > 0 ? (
                          <ul className="py-1">
                            {filteredItems.map((item) => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => handleItemSelect(item.id)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-900"
                                >
                                  <p className="font-medium">{item.name}</p>
                                  {item.category && <p className="text-xs text-slate-400">{item.category}</p>}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="px-5 py-3.5 text-sm text-slate-400 text-center">ไม่พบสินค้า REUSABLE</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {formErrors.itemId && <p className="text-red-500 text-xs mt-1">{formErrors.itemId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">จำนวนรายชิ้น</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantityOrdered}
                  onChange={(e) => setFormData({ ...formData, quantityOrdered: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.quantityOrdered && <p className="text-red-500 text-xs mt-1">{formErrors.quantityOrdered}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">ราคาต้นทุน/ชิ้น</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice || 0}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                เพิ่มรายการ
              </button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">สินค้า</th>
                    <th className="px-4 py-3 text-left">ประเภท</th>
                    <th className="px-4 py-3 text-right">จำนวนรายชิ้น</th>
                    <th className="px-4 py-3 text-right">ราคาต้นทุน/ชิ้น</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">ยังไม่มีรายการ</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={`${item.itemId}-${idx}`} className="border-t border-slate-100">
                        <td className="px-4 py-3">{item.itemName}</td>
                        <td className="px-4 py-3">{item.category || "-"}</td>
                        <td className="px-4 py-3 text-right">{item.quantityOrdered}</td>
                        <td className="px-4 py-3 text-right">{item.costPrice || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-8 py-2.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              บันทึกรับเข้าแบบรายชิ้น
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
