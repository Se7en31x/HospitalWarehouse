"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, Package, Plus, Minus, ShoppingCart, 
  Clock, X, ChevronLeft, ChevronRight, PackagePlus, 
  HandHelping, RefreshCw 
} from 'lucide-react';
import { UiItem } from '@/services/itemsService';

interface Props {
  initialItems: UiItem[];
}

interface CartItem extends UiItem {
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

export default function BorrowClient({ initialItems }: Props) {
  // --- State ---
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCartModal, setShowCartModal] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  // State ยืม/คืน
  const [globalReturnDate, setGlobalReturnDate] = useState(''); 
  const [activeTab, setActiveTab] = useState<'BORROW' | 'RETURN'>('BORROW');
  
  // Mock Data ประวัติการยืม (สำหรับการคืน)
  const [history, setHistory] = useState<BorrowHistory[]>([
      { id: 'REQ-001', itemId: '1', itemName: 'เครื่องวัดความดัน', quantity: 1, borrowDate: '2025-12-20', returnDate: '2025-12-25', status: 'BORROWED' }
  ]);
  const [returnId, setReturnId] = useState('');
  const [returnQty, setReturnQty] = useState(1);

  const itemsPerPage = 10;

  // --- Logic ---
  const categories = useMemo(() => ['ทั้งหมด', ...Array.from(new Set(initialItems.map(i => i.category || 'ไม่ระบุ')))], [initialItems]);

  const filteredItems = useMemo(() => {
    return initialItems.filter(item => {
      const matchesCategory = selectedCategory === 'ทั้งหมด' || (item.category || 'ไม่ระบุ') === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [initialItems, selectedCategory, searchTerm]);

  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // --- Actions ---
  const addToCart = (item: UiItem) => {
    if (!globalReturnDate) { alert("กรุณาระบุวันที่คืนก่อนเลือกสินค้า"); return; }
    const qty = quantities[item.id] || 1;
    
    if (qty > item.stock) { alert("จำนวนเกินสต็อกคงเหลือ"); return; }

    setSelectedItems(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
        return [...prev, { ...item, quantity: qty, returnDate: globalReturnDate }];
    });
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const removeFromCart = (id: string) => setSelectedItems(prev => prev.filter(i => i.id !== id));
  
  const updateCartQuantity = (id: string, delta: number) => {
      setSelectedItems(prev => prev.map(item => {
          if (item.id === id) {
             const newQty = item.quantity + delta;
             if (newQty > 0 && newQty <= item.stock) return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const submitBorrow = () => {
    if (selectedItems.length === 0) return;
    alert(`ส่งคำขอยืมเรียบร้อย! คืนวันที่: ${globalReturnDate}`);
    setSelectedItems([]);
    setGlobalReturnDate('');
    setShowCartModal(false);
  };

  const submitReturn = () => {
    if (!returnId) return;
    setHistory(prev => prev.map(h => h.id === returnId ? { ...h, status: 'RETURNED' } : h));
    alert("บันทึกการคืนสำเร็จ");
    setReturnId('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <HandHelping className="w-8 h-8 text-indigo-600 bg-indigo-50 p-1.5 rounded-lg" />
                    ระบบยืม-คืน ครุภัณฑ์
                </h2>
                <p className="text-gray-500 text-sm mt-1 ml-10">เลือกรายการครุภัณฑ์ที่ต้องการยืม และระบุวันส่งคืน</p>
            </div>
            <button
                onClick={() => setShowCartModal(true)}
                className="relative bg-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-md hover:bg-indigo-700 transition flex items-center gap-2 active:scale-95"
            >
                <ShoppingCart className="w-5 h-5" />
                จัดการยืม/คืน
                {selectedItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-xs w-6 h-6 flex items-center justify-center rounded-full border-2 border-white font-bold">{selectedItems.length}</span>
                )}
            </button>
        </div>

        {/* Global Controls */}
        <div className="flex flex-col lg:flex-row gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 items-center">
            <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="ค้นหารหัส, ชื่อครุภัณฑ์..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-indigo-200">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex gap-1">
                        <Clock className="w-4 h-4 text-indigo-500" /> วันที่คืน:
                    </label>
                    <input 
                        type="date" 
                        className="outline-none text-gray-600 text-sm"
                        value={globalReturnDate}
                        onChange={(e) => setGlobalReturnDate(e.target.value)}
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                    className="px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[150px]"
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                        <th className="py-4 px-6 w-[5%]">#</th>
                        <th className="py-4 px-6 w-[8%]">รูปภาพ</th>
                        <th className="py-4 px-6 w-[10%]">รหัส</th>
                        <th className="py-4 px-6 w-[20%]">ชื่อครุภัณฑ์</th>
                        <th className="py-4 px-6 w-[10%]">หมวดหมู่</th>
                        <th className="py-4 px-6 w-[10%] text-center">คงเหลือ</th>
                        <th className="py-4 px-6 w-[10%]">ตำแหน่ง</th>
                        <th className="py-4 px-6 w-[8%] text-center">สถานะ</th>
                        <th className="py-4 px-6 w-[12%] text-center">จำนวนยืม</th>
                        <th className="py-4 px-6 w-[7%] text-center"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {paginatedItems.length > 0 ? (
                        paginatedItems.map((item, index) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-6 text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td className="py-4 px-6">
                                    <div className="w-10 h-10 rounded bg-gray-100 border flex items-center justify-center overflow-hidden">
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </td>
                                <td className="py-4 px-6 font-mono text-slate-600">{item.code || '-'}</td>
                                <td className="py-4 px-6 font-medium text-slate-900">{item.name}</td>
                                <td className="py-4 px-6 text-slate-600">{item.category}</td>
                                <td className="py-4 px-6 text-center font-bold text-slate-700">
                                    {item.stock} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                                </td>
                                <td className="py-4 px-6 text-slate-600 text-xs">{item.location || '-'}</td>
                                <td className="py-4 px-6 text-center">
                                    {item.stock > 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">ปกติ</span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">หมด</span>
                                    )}
                                </td>
                                <td className="py-4 px-6">
                                    <input 
                                        type="number" 
                                        min={1}
                                        max={item.stock}
                                        className="w-full border border-gray-300 rounded-lg text-center py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                                        value={quantities[item.id] || 1}
                                        onChange={(e) => setQuantities(prev => ({...prev, [item.id]: Number(e.target.value)}))}
                                        disabled={item.stock <= 0}
                                    />
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <button 
                                        onClick={() => addToCart(item)}
                                        disabled={item.stock <= 0}
                                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm"
                                        title="เพิ่มลงตะกร้า"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={10} className="text-center py-16 text-gray-400">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                ไม่พบรายการครุภัณฑ์
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Pagination Footer */}
        {filteredItems.length > 0 && (
            <div className="flex justify-between items-center py-4 px-6 border-t border-gray-200 bg-gray-50">
                <span className="text-sm text-slate-600">แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ</span>
                <div className="flex gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="px-3 py-1.5 text-sm font-medium text-gray-600">หน้า {currentPage} / {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
        )}
      </div>

      {/* Modal: ยืม / คืน */}
      {showCartModal && (
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
      )}

    </div>
  );
}