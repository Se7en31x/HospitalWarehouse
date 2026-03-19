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
import {
  ReceiveItem,
  ConfirmReceiveFormData,
  ReceiveHeaderInfo,
} from "@/types/stockin_form_type";

interface ReceiveFormModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSuccessAction?: () => void;
  mode: "view" | "confirm";
  receiveData: ReceiveHeaderInfo;
  receiveHeaderId: string;
}

const INITIAL_CONFIRM_FORM: ConfirmReceiveFormData = {
  receive_date: new Date().toISOString().split("T")[0],
  items: [],
};

export default function ReceiveFormModal({
  isOpen,
  onCloseAction,
  onSuccessAction,
  mode,
  receiveData,
  receiveHeaderId,
}: ReceiveFormModalProps) {
  // CONFIRM MODE states
  const [confirmFormData, setConfirmFormData] = useState<ConfirmReceiveFormData>(INITIAL_CONFIRM_FORM);
  const [confirmItems, setConfirmItems] = useState<ReceiveItem[]>([]);
  const [editingConfirmItemIndex, setEditingConfirmItemIndex] = useState<number | null>(null);
  const [confirmItemFormData, setConfirmItemFormData] = useState<ReceiveItem>({
    item_id: "",
    qty: 0,
    lot_code: "",
    expired_at: "",
  });
  const [confirmFormErrors, setConfirmFormErrors] = useState<Record<string, string>>({});

  // COMMON states
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingOptions, setIsFetchingOptions] = useState(true);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);

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

  // ============ FETCH OPTIONS (CONFIRM MODE) ============
  useEffect(() => {
    if (isOpen && mode === "confirm") {
      const fetchItems = async () => {
        try {
          const itemsData = await ItemSvc.getInventoryItems();
          setItemsList(itemsData || []);
        } catch (error) {
          console.warn("Error fetching items:", error);
          toast.error("ไม่สามารถดึงรายการสินค้าได้");
          setItemsList([]);
        } finally {
          setIsFetchingOptions(false);
        }
      };

      setIsFetchingOptions(true);
      fetchItems();
    }
  }, [isOpen, mode]);

  // ============ RESET FORM ON CLOSE ============
  useEffect(() => {
    if (!isOpen) {
      setConfirmFormData(INITIAL_CONFIRM_FORM);
      setConfirmFormErrors({});
      setConfirmItems([]);
      setEditingConfirmItemIndex(null);
      setConfirmItemFormData({
        item_id: "",
        qty: 0,
        lot_code: "",
        expired_at: "",
      });
      setItemSearchQuery("");
      setIsItemDropdownOpen(false);
    }
  }, [isOpen]);

  // ============ CLOSE DROPDOWN ON OUTSIDE CLICK ============
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

  // ============ CONFIRM MODE FUNCTIONS ============

  const validateConfirmItemForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!confirmItemFormData.item_id) errors.item_id = "กรุณาเลือกสินค้า";
    if (confirmItemFormData.qty <= 0) errors.qty = "จำนวนต้องมากกว่า 0";
    if (!confirmItemFormData.lot_code) errors.lot_code = "กรุณาระบุ lot code";
    if (!confirmItemFormData.expired_at) errors.expired_at = "กรุณาระบุวันหมดอายุ";
    
    setConfirmFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddConfirmItem = () => {
    if (!validateConfirmItemForm()) return;

    if (editingConfirmItemIndex !== null) {
      // Update existing item
      const updatedItems = [...confirmItems];
      updatedItems[editingConfirmItemIndex] = confirmItemFormData;
      setConfirmItems(updatedItems);
      toast.success("อัปเดตรายการสำเร็จ");
      setEditingConfirmItemIndex(null);
    } else {
      // Add new item
      setConfirmItems([...confirmItems, confirmItemFormData]);
      toast.success("เพิ่มรายการสำเร็จ");
    }

    setConfirmItemFormData({
      item_id: "",
      qty: 0,
      lot_code: "",
      expired_at: "",
    });
    setConfirmFormErrors({});
    setItemSearchQuery("");
  };

  const handleEditConfirmItem = (index: number) => {
    setConfirmItemFormData(confirmItems[index]);
    setEditingConfirmItemIndex(index);
  };

  const handleRemoveConfirmItem = (index: number) => {
    setConfirmItems(confirmItems.filter((_, i) => i !== index));
    toast.success("ลบรายการสำเร็จ");
  };

  const handleConfirmReceive = async () => {
    if (confirmItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    setIsSaving(true);
    try {
      // Convert date string to ISO format
      const receiveDateTime = new Date(confirmFormData.receive_date).toISOString();

      const payload = {
        receive_date: receiveDateTime,
        items: confirmItems.map(item => ({
          item_id: item.item_id,
          qty: item.qty,
          lot_code: item.lot_code,
          expired_at: new Date(item.expired_at).toISOString(),
        })),
      };

      console.log("Confirming receive with payload:", payload);
      await StockInSvc.confirmReceive(receiveHeaderId, receiveDateTime, payload.items);
      
      toast.success("ยืนยันการรับของสำเร็จ");
      onSuccessAction?.();
      onCloseAction?.();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Confirm error:", error);
      toast.error("เกิดข้อผิดพลาด: " + errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = itemsList.filter((item) =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  // ============ RENDER: VIEW MODE ============
  if (mode === "view") {
    return (
      <>
        <Toaster position="top-right" />
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={onCloseAction} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    ดูรายละเอียดใบรับสินค้า
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{receiveData.doc_no}</p>
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
              {/* Header Info */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">ข้อมูลใบรับ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">เลขที่ใบรับ</label>
                    <p className="text-lg font-bold text-slate-900 mt-1">{receiveData.doc_no}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">ประเภท</label>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {receiveData.type === "PURCHASE" ? "สั่งซื้อ" : "บริจาค"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">ผู้จำหน่าย</label>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {receiveData.supplier_name || "ไม่ระบุ"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">สถานะ</label>
                    <p className={`text-lg font-bold mt-1 ${
                      receiveData.status === "COMPLETED" 
                        ? "text-green-600"
                        : receiveData.status === "PENDING"
                        ? "text-yellow-600"
                        : "text-slate-600"
                    }`}>
                      {receiveData.status === "COMPLETED" && "เสร็จสิ้น"}
                      {receiveData.status === "PENDING" && "รอดำเนินการ"}
                      {receiveData.status === "DRAFT" && "แบบร่าง"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">วันที่รับ</label>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {receiveData.receive_date
                        ? new Date(receiveData.receive_date).toLocaleDateString("th-TH")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600">หมายเหตุ</label>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {receiveData.note || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">
                    รายการสินค้า ({receiveData.items?.length || 0})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">สินค้า</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">ประเภท</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">คาดว่า</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">รับจริง</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Lot Code</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">วันหมดอายุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {receiveData.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 text-slate-600 font-mono text-sm">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 text-sm">
                              {item.item_name || item.item_id}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">{item.category || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-slate-200 text-slate-700 rounded font-semibold text-xs">
                              {item.expected_qty || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold text-xs">
                              {item.qty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">{item.lot_code}</td>
                          <td className="px-4 py-3 text-slate-600 text-sm">
                            {new Date(item.expired_at).toLocaleDateString("th-TH")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-end gap-3">
              <button
                onClick={onCloseAction}
                className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ============ RENDER: CONFIRM MODE ============
  return (
    <>
      <Toaster position="top-right" />
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={onCloseAction} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">ยืนยันการรับสินค้า</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {receiveData.doc_no} - รถมาส่งของแล้ว
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
            {/* Receive Date */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                วันที่รับจริง (วันที่รถมาส่ง) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={confirmFormData.receive_date}
                  onChange={(e) =>
                    setConfirmFormData({
                      ...confirmFormData,
                      receive_date: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                />
              </div>
            </div>

            {/* Add Item Section */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                {editingConfirmItemIndex !== null ? "แก้ไขรายการสินค้า" : "เพิ่มรายการสินค้า"}
              </h3>

              <div className="space-y-4">
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
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => {
                          setItemSearchQuery(e.target.value);
                          setIsItemDropdownOpen(true);
                        }}
                        onFocus={() => setIsItemDropdownOpen(true)}
                        placeholder="ค้นหาสินค้า..."
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />

                      {isItemDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                          {filteredItems.length > 0 ? (
                            <ul className="py-1">
                              {filteredItems.map((item) => (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmItemFormData({
                                        ...confirmItemFormData,
                                        item_id: item.id,
                                      });
                                      setItemSearchQuery(item.name);
                                      setIsItemDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm text-slate-900 focus:outline-none focus:bg-indigo-50 transition-colors"
                                  >
                                    {item.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                              {itemSearchQuery ? "ไม่พบสินค้า" : "พิมพ์เพื่อค้นหา"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {confirmFormErrors.item_id && (
                    <p className="text-red-500 text-xs mt-1">{confirmFormErrors.item_id}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      จำนวนที่รับ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={confirmItemFormData.qty}
                      onChange={(e) =>
                        setConfirmItemFormData({
                          ...confirmItemFormData,
                          qty: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    {confirmFormErrors.qty && (
                      <p className="text-red-500 text-xs mt-1">{confirmFormErrors.qty}</p>
                    )}
                  </div>

                  {/* Lot Code */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      Lot Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={confirmItemFormData.lot_code}
                      onChange={(e) =>
                        setConfirmItemFormData({
                          ...confirmItemFormData,
                          lot_code: e.target.value,
                        })
                      }
                      placeholder="เช่น LOT-B222"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    {confirmFormErrors.lot_code && (
                      <p className="text-red-500 text-xs mt-1">{confirmFormErrors.lot_code}</p>
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
                        value={confirmItemFormData.expired_at}
                        onChange={(e) =>
                          setConfirmItemFormData({
                            ...confirmItemFormData,
                            expired_at: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm pl-10 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                    </div>
                    {confirmFormErrors.expired_at && (
                      <p className="text-red-500 text-xs mt-1">{confirmFormErrors.expired_at}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddConfirmItem}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  {editingConfirmItemIndex !== null ? "อัปเดต" : "เพิ่มรายการ"}
                </button>
                {editingConfirmItemIndex !== null && (
                  <button
                    onClick={() => {
                      setEditingConfirmItemIndex(null);
                      setConfirmItemFormData({
                        item_id: "",
                        qty: 0,
                        lot_code: "",
                        expired_at: "",
                      });
                      setConfirmFormErrors({});
                    }}
                    className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-all"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>
            </div>

            {/* Items Table */}
            {confirmItems.length > 0 && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">
                    รายการที่เพิ่มแล้ว ({confirmItems.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">สินค้า (ID)</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">จำนวน</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Lot Code</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">วันหมดอายุ</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {confirmItems.map((item, index) => (
                        <tr key={index} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 text-slate-600 font-mono text-sm">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 text-sm">
                              {item.item_name || item.item_id}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold text-xs">
                              {item.qty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">{item.lot_code}</td>
                          <td className="px-4 py-3 text-slate-600 text-sm">
                            {new Date(item.expired_at).toLocaleDateString("th-TH")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEditConfirmItem(index)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveConfirmItem(index)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
            <p className="text-sm text-slate-500">
              รอบนี้กรอก {confirmItems.length} รายการ
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCloseAction}
                className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReceive}
                disabled={confirmItems.length === 0 || isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                ยืนยันการรับสินค้า
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
