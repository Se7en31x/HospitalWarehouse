"use client";

import { useState, useCallback } from "react";
import { Plus, Minus, ShoppingCart, Clock, X, RefreshCw, Package, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// ✅ Import Services และ Types
import * as ItemSvc from "@/services/itemsService";
import * as RequisitionSvc from "@/services/requisitionService";
import { RequisitionPayload } from "@/types/requisition_type";

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

interface Department {
  code: string;
  name: string;
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
  // ✅ Props สำหรับแผนก
  selectedDeptId: string;
  departments: Department[];
  onDeptChange: (deptId: string) => void;
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
  selectedDeptId,     // รับค่าแผนก
  departments,        // รับค่าแผนก
  onDeptChange,       // ฟังก์ชันเปลี่ยนแผนก
}: BorrowCartModalProps) {
  const [activeTab, setActiveTab] = useState<'BORROW' | 'RETURN'>('BORROW');
  const [returnId, setReturnId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  
  // ✅ State สำหรับ Loading ตอนกดปุ่ม
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // --- [Submit API: ยืมของ] ---
  const submitBorrow = async () => {
    if (selectedItems.length === 0) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ", icon: "warning" });
      return;
    }

    if (!selectedDeptId) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาระบุแผนกที่ทำการยืม", icon: "warning" });
      return;
    }

    if (!globalReturnDate) {
      MySwal.fire({ title: "แจ้งเตือน", text: "กรุณาระบุวันที่คืนครุภัณฑ์", icon: "warning" });
      return;
    }
    
    // หาชื่อแผนกจาก code
    const currentDept = departments.find((d) => d.code === selectedDeptId);
    const deptName = currentDept ? currentDept.name : "แผนกทั่วไป";

    const confirm = await MySwal.fire({
      title: "ยืนยันการยืม",
      html: `ยืมในนามแผนก: <b class="text-indigo-600">${deptName}</b><br/><br/>จำนวน: ${selectedItems.length} รายการ<br/>วันที่ต้องคืน: <strong class="text-indigo-600">${globalReturnDate}</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยันการยืม",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#4f46e5",
      reverseButtons: true,
    });
    
    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);

    try {
      // ✅ จัดเตรียม Payload สำหรับ API (เปลี่ยน type เป็น BORROW)
      const payload: RequisitionPayload = {
        type: "BORROW",
        department_id: selectedDeptId,
        department_name: deptName,
        due_date: globalReturnDate, // ส่งวันที่ต้องคืนไปด้วย
        items: selectedItems.map((i) => ({
          item_id: i.id, // ใช้ ID (String UUID)
          qty: i.quantity,
          note: "",
        })),
        note: "ยืมออนไลน์ผ่านระบบ",
      };

      // ✅ ยิง API
      const res = await RequisitionSvc.createRequisition(payload);

      if (res.success) {
        await MySwal.fire({
          title: "สำเร็จ",
          text: "ส่งคำขอยืมเรียบร้อย รอการอนุมัติจากคลัง",
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
        
        // ล้างข้อมูลและปิด Modal
        setSelectedItems([]);
        setGlobalReturnDate('');
        localStorage.removeItem("borrow_cart");
        localStorage.removeItem("borrow_return_date");
        setShowCartModal(false);
      } else {
        throw new Error(res.message || "เกิดข้อผิดพลาดในการสร้างใบยืม");
      }
    } catch (error) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: getErrorMessage(error),
        icon: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- [Submit MOCK: คืนของ] --- (รอเชื่อม Backend ในอนาคต)
  const submitReturn = async () => {
    if (!returnId) return;
    
    try {
      setHistory(
        history.map((h) => (h.id === returnId ? { ...h, status: 'RETURNED' } : h))
      );

      MySwal.fire({
        title: "สำเร็จ",
        text: "บันทึกการแจ้งคืนสำเร็จ (Mock)",
        icon: "success",
      });
      
      setReturnId("");
      setReturnQty(1);
    } catch (error) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(error), icon: "error" });
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
          <button 
            onClick={() => setShowCartModal(false)} 
            disabled={isSubmitting}
            className="px-4 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          
          {/* --- TAB: BORROW --- */}
          {activeTab === 'BORROW' && (
            <div className="space-y-4">
              
              {/* ✅ Department Selection Section */}
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm">
                <label className="text-[10px] font-bold text-indigo-600 uppercase mb-2 block">
                  ระบุแผนกที่ทำการยืม
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => onDeptChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 outline-none"
                >
                  <option value="">-- กรุณาเลือกแผนก --</option>
                  {(departments || []).map((d) => (
                    <option key={d.code} value={d.code}>
                      แผนก{d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Return Date Section */}
              <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-indigo-600" /> วันที่คืนครุภัณฑ์ (สูงสุด 90 วัน)
                </label>
                <input 
                  type="date" 
                  disabled={isSubmitting}
                  className="w-full border border-indigo-300 rounded-lg p-2.5 text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none mb-3 disabled:bg-slate-100"
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
                    disabled={isSubmitting}
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 30);
                      setGlobalReturnDate(date.toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition disabled:opacity-50"
                  >
                    30 วัน
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 60);
                      setGlobalReturnDate(date.toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition disabled:opacity-50"
                  >
                    60 วัน
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 90);
                      setGlobalReturnDate(date.toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition disabled:opacity-50"
                  >
                    90 วัน
                  </button>
                </div>
              </div>

              {selectedItems.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">ยังไม่มีรายการในตะกร้า</p>
                  <p className="text-xs text-gray-400 mt-1">กรุณาเลือกรายการจากหน้าระบบยืม</p>
                </div>
              ) : (
                selectedItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.code} | {item.category}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-gray-50 rounded border border-gray-200 p-1">
                        <button 
                          disabled={isSubmitting} 
                          onClick={() => updateCartQuantity(item.id, -1)} 
                          className="w-6 h-6 flex items-center justify-center hover:bg-white rounded disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-gray-800">{item.quantity}</span>
                        <button 
                          disabled={isSubmitting} 
                          onClick={() => updateCartQuantity(item.id, 1)} 
                          className="w-6 h-6 flex items-center justify-center hover:bg-white rounded disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        disabled={isSubmitting} 
                        onClick={() => removeFromCart(item.id)} 
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
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
                <div className="text-center py-10 flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  <p className="text-gray-500 font-medium">ไม่มีรายการค้างส่งคืน</p>
                </div>
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
          <div className="p-5 border-t border-gray-200 bg-white">
            <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
              <span>รวมทั้งหมด</span>
              <span className="text-xl font-bold text-indigo-600">
                {selectedItems.reduce((a,b) => a + b.quantity, 0)} <span className="text-sm font-normal text-gray-500">ชิ้น</span>
              </span>
            </div>
            
            {/* ✅ ปุ่ม ยืนยันการยืม ที่มีระบบ Loading */}
            <button 
              onClick={submitBorrow} 
              disabled={isSubmitting || !selectedDeptId || !globalReturnDate}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />} 
              {isSubmitting ? 'กำลังส่งคำขอ...' : 'ยืนยันการยืม'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}