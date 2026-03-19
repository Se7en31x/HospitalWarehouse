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

type ReceiveType = "medicine-lot" | "product-lot" | "donation";

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
  const [receiveType, setReceiveType] = useState<ReceiveType>("medicine-lot");
  const [lotMode, setLotMode] = useState<"prepare" | "receive">("receive");
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
    
    if (receiveType === "donation") {
      if (!donorName) errors.donorName = "กรุณาใส่ชื่อผู้บริจาค";
      if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
      if (formData.quantityReceived <= 0) errors.quantityReceived = "จำนวนที่รับต้องมากกว่า 0";
      if (!formData.expiryDate) errors.expiryDate = "กรุณาระบุวันหมดอายุ";
    } else if (receiveType === "medicine-lot" || receiveType === "product-lot") {
      if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
      
      if (lotMode === "prepare") {
        // Prepare mode: only need item and quantity ordered
        if (formData.quantityOrdered <= 0) errors.quantityOrdered = "จำนวนที่สั่งต้องมากกว่า 0";
      } else {
        // Receive mode: need all details
        if (!formData.lotCode) errors.lotCode = "บังคับ: ต้องใส่ Lot Code";
        if (formData.quantityReceived <= 0) errors.quantityReceived = "จำนวนที่รับต้องมากกว่า 0";
        if (!formData.expiryDate) errors.expiryDate = "กรุณาระบุวันหมดอายุ";
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
      };

      setItems([...items, newItem]);
      // Reset only item-specific fields, keep PO and Supplier info
      setFormData((prev) => ({
        itemId: "",
        itemName: "",
        categoryId: "",
        category: "",
        poNumber: prev.poNumber, // Keep PO
        quantityOrdered: 0,
        quantityReceived: 0,
        unitId: "",
        unit: "",
        supplierId: prev.supplierId, // Keep Supplier
        costPrice: 0,
        mfgDate: "",
        expiryDate: "",
        warehouseId: "",
        warehouseName: "",
        lotCode: "",
      }));
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

      if (receiveType === "donation") {
        // Donation Mode
        const payload = {
          doc_no: `REC-${Date.now()}`,
          type: "DONATION",
          donor_name: donorName,
          status: "COMPLETED",
          receive_date: new Date().toISOString(),
          note: "รับบริจาค",
          items: items.map(item => ({
            item_id: item.itemId,
            warehouse_id: item.warehouseId,
            expected_qty: item.quantityReceived,
            qty: item.quantityReceived,
            lot_code: item.lotCode || "",
            cost_price: item.costPrice || 0,
            expired_at: item.expiryDate ? new Date(item.expiryDate).toISOString() : new Date().toISOString(),
          })),
        };

        await StockInSvc.quickReceive(payload);
        toast.success("บันทึกการรับเข้าสำเร็จ");
      } else if (receiveType === "medicine-lot" || receiveType === "product-lot") {
        // Lot Mode - Split prepare and receive
        if (lotMode === "prepare") {
          // Prepare Mode: Create PENDING document with qty: 0, no lot_code
          const payload = {
            doc_no: `REC-${Date.now()}-PREPARE`,
            type: "PURCHASE",
            supplier_id: formData.supplierId,
            status: "PENDING",
            note: receiveType === "medicine-lot" ? "เตรียมรับยา - ยังไม่ส่งมา" : "เตรียมรับสินค้า - ยังไม่ส่งมา",
            items: items.map(item => ({
              item_id: item.itemId,
              warehouse_id: item.warehouseId,
              expected_qty: item.quantityOrdered,
              qty: 0,
              cost_price: item.costPrice || 0,
            })),
          };
          await StockInSvc.createReceive(payload);
          toast.success("บันทึกการเตรียมรับสำเร็จ");
        } else {
          // Receive Mode: Create COMPLETED document with actual qty and lot_code
          const payload = {
            doc_no: `REC-${Date.now()}`,
            type: "PURCHASE",
            supplier_id: formData.supplierId,
            status: "COMPLETED",
            receive_date: new Date().toISOString(),
            note: receiveType === "medicine-lot" ? "รับยาเข้าคลัง" : "รับสินค้าเข้าคลัง",
            items: items.map(item => ({
              item_id: item.itemId,
              warehouse_id: item.warehouseId,
              expected_qty: item.quantityOrdered,
              qty: item.quantityReceived,
              lot_code: item.lotCode,
              cost_price: item.costPrice || 0,
              expired_at: item.expiryDate ? new Date(item.expiryDate).toISOString() : new Date().toISOString(),
              mfg_date: item.mfgDate ? new Date(item.mfgDate).toISOString() : null,
            })),
          };
          await StockInSvc.createReceive(payload);
          toast.success("บันทึกการรับสินค้าสำเร็จ");
        }
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



  return (
    <>
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="w-full px-2 sm:px-4 lg:px-6 py-6 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="ml-4">
            <h1 className="text-3xl font-bold text-slate-900">
              {receiveType === "medicine-lot" 
                ? "รับยาเข้าคลัง (ล็อตยา)"
                : receiveType === "product-lot"
                ? "รับสินค้าเข้าคลัง (ล็อตสินค้า)"
                : receiveType === "donation"
                ? "รับเข้าจากบริจาค"
                : ""}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {receiveType === "medicine-lot" 
                ? "บันทึกการรับยาเข้าคลังด้วยเลขล็อต"
                : receiveType === "product-lot"
                ? "บันทึกการรับสินค้าเข้าคลังด้วยเลขล็อต"
                : "บันทึกการรับสินค้าบริจาค"}
            </p>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Receive Type Toggle */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <p className="font-semibold text-slate-900 mb-3">เลือกประเภทการรับสินค้าเข้าคลัง</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setReceiveType("medicine-lot");
                    setLotMode("receive");
                    setFormData((prev) => ({
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
                    }));
                    setItems([]);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    receiveType === "medicine-lot"
                      ? "bg-red-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  ล็อตสินค้า (สำหรับยา)
                </button>
                <button
                  onClick={() => {
                    setReceiveType("product-lot");
                    setLotMode("receive");
                    setFormData((prev) => ({
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
                    }));
                    setItems([]);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    receiveType === "product-lot"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  ล็อตสินค้า (สินค้าต่างๆ ที่มิใช่ยา)
                </button>
                <button
                  onClick={() => {
                    setReceiveType("donation");
                    setFormData(INITIAL_FORM_DATA);
                    setItems([]);
                    setDonorName("");
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    receiveType === "donation"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  บริจาค
                </button>
              </div>
            </div>

            {/* Lot Mode Toggle - for Medicine and Product Lot */}
            {(receiveType === "medicine-lot" || receiveType === "product-lot") && (
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-3">
                  {receiveType === "medicine-lot" ? "วิธีรับยาเข้าคลัง" : "วิธีรับสินค้าเข้าคลัง"}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setLotMode("prepare");
                      setFormData((prev) => ({
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
                      }));
                      setItems([]);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      lotMode === "prepare"
                        ? "bg-orange-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    1. เตรียมก่อน (รอรับของ)
                  </button>
                  <button
                    onClick={() => {
                      setLotMode("receive");
                      setFormData((prev) => ({
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
                      }));
                      setItems([]);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      lotMode === "receive"
                        ? "bg-green-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    2. รับเข้าจริง (เข้าคลังเลย)
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  {lotMode === "prepare"
                    ? "📋 เตรียมรายการสินค้าที่คาดว่าจะมา: ระบุจำนวนที่สั่ง ยังไม่ต้องใส่ Lot Code"
                    : "✅ รับสินค้าเข้าคลังจริง: ระบุจำนวนที่รับจริง Lot Code และวันหมดอายุ"}
                </p>
              </div>
            )}

            {/* PO & Supplier Section - Only for Lot Modes */}
            {receiveType !== "donation" && (
              <div className="bg-white rounded-xl p-8 border border-slate-200 border-2 border-amber-200 bg-amber-50">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    ข้อมูลสั่งซื้อ (ทั่วไป)
                  </h3>
                  {formData.poNumber && formData.supplierId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, poNumber: "", supplierId: "" });
                        setSupplierSearchQuery("");
                      }}
                      className="text-sm font-semibold px-3 py-1.5 bg-amber-200 text-amber-900 rounded-lg hover:bg-amber-300 transition-colors"
                    >
                      แก้ไข
                    </button>
                  )}
                </div>

                {/* Display Header View */}
                {formData.poNumber && formData.supplierId ? (
                  <div className="bg-white rounded-lg p-4 border-2 border-amber-300 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold">หมายเลขการสั่งซื้อ (PO)</p>
                        <p className="text-lg font-bold text-amber-700">{formData.poNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold">ผู้จำหน่าย</p>
                        <p className="text-lg font-bold text-amber-700">
                          {suppliers.find((s) => s.id === formData.supplierId)?.name || ""}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-3 italic">
                      ข้อมูลนี้จะใช้กับทุกรายการที่เพิ่มด้านล่าง
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Edit Form View */}
                    {/* Lot Code - At the top */}
                    {lotMode === "receive" ? (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2 text-slate-700">
                          Lot Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.lotCode || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, lotCode: e.target.value })
                          }
                          placeholder="LOT-001"
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        />
                        {formErrors.lotCode && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.lotCode}</p>
                        )}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* PO Number */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-slate-700">
                          หมายเลขการสั่งซื้อ (PO)
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
                            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
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
                          ผู้จำหน่าย
                        </label>
                        {isFetchingOptions ? (
                          <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          </div>
                        ) : suppliers.length === 0 ? (
                          <div className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-50 text-slate-500">
                            ไม่มีผู้จำหน่าย
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                              <input
                                type="text"
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
                                className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white ${
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
                                          className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-sm text-slate-900 focus:outline-none focus:bg-amber-50 transition-colors"
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
                  </>
                )}
              </div>
            )}

            {/* Donation Header Section */}
            {receiveType === "donation" && (
              <div className="bg-white rounded-xl p-8 border-2 border-blue-300 bg-blue-50">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  ข้อมูลการบริจาค
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Donor Name */}
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
                </div>
              </div>
            )}

            {/* Form Section */}
            <div className="bg-white rounded-xl p-8 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                {receiveType === "medicine-lot" || receiveType === "product-lot" 
                  ? "รายละเอียดสินค้าล็อต" 
                  : "รับเข้าสินค้าจากบริจาค"}
              </h3>

              {(receiveType === "medicine-lot" || receiveType === "product-lot") && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  receiveType === "medicine-lot"
                    ? "bg-red-50 border-red-200"
                    : "bg-indigo-50 border-indigo-200"
                }`}>
                  <p className={`text-sm ${
                    receiveType === "medicine-lot"
                      ? "text-red-700"
                      : "text-indigo-700"
                  }`}>
                    โปรดกรอก Lot Code (บังคับ) วันหมดอายุ และจำนวนสินค้าที่รับเข้าจริง
                  </p>
                </div>
              )}

              {receiveType === "donation" && (
                <div className="mb-4 p-3 rounded-lg border bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-700">
                    โปรดกรอก Lot Code และจำนวนสินค้าที่รับเข้าจริง
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
                            }`}
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
                      value={formData.warehouseName}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-100 text-slate-600 cursor-not-allowed opacity-70 outline-none"
                    />
                  </div>
                </div>

                {/* Row 3: Quantity and Lot Details - Based on Mode */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Cost Price */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      ราคาต้นทุน
                    </label>
                    <input
                      type="number"
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

                  {/* Quantity Ordered / Received */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      {(receiveType === "medicine-lot" || receiveType === "product-lot") && lotMode === "prepare" ? "จำนวนที่สั่ง" : "จำนวนที่รับจริง"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={(receiveType === "medicine-lot" || receiveType === "product-lot") && lotMode === "prepare" ? formData.quantityOrdered : formData.quantityReceived}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if ((receiveType === "medicine-lot" || receiveType === "product-lot") && lotMode === "prepare") {
                          setFormData({ ...formData, quantityOrdered: value });
                        } else {
                          setFormData({ ...formData, quantityReceived: value });
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    {formErrors.quantityOrdered && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.quantityOrdered}</p>
                    )}
                    {formErrors.quantityReceived && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.quantityReceived}</p>
                    )}
                  </div>

                  {/* Mfg Date - only for receive mode and donation */}
                  {((receiveType === "medicine-lot" || receiveType === "product-lot") && lotMode === "receive") || receiveType === "donation" ? (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        วันที่ผลิต
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          value={formData.mfgDate || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, mfgDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Expiry Date - only for receive mode and donation */}
                  {((receiveType === "medicine-lot" || receiveType === "product-lot") && lotMode === "receive") || receiveType === "donation" ? (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        วันหมดอายุ <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          value={formData.expiryDate}
                          onChange={(e) =>
                            setFormData({ ...formData, expiryDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        />
                      </div>
                      {formErrors.expiryDate && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.expiryDate}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddItem}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {receiveType === "medicine-lot"
                    ? "เพิ่มรายการยา"
                    : receiveType === "product-lot"
                    ? "เพิ่มรายการสินค้า"
                    : "เพิ่มรายการบริจาค"}
                </button>
                <button
                  onClick={() => {
                    setFormData((prev) => ({
                      itemId: "",
                      itemName: "",
                      categoryId: "",
                      category: "",
                      poNumber: prev.poNumber, // Keep PO
                      quantityOrdered: 0,
                      quantityReceived: 0,
                      unitId: "",
                      unit: "",
                      supplierId: prev.supplierId, // Keep Supplier
                      costPrice: 0,
                      mfgDate: "",
                      expiryDate: "",
                      warehouseId: "",
                      warehouseName: "",
                      lotCode: "",
                    }));
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
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Table Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">
                    {receiveType === "medicine-lot"
                      ? `รายการยา (${items.length})`
                      : receiveType === "product-lot"
                      ? `รายการสินค้า (${items.length})`
                      : `รายการบริจาค (${items.length})`}
                  </h3>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 w-[50px]">#</th>
                        <th className="px-6 py-4 w-[200px]">สินค้า</th>
                        <th className="px-6 py-4 w-[150px]">ประเภท</th>
                        <th className="px-6 py-4 w-[100px] text-center">จำนวน</th>
                        <th className="px-6 py-4 w-[150px]">Lot Code</th>
                        <th className="px-6 py-4 w-[100px]">หน่วย</th>
                        <th className="px-6 py-4 w-[150px]">คลัง</th>
                        <th className="px-6 py-4 w-[100px] text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-600">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              {item.itemName}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.category}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs">
                              {(receiveType === "medicine-lot" || receiveType === "product-lot") && lotMode === "prepare" 
                                ? item.quantityOrdered 
                                : item.quantityReceived}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-slate-600">
                            {item.lotCode || <span className="text-slate-400">-</span>}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.unit}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.warehouseName}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบรายการ"
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
        <div className="w-full px-2 sm:px-4 lg:px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500">
              {receiveType === "medicine-lot"
                ? "จำนวนรายการยา"
                : receiveType === "product-lot"
                ? "จำนวนรายการสินค้า"
                : "จำนวนรายการบริจาค"}
            </p>
            <p className="text-2xl font-bold text-indigo-600">
              {items.length} รายการ
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
              {receiveType === "medicine-lot"
                ? "บันทึกการรับเข้ายา"
                : receiveType === "product-lot"
                ? "บันทึกการรับเข้าสินค้า"
                : "บันทึกการรับเข้าจากบริจาค"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
