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
} from "lucide-react";

import * as StockInSvc from "@/services/stockInService";
import * as StockIn from "@/types/stockin_type";
import {
  FormData,
  FormErrors,
  StockInFormModalProps,
} from "@/types/stockin_form_type";

const INITIAL_FORM_DATA: FormData = {
  itemId: "",
  itemName: "",
  category: "",
  poNumber: "",
  quantityOrdered: 0,
  quantityReceived: 0,
  unit: "",
  warehouse: "",
  supplierId: "",
  costPrice: 0,
  mfgDate: "",
  expiryDate: "",
  barcode: "",
};

export default function StockInFormModal({
  isOpen,
  onCloseAction,
  onSuccessAction,
}: StockInFormModalProps) {
  const [items, setItems] = useState<StockIn.StockInItem[]>([]);
  const [options, setOptions] = useState<StockIn.AllOptions>({
    items: [],
    categories: [],
    units: [],
    warehouses: [],
    suppliers: [],
  });
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);

  // Fetch options on mount
  useEffect(() => {
    if (isOpen) {
      const fetchOptions = async () => {
        try {
          const opts = await StockInSvc.getStockInOptions();
          console.log("Fetched options:", opts);
          setOptions(opts);
        } catch (error) {
          console.error("Error fetching options:", error);
          toast.error("ไม่สามารถดึงข้อมูลได้");
        } finally {
          setIsFetchingOptions(false);
        }
      };

      fetchOptions();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setFormData(INITIAL_FORM_DATA);
      setFormErrors({});
      setItemSearchQuery("");
      setIsItemDropdownOpen(false);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-item-dropdown]')) {
        setIsItemDropdownOpen(false);
      }
    };

    if (isItemDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isItemDropdownOpen]);

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.itemId) errors.itemId = "กรุณาเลือกสินค้า";
    if (!formData.warehouse) errors.warehouse = "กรุณาเลือกคลัง";
    if (formData.quantityOrdered <= 0)
      errors.quantityOrdered = "จำนวนที่สั่งซื้อต้องมากกว่า 0";
    if (formData.quantityReceived < 0)
      errors.quantityReceived = "จำนวนที่รับต้องมากกว่าหรือเท่ากับ 0";
    if (formData.quantityReceived > formData.quantityOrdered)
      errors.quantityReceived =
        "จำนวนที่รับไม่ควรมากกว่าจำนวนที่สั่งซื้อ";
    if (!formData.expiryDate) errors.expiryDate = "กรุณาระบุวันหมดอายุ";

    return errors;
  };

  const handleAddItem = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const selectedItem = options.items.find(
        (item) => item.id === formData.itemId
      );
      const selectedWarehouse = options.warehouses.find(
        (w) => w.id === formData.warehouse
      );

      if (!selectedItem || !selectedWarehouse) {
        toast.error("ข้อมูลไม่ครบถ้วน");
        return;
      }

      const payload: StockIn.CreatePayload = {
        item_id: formData.itemId,
        warehouse_id: formData.warehouse,
        quantity: formData.quantityOrdered,
        quantity_received: formData.quantityReceived,
        po_number: formData.poNumber || undefined,
        supplier_id: formData.supplierId || undefined,
        cost_price: formData.costPrice || undefined,
        mfg_date: formData.mfgDate || undefined,
        expried_at: formData.expiryDate || undefined,
        barcode: formData.barcode || undefined,
      };

      await StockInSvc.createStockIn(payload);
      toast.success("บันทึกการรับสินค้าสำเร็จ");

      const newItem: StockIn.StockInItem = {
        ...formData,
        warehouse: selectedWarehouse.name,
        itemName: selectedItem.name,
        category: selectedItem.category || formData.category,
        unit: selectedItem.unit || formData.unit,
      };

      setItems([...items, newItem]);
      setFormData(INITIAL_FORM_DATA);
      setFormErrors({});
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success("ลบรายการสำเร็จ");
  };

  const handleItemSelect = async (itemId: string) => {
    const selectedItem = options.items.find((item) => item.id === itemId);
    console.log("Selected item from options:", selectedItem);
    
    if (selectedItem) {
      // Set initial data from options
      setFormData((prev) => ({
        ...prev,
        itemId,
        itemName: selectedItem.name || "",
        category: selectedItem.category || "",
        unit: selectedItem.unit || "",
        warehouse: "", // Reset warehouse first
      }));

      // Reset search and close dropdown
      setItemSearchQuery("");
      setIsItemDropdownOpen(false);

      // Fetch detailed item data from API (includes warehouse info)
      try {
        const itemDetail = await StockInSvc.getItemDetail(itemId);
        console.log("Item detail from API:", itemDetail);
        
        if (itemDetail) {
          setFormData((prev) => ({
            ...prev,
            category: itemDetail.category || prev.category,
            unit: itemDetail.unit || prev.unit,
            warehouse: itemDetail.warehouseId || "", // Auto-fill warehouse if available
          }));
        }
      } catch (error) {
        console.error("Error fetching item detail:", error);
      }
    }
  };

  const handleSaveAll = async () => {
    if (items.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    toast.success("บันทึกใบรับสินค้าสำเร็จ");
    onSuccessAction?.();
    onCloseAction?.();
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantityReceived * (item.costPrice || 0)),
    0
  );

  const filteredItems = options.items.filter((item) =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
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
                  สร้างใบรับสินค้า
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  บันทึกการรับสินค้าเข้าคลัง
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
                <FileText className="w-5 h-5 text-slate-500" />
                ข้อมูลการรับสินค้า
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Item Selection */}
                <div className="lg:col-span-2" data-item-dropdown>
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
                          value={formData.itemId ? (options.items.find((i) => i.id === formData.itemId)?.name || "") : itemSearchQuery}
                          onChange={(e) => {
                            setItemSearchQuery(e.target.value);
                            setIsItemDropdownOpen(true);
                            // Clear selection if user is editing
                            if (formData.itemId) {
                              setFormData({ ...formData, itemId: "" });
                            }
                          }}
                          onFocus={() => setIsItemDropdownOpen(true)}
                          placeholder="ค้นหาสินค้า..."
                          className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white ${
                            formData.itemId && itemSearchQuery === "" ? "opacity-75" : ""
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
                            setFormData({ ...formData, itemId: "", itemName: "", category: "", unit: "" });
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
                    disabled={formData.itemId ? true : false}
                    value={formData.category}
                    className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none ${
                      formData.itemId
                        ? "bg-slate-100 text-slate-600 cursor-not-allowed opacity-70"
                        : "bg-white text-slate-600"
                    }`}
                  />
                </div>

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

                {/* Quantity Ordered */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    จำนวนที่สั่งซื้อ <span className="text-red-500">*</span>
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

                {/* Quantity Received */}
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

                {/* Unit */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    หน่วย
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled={formData.itemId ? true : false}
                    value={formData.unit}
                    className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none ${
                      formData.itemId
                        ? "bg-slate-100 text-slate-600 cursor-not-allowed opacity-70"
                        : "bg-white text-slate-600"
                    }`}
                  />
                </div>

                {/* Warehouse */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    คลัง <span className="text-red-500">*</span>
                  </label>
                  {formData.itemId ? (
                    // When item is selected, show warehouse as read-only or for selection
                    formData.warehouse ? (
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={
                          options.warehouses.find((w) => w.id === formData.warehouse)?.name ||
                          "ไม่มีข้อมูลคลัง"
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-100 text-slate-600 outline-none cursor-not-allowed opacity-70"
                      />
                    ) : (
                      <div className="w-full p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                        ⚠️ สินค้านี้ไม่มีข้อมูลคลัง กรุณาเลือกคลังด้วยตนเอง
                      </div>
                    )
                  ) : (
                    // When no item selected, show dropdown to choose warehouse
                    <>
                      {isFetchingOptions ? (
                        <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        </div>
                      ) : (
                        <select
                          value={formData.warehouse}
                          onChange={(e) =>
                            setFormData({ ...formData, warehouse: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        >
                          <option value="">-- เลือกคลัง --</option>
                          {options.warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                  {formErrors.warehouse && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.warehouse}
                    </p>
                  )}
                </div>

                {/* Expiry Date */}
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

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    ผู้จำหน่าย
                  </label>
                  {isFetchingOptions ? (
                    <div className="flex items-center justify-center h-10 bg-white rounded-lg border border-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <select
                      value={formData.supplierId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplierId: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- เลือกผู้จำหน่าย --</option>
                      {options.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
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

                {/* Mfg Date */}
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
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
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
                  เพิ่มรายการ
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
                          สั่ง
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          รับ
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          หน่วย
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          การกระทำ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-white transition-colors">
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
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold text-xs">
                              {item.quantityReceived}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">
                            {item.unit}
                          </td>
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
              <p className="text-sm text-slate-500">ยอดรวม</p>
              <p className="text-2xl font-bold text-indigo-600">
                ฿{totalAmount.toLocaleString()}
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
                disabled={items.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" /> บันทึกใบรับสินค้า
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
