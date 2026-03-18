"use client";

import { useState, useCallback } from "react";
import { Plus, Minus, ShoppingCart, Clock, X, RefreshCw, Package } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import * as ItemSvc from "@/services/itemsService";

const MySwal = withReactContent(Swal);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

interface CartItem extends ItemSvc.UiItem {
  quantity: number;
  returnDate?: string;
}

interface BorrowHistory {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: 'BORROWED' | 'RETURNED' | 'PARTIAL';
}

interface BorrowCartModalProps {
  showCartModal: boolean;
  setShowCartModal: (value: boolean) => void;
  selectedItems: CartItem[];
  setSelectedItems: (items: CartItem[]) => void;
  globalReturnDate: string;
  setGlobalReturnDate: (date: string) => void;
  history: BorrowHistory[];
  setHistory: (history: BorrowHistory[]) => void;
}

export default function BorrowCartModal({
  showCartModal,
  setShowCartModal,
  selectedItems,
  setSelectedItems,
  globalReturnDate,
  setGlobalReturnDate,
  history,
  setHistory,
}: BorrowCartModalProps) {
  const [activeTab, setActiveTab] = useState<'BORROW' | 'RETURN'>('BORROW');
  const [returnId, setReturnId] = useState('');
  const [returnQty, setReturnQty] = useState(1);

  // --- [Helper Actions] ---
  const removeFromCart = useCallback((id: string) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== id));
  }, [selectedItems, setSelectedItems]);
  
  const updateCartQuantity = useCallback((id: string, delta: number) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty > 0 && newQty <= item.stock) return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  }, [selectedItems, setSelectedItems]);

  const submitBorrow = async () => {
    if (selectedItems.length === 0) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ", icon: "warning" });
      return;
    }

    if (!globalReturnDate) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาระบุวันที่คืนครุภัณฑ์", icon: "warning" });
      return;
    }
    
    try {
      await MySwal.fire({
        title: "ยืนยันการยืม",
        html: `คุณต้องการยืมสินค้า ${selectedItems.length} รายการหรือไม่<br/><br/>วันที่ต้องคืน: <strong>${globalReturnDate}</strong>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
      });
      
      setSelectedItems([]);
      setGlobalReturnDate('');
      localStorage.removeItem("borrow_cart");
      localStorage.removeItem("borrow_return_date");
      setShowCartModal(false);

      MySwal.fire({
        title: "สำเร็จ",
        text: "ส่งคำขอยืมเรียบร้อย",
        icon: "success",
      });
    } catch (error) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: getErrorMessage(error),
        icon: "error",
      });
    }
  };

  const submitReturn = async () => {
    if (!returnId) return;
    
    try {
      setHistory(
        history.map((h) => (h.id === returnId ? { ...h, status: 'RETURNED' } : h))
      );

      MySwal.fire({
        title: "สำเร็จ",
        text: "บันทึกการคืนสำเร็จ",
        icon: "success",
      });
      
      setReturnId("");
      setReturnQty(1);
    } catch (error) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: getErrorMessage(error),
        icon: "error",
      });
    }
  };

  if (!showCartModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Tabs Header */}
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-4 font-bold text-center transition-colors ${activeTab === 'BORROW' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('BORROW')}
          >
            ตะกร้ายืม ({selectedItems.length})
          </button>
          <button 
            className={`flex-1 py-4 font-bold text-center transition-colors ${activeTab === 'RETURN' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('RETURN')}
          >
            แจ้งคืนของ
          </button>
          <button onClick={() => setShowCartModal(false)} className="px-4 text-gray-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {/* --- TAB: BORROW --- */}
          {activeTab === 'BORROW' && (
            <div className="space-y-4">
              {/* Return Date Section */}
              <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-indigo-600" /> วันที่คืนครุภัณฑ์ (สูงสุด 90 วัน)
                </label>
                <input 
                  type="date" 
                  className="w-full border border-indigo-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none mb-3"
                  value={globalReturnDate}
                  onChange={(e) => setGlobalReturnDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  max={(() => {
                    const maxDate = new Date();
                    maxDate.setDate(maxDate.getDate() + 90);
                    return maxDate.toISOString().split('T')[0];
                  })()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 30);
                      setGlobalReturnDate(date.toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition"
                  >
                    30 วัน
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 60);
                      setGlobalReturnDate(date.toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition"
                  >
                    60 วัน
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 90);
                      setGlobalReturnDate(date.toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition"
                  >
                    90 วัน
                  </button>
                </div>
              </div>

              {selectedItems.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">ยังไม่มีรายการในตะกร้า</p>
                  <p className="text-xs text-gray-400 mt-1">กรุณาเลือกรายการและระบุวันที่คืน</p>
                </div>
              ) : (
                selectedItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> คืนภายใน: {item.returnDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-gray-50 rounded border p-1">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded"><Minus className="w-3 h-3" /></button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* --- TAB: RETURN --- */}
          {activeTab === 'RETURN' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-green-600" /> รายการที่กำลังยืมอยู่
              </h3>
              {history.filter(h => h.status === 'BORROWED').length === 0 ? (
                <p className="text-center text-gray-400 py-6">ไม่มีรายการค้างส่งคืน</p>
              ) : (
                history.filter(h => h.status === 'BORROWED').map(h => (
                  <div 
                    key={h.id} 
                    className={`border p-4 rounded-xl flex justify-between items-center cursor-pointer transition-all ${returnId === h.id ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-white hover:border-green-300'}`} 
                    onClick={() => setReturnId(h.id)}
                  >
                    <div>
                      <div className="font-bold text-gray-900">{h.itemName}</div>
                      <div className="text-xs text-red-500 mt-1">กำหนดคืน: {h.returnDate}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${returnId === h.id ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {returnId === h.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                  </div>
                ))
              )}
              
              {returnId && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-green-200 shadow-sm animate-in slide-in-from-bottom-2">
                  <h4 className="font-bold text-green-800 mb-3 border-b border-green-100 pb-2">รายละเอียดการคืน</h4>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-sm text-gray-600">จำนวนที่คืน:</label>
                    <input 
                      type="number" 
                      value={returnQty} 
                      onChange={(e) => setReturnQty(Number(e.target.value))} 
                      className="border border-green-300 rounded-lg p-2 w-24 text-center focus:ring-2 focus:ring-green-500 outline-none" 
                      min={1} 
                    />
                    <span className="text-sm text-gray-500">ชิ้น</span>
                  </div>
                  <button onClick={submitReturn} className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition shadow-md">
                    ยืนยันรับคืน
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (Specific for Borrow Tab) */}
        {activeTab === 'BORROW' && selectedItems.length > 0 && (
          <div className="p-5 border-t bg-white">
            <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
              <span>รวมทั้งหมด</span>
              <span className="text-xl font-bold text-indigo-600">{selectedItems.reduce((a,b) => a + b.quantity, 0)} <span className="text-sm font-normal text-gray-500">ชิ้น</span></span>
            </div>
            <button onClick={submitBorrow} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition flex items-center justify-center gap-2">
              <Clock className="w-5 h-5" /> ยืนยันการยืม
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
