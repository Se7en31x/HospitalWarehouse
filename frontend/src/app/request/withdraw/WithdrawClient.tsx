"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, ShoppingCart, X, PackagePlus } from 'lucide-react';
import { UiItem, getItemOptions, ItemOptions, getInventoryItems } from '@/services/itemsService';
import { createRequisition, RequisitionPayload } from '@/services/requisitionService';
import { useAuth } from '../../hooks/useAuth';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface Props {
  initialItems: UiItem[];
}

interface CartItem extends UiItem {
  quantity: number;
}

export default function WithdrawClient({ initialItems }: Props) {
  const { departments, isLoaded: isAuthLoaded } = useAuth();

  const [items, setItems] = useState<UiItem[]>(initialItems || []);
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedUnit, setSelectedUnit] = useState('ทั้งหมด');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCartModal, setShowCartModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [options, setOptions] = useState<ItemOptions>({ category: [], unit: [], warehouse: [] });
  const [isMounted, setIsMounted] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedCart = localStorage.getItem('withdraw_cart');
    if (savedCart) {
      try { setSelectedItems(JSON.parse(savedCart)); } catch (e) { console.error(e); }
    }
    const loadData = async () => {
      const [opt, itm] = await Promise.all([getItemOptions(), getInventoryItems()]);
      setOptions(opt);
      setItems(itm);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isAuthLoaded && departments.length > 0 && !selectedDeptId) {
      const savedDept = localStorage.getItem('withdraw_dept');
      if (savedDept && departments.some(d => d.code === savedDept)) {
        setSelectedDeptId(savedDept);
      } else if (departments.length === 1) {
        setSelectedDeptId(departments[0].code);
      }
    }
  }, [isAuthLoaded, departments, selectedDeptId]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('withdraw_cart', JSON.stringify(selectedItems));
      localStorage.setItem('withdraw_dept', selectedDeptId);
    }
  }, [selectedItems, selectedDeptId, isMounted]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCat = selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
      const matchesUnit = selectedUnit === 'ทั้งหมด' || item.unit === selectedUnit;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesUnit && matchesSearch;
    });
  }, [items, selectedCategory, selectedUnit, searchTerm]);

  const displayItems = useMemo(() => {
    const start = (currentPage - 1) * 10;
    return filteredItems.slice(start, start + 10);
  }, [filteredItems, currentPage]);

  const addToCart = (item: UiItem) => {
    const qty = quantities[item.id] || 1;
    if (qty <= 0 || qty > item.stock) {
      MySwal.fire({ icon: 'error', title: 'สินค้าไม่พอ', timer: 1000, showConfirmButton: false });
      return;
    }
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 300);
    setSelectedItems(prev => {
      const exist = prev.find(i => i.id === item.id);
      if (exist) {
        const newQty = exist.quantity + qty;
        return newQty > item.stock ? prev : prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
      }
      return [...prev, { ...item, quantity: qty }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.id === id) {
        const n = i.quantity + delta;
        const stock = items.find(orig => orig.id === id)?.stock || 0;
        if (n > 0 && n <= stock) return { ...i, quantity: n };
      }
      return i;
    }));
  };

  // --- ฟังก์ชันส่งข้อมูลที่ปรับแก้ตาม Token ---
  const handleSubmit = async () => {
    if (!selectedDeptId || selectedItems.length === 0) {
      MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกแผนกและสินค้า' });
      return;
    };

    // ค้นหาชื่อแผนกจาก Code ที่เลือก
    const currentDept = departments.find(d => d.code === selectedDeptId);
    const deptName = currentDept ? currentDept.name : "แผนกทั่วไป";

    setShowCartModal(false);
    
    const confirm = await MySwal.fire({
      title: 'ยืนยันการส่งใบเบิก?',
      html: `เบิกในนามแผนก: <b class="text-indigo-600">${deptName}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      reverseButtons: true
    });

    if (!confirm.isConfirmed) { setShowCartModal(true); return; }

    setIsSubmitting(true);
    try {
      const payload: RequisitionPayload = {
        type: 'WITHDRAW',
        department_id: selectedDeptId,    // เช่น "01"
        department_name: deptName,        // เช่น "ฉุกเฉิน" (เก็บลง DB Snapshot)
        items: selectedItems.map(i => ({ item_id: Number(i.id), qty: i.quantity })),
        note: "เบิกออนไลน์ผ่านระบบ"
      };

      const res = await createRequisition(payload);
      if (res.success) {
        await MySwal.fire({ icon: 'success', title: 'สำเร็จ', text: 'ส่งใบเบิกเรียบร้อย', timer: 1500 });
        setSelectedItems([]);
        localStorage.removeItem('withdraw_cart');
      } else throw new Error(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      await MySwal.fire({ icon: 'error', title: 'ผิดพลาด', text: msg });
      setShowCartModal(true);
    } finally { setIsSubmitting(false); }
  };

  if (!isMounted) return null;

  return (
    <div className="w-full bg-slate-50 min-h-screen p-4 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cart-bounce { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } .animate-bounce-custom { animation: cart-bounce 0.3s ease-in-out; }` }} />

      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white"><PackagePlus size={20} /></div>
          <h1 className="text-lg font-bold text-slate-800">เบิกพัสดุ</h1>
        </div>
        <button onClick={() => setShowCartModal(true)} className={`bg-slate-900 text-white px-5 py-2 rounded-lg flex items-center gap-2 relative transition-transform active:scale-95 ${isCartBouncing ? 'animate-bounce-custom' : ''}`}>
          <ShoppingCart size={18} />
          <span className="text-sm font-bold">ตะกร้า ({selectedItems.length})</span>
        </button>
      </div>

      {/* Filters... (เหมือนเดิม) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="ค้นหาชื่อหรือรหัส..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="ทั้งหมด">ทุกหมวดหมู่</option>
          {options.category.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="ทั้งหมด">ทุกหน่วย</option>
          {options.unit.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
      </div>

      {/* Table... (เหมือนเดิม) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-slate-500 text-[11px] font-bold uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">รหัสพัสดุ</th>
                <th className="px-4 py-3">ชื่อรายการ</th>
                <th className="px-4 py-3 text-center">คงเหลือ</th>
                <th className="px-4 py-3 text-center w-[120px]">จำนวน</th>
                <th className="px-4 py-3 w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 h-[58px]">
                  <td className="px-4 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-4 font-mono text-xs font-bold">{item.code}</td>
                  <td className="px-4 text-sm font-semibold">{item.name}</td>
                  <td className="px-4 text-center text-sm font-bold">{item.stock} {item.unit}</td>
                  <td className="px-4 text-center">
                    <input type="number" className="w-16 p-1 border rounded text-center font-bold" value={quantities[item.id] || 1} onChange={(e) => setQuantities({ ...quantities, [item.id]: parseInt(e.target.value) || 0 })} />
                  </td>
                  <td className="px-4 text-right">
                    <button onClick={() => addToCart(item)} disabled={item.stock <= 0} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-slate-900 disabled:opacity-30"><Plus size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center rounded-t-xl">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={18} className="text-indigo-600" /> ตะกร้าของฉัน</h2>
              <button onClick={() => setShowCartModal(false)} className="text-slate-400 hover:text-rose-500"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {/* ✅ ส่วนเลือกแผนกที่ดึงมาจาก Token (ฉุกเฉิน, ชีวาภิบาล, เวชระเบียน) */}
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">ระบุแผนกที่เบิก</label>
                <select 
                  value={selectedDeptId} 
                  onChange={(e) => setSelectedDeptId(e.target.value)} 
                  className="w-full p-2 bg-white border border-slate-200 rounded font-bold text-sm"
                >
                  <option value="">-- กรุณาเลือกแผนก --</option>
                  {departments.map(d => (
                    <option key={d.code} value={d.code}>แผนก{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="text-sm font-bold">{item.name}</div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-white p-1 rounded border">
                        <button onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-rose-500"><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowCartModal(false)} className="text-xs font-bold text-slate-500">ยกเลิก</button>
              <button 
                onClick={handleSubmit} 
                disabled={!selectedDeptId || selectedItems.length === 0 || isSubmitting} 
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 disabled:opacity-40"
              >
                {isSubmitting ? 'กำลังส่ง...' : 'ยืนยันใบเบิก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}