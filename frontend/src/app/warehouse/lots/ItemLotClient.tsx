"use client";

import React, { useState, useEffect } from "react";
import {
  Layers, Search, Download,
  Wrench, Trash2, Copy,
  ChevronLeft, ChevronRight, Package,
  MapPin, Tag, X, Save,
  Calendar, ArrowRight,
  TrendingUp, TrendingDown,
  Loader2 // ✅ เพิ่ม icon หมุนๆ
} from "lucide-react";
import Swal from "sweetalert2"; 

// ✅ Import Service
import { createLot, deleteLot, getLots, adjustLot, getMasterSuppliers } from "@/services/lot.service";
import { getInventoryItems, getItemOptions } from "@/services/inventoryService"; 
import * as LotInterface from "@/app/interfaces/lot.interface";
import * as ItemInterface from "@/app/interfaces/item.interface";

// --- Interfaces ---
interface CreateLotFormData {
  item_id: string | number;
  warehouse_id: string | number;
  supplier_id: string | number;
  quantity: number;
  cost_price: number;
  expried_at: string;
  status: string;
}

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateLotFormData) => void;
  itemsList: ItemInterface.UiItem[];
  warehousesList: ItemInterface.Option[]; 
  suppliersList: LotInterface.MasterSupplier[];
  isSaving: boolean; // ✅ เพิ่ม Prop รับสถานะกำลังบันทึก
}

interface AdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newQty: number, reason: string) => void;
  lot: LotInterface.UiLot | null;
  isAdjusting: boolean; // ✅ เพิ่ม Prop รับสถานะกำลังบันทึก
}

interface LotClientProps {
  initialLots: LotInterface.UiLot[];
  initialItems: ItemInterface.UiItem[];
  initialWarehouses: ItemInterface.Option[];
  initialSuppliers: LotInterface.MasterSupplier[];
}

