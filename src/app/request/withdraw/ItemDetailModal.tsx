"use client";

import { useState } from "react";
import { X, PackagePlus, Plus, Minus } from "lucide-react";

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
// 
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
      <div className="bg-white rounded-xl w-full max-w-[min(100%,42rem)] min-h-[min(32rem,85vh)] shadow-xl overflow-hidden flex flex-col">
        {/* Header — กว้างตาม max-w-2xl (~672px) บนจอใหญ่ */}
        <div className="px-[1.65rem] py-[1.25rem] border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <h2 className="font-bold text-slate-800">รายละเอียดสินค้า</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-[1.65rem] pb-[2rem] space-y-[2rem] flex-1 flex flex-col min-h-0">
          {/* Product Image & Info Container */}
          <div className="flex gap-[1.65rem] flex-1 min-h-[9.5rem]">
            {/* Image Left */}
            <div className="flex-shrink-0">
              <div className="w-[9.25rem] h-[9.25rem] rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-300">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                ) : (
                  <PackagePlus className="w-[4.6rem] h-[4.6rem] text-slate-300" />
                )}
              </div>
            </div>

            {/* Info Right - 2 Column Grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-[1.1rem] gap-y-[1.35rem] content-start">
              {/* Left Column */}
              <div className="space-y-[1.35rem]">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">รหัสพัสดุ</label>
                  <p className="text-sm font-normal text-slate-800">{item.code}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">หมวดหมู่</label>
                  <p className="text-sm font-normal text-slate-600">{item.category}</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-[1.35rem]">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">ชื่อรายการ</label>
                  <p className="text-sm font-normal text-slate-800 line-clamp-3">{item.name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">ตำแหน่ง</label>
                  <p className="text-sm font-normal text-slate-600">{item.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock & Quantity Selection */}
          <div className="border-t border-slate-200 pt-[2rem] mt-auto">
            <div className="grid grid-cols-2 gap-[1.1rem] gap-y-6">
              {/* Stock Info Left */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                  คงเหลือ
                </label>
                <div className="flex-1 flex items-center min-w-0">
                  <p className="text-lg font-bold text-emerald-600 flex items-baseline gap-1 min-w-0 max-w-full">
                    <span className="shrink-0 tabular-nums">{item.stock}</span>
                    <span className="truncate min-w-0" title={item.unit}>{item.unit}</span>
                  </p>
                </div>
              </div>

              {/* Quantity Selection Right */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                  จำนวนที่ต้องการเบิก
                </label>
                <div className="flex-1 flex items-center min-w-0">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shrink-0">
                    <button
                      onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                      className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-500"
                    >
                      <Minus size={20} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleConfirm(); } }}
                      className="w-6 text-center font-bold text-lg text-indigo-600 border-0 outline-none focus:ring-0 bg-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
                    />
                    <button
                      onClick={() => handleQuantityChange(Math.min(item.stock, quantity + 1))}
                      className="p-1 hover:bg-slate-100 rounded transition-colors text-indigo-600"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <span className="text-slate-500 font-medium text-xs ml-1 min-w-0 truncate" title={item.unit}>{item.unit}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 truncate" title={`สูงสุด: ${item.stock} ${item.unit}`}>
                  สูงสุด: {item.stock} {item.unit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.65rem] py-[1.15rem] border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            เพิ่มลงตะกร้า
          </button>
        </div>
      </div>
    </div>
  );
}
