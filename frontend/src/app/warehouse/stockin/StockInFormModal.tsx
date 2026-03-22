"use client";

import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Save,
  Search,
  Package,
  Calendar,
  FileText,
  Loader2,
  X,
  Trash2,
  Eye,
  Edit,
} from "lucide-react";

import * as StockInSvc from "@/services/stockInService";
import * as ItemSvc from "@/services/itemsService";
import * as StockIn from "@/types/stockin_type";
import {
  FormData,
  FormErrors,
  StockInFormModalProps,
  ReceiveItem,
  ConfirmReceiveFormData,
} from "@/types/stockin_form_type";

const INITIAL_CONFIRM_FORM: ConfirmReceiveFormData = {
  receive_date: new Date().toISOString().split("T")[0],
  items: [],
};

export default function StockInFormModal({
  isOpen,
  onCloseAction,
  onSuccessAction,
  mode = "create",
  receiveData,
  receiveHeaderId,
}: StockInFormModalProps) {
  // CREATE MODE states
  const [items, setItems] = useState<StockIn.StockInItem[]>([]);
  const [itemsList, setItemsList] = useState<StockIn.ItemOption[]>([]);
  const [suppliers, setSuppliers] = useState<StockIn.Option[]>([]);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isDraftMode, setIsDraftMode] = useState(false);

  // CONFIRM MODE states
  const [confirmFormData, setConfirmFormData] = useState<ConfirmReceiveFormData>(INITIAL_CONFIRM_FORM);
  const [confirmFormErrors, setConfirmFormErrors] = useState<Record<string, string>>({});
  const [confirmItems, setConfirmItems] = useState<ReceiveItem[]>([]);
  const [editingConfirmItemIndex, setEditingConfirmItemIndex] = useState<number | null>(null);
  const [confirmItemFormData, setConfirmItemFormData] = useState<ReceiveItem>({
    item_id: "",
    qty: 0,
    lot_code: "",
    expired_at: "",
  });

  // COMMON states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // ============ INITIALIZE CONFIRM MODE ============
  useEffect(() => {
    if (isOpen && mode === "confirm" && receiveData) {
      setConfirmItems(receiveData.items || []);
      setConfirmFormData({
        receive_date: receiveData.receive_date 
          ? new Date(receiveData.receive_date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        items: receiveData.items || [],
      });
    }
  }, [isOpen, mode, receiveData]);

  // ============ FETCH OPTIONS (CREATE MODE) ============
  useEffect(() => {
    if (isOpen && mode === "create") {
      const fetchAllOptions = async () => {
        try {
          const [itemsData, suppliersData] = await Promise.all([
            ItemSvc.getInventoryItems(),
            StockInSvc.getSuppliers(),
          ]);
          
          // Convert items to ItemOption format
          const itemOptions: StockIn.ItemOption[] = itemsData.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            categoryId: item.categoryId,
            unit: item.unit,
            unitId: item.unitId,
            warehouseId: item.warehouseId,
            warehouseName: item.location,
          }));
          
          setItemsList(itemOptions);
          setSuppliers(suppliersData || []);
          
          if (!suppliersData || suppliersData.length === 0) {
            console.debug("No suppliers data available, supplier field will be optional");
          }
        } catch (error) {
          console.warn("Error fetching options:", error);
          toast.error("ไม่สามารถดึงข้อมูลได้");
          setItemsList([]);
          setSuppliers([]);
        } finally {
          setIsFetchingOptions(false);
        }
      };

      setIsFetchingOptions(true);
      fetchAllOptions();
    }
  }, [isOpen, mode]);


  // ============ RESET FORM ON CLOSE ============
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setFormData(INITIAL_FORM_DATA);
      setFormErrors({});
      setItemSearchQuery("");
      setIsItemDropdownOpen(false);
      setIsSaving(false);
      setIsDraftMode(false);
    }
  }, [isOpen]);

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

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
    if (formData.quantityOrdered <= 0)
      errors.quantityOrdered = "จำนวนที่สั่งซื้อต้องมากกว่า 0";
    if (!isDraftMode) {
      // Normal mode validation
      if (formData.quantityReceived < 0)
        errors.quantityReceived = "จำนวนที่รับต้องมากกว่าหรือเท่ากับ 0";
      if (formData.quantityReceived > formData.quantityOrdered)
        errors.quantityReceived =
          "จำนวนที่รับไม่ควรมากกว่าจำนวนที่สั่งซื้อ";
      if (!formData.expiryDate) errors.expiryDate = "กรุณาระบุวันหมดอายุ";
    }
    // Draft mode: no validation for quantityReceived or expiryDate

    return errors;
  };

  const handleAddItem = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Additional validation to ensure itemId is set
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

      // Validate required fields
      if (!formData.warehouseId && !selectedItem.warehouseId) {
        toast.error("ไม่พบข้อมูลคลัง");
        return;
      }

      // Add item to local list without calling API yet
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
    console.log("Selected item:", selectedItem);
    
    if (selectedItem) {
      let warehouseId = selectedItem.warehouseId || "";
      let warehouseName = selectedItem.warehouseName || "";

      // If warehouse data is not in the item, fetch from API
      if (!warehouseId) {
        try {
          const itemDetail = await StockInSvc.getItemDetail(itemId);
          if (itemDetail) {
            warehouseId = itemDetail.warehouseId || "";
            warehouseName = itemDetail.warehouseName || "";
          }
        } catch (error) {
          console.error("Error fetching item detail:", error);
        }
      }

      // Set form data from selected item
      setFormData((prev) => ({
        ...prev,
        itemId,
        itemName: selectedItem.name || "",
        categoryId: selectedItem.categoryId || "",
        category: selectedItem.category || "",
        unitId: selectedItem.unitId || "",
        unit: selectedItem.unit || "",
        warehouseId,
        warehouseName,
      }));

      // Reset search and close dropdown
      setItemSearchQuery("");
      setIsItemDropdownOpen(false);
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
      console.log("Saving items (Draft mode:", isDraftMode, "):", items);
      
      // Validate all items before sending
      const invalidItems = items.filter(item => !item.itemId || !item.warehouseId);
      if (invalidItems.length > 0) {
        toast.error("มีรายการที่ข้อมูลไม่ครบถ้วน");
        setIsSaving(false);
        return;
      }

      // Separate draft and normal items
      const draftItems = items.filter(item => item.isDraft);
      const normalItems = items.filter(item => !item.isDraft);

      // Save draft items if any
      if (draftItems.length > 0) {
        await StockInSvc.saveDraftLots(draftItems);
      }

      // Save normal items if any
      if (normalItems.length > 0) {
        await StockInSvc.saveLots(normalItems);
      }

      toast.success("บันทึกขอมูลสำเร็จ");
      setItems([]);
      onSuccessAction?.();
      onCloseAction?.();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Save error details:", error);
      
      // Check if error is from HTML response
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isDraftMode ? "สร้างใบเตรียมรับของ" : "สร้างใบรับสินค้า"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isDraftMode ? "บันทึกการเตรียมสินค้าที่คาดว่าจะมา" : "บันทึกการรับสินค้าเข้าคลัง"}
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
            {/* Mode Toggle */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">โหมดบันทึก</p>
                <p className="text-sm text-slate-600 mt-1">
                  {isDraftMode 
                    ? "โหมดแบบร่าง: บันทึกเพื่อเตรียมรับของในอนาคต" 
                    : "โหมดปกติ: บันทึกการรับสินค้าทันที"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsDraftMode(!isDraftMode);
                  setFormData(INITIAL_FORM_DATA);
                  setFormErrors({});
                  setItems([]);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isDraftMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {isDraftMode ? "โหมดแบบร่าง" : "โหมดปกติ"}
              </button>
            </div>

            {/* Form Section */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                ข้อมูลการรับสินค้า
              </h3>

              <div className="space-y-4">
                {/* Row 1: Item, Category, Unit, Warehouse */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Item Selection */}
                  <div data-item-dropdown>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    ชื่อสินค้า <span className="text-red-500">*</span>
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
                          value={formData.itemId ? (itemsList.find((i) => i.id === formData.itemId)?.name || "") : itemSearchQuery}
                          onChange={(e) => {
                            // Only open dropdown if user is typing (not just clicking)
                            const newValue = e.target.value;
                            if (newValue !== (itemsList.find((i) => i.id === formData.itemId)?.name || "")) {
                              // User is typing a new search
                              setItemSearchQuery(newValue);
                              setIsItemDropdownOpen(true);
                              // Only clear selection if user is actively searching
                              if (formData.itemId && newValue === "") {
                                setFormData({ ...formData, itemId: "", itemName: "", categoryId: "", category: "", unitId: "", unit: "", warehouseId: "", warehouseName: "" });
                              }
                            }
                          }}
                          onFocus={() => {
                            // Only show dropdown if no item is selected
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

                {/* Row 2: PO Number, Supplier, Cost Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                    </div>
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
                        ไม่มีข้อมูลผู้จำหน่าย (ไม่บังคับ)
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
                              // Clear selection if user is editing
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
                  </div>

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
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>

                {/* Row 3: Barcode, Quantity Ordered, Quantity Received, Mfg Date, Expiry Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Barcode */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      บาร์โค้ด
                    </label>
                    <input
                      type="text"
                      value={formData.barcode || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                      placeholder="บาร์โค้ด"
                      disabled={isDraftMode}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-100 disabled:opacity-60"
                    />
                  </div>

                  {/* Quantity Ordered / Expected */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      {isDraftMode ? "จำนวนที่คาดว่าจะมา" : "จำนวนที่สั่งซื้อ"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantityOrdered}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantityOrdered: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    {formErrors.quantityOrdered && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.quantityOrdered}
                      </p>
                    )}
                  </div>

                  {/* Quantity Received (hidden in draft mode) */}
                  {!isDraftMode && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700">
                        จำนวนที่รับ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.quantityReceived}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantityReceived: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-indigo-50"
                      />
                      {formErrors.quantityReceived && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.quantityReceived}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Mfg Date (hidden in draft mode) */}
                  {!isDraftMode && (
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
                  )}

                  {/* Expiry Date (required in normal mode, hidden in draft mode) */}
                  {!isDraftMode && (
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
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddItem}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isDraftMode ? "เพิ่มรายการเตรียม" : "เพิ่มรายการ"}
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
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
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
                        <tr key={index} className={`hover:bg-white transition-colors ${item.isDraft ? "bg-blue-50" : ""}`}>
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

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500">
                {isDraftMode ? "รายการเตรียม" : "ยอดรวม"}
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                {isDraftMode 
                  ? `${items.length} รายการ`
                  : `฿${totalAmount.toLocaleString()}`
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCloseAction}
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
                {isDraftMode ? "บันทึกรายการเตรียมรับ" : "บันทึกใบรับสินค้า"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
