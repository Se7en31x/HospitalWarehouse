"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Save, ArrowLeft, Search, Plus, Trash2,
  Calendar, User, FileText, CheckCircle, AlertTriangle
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// --- Types ---
interface StockItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  poQty: number;      // ยอดสั่งซื้อ
  receiveQty: number; // ยอดรับจริง
  unitPrice: number;
  lotNo: string;
  expDate: string;
  totalPrice: number;
}

export default function StockInCreateClient() {
  const router = useRouter();
  
  // --- States ---
  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Logic: จำลองดึงข้อมูล PO ---
  const handleLoadPO = () => {
    if (!poNumber) return toast.error("กรุณาระบุเลขที่ใบสั่งซื้อ (PO)");
    
    setIsLoading(true);
    // Simulation API Delay
    setTimeout(() => {
        setSupplierName("บริษัท เมดิคอล ซัพพลาย จำกัด");
        setItems([
            { id: "1", code: "MED-001", name: "Paracetamol 500mg", unit: "กล่อง", poQty: 100, receiveQty: 100, unitPrice: 250, lotNo: "", expDate: "", totalPrice: 25000 },
            { id: "2", code: "SUR-Mask", name: "หน้ากากอนามัย 3 ชั้น", unit: "ลัง", poQty: 50, receiveQty: 50, unitPrice: 1500, lotNo: "", expDate: "", totalPrice: 75000 },
        ]);
        setIsLoading(false);
        toast.success("ดึงข้อมูล PO สำเร็จ");
    }, 800);
  };

  // --- Logic: คำนวณเงิน ---
  const updateItem = (id: string, field: keyof StockItem, value: any) => {
    setItems(prev => prev.map(item => {
        if (item.id === id) {
            const updated = { ...item, [field]: value };
            // Auto calculate total price per row
            if (field === 'receiveQty' || field === 'unitPrice') {
                updated.totalPrice = updated.receiveQty * updated.unitPrice;
            }
            return updated;
        }
        return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const calculateTotal = () => {
    const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return total;
  };

  const handleSubmit = () => {
    // Validation logic here
    toast.success("บันทึกการรับเข้าเรียบร้อย");
    // router.push('/warehouse/stock-in');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <Toaster position="top-right" />

      {/* --- 1. Header (Style เหมือน LotClient) --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-white rounded-xl shadow-sm p-6 gap-4 border border-gray-100">
        <div>
           {/* ปุ่มย้อนกลับ */}
           <button 
             onClick={() => router.back()}
             className="flex items-center gap-1 text-gray-400 hover:text-gray-600 mb-2 text-sm transition-colors"
           >
             <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
           </button>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
             <div className="p-2 bg-indigo-50 rounded-lg">
                <Package className="w-8 h-8 text-indigo-600" />
             </div>
             บันทึกรับสินค้าเข้า (Stock In)
           </h1>
           <p className="text-gray-500 text-sm mt-1 ml-14">สร้างรายการรับของจากการสั่งซื้อ หรือ รับบริจาค</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right mr-4 hidden md:block">
            <div className="text-sm text-gray-500">ยอดรวมสุทธิ</div>
            <div className="text-2xl font-bold text-indigo-600">฿{calculateTotal().toLocaleString()}</div>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> บันทึกรับเข้า
          </button>
        </div>
      </header>

      {/* --- 2. Document Info Card (Style เหมือน Filter Bar) --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" /> ข้อมูลเอกสาร
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* PO Search */}
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบสั่งซื้อ (PO)</label>
                <div className="relative flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            placeholder="ค้นหา PO..." 
                            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                    </div>
                    <button 
                        onClick={handleLoadPO}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
                    >
                        ดึงข้อมูล
                    </button>
                </div>
            </div>

            {/* Supplier (Read Only) */}
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จำหน่าย</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input 
                        type="text" 
                        readOnly
                        value={supplierName}
                        placeholder="ระบบจะแสดงชื่อผู้จำหน่ายอัตโนมัติ" 
                        className={`w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none ${supplierName ? 'bg-indigo-50/50 text-indigo-900 font-medium' : 'bg-gray-50 text-gray-500'}`} 
                    />
                    {supplierName && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                </div>
            </div>

             {/* Invoice No */}
             <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบส่งของ <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="ระบุเลขที่บิล" 
                    className="w-full rounded-lg border border-gray-200 py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
             {/* Date */}
             <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับของ</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={docDate}
                        onChange={(e) => setDocDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600" 
                    />
                </div>
            </div>
            {/* Note */}
            <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <input 
                    type="text" 
                    placeholder="รายละเอียดเพิ่มเติม..." 
                    className="w-full rounded-lg border border-gray-200 py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
            </div>
        </div>
      </div>

      {/* --- 3. Items Table (Style เหมือน Lot Table) --- */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
        {/* Table Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <h3 className="text-lg font-bold text-gray-800">รายการสินค้า</h3>
             <button className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> เพิ่มสินค้าเอง
             </button>
        </div>

        <div className="overflow-x-auto flex-grow">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium uppercase text-xs border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 w-[5%] text-center">#</th>
                        <th className="px-6 py-4 w-[25%]">สินค้า</th>
                        <th className="px-6 py-4 w-[10%] text-center">สั่งซื้อ</th>
                        <th className="px-6 py-4 w-[12%] text-center">รับจริง</th>
                        <th className="px-6 py-4 w-[10%]">หน่วย</th>
                        <th className="px-6 py-4 w-[15%]">Lot No.</th>
                        <th className="px-6 py-4 w-[13%]">วันหมดอายุ</th>
                        <th className="px-6 py-4 w-[5%] text-center">ลบ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.length > 0 ? (
                        items.map((item, index) => (
                            <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 text-gray-500 font-mono text-center">{index + 1}</td>
                                
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{item.code}</div>
                                </td>

                                <td className="px-6 py-4 text-center">
                                    <span className="inline-block px-3 py-1 bg-gray-100 rounded-full font-bold text-gray-600 text-xs">
                                        {item.poQty}
                                    </span>
                                </td>

                                <td className="px-6 py-4 text-center">
                                    <input 
                                        type="number"
                                        value={item.receiveQty}
                                        onChange={(e) => updateItem(item.id, 'receiveQty', Number(e.target.value))}
                                        className="w-20 text-center rounded border border-indigo-200 bg-indigo-50/50 py-1.5 text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </td>

                                <td className="px-6 py-4 text-gray-500">{item.unit}</td>

                                <td className="px-6 py-4">
                                    <input 
                                        type="text"
                                        value={item.lotNo}
                                        onChange={(e) => updateItem(item.id, 'lotNo', e.target.value)}
                                        placeholder="Lot No."
                                        className={`w-full rounded border py-1.5 px-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase ${!item.lotNo ? 'border-red-200 bg-red-50 placeholder:text-red-300' : 'border-gray-200'}`}
                                    />
                                </td>

                                <td className="px-6 py-4">
                                    <input 
                                        type="date"
                                        value={item.expDate}
                                        onChange={(e) => updateItem(item.id, 'expDate', e.target.value)}
                                        className={`w-full rounded border py-1.5 px-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600 ${!item.expDate ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                                    />
                                </td>

                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => removeItem(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                <Package className="w-12 h-12 text-gray-300" />
                                <p>ยังไม่มีรายการสินค้า</p>
                                <p className="text-sm text-gray-400">กรุณาค้นหา PO เพื่อดึงรายการสินค้า</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}