// =======================
// 1. Adjust Modal (Update)
// =======================
const AdjustLotModal = ({ isOpen, onClose, onConfirm, lot, isAdjusting }: AdjustModalProps) => {
  const [newQty, setNewQty] = useState<number>(0);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (isOpen && lot) {
      setNewQty(lot.quantity);
      setReason("");
    }
  }, [isOpen, lot]);

  if (!isOpen || !lot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdjusting) return; // ✅ กันกดเบิ้ล
    onConfirm(newQty, reason);
  };

  const diff = newQty - lot.quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex justify-between items-center text-white shadow-md">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5" /> ปรับปรุงยอดคงเหลือ (Stock Adjust)
          </h2>
          {/* ✅ Disable ปุ่มปิดขณะบันทึก */}
          <button onClick={onClose} disabled={isAdjusting} className="hover:bg-white/20 p-1.5 rounded-full transition duration-200 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-blue-900 shadow-sm border border-blue-100 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base line-clamp-1">{lot.itemName}</h3>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono">Lot: {lot.id}</span>
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{lot.warehouse}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="block text-xs text-gray-500 mb-1">ยอดเดิม</span>
              <span className="text-xl font-bold text-gray-700">{lot.quantity.toLocaleString()}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="relative">
              <span className="absolute -top-2.5 left-2 bg-white px-1 text-xs font-medium text-blue-700">ยอดใหม่</span>
              <input required type="number" min="0" value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} className="w-full border-2 border-blue-100 rounded-lg px-3 py-3 text-center text-xl font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
            </div>
          </div>
          {diff !== 0 ? (
             <div className={`flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg ${diff > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {diff > 0 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                <span>{diff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} {Math.abs(diff).toLocaleString()} {lot.unit}</span>
             </div>
          ) : (
             <div className="text-center text-sm text-gray-400 py-2">ยังไม่มีการเปลี่ยนแปลงยอด</div>
          )}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">สาเหตุการปรับปรุง <span className="text-red-500">*</span></label>
              <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุสาเหตุ เช่น นับสต็อกใหม่, สินค้าชำรุด, ตัดยอดผิด..." className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow" />
          </div>
          <div className="flex gap-3 mt-2 pt-2">
            <button type="button" onClick={onClose} disabled={isAdjusting} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">ยกเลิก</button>
            
            {/* ✅ ปุ่ม Submit กันเบิ้ล */}
            <button type="submit" disabled={isAdjusting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-md transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                {isAdjusting ? (
                    <> <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก... </>
                ) : (
                    <> <Save className="w-4 h-4" /> บันทึกผล </>
                )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =======================
// 2. Create Modal
// =======================
const LotModal = ({ isOpen, onClose, onSave, itemsList, warehousesList, suppliersList, isSaving }: CreateModalProps) => {
  const [formData, setFormData] = useState<CreateLotFormData>({
    item_id: "", warehouse_id: "", supplier_id: "", quantity: 0, cost_price: 0, expried_at: new Date().toISOString().split('T')[0], status: "ACTIVE"
  });

  // Reset form when opened
  useEffect(() => {
      if(isOpen) {
        setFormData({
            item_id: "", warehouse_id: "", supplier_id: "", quantity: 0, cost_price: 0, expried_at: new Date().toISOString().split('T')[0], status: "ACTIVE"
        });
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // ✅ กันกดเบิ้ล
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-blue-900 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold flex items-center gap-2"><Package className="w-5 h-5" /> รับของเข้า (Add New Lot)</h2>
          <button onClick={onClose} disabled={isSaving} className="hover:bg-blue-800 p-1 rounded-full transition disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า <span className="text-red-500">*</span></label>
            <select required name="item_id" value={formData.item_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">-- เลือกสินค้า --</option>
              {itemsList.map(item => (<option key={item.id} value={item.id}>{item.code} : {item.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คลังสินค้า <span className="text-red-500">*</span></label>
            <select required name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">-- เลือกคลัง --</option>
              {warehousesList.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จำหน่าย</label>
            <select name="supplier_id" value={formData.supplier_id} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">-- ไม่ระบุ --</option>
              {suppliersList.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนรับเข้า <span className="text-red-500">*</span></label>
            <input required name="quantity" type="number" min="1" value={formData.quantity || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ราคาทุนต่อหน่วย</label>
            <input required name="cost_price" type="number" min="0" step="0.01" value={formData.cost_price || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">วันหมดอายุ <span className="text-red-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required name="expried_at" type="date" value={formData.expried_at} onChange={handleChange} className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">ยกเลิก</button>
            
            {/* ✅ ปุ่ม Submit กันเบิ้ล */}
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed">
                {isSaving ? (
                    <> <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก... </>
                ) : (
                    <> <Save className="w-4 h-4" /> บันทึกรับเข้า </>
                )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =======================
// 4. Main Client Component
// =======================
export default function LotClient({ 
  initialLots, initialItems, initialWarehouses, initialSuppliers 
}: LotClientProps) {

  const [lots, setLots] = useState<LotInterface.UiLot[]>(initialLots);
  const [itemsMaster, setItemsMaster] = useState<ItemInterface.UiItem[]>(initialItems);
  const [warehousesMaster, setWarehousesMaster] = useState<ItemInterface.Option[]>(initialWarehouses);
  const [suppliersMaster, setSuppliersMaster] = useState<LotInterface.MasterSupplier[]>(initialSuppliers);
  const [loading, setLoading] = useState(false);

  // ✅ เพิ่ม Loading State สำหรับการกระทำต่างๆ
  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingLot, setAdjustingLot] = useState<LotInterface.UiLot | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("ทั้งหมด");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAllData = async () => {
    setLoading(true);
    try {
        const [lotsData, itemsData, optionsData, supData] = await Promise.all([
            getLots(),
            getInventoryItems(),
            getItemOptions(),
            getMasterSuppliers()
        ]);

        setLots(lotsData);
        // เช็คว่า itemsData มีค่าไหม
        if(itemsData && itemsData.length > 0) setItemsMaster(itemsData);
        if(optionsData?.warehouse) setWarehousesMaster(optionsData.warehouse);
        if(supData) setSuppliersMaster(supData);
    } catch (error) {
        console.error("Failed to fetch data", error);
    } finally {
        setLoading(false);
    }
  };

  // ✅ useEffect: ถ้า items ว่างให้โหลดใหม่ทันที (แก้ปัญหาข้อมูลไม่โหลด)
  useEffect(() => {
     const isItemsMissing = !itemsMaster || itemsMaster.length === 0;
     const isWarehousesMissing = !warehousesMaster || warehousesMaster.length === 0;

     if (isItemsMissing || isWarehousesMissing) {
         console.log("Data missing, fetching...");
         fetchAllData();
     }
  }, []);

  const handleSaveLot = async (formData: CreateLotFormData) => {
    // ✅ เริ่มต้นสถานะ Loading
    setIsSaving(true);
    
    const payload: LotInterface.CreateLotDto = {
        item_id: Number(formData.item_id),
        warehouse_id: Number(formData.warehouse_id),
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
        quantity: Number(formData.quantity),
        cost_price: Number(formData.cost_price),
        expried_at: new Date(formData.expried_at).toISOString(),
    };

    try {
        const result = await createLot(payload);
        if (result.success) {
            await fetchAllData(); 
            setIsCreateModalOpen(false);
            Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'รับของเข้าเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message || 'บันทึกไม่สำเร็จ' });
    } finally {
        // ✅ ปิดสถานะ Loading ไม่ว่าจะสำเร็จหรือล้มเหลว
        setIsSaving(false);
    }
  };

  const openAdjustModal = (lot: LotInterface.UiLot) => {
    setAdjustingLot(lot);
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (newQty: number, reason: string) => {
    if (!adjustingLot) return;
    
    // ✅ เริ่มต้นสถานะ Loading
    setIsAdjusting(true);

    try {
        const result = await adjustLot(adjustingLot.id, {
            new_quantity: newQty,
            reason: reason,
            user_name: "Admin" 
        });

        if (result.success) {
            await fetchAllData();
            setIsAdjustModalOpen(false);
            setAdjustingLot(null);
            Swal.fire({ icon: 'success', title: 'ปรับยอดสำเร็จ', text: `ปรับยอดสินค้าเรียบร้อยแล้ว`, timer: 1500, showConfirmButton: false });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        Swal.fire({ icon: 'error', title: 'ปรับยอดไม่สำเร็จ', text: error.message });
    } finally {
        // ✅ ปิดสถานะ Loading
        setIsAdjusting(false);
    }
  };

  const handleDelete = async (lotCode: string) => {
    const confirmResult = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `คุณต้องการลบ Lot: ${lotCode} ใช่หรือไม่? สต็อกจะถูกตัดออกตามจำนวนคงเหลือ`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก'
    });

    if (confirmResult.isConfirmed) {
        // ให้ Swal ขึ้น Loading หน่อยก็ดีถ้าลบนาน (Optional)
        Swal.showLoading();
        try {
            const success = await deleteLot(lotCode);
            if (success) {
                setLots(prev => prev.filter(l => l.id !== lotCode));
                Swal.fire('ลบสำเร็จ!', 'ข้อมูล Lot ถูกลบเรียบร้อยแล้ว', 'success');
            } else {
                throw new Error("ลบไม่สำเร็จ");
            }
        } catch (error) {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
        }
    }
  };

  // ... (Calculation & Rendering Logic เดิม) ...
  const calculateStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return "ปกติ";
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return "หมดอายุ";
    if (diffDays <= 30) return "ใกล้หมด"; 
    return "ปกติ";
  };

  const filteredData = lots.filter(lot => {
    const currentStatus = calculateStatus(lot.expiryDate);
    const searchLower = searchTerm.toLowerCase();
    const name = lot.itemName || "";
    const id = lot.id || "";
    const code = lot.itemCode || "";
    const matchesSearch = name.toLowerCase().includes(searchLower) || id.toLowerCase().includes(searchLower) || code.toLowerCase().includes(searchLower);
    const matchesWarehouse = selectedWarehouse === "ทั้งหมด" || lot.warehouse === selectedWarehouse;
    const matchesCategory = selectedCategory === "ทั้งหมด" || lot.category === selectedCategory;
    let matchesStatus = true;
    if (statusFilter === 'NEAR') matchesStatus = currentStatus === 'ใกล้หมด';
    if (statusFilter === 'EXPIRED') matchesStatus = currentStatus === 'หมดอายุ';
    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(val);
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-800">
      
      <LotModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSave={handleSaveLot} 
        itemsList={itemsMaster} 
        warehousesList={warehousesMaster} 
        suppliersList={suppliersMaster}
        isSaving={isSaving} // ✅ ส่ง props สถานะ
      />

      <AdjustLotModal 
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={handleConfirmAdjust}
        lot={adjustingLot}
        isAdjusting={isAdjusting} // ✅ ส่ง props สถานะ
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <Layers className="text-blue-900 w-7 h-7" /> จัดการ Lot สินค้า
           </h1>
           <p className="text-sm text-gray-500 mt-1">บริหารจัดการวันหมดอายุและสถานะสินค้าคงคลัง</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 shadow-sm transition flex items-center gap-2">
            + รับของเข้า
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="ค้นหา Lot, รหัสยา, ชื่อสินค้า..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="lg:col-span-2 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <select className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 text-sm outline-none bg-white appearance-none text-gray-700 cursor-pointer" value={selectedWarehouse} onChange={(e) => { setSelectedWarehouse(e.target.value); setCurrentPage(1); }}>
                    <option value="ทั้งหมด">ทุกคลังสินค้า</option>
                    {warehousesMaster.map((wh) => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                </select>
            </div>
            <div className="lg:col-span-2 relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <select className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 text-sm outline-none bg-white appearance-none text-gray-700 cursor-pointer" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
                    <option value="ทั้งหมด">ทุกหมวดหมู่</option>
                    {Array.from(new Set(itemsMaster.map(i => i.category))).map(catName => <option key={catName} value={catName}>{catName}</option>)}
                </select>
            </div>
            <div className="lg:col-span-4 flex justify-start lg:justify-end">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                   <button onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }} className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'ALL' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>ทั้งหมด</button>
                   <button onClick={() => { setStatusFilter('NEAR'); setCurrentPage(1); }} className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'NEAR' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>ใกล้หมด</button>
                   <button onClick={() => { setStatusFilter('EXPIRED'); setCurrentPage(1); }} className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'EXPIRED' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>หมดอายุ</button>
                </div>
            </div>
         </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-800 font-semibold text-sm border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-center w-[60px]">รูป</th>
                <th className="px-4 py-3">สินค้า (ชื่อ / รหัส)</th> 
                <th className="px-4 py-3 w-[120px]">ประเภท</th> 
                <th className="px-4 py-3 w-[180px]">เลข Lot</th>
                <th className="px-4 py-3 w-[160px]">คลังสินค้า</th>
                <th className="px-4 py-3 w-[120px]">วันหมดอายุ</th>
                <th className="px-4 py-3 w-[100px] text-right">ราคาทุน</th>
                <th className="px-4 py-3 w-[150px] text-center">คงเหลือ</th>
                <th className="px-4 py-3 w-[100px] text-center">สถานะ</th>
                <th className="px-4 py-3 w-[100px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                 <tr><td colSpan={10} className="py-20 text-center"><div className="flex justify-center items-center gap-2"><Loader2 className="w-6 h-6 animate-spin text-blue-900"/> กำลังโหลดข้อมูล...</div></td></tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((lot, idx) => {
                  const currentStatus = calculateStatus(lot.expiryDate);
                  return (
                    <tr key={lot.id || idx} className="hover:bg-blue-50/40 transition-colors h-[72px]">
                      <td className="px-4 py-3 text-center"><div className="w-10 h-10 bg-gray-50 rounded-md flex items-center justify-center mx-auto text-gray-400 border border-gray-100 shrink-0"><Package className="w-5 h-5" /></div></td>
                      <td className="px-4 py-3"><div className="flex flex-col justify-center"><span className="font-medium text-gray-900 text-base line-clamp-1" title={lot.itemName}>{lot.itemName}</span><span className="text-xs font-mono text-gray-500 mt-1">{lot.itemCode}</span></div></td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">{lot.category}</span></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2 group"><span className="font-mono text-gray-700 text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">{lot.id}</span><button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition" onClick={() => navigator.clipboard.writeText(lot.id)}><Copy className="w-3.5 h-3.5" /></button></div></td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{lot.warehouse}</td>
                      <td className={`px-4 py-3 ${currentStatus === 'หมดอายุ' ? 'text-red-600 font-medium' : currentStatus === 'ใกล้หมด' ? 'text-orange-600' : 'text-gray-600'}`}>{formatDate(lot.expiryDate)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">{formatMoney(lot.cost)}</td>
                      <td className="px-4 py-3 text-center"><div className="flex flex-col items-center"><span className="text-gray-900 text-base font-bold">{lot.quantity.toLocaleString()}</span><span className="text-gray-400 text-[10px] leading-tight">{lot.unit}</span></div></td>
                      <td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${currentStatus === 'ปกติ' ? 'bg-green-50 text-green-700 border-green-200' : currentStatus === 'หมดอายุ' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{currentStatus}</span></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openAdjustModal(lot)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="ปรับยอด"><Wrench className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(lot.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={10} className="py-24 text-center text-gray-400 flex flex-col items-center justify-center w-full"><Package className="w-12 h-12 text-gray-200 mb-2" /><span>ไม่พบข้อมูล</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600 sticky bottom-0 z-10">
           <div>แสดง {filteredData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filteredData.length)} จาก {filteredData.length} รายการ</div>
           <div className="flex items-center gap-2">
             <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 transition"><ChevronLeft className="w-4 h-4" /></button>
             <span className="px-2 font-medium">หน้า {currentPage} / {totalPages || 1}</span>
             <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 transition"><ChevronRight className="w-4 h-4" /></button>
           </div>
        </div>
      </div>
    </div>
  );
}