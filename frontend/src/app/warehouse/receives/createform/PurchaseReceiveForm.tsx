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
} from "lucide-react";

import * as ReceiveSvc from "@/services/receiveService";
import * as StockInSvc from "@/services/stockInService";
import * as ItemSvc from "@/services/itemsService";
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

export default function PurchaseReceiveForm({ onChangeType }: Props) {
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
  const [lotMode, setLotMode] = useState<"prepare" | "receive">("receive");

  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        const [itemsData, suppliersData] = await Promise.all([
          ItemSvc.getInventoryItems(),
          ReceiveSvc.getSuppliers(),
        ]);

        const itemOptions: StockIn.ItemOption[] = itemsData.map((item) => ({
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
    };
    if (isItemDropdownOpen || isSupplierDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isItemDropdownOpen, isSupplierDropdownOpen]);

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
    if (lotMode === "prepare") {
      if (formData.quantityOrdered <= 0) errors.quantityOrdered = "จำนวนต้องมากกว่า 0";
    } else {
      if (!formData.lotCode) errors.lotCode = "กรุณาระบุ Lot Code";
      if (formData.quantityReceived <= 0) errors.quantityReceived = "จำนวนต้องมากกว่า 0";
      if (!formData.expiryDate) errors.expiryDate = "กรุณาระบุวันหมดอายุ";
    }
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
    Swal.fire({
      title: "สำเร็จ",
      text: "ลบรายการแล้ว",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
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
      let createdReceive: ReceiveSvc.ReceiveHeader | null = null;

      if (lotMode === "prepare") {
        createdReceive = await ReceiveSvc.createReceive({
          doc_no: `REC-${Date.now()}`,
          type: "PURCHASE",
          supplier_id: formData.supplierId || null,
          status: "PENDING",
          note: "เตรียมรับพัสดุ - รอรับของจริง",
          items: items.map((item) => ({
            item_id: item.itemId,
            warehouse_id: item.warehouseId,
            expected_qty: item.quantityOrdered,
            qty: 0,
            cost_price: item.costPrice || 0,
          })),
        });
        Swal.fire({
          title: "สำเร็จ",
          text: "บันทึกเตรียมรับพัสดุสำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        createdReceive = await ReceiveSvc.createReceive({
          doc_no: `REC-${Date.now()}`,
          type: "PURCHASE",
          supplier_id: formData.supplierId || null,
          status: "COMPLETED",
          note: "รับพัสดุเข้าคลัง",
          items: items.map((item) => ({
            item_id: item.itemId,
            warehouse_id: item.warehouseId,
            expected_qty: item.quantityReceived,
            qty: item.quantityReceived,
            lot_code: item.lotCode || null,
            cost_price: item.costPrice || 0,
            expired_at: item.expiryDate ? new Date(item.expiryDate).toISOString() : null,
          })),
        });
        Swal.fire({
          title: "สำเร็จ",
          text: "บันทึกรับพัสดุเข้าคลังสำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setItems([]);
      setTimeout(() => {
        const idNum = Number(createdReceive?.id);
        if (idNum && Number.isFinite(idNum) && idNum > 0) {
          router.push(`/warehouse/receives/${idNum}`);
        } else {
          router.push("/warehouse/receives");
        }
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

  const showBothQty = lotMode === "receive";
  const showQuantityOrdered = lotMode === "prepare";

  return (
    <div className="flex flex-col min-h-screen bg-white p-6">
      <Toaster position="top-right" />
      <div className="w-full flex flex-col flex-1">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold text-gray-800">รับพัสดุจากการจัดซื้อ</h2>
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
                const active = type === "purchase";
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
          </div>

          {/* ── รูปแบบการรับพัสดุ ── */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">รูปแบบการรับพัสดุเข้าคลัง</p>
            <div className="flex gap-2">
              {([
                { mode: "prepare" as const, label: "เตรียมรับพัสดุ",   desc: "บันทึกจำนวนที่สั่งซื้อไว้ล่วงหน้า รอรับพัสดุจริง" },
                { mode: "receive" as const, label: "รับพัสดุเข้าคลัง", desc: "ระบุ Lot Code และจำนวนที่รับจริง บันทึกเข้าคลังทันที" },
              ]).map(({ mode, label, desc }) => {
                const active = lotMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      setLotMode(mode);
                      setFormData((prev) => resetItemFields(prev));
                      setItems([]);
                    }}
                    className={`flex-1 text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      active
                        ? "border-blue-700 bg-blue-50 text-blue-900"
                        : "border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-medium">{label}</p>
                    <p className={`text-xs mt-0.5 ${active ? "text-blue-600" : "text-slate-400"}`}>{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ข้อมูลเอกสาร ── */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">ข้อมูลเอกสาร</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PO Number */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">หมายเลขการสั่งซื้อ (PO)</label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  placeholder="หมายเลข PO (ถ้ามี)"
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
                          <p className="px-5 py-3.5 text-sm text-slate-400 text-center">
                            {supplierSearchQuery ? "ไม่พบผู้จำหน่าย" : "พิมพ์เพื่อค้นหา"}
                          </p>
                        )}
                      </div>
                    )}
                    {formData.supplierId && (
                      <button
                        type="button"
                        onClick={() => { setFormData({ ...formData, supplierId: "" }); setSupplierSearchQuery(""); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* ── เพิ่มรายการสินค้า ── */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <p className="text-base font-medium text-slate-600 mb-3">เพิ่มรายการสินค้า</p>

            <div className="space-y-6">
              {/* Item Search */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  ชื่อสินค้า <span className="text-red-500">*</span>
                </label>
                <div className="relative" data-item-dropdown>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="text"
                      value={formData.itemId ? formData.itemName : itemSearchQuery}
                      onChange={(e) => {
                        if (!formData.itemId) { setItemSearchQuery(e.target.value); setIsItemDropdownOpen(true); }
                      }}
                      onFocus={() => { if (!formData.itemId) setIsItemDropdownOpen(true); }}
                      placeholder="ค้นหาสินค้า..."
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
                          <p className="px-5 py-3.5 text-sm text-slate-400 text-center">
                            {itemSearchQuery ? "ไม่พบสินค้า" : "พิมพ์เพื่อค้นหา"}
                          </p>
                        )}
                      </div>
                    )}
                    {formData.itemId && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, itemId: "", itemName: "", categoryId: "", category: "", unitId: "", unit: "", warehouseId: "", warehouseName: "" });
                          setItemSearchQuery(""); setIsItemDropdownOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                </div>
                {formErrors.itemId && <p className="text-red-500 text-xs mt-1">{formErrors.itemId}</p>}
              </div>

              {/* Info Row: Category / Unit / Warehouse (read-only) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "ประเภท", value: formData.category },
                  { label: "หน่วย",  value: formData.unit },
                  { label: "ตำแหน่งเก็บ(คลัง)",   value: formData.warehouseName },
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

              {/* Qty + Cost */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">ราคาต้นทุน</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formData.costPrice || 0}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                {(showQuantityOrdered || showBothQty) && (
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
                )}
                {showBothQty && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">
                      จำนวนที่รับจริง <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number" min="1"
                      value={formData.quantityReceived}
                      onChange={(e) => setFormData({ ...formData, quantityReceived: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    {formErrors.quantityReceived && <p className="text-red-500 text-xs mt-1">{formErrors.quantityReceived}</p>}
                  </div>
                )}
              </div>

              {/* Lot Info */}
              {lotMode === "receive" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="md:col-span-3 -mb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ข้อมูล Lot</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">
                      Lot Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lotCode || ""}
                      onChange={(e) => setFormData({ ...formData, lotCode: e.target.value })}
                      placeholder="เช่น LOT-001"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    {formErrors.lotCode && <p className="text-red-500 text-xs mt-1">{formErrors.lotCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">วันที่ผลิต</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={formData.mfgDate || ""}
                        onChange={(e) => setFormData({ ...formData, mfgDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">
                      วันหมดอายุ <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    {formErrors.expiryDate && <p className="text-red-500 text-xs mt-1">{formErrors.expiryDate}</p>}
                  </div>
                </div>
              )}
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
            <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden flex flex-col">
              <div className="px-6 py-3.5 border-b border-slate-300 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">รายการสินค้า</p>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg">
                  {items.length} รายการ
                </span>
              </div>
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
                <table className="w-full text-sm text-left table-fixed">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 w-[50px]">#</th>
                      <th className="px-6 py-4 w-[220px]">ชื่อสินค้า</th>
                      <th className="px-6 py-4 w-[180px]">ประเภท</th>
                      {showBothQty ? (
                        <>
                          <th className="px-6 py-4 w-[120px] text-right">สั่งซื้อ</th>
                          <th className="px-6 py-4 w-[120px] text-right">รับจริง</th>
                        </>
                      ) : (
                        <th className="px-6 py-4 w-[120px] text-right">สั่งซื้อ</th>
                      )}
                      <th className="px-6 py-4 w-[150px]">Lot Code</th>
                      <th className="px-6 py-4 w-[120px]">หน่วย</th>
                      <th className="px-6 py-4 w-[160px]">ตำแหน่งเก็บ</th>
                      <th className="px-6 py-4 w-[80px] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 w-[50px] text-sm text-slate-500">{index + 1}</td>
                        <td className="px-6 py-4 w-[220px] font-medium">{item.itemName}</td>
                        <td className="px-6 py-4 w-[180px] text-slate-600">{item.category}</td>
                        {showBothQty ? (
                          <>
                            <td className="px-6 py-4 w-[120px] text-right font-semibold">{item.quantityOrdered}</td>
                            <td className="px-6 py-4 w-[120px] text-right font-semibold">{item.quantityReceived}</td>
                          </>
                        ) : (
                          <td className="px-6 py-4 w-[120px] text-right font-semibold">{item.quantityOrdered}</td>
                        )}
                        <td className="px-6 py-4 w-[150px] font-mono text-sm text-slate-600">
                          {item.lotCode || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4 w-[120px] text-slate-600">{item.unit}</td>
                        <td className="px-6 py-4 w-[160px] text-slate-600">{item.warehouseName}</td>
                        <td className="px-6 py-4 w-[80px] text-center">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-block"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
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
          <div className="flex justify-end mt-auto pt-6">
            <button
              onClick={handleSaveAll}
              disabled={items.length === 0 || isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกรับพัสดุ
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
