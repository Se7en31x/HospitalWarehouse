"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Save,
  Search,
  Package,
  Calendar,
  FileText,
  Loader2,
  ChevronLeft,
  Trash2,
} from "lucide-react";

import * as StockInSvc from "@/services/stockInService";
import * as ItemSvc from "@/services/itemsService";
import * as StockIn from "@/types/stockin_type";
import {
  FormData,
  FormErrors,
} from "@/types/stockin_form_type";

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
  lotCode: "", // For form input (barcode/lot code)
};

type ReceiveType = "quick-purchase" | "quick-donation";

export default function StockInFormPage() {
  const router = useRouter();
  const [items, setItems] = useState<StockIn.StockInItem[]>([]);
  const [itemsList, setItemsList] = useState<StockIn.ItemOption[]>([]);
  const [suppliers, setSuppliers] = useState<StockIn.Option[]>([]);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [receiveType, setReceiveType] = useState<ReceiveType>("quick-purchase");
  const [donorName, setDonorName] = useState("");

  // Fetch options on mount
  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        console.log("🔄 เริ่มดึงข้อมูลสินค้าและผู้จำหน่าย...");
        const [itemsData, suppliersData] = await Promise.all([
          ItemSvc.getInventoryItems(),
          StockInSvc.getSuppliers(),
        ]);
        
        console.log("📦 ข้อมูลสินค้าที่ได้:", itemsData);
        console.log("👥 ข้อมูลผู้จำหน่ายที่ได้:", suppliersData);
        
        // Convert items to ItemOption format with fallback values
        const itemOptions: StockIn.ItemOption[] = itemsData.map((item) => ({
          id: item.id,
          name: item.name || "ไม่ระบุชื่อ",
          category: item.category || "ไม่ระบุประเภท",
          categoryId: item.categoryId || "",
          unit: item.unit || "ชิ้น",
          unitId: item.unitId || "",
          warehouseId: item.warehouseId || "",
          warehouseName: item.location || "ไม่ระบุคลัง",
        }));
        
        console.log(`✅ แปลงข้อมูลสินค้าสำเร็จ: ${itemOptions.length} รายการ`);
        console.log("📋 รายการสินค้า:", itemOptions);
        
        setItemsList(itemOptions);
        setSuppliers(suppliersData || []);
        
        if (!itemsData || itemsData.length === 0) {
          console.warn("⚠️ ไม่มีข้อมูลสินค้า!");
        }
        
        if (!suppliersData || suppliersData.length === 0) {
          console.debug("⚠️ ไม่มีข้อมูลผู้จำหน่าย, ฟิลด์ supplier จะ optional");
        }
      } catch (error) {
        console.error("❌ มีข้อผิดพลาดในการดึงข้อมูล:", error);
        toast.error("ไม่สามารถดึงข้อมูลได้");
        // Set empty arrays to allow form to continue working
        setItemsList([]);
        setSuppliers([]);
      } finally {
        setIsFetchingOptions(false);
      }
    };

    setIsFetchingOptions(true);
    fetchAllOptions();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-item-dropdown]')) {
        setIsItemDropdownOpen(false);
      }
      if (!target.closest('[data-supplier-dropdown]')) {
        setIsSupplierDropdownOpen(false);
      }
    };

    if (isItemDropdownOpen || isSupplierDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isItemDropdownOpen, isSupplierDropdownOpen]);

  // Debug: Log formData whenever it changes
  useEffect(() => {
    console.log("📝 formData ปัจจุบัน:", formData);
    console.log("  ✓ itemId:", formData.itemId);
    console.log("  ✓ itemName:", formData.itemName);
    console.log("  ✓ category:", formData.category);
    console.log("  ✓ unit:", formData.unit);
    console.log("  ✓ warehouseName:", formData.warehouseName);
  }, [formData]);

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    
    // Quick Receive validation
    if (isQuickReceiveMode) {
      if (receiveType === "quick-donation" && !donorName) {
        errors.donorName = "กรุณาใส่ชื่อผู้บริจาค";
      }
      if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
      if (!formData.lotCode) errors.lotCode = "บังคับ: ต้องใส่ Lot Code";
      if (formData.quantityReceived <= 0) errors.quantityReceived = "จำนวนที่รับต้องมากกว่า 0";
      if (!formData.expiryDate) errors.expiryDate = "กรุณาระบุวันหมดอายุ";
    } else {
      // Quick Purchase PO validation
      if (!formData.poNumber) errors.poNumber = "กรุณากรอกหมายเลข PO";
      if (!formData.supplierId) errors.supplierId = "กรุณาเลือกผู้จำหน่าย";
      if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
      if (formData.quantityOrdered <= 0) errors.quantityOrdered = "จำนวนที่สั่งซื้อต้องมากกว่า 0";
      
      if (!isDraftMode) {
        if (formData.quantityReceived < 0) errors.quantityReceived = "จำนวนที่รับต้องมากกว่าหรือเท่ากับ 0";
        if (formData.quantityReceived > formData.quantityOrdered) errors.quantityReceived = "จำนวนที่รับไม่ควรมากกว่าจำนวนที่สั่งซื้อ";
        if (!formData.expiryDate) errors.expiryDate = "กรุณาระบุวันหมดอายุ";
        if (!formData.lotCode) errors.lotCode = "บังคับ: ต้องใส่ Lot Code";
      }
    }
    
    return errors;
  };

  const handleAddItem = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!formData.itemId) {
      toast.error("กรุณาเลือกสินค้าก่อน");
      return;
    }

    try {
      const selectedItem = itemsList.find(
        (item) => item.id === formData.itemId
      );

      if (!selectedItem) {
        toast.error("ข้อมูลไม่ครบถ้วน");
        return;
      }

      if (!formData.warehouseId && !selectedItem.warehouseId) {
        toast.error("ไม่พบข้อมูลคลัง");
        return;
      }

      const newItem: StockIn.StockInItem = {
        ...formData,
        warehouseId: formData.warehouseId || selectedItem.warehouseId || "",
        itemName: selectedItem.name,
        isDraft: isDraftMode,
      };

      setItems([...items, newItem]);
      setFormData(INITIAL_FORM_DATA);
      setFormErrors({});
      toast.success("เพิ่มรายการสำเร็จ");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("ลบรายการสำเร็จ");
  };

  const handleItemSelect = async (itemId: string) => {
    const selectedItem = itemsList.find((item) => item.id === itemId);
    
    console.log("🔍 handleItemSelect ถูกเรียก กับ itemId:", itemId);
    console.log("📍 selectedItem ที่พบ:", selectedItem);
    
    if (selectedItem) {
      try {
        setIsLoading(true);
        let warehouseId = selectedItem.warehouseId || "";
        let warehouseName = selectedItem.warehouseName || "";
        let category = selectedItem.category || "";
        let categoryId = selectedItem.categoryId || "";
        let unit = selectedItem.unit || "";
        let unitId = selectedItem.unitId || "";

        // Fetch complete item details from API
        try {
          const itemDetail = await StockInSvc.getItemDetail(itemId);
          if (itemDetail) {
            category = itemDetail.category || category;
            categoryId = itemDetail.categoryId || categoryId;
            unit = itemDetail.unit || unit;
            unitId = itemDetail.unitId || unitId;
            warehouseId = itemDetail.warehouseId || warehouseId;
            warehouseName = itemDetail.warehouseName || warehouseName;
          }
        } catch (error) {
          console.warn("Error fetching item detail, using cached data:", error);
        }

        const newFormData = {
          itemId,
          itemName: selectedItem.name || "",
          categoryId,
          category,
          unitId,
          unit,
          warehouseId,
          warehouseName,
        };
        
        console.log("💾 ข้อมูลที่จะบันทึกลง formData:", newFormData);

        setFormData((prev) => ({
          ...prev,
          ...newFormData,
        }));

        console.log("✅ setFormData ถูกเรียก สำเร็จ");

        setItemSearchQuery("");
        setIsItemDropdownOpen(false);
        toast.success("เลือกสินค้าสำเร็จ");
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการเลือกสินค้า");
        console.error("Error selecting item:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn("❌ ไม่พบ selectedItem สำหรับ itemId:", itemId);
    }
  };

  const handleSupplierSelect = (supplierId: string) => {
    setFormData({
      ...formData,
      supplierId,
    });
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
      const invalidItems = items.filter(item => !item.itemId || !item.warehouseId);
      if (invalidItems.length > 0) {
        toast.error("มีรายการที่ข้อมูลไม่ครบถ้วน");
        setIsSaving(false);
        return;
      }

      // Quick Receive Mode (One-Stop Receive)
      if (isQuickReceiveMode) {
        const payload = {
          doc_no: `REC-${Date.now()}`,
          type: "DONATION",
          donor_name: donorName,
          status: "COMPLETED",
          receive_date: new Date().toISOString(),
          note: "รับบริจาค",
          items: items.map(item => ({
            item_id: item.itemId,
            expected_qty: item.quantityOrdered || item.quantityReceived || 0,
            qty: item.quantityReceived,
            lot_code: item.lotCode,
            cost_price: item.costPrice || 0,
            expired_at: item.expiryDate ? new Date(item.expiryDate).toISOString() : new Date().toISOString(),
          })),
        };

        await StockInSvc.quickReceive(payload);
        toast.success("บันทึกการรับเข้าสำเร็จ");
      } else {
        // Quick Purchase PO Mode - Split Draft and Normal
        const draftItems = items.filter(item => item.isDraft);
        const normalItems = items.filter(item => !item.isDraft);

        // Draft Mode - Create PENDING Receive Document
        if (draftItems.length > 0) {
          const draftPayload = {
            doc_no: `REC-${Date.now()}-DRAFT`,
            type: "PURCHASE",
            supplier_id: formData.supplierId,
            status: "PENDING",
            note: "สั่งของรอล่วงหน้า ยังไม่รู้วันส่ง",
            items: draftItems.map(item => ({
              item_id: item.itemId,
              expected_qty: item.quantityOrdered,
              qty: 0, // Draft items no quantity received yet
              cost_price: item.costPrice || 0,
            })),
          };
          await StockInSvc.createReceive(draftPayload);
        }

        // Normal Mode - Create COMPLETED Receive Document
        if (normalItems.length > 0) {
          const normalPayload = {
            doc_no: `REC-${Date.now()}`,
            type: "PURCHASE",
            supplier_id: formData.supplierId,
            status: normalItems.some(i => i.quantityReceived < i.quantityOrdered) ? "PENDING" : "COMPLETED",
            receive_date: new Date().toISOString(),
            note: `รับสินค้าจากใบ PO ${formData.poNumber}`,
            items: normalItems.map(item => ({
              item_id: item.itemId,
              expected_qty: item.quantityOrdered,
              qty: item.quantityReceived,
              lot_code: item.lotCode || "",
              cost_price: item.costPrice || 0,
              expired_at: item.expiryDate ? new Date(item.expiryDate).toISOString() : new Date().toISOString(),
            })),
          };
          await StockInSvc.createReceive(normalPayload);
        }

        toast.success("บันทึกข้อมูลสำเร็จ");
      }

      setItems([]);
      setTimeout(() => {
        router.push("/warehouse/stockin");
      }, 1500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Save error:", error);
      
      if (errorMsg.includes("Expected JSON") || errorMsg.includes("text/html")) {
        toast.error("เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาตรวจสอบการเชื่อมต่อ");
      } else {
        toast.error("เกิดข้อผิดพลาด: " + errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantityReceived * (item.costPrice || 0)),
    0
  );

  const filteredItems = itemsList.filter((item) =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
  );

  // Form is locked until PO and Supplier are filled (for quick-purchase mode)
  const isFormLocked = receiveType === "quick-purchase" && (!formData.poNumber || !formData.supplierId);
  const isQuickReceiveMode = receiveType !== "quick-purchase";

  return (
    <>
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {receiveType === "quick-purchase" 
                  ? (isDraftMode ? "สร้างใบเตรียมรับของ" : "สร้างใบรับสินค้า")
                  : receiveType === "quick-donation"
                  ? "รับเข้าจากบริจาค"
                  : ""}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {receiveType === "quick-purchase"
                  ? (isDraftMode ? "บันทึกการเตรียมสินค้าที่คาดว่าจะมา" : "บันทึกการรับสินค้าเข้าคลัง")
                  : "รับสินค้าเข้าคลังด่วน (One-Stop Receive)"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Receive Type Toggle */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <p className="font-semibold text-slate-900 mb-3">เลือกประเภทการรับสินค้าเข้าคลัง</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setReceiveType("quick-purchase");
                    setFormData(INITIAL_FORM_DATA);
                    setItems([]);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    receiveType === "quick-purchase"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  สั่งซื้อ (PO)
                </button>
                <button
                  onClick={() => {
                    setReceiveType("quick-donation");
                    setFormData(INITIAL_FORM_DATA);
                    setItems([]);
                    setDonorName("");
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    receiveType === "quick-donation"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  บริจาค
                </button>
              </div>
            </div>

            {/* PO & Supplier Section - Only for Quick Purchase Mode */}
            {receiveType === "quick-purchase" && (
              <div className="bg-white rounded-xl p-8 border border-slate-200 border-2 border-indigo-200 bg-indigo-50">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  ข้อมูลสั่งซื้อ
                </h3>

                {/* Draft Mode Toggle */}
                <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="draftModeToggle"
                    checked={isDraftMode}
                    onChange={(e) => setIsDraftMode(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="draftModeToggle" className="text-sm font-semibold text-blue-700 cursor-pointer flex-1">
                    ปรับเตรียมใบรับสินค้าล่วงหน้า (สินค้ายังไม่ส่งมา) - {isDraftMode ? "เปิดใช้" : "ปิด"}
                  </label>
                  <span className="text-xs text-blue-600">
                    {isDraftMode ? "บันทึกเป็นร่างใบรับ: จำนวน = 0, ไม่ต้องระบุ Lot Code" : "บันทึกเป็นใบรับที่สมบูรณ์: ต้องระบุจำนวนสินค้าที่รับเข้าจริง"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PO Number */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      หมายเลขการสั่งซื้อ (PO) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={formData.poNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, poNumber: e.target.value })
                        }
                        placeholder="หมายเลข PO"
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        required
                      />
                    </div>
                    {formErrors.poNumber && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.poNumber}
                      </p>
                    )}
                  </div>

                  {/* Supplier */}
                  <div data-supplier-dropdown>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      ผู้จำหน่าย <span className="text-red-500">*</span>
                    </label>
                    {isFetchingOptions ? (
                      <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    ) : suppliers.length === 0 ? (
                      <div className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm bg-red-50 text-red-500 font-semibold">
                        กรุณาเลือกผู้จำหน่าย (บังคับ)
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                          <input
                            type="text"
                            required
                            value={formData.supplierId ? (suppliers.find((s) => s.id === formData.supplierId)?.name || "") : supplierSearchQuery}
                            onChange={(e) => {
                              setSupplierSearchQuery(e.target.value);
                              setIsSupplierDropdownOpen(true);
                              if (formData.supplierId) {
                                setFormData({ ...formData, supplierId: "" });
                              }
                            }}
                            onFocus={() => setIsSupplierDropdownOpen(true)}
                            placeholder="ค้นหาผู้จำหน่าย..."
                            className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white ${
                              formData.supplierId && supplierSearchQuery === "" ? "opacity-75" : ""
                            }`}
                          />
                        </div>

                        {/* Dropdown Menu */}
                        {isSupplierDropdownOpen && !formData.supplierId && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                            {filteredSuppliers.length > 0 ? (
                              <ul className="py-1">
                                {filteredSuppliers.map((supplier) => (
                                  <li key={supplier.id}>
                                    <button
                                      type="button"
                                      onClick={() => handleSupplierSelect(supplier.id)}
                                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm text-slate-900 focus:outline-none focus:bg-indigo-50 transition-colors"
                                    >
                                      {supplier.name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : supplierSearchQuery ? (
                              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                ไม่พบผู้จำหน่าย
                              </div>
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                พิมพ์เพื่อค้นหา
                              </div>
                            )}
                          </div>
                        )}

                        {/* Clear selection button */}
                        {formData.supplierId && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, supplierId: "" });
                              setSupplierSearchQuery("");
                              setIsSupplierDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                    {formErrors.supplierId && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.supplierId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Receive Header Section */}
            {isQuickReceiveMode && (
              <div className={`bg-white rounded-xl p-8 border-2 ${
                receiveType === "quick-donation" 
                  ? "border-blue-300 bg-blue-50" 
                  : "border-green-300 bg-green-50"
              }`}>
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <FileText className={`w-5 h-5 ${
                    receiveType === "quick-donation" 
                      ? "text-blue-600" 
                      : "text-green-600"
                  }`} />
                  {receiveType === "quick-donation" ? "ข้อมูลการบริจาค" : "ข้อมูลการรับเข้าด่วน"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quick Donation: Donor Name */}
                  {receiveType === "quick-donation" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        ชื่อผู้บริจาค <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="ชื่อผู้บริจาค"
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      />
                      {formErrors.donorName && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.donorName}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Section */}
            <div className="bg-white rounded-xl p-8 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                {receiveType === "quick-purchase" ? "รายละเอียดสินค้า" : "รับเข้าสินค้า"}
              </h3>

              {isQuickReceiveMode && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  receiveType === "quick-donation"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-green-50 border-green-200"
                }`}>
                  <p className={`text-sm ${
                    receiveType === "quick-donation"
                      ? "text-blue-700"
                      : "text-green-700"
                  }`}>
                    โปรดกรอก Lot Code (บังคับ) และจำนวนสินค้าที่รับเข้าจริง
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* Row 1: Item */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      ชื่อสินค้า <span className="text-red-500">*</span>
                    </label>
                    {isFetchingOptions ? (
                      <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <div className="relative" data-item-dropdown>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                          <input
                            type="text"
                            disabled={receiveType === "quick-purchase" && isFormLocked}
                            value={formData.itemId ? formData.itemName : itemSearchQuery}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (!formData.itemId) {
                                // If no item selected, update search query
                                setItemSearchQuery(newValue);
                                setIsItemDropdownOpen(true);
                              }
                            }}
                            onFocus={() => {
                              if (!formData.itemId) {
                                setIsItemDropdownOpen(true);
                              }
                            }}
                            placeholder="ค้นหาสินค้า..."
                            readOnly={!!formData.itemId}
                            className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white ${
                              formData.itemId ? "bg-indigo-50 cursor-not-allowed" : ""
                            } ${receiveType === "quick-purchase" && isFormLocked && !formData.itemId ? "opacity-50 bg-slate-100 cursor-not-allowed" : ""}`}
                          />
                        </div>

                        {/* Dropdown Menu */}
                        {isItemDropdownOpen && !formData.itemId && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                            {filteredItems.length > 0 ? (
                              <ul className="py-1">
                                {filteredItems.map((item) => (
                                  <li key={item.id}>
                                    <button
                                      type="button"
                                      onClick={() => handleItemSelect(item.id)}
                                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm text-slate-900 focus:outline-none focus:bg-indigo-50 transition-colors flex justify-between items-start"
                                    >
                                      <div>
                                        <div className="font-semibold">{item.name}</div>
                                        {item.category && (
                                          <div className="text-xs text-slate-500">
                                            {item.category}
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : itemSearchQuery ? (
                              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                ไม่พบสินค้า
                              </div>
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                พิมพ์เพื่อค้นหา
                              </div>
                            )}
                          </div>
                        )}

                        {/* Clear selection button */}
                        {formData.itemId && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, itemId: "", itemName: "", categoryId: "", category: "", unitId: "", unit: "", warehouseId: "", warehouseName: "" });
                              setItemSearchQuery("");
                              setIsItemDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                    {formErrors.itemId && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.itemId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: Category, Unit, Warehouse */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      ประเภท
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled={receiveType === "quick-purchase" && isFormLocked}
                      value={formData.category}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-100 text-slate-600 cursor-not-allowed opacity-70 outline-none"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      หน่วย
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled={receiveType === "quick-purchase" && isFormLocked}
                      value={formData.unit}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-100 text-slate-600 cursor-not-allowed opacity-70 outline-none"
                    />
                  </div>

                  {/* Warehouse */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      ตำแหน่ง (คลัง)
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled={receiveType === "quick-purchase" && isFormLocked}
                      value={formData.warehouseName}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-100 text-slate-600 cursor-not-allowed opacity-70 outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Cost Price, Barcode, Quantity Ordered, Quantity Received, Mfg Date, Expiry Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Cost Price */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      ราคาต้นทุน
                    </label>
                    <input
                      type="number"
                      disabled={isFormLocked}
                      min="0"
                      step="0.01"
                      value={formData.costPrice || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costPrice: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:opacity-60"
                    />
                  </div>

                  {/* Lot Code */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      Lot Code
                      {(isQuickReceiveMode || (receiveType === "quick-purchase" && !isDraftMode)) && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.lotCode || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, lotCode: e.target.value })
                      }
                      placeholder="LOT-001"
                      disabled={receiveType === "quick-purchase" && isDraftMode}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:opacity-60"
                    />
                    {(isQuickReceiveMode || (receiveType === "quick-purchase" && !isDraftMode)) && formErrors.lotCode && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.lotCode}
                      </p>
                    )}
                  </div>

                  {/* Quantity Ordered / Expected (only for quick-purchase mode) */}
                  {receiveType === "quick-purchase" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        {isDraftMode ? "จำนวนที่คาดว่าจะมา" : "จำนวนที่สั่งซื้อ"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        disabled={isFormLocked}
                        min="1"
                        value={formData.quantityOrdered}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantityOrdered: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:opacity-60"
                      />
                      {formErrors.quantityOrdered && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.quantityOrdered}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quantity Received (for quick-receive or quick-purchase) */}
                  {(isQuickReceiveMode || (receiveType === "quick-purchase" && !isDraftMode)) && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        {isQuickReceiveMode ? "จำนวนที่รับจริง" : "จำนวนที่รับ"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        disabled={receiveType === "quick-purchase" && isFormLocked}
                        min="0"
                        value={formData.quantityReceived}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantityReceived: Number(e.target.value),
                          })
                        }
                        className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          receiveType === "quick-purchase"
                            ? "bg-indigo-50"
                            : "bg-white"
                        } disabled:bg-slate-100 disabled:opacity-60`}
                      />
                      {formErrors.quantityReceived && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.quantityReceived}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Mfg Date */}
                  {(isQuickReceiveMode || (receiveType === "quick-purchase" && !isDraftMode)) && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        วันที่ผลิต
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          disabled={receiveType === "quick-purchase" && isFormLocked}
                          value={formData.mfgDate || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, mfgDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  )}

                  {/* Expiry Date (for quick-receive or quick-purchase non-draft) */}
                  {(isQuickReceiveMode || (receiveType === "quick-purchase" && !isDraftMode)) && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        วันหมดอายุ <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          disabled={receiveType === "quick-purchase" && isFormLocked}
                          value={formData.expiryDate}
                          onChange={(e) =>
                            setFormData({ ...formData, expiryDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:opacity-60"
                        />
                      </div>
                      {formErrors.expiryDate && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.expiryDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddItem}
                  disabled={isLoading || (receiveType === "quick-purchase" && isFormLocked)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isQuickReceiveMode 
                    ? "เพิ่มรายการรับเข้า"
                    : (isDraftMode ? "เพิ่มรายการเตรียม" : "เพิ่มรายการ")}
                </button>
                <button
                  onClick={() => {
                    setFormData(INITIAL_FORM_DATA);
                    setFormErrors({});
                  }}
                  className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-all"
                >
                  ล้างข้อมูล
                </button>
              </div>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">
                    รายการที่เพิ่มแล้ว ({items.length})
                    {items.some(item => item.isDraft) && (
                      <span className="text-sm font-normal text-blue-600 ml-2">
                        - {items.filter(i => i.isDraft).length} แบบร่าง
                      </span>
                    )}
                  </h3>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          #
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          สินค้า
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          ประเภท
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          {items[0]?.isDraft ? "คาดว่าเข้า" : "สั่ง"}
                        </th>
                        {!items[0]?.isDraft && (
                          <th className="px-4 py-3 text-center font-semibold text-slate-700">
                            รับ
                          </th>
                        )}
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          หน่วย
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          คลัง
                        </th>
                        {items[0]?.isDraft && (
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">
                            สถานะ
                          </th>
                        )}
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          การกระทำ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.map((item, index) => (
                        <tr key={index} className={`hover:bg-slate-50 transition-colors ${item.isDraft ? "bg-blue-50" : ""}`}>
                          <td className="px-4 py-3 text-slate-600 font-mono text-sm">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 text-sm">
                              {item.itemName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">
                            {item.category}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-slate-200 text-slate-700 rounded font-semibold text-xs">
                              {item.quantityOrdered}
                            </span>
                          </td>
                          {!item.isDraft && (
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold text-xs">
                                {item.quantityReceived}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-slate-600 text-sm">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">
                            {item.warehouseName}
                          </td>
                          {item.isDraft && (
                            <td className="px-4 py-3 text-left">
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
                                แบบร่าง
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
        </div>
      </div>
      </div>

      {/* Footer with Save Button */}
      <div className="bg-white border-t border-slate-200 sticky bottom-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500">
              {isQuickReceiveMode
                ? "รายการที่จะรับเข้า"
                : (isDraftMode ? "รายการเตรียม" : "ยอดรวม")}
            </p>
            <p className="text-2xl font-bold text-indigo-600">
              {isQuickReceiveMode
                ? `${items.length} รายการ`
                : (isDraftMode 
                  ? `${items.length} รายการ`
                  : `฿${totalAmount.toLocaleString()}`)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveAll}
              disabled={items.length === 0 || isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isQuickReceiveMode
                ? "บันทึกการรับเข้า"
                : (isDraftMode ? "บันทึกรายการเตรียมรับ" : "บันทึกใบรับสินค้า")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
