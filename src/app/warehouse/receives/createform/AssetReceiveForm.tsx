import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import {
  Plus,
  Save,
  Search,
  Calendar,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import * as ReceiveSvc from "@/services/receiveService";
import * as StockInSvc from "@/services/stockInService";
import * as ItemSvc from "@/services/itemsService";
import { resolveToItemCode } from "@/services/barcodeService";
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

export default function AssetReceiveForm({ onChangeType }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<StockIn.StockInItem[]>([]);
  const [itemsList, setItemsList] = useState<StockIn.ItemOption[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [receiveDate, setReceiveDate] = useState("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  // BARCODE SCAN State
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        const [itemsData, suppliersData, deptsData] = await Promise.all([
          ItemSvc.getInventoryItems(),
          ReceiveSvc.getSuppliers(),
          DeptSvc.getDepartmentOptions(),
        ]);

        setDepartments(deptsData || []);

        const medAssetItems = (itemsData || []).filter((item) => {
          const type = (item.type || "").toUpperCase();
          return type === "MED_ASSET" || type === "ASSET";
        });

        const itemOptions: StockIn.ItemOption[] = medAssetItems.map((item) => ({
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
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", error);
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        setItemsList([]);
        setSuppliers([]);
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

  const resetItemFields = (prev: FormData): FormData => ({
    itemId: "",
    itemName: "",
    categoryId: "",
    category: "",
    poNumber: prev.poNumber,
    quantityOrdered: 0,
    quantityReceived: 0,
    unitId: "",
    unit: "",
    supplierId: prev.supplierId,
    costPrice: 0,
    mfgDate: "",
    expiryDate: "",
    warehouseId: "",
    warehouseName: "",
    lotCode: "",
  });

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
    if (formData.quantityOrdered <= 0) errors.quantityOrdered = "จำนวนต้องมากกว่า 0";
    return errors;
  };

  const handleAddItem = async () => {
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
      warehouseId: formData.warehouseId || selectedItem.warehouseId || "",
      itemName: selectedItem.name,
    };

    setItems([...items, newItem]);
    setFormData((prev) => resetItemFields(prev));
    setFormErrors({});
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("ลบรายการแล้ว");
  };

  const handleQuickScan = async () => {
    const raw = scanInput.trim();
    if (!raw) return;

    try {
      setIsLoading(true);
      setScanMessage(null);

      const itemCode = await resolveToItemCode(raw);
      if (!itemCode) {
        setScanMessage(`ไม่พบการถอดรหัสจากบาร์โค้ด ${raw}`);
        return;
      }

      const found = itemsList.find((i) =>
        (i.id || "").toLowerCase() === itemCode.toLowerCase()
      );
      const foundItem = found || itemsList.find((i) =>
        (i.name || "").toLowerCase().includes(itemCode.toLowerCase())
      );

      if (foundItem) {
        setScanMessage(`✓ พบสินค้า: ${foundItem.name}`);
        setScanInput("");
        await handleItemSelect(foundItem.id);
      } else {
        setScanMessage(`❌ พบรหัส ${itemCode} แต่ไม่พบสินค้านี้ในหมวดหมู่ที่รองรับ`);
      }
    } catch (e) {
      setScanMessage("❌ เกิดข้อผิดพลาดในการวิเคราะห์บาร์โค้ด");
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSelect = async (itemId: string) => {
    const selectedItem = itemsList.find((item) => item.id === itemId);
    if (!selectedItem) return;

    try {
      setIsLoading(true);
      let warehouseId = selectedItem.warehouseId || "";
      let warehouseName = selectedItem.warehouseName || "";
      let category = selectedItem.category || "";
      let categoryId = selectedItem.categoryId || "";
      let unit = selectedItem.unit || "";
      let unitId = selectedItem.unitId || "";

      try {
        const itemDetail = await StockInSvc.getItemDetail(itemId);
        if (itemDetail) {
          // API returns nested objects: categories, unit, warehouses
          category = itemDetail.category_name || itemDetail.categories?.name || itemDetail.category?.name || category;
          categoryId = itemDetail.category_id || itemDetail.categories?.id || categoryId;
          unit = itemDetail.unit_name || itemDetail.unit?.name || unit;
          unitId = itemDetail.unit_id || itemDetail.unit?.id || unitId;
          warehouseId = itemDetail.warehouse_id || itemDetail.warehouses?.id || warehouseId;
          warehouseName = itemDetail.warehouse_name || itemDetail.warehouses?.name || warehouseName;
        }
      } catch {}

      setFormData((prev) => ({
        ...prev,
        itemId,
        itemName: selectedItem.name || "",
        categoryId,
        category,
        unitId,
        unit,
        warehouseId,
        warehouseName,
      }));
      setItemSearchQuery("");
      setIsItemDropdownOpen(false);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    setFormData({ ...formData, supplierId });
    setSupplierSearchQuery("");
    setIsSupplierDropdownOpen(false);
  };

  const handleSaveAll = async () => {
    if (items.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    setIsSaving(true);
    try {
      const ts = Date.now();
      const batch = await ReceiveSvc.createBatch({
        batch_no: `RCV-${ts}`,
        acquisition_type: "PURCHASE",
        supplier_id: formData.supplierId || null,
        receive_date: receiveDate ? new Date(receiveDate).toISOString() : new Date().toISOString(),
      });
      await ReceiveSvc.createReceive({
        doc_no: `REC-${ts}`,
        type: "PURCHASE_ASSET",
        status: "PENDING",
        batch_id: batch.id,
        note: selectedDepartmentId
          ? `แผนก: ${departments.find((d) => d.id === selectedDepartmentId)?.name ?? selectedDepartmentId}`
          : "รับครุภัณฑ์/สินทรัพย์",
        items: items.map((item) => ({
          item_id: item.itemId,
          warehouse_id: item.warehouseId || null,
          expected_qty: item.quantityOrdered,
          qty: 0,
          cost_price: item.costPrice || 0,
        })),
      });
      Swal.fire({
        title: "สำเร็จ",
        text: "บันทึกรับครุภัณฑ์เข้าระบบสำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      setItems([]);
      setTimeout(() => {
        router.push(`/warehouse/receives/${batch.id}`);
      }, 1500);
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
    <div className="flex flex-col min-h-screen bg-white p-6">
      <Toaster position="top-right" />
      <div className="w-full flex flex-col flex-1">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold text-gray-800">รับครุภัณฑ์ภายในองค์กร</h2>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            ย้อนกลับ
          </button>
        </div>

        <div className="space-y-6 w-full flex-1 flex flex-col">

          {/* ── ประเภทการรับเข้า ── */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">ประเภทการรับเข้า</p>
            <div className="flex flex-wrap gap-2">
              {([
                { type: "purchase" as const,       label: "รับพัสดุจากการจัดซื้อ" },
                { type: "reusable-unit" as const,   label: "รับของใช้ซ้ำรายชิ้น" },
                { type: "purchase-asset" as const,  label: "รับครุภัณฑ์ภายในองค์กร" },
                { type: "donation" as const,        label: "รับพัสดุจากการบริจาค" },
              ]).map(({ type, label }) => {
                const active = type === "purchase-asset";
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
              ครุภัณฑ์จะถูกบันทึกในระบบทะเบียนสินทรัพย์ ไม่นับเป็นสต็อกพัสดุ — สามารถระบุรายละเอียดเพิ่มเติมได้ในขั้นตอนยืนยันการรับ
            </p>
          </div>

          {/* ── ข้อมูลเอกสาร ── */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">ข้อมูลเอกสาร</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* วันที่รับเข้า */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  วันที่รับเข้า <span className="text-red-500">*</span>
                </label>
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
              {/* แผนก/หน่วยงาน */}
              <div data-dept-dropdown>
                <label className="block text-sm font-medium text-slate-600 mb-2">แผนก/หน่วยงานที่รับ</label>
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
                      {departments.filter((d) => d.name?.toLowerCase().includes(deptSearchQuery.toLowerCase())).length === 0 && (
                        <p className="px-5 py-3.5 text-sm text-slate-400 text-center">ไม่พบแผนก</p>
                      )}
                    </div>
                  )}
                  {selectedDepartmentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDepartmentId(null);
                        setDeptSearchQuery("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {/* PO */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">หมายเลข PO</label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  placeholder="เลขที่ใบส่งของ"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Supplier */}
              <div data-supplier-dropdown>
                <label className="block text-sm font-medium text-slate-600 mb-2">ผู้จำหน่าย</label>
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
                  {formData.supplierId && (
                    <button
                      type="button"
                      onClick={() => { setFormData({ ...formData, supplierId: "" }); setSupplierSearchQuery(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── เพิ่มรายการครุภัณฑ์ ── */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">เพิ่มรายการครุภัณฑ์</p>

            <div className="space-y-6">

              {/* Barcode Quick Scan */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <label className="block text-sm font-semibold text-indigo-900 mb-2">ยิงสแกนเนอร์บาร์โค้ดด่วน</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleQuickScan();
                      }
                    }}
                    placeholder="สแกนรหัสเพื่อเติมข้อมูลสินค้าอัตโนมัติ"
                    className="flex-1 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleQuickScan()}
                    disabled={isLoading}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    สแกนค้นหา
                  </button>
                </div>
                {scanMessage && (
                  <p className={`mt-2 text-sm font-medium ${scanMessage.includes("❌") ? "text-red-600" : "text-green-600"}`}>
                    {scanMessage}
                  </p>
                )}
              </div>

              {/* Item Search */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  ชื่อสินค้า (ค้นหาแบบ Manual) <span className="text-red-500">*</span>
                </label>
                <div className="relative" data-item-dropdown>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={formData.itemId ? formData.itemName : itemSearchQuery}
                    onChange={(e) => {
                      if (!formData.itemId) { setItemSearchQuery(e.target.value); setIsItemDropdownOpen(true); } else { setItemSearchQuery(e.target.value); setIsItemDropdownOpen(true); }
                    }}
                    onFocus={() => { setIsItemDropdownOpen(true); }}
                    placeholder="ค้นหาสินค้า..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  {formData.itemId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...INITIAL_FORM_DATA, supplierId: formData.supplierId, poNumber: formData.poNumber });
                        setItemSearchQuery("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {isItemDropdownOpen && (
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
                        <p className="px-5 py-3.5 text-sm text-slate-400 text-center">
                          {itemSearchQuery ? "ไม่พบสินค้า" : "พิมพ์เพื่อค้นหา"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {formErrors.itemId && <p className="text-red-500 text-xs mt-1">{formErrors.itemId}</p>}
              </div>

              {/* Info Row: Category / Unit (read-only) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "ประเภท", value: formData.category },
                  { label: "หน่วย",  value: formData.unit },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
                    <input
                      readOnly
                      value={value || "—"}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Qty */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">
                    จำนวนที่สั่ง <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" min="1"
                    value={formData.quantityOrdered}
                    onChange={(e) => setFormData({ ...formData, quantityOrdered: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  {formErrors.quantityOrdered && <p className="text-red-500 text-xs mt-1">{formErrors.quantityOrdered}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={handleAddItem}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                เพิ่มรายการ
              </button>
              <button
                onClick={() => { setFormData((prev) => resetItemFields(prev)); setFormErrors({}); }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium text-sm transition-colors"
              >
                ล้างข้อมูล
              </button>
            </div>
          </div>

          {/* ── ตารางรายการที่เพิ่มแล้ว ── */}
          {items.length > 0 && (
            <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">รายการครุภัณฑ์</p>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {items.length} รายการ
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3.5 w-10">#</th>
                      <th className="px-5 py-3.5">สินค้า</th>
                      <th className="px-5 py-3.5">ประเภท</th>
                      <th className="px-5 py-3.5 text-right">สั่งซื้อ</th>
                      <th className="px-5 py-3.5">หน่วย</th>
                      <th className="px-5 py-3.5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-400 text-sm">{index + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{item.itemName}</td>
                        <td className="px-5 py-3 text-slate-500">{item.category}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-semibold text-slate-700">{item.quantityOrdered}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{item.unit}</td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* บันทึก */}
          <div className="flex justify-end pb-8">
            <button
              onClick={handleSaveAll}
              disabled={items.length === 0 || isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกรับครุภัณฑ์
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
