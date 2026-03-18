"use client";

import { useState } from "react";
import { X, HandHelping } from "lucide-react";

interface ItemDetailModalProps {
  isOpen: boolean;
  item: {
    id: string;
    code: string;
    name: string;
    category: string;
    location: string;
    stock: number;
    unit: string;
    imageUrl?: string;
  } | null;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export default function ItemDetailModal({
  isOpen,
  item,
  onClose,
  onConfirm,
}: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  if (!isOpen || !item) return null;

  const handleConfirm = () => {
    if (quantity > 0 && quantity <= item.stock) {
      onConfirm(quantity);
      setQuantity(1);
      onClose();
    }
  };

  const handleQuantityChange = (value: number) => {
    if (value > 0 && value <= item.stock) {
      setQuantity(value);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">รายละเอียดครุภัณฑ์</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Image & Info Container */}
          <div className="flex gap-6">
            {/* Image Left */}
            <div className="flex-shrink-0">
              <div className="w-28 h-28 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-300">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                ) : (
                  <HandHelping className="w-14 h-14 text-slate-300" />
                )}
              </div>
            </div>

            {/* Info Right - 2 Column Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">รหัสครุภัณฑ์</label>
                  <p className="text-sm font-medium text-slate-800">{item.code}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">ประเภท</label>
                  <p className="text-sm text-slate-600">{item.category}</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">ชื่อรายการ</label>
                  <p className="text-sm font-medium text-slate-800 line-clamp-3">{item.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">ตำแหน่ง</label>
                  <p className="text-sm text-slate-600">{item.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock & Quantity Selection */}
          <div className="border-t border-slate-200 pt-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Stock Info Left */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                  คงเหลือ
                </label>
                <div className="flex-1 flex items-center">
                  <p className="text-lg font-bold text-indigo-600">
                    {item.stock} {item.unit}
                  </p>
                </div>
              </div>

              {/* Quantity Selection Right */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                  จำนวนที่ต้องการยืม
                </label>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={item.stock}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="flex-1 text-center px-3 py-2 border border-slate-200 rounded text-lg font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />

                  <span className="text-sm font-medium text-slate-600 min-w-max">{item.unit}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  สูงสุด: {item.stock} {item.unit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            เพิ่มลงตะกร้า
          </button>
        </div>
      </div>
    </div>
  );
}
