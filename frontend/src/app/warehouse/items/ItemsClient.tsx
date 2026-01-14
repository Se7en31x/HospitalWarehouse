"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import toast, { Toaster } from "react-hot-toast";
import {
  PackagePlus, Search, Edit, Package,
  ChevronLeft, ChevronRight, X, Upload,
  Trash2, Loader2
} from "lucide-react";

import * as ItemSvc from "@/services/inventoryService";
import * as Item from "../../interfaces/item.interface"; 
import { socket } from "../../utils/socket";

interface FormErrors {
  name?: string;
  category?: string;
  min_stock?: string;
  unit?: string;
  location?: string;
  imageUrl?: string;
}

interface FormDataFields {
  code: string;
  name: string;
  category_id: string; // เก็บเป็น string เพื่อผูกกับ <select>
  unit_id: string;
  warehouse_id: string;
  min_stock: number;
  status: string;
  imageUrl: string;
}

const INITIAL_FORM_DATA: FormDataFields = {
  code: "",
  name: "",
  category_id: "",
  unit_id: "",
  warehouse_id: "",
  min_stock: 0,
  status: "ปกติ",
  imageUrl: "",
};

// Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export default function ItemsClient({ initialItems }: { initialItems: Item.UiItem[] }) {
  // ✅ State สำหรับรายการสินค้า
  const [items, setItems] = useState<Item.UiItem[]>(initialItems || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // ✅ State สำหรับ Options (Dropdowns)
  const [options, setOptions] = useState<Item.AllOptions>({
    category: [],
    unit: [],
    warehouse: []
  });

  // --- [Data Fetching Logic] ---
  // ฟังก์ชันดึงข้อมูลใหม่ (ใช้ useCallback เพื่อให้เรียกซ้ำใน useEffect ได้โดยไม่ loop)
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems();
      setItems(data || []);
      // Optional: แจ้งเตือนเล็กๆ ว่าอัปเดตแล้ว (ถ้าต้องการ)
      // toast.success("อัปเดตข้อมูลล่าสุดแล้ว", { id: 'refresh-toast', duration: 2000 });
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Real-time Socket.io Connection (Updated)] ---
  useEffect(() => {
    // 1. เชื่อมต่อ Socket
    if (!socket.connected) socket.connect();

    // 2. ฟังก์ชันจัดการเมื่อได้รับสัญญาณ
    const handleRefreshSignal = (message: any) => {
      // เช็คว่าสัญญาณที่ส่งมาคือ 'ITEMS' (ตรงกับ req.io.emit ใน Backend)
      if (message === 'ITEMS') {
        console.log("⚡ Socket: Received Refresh Signal -> Reloading Data...");
        refreshData(); // <--- สั่งดึงข้อมูลใหม่ทันที
      }
    };

    // 3. ฟัง Event ชื่อ 'REFRESH_DATA'
    socket.on("REFRESH_DATA", handleRefreshSignal);

    // 4. Cleanup function เมื่อ Component ถูกทำลาย
    return () => {
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [refreshData]); // ใส่ refreshData เป็น dependency

  // --- [Initial Load Options] ---
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await ItemSvc.getItemOptions();
        setOptions(data || { category: [], unit: [], warehouse: [] });
      } catch (err) {
        console.error("Load options failed", err);
      }
    };
    fetchOptions();
    
    // โหลดข้อมูลใหม่หากไม่มีข้อมูลเริ่มต้น
    if (!initialItems || initialItems.length === 0) {
      refreshData();
    }
  }, [initialItems, refreshData]);

  // --- [Search & Filter States] ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item.UiItem | null>(null);
  const [formData, setFormData] = useState<FormDataFields>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Logic การ Filter
  const filterCategories = ["ทั้งหมด", ...(options.category || []).map(c => c.name)];
  
  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.code || "").toLowerCase().includes(term) ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term);
      
    const matchesCat = selectedCategory === "ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "ทั้งหมด" || item.status === selectedStatus;
    
    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- [Handlers] ---
  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.name) errors.name = "กรุณากรอกชื่อพัสดุ";
    if (!formData.category_id) errors.category = "กรุณาเลือกหมวดหมู่";
    if (!formData.unit_id) errors.unit = "กรุณาเลือกหน่วย";
    if (!formData.warehouse_id) errors.location = "กรุณาเลือกคลัง";
    return errors;
  };

  const handleAddItem = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) return setFormErrors(errors);

    setIsLoading(true);
    try {
      const payload: Item.CreatePayload = {
        name: formData.name,
        min_stock: Number(formData.min_stock),
        category_id: Number(formData.category_id),
        unit_id: Number(formData.unit_id),
        warehouse_id: Number(formData.warehouse_id),
        status: "ACTIVE",
        image_url: formData.imageUrl
      };
      await ItemSvc.createInventoryItem(payload);
      toast.success("บันทึกสำเร็จ");
      // ไม่ต้องสั่ง refreshData() ตรงนี้ เพราะ Backend จะส่ง Socket กลับมาสั่งให้ refresh เอง
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) return setFormErrors(errors);

    setIsLoading(true);
    try {
      if (!selectedItem) return;
      const payload: Item.UpdatePayload = {
        name: formData.name,
        min_stock: Number(formData.min_stock),
        unit_id: Number(formData.unit_id),
        warehouse_id: Number(formData.warehouse_id),
        status: formData.status,
        image_url: formData.imageUrl
      };
      await ItemSvc.updateInventoryItem(selectedItem.id, payload);
      toast.success("แก้ไขข้อมูลเรียบร้อย");
      // รอ Socket สั่ง Refresh
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;
    try {
      await ItemSvc.deleteInventoryItem(id);
      toast.success("ลบรายการเรียบร้อย");
      // รอ Socket สั่ง Refresh
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openEditModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    const foundCat = options.category?.find(c => c.name === item.category);
    const foundUnit = options.unit?.find(u => u.name === item.unit);
    const foundWarehouse = options.warehouse?.find(w => w.name === item.location);

    setFormData({
      code: item.code,
      name: item.name,
      category_id: foundCat ? foundCat.id.toString() : "",
      unit_id: foundUnit ? foundUnit.id.toString() : "",
      warehouse_id: foundWarehouse ? foundWarehouse.id.toString() : "",
      min_stock: item.minStock,
      status: item.status,
      imageUrl: item.imageUrl
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setIsLoading(false);
  };

  // --- [UI Components] ---
  const Badge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      "ปกติ": "bg-green-100 text-green-800",
      "ต่ำ": "bg-yellow-100 text-yellow-800",
      "หมด": "bg-red-100 text-red-800",
      "ระงับ": "bg-gray-200 text-gray-500",
      "ACTIVE": "bg-green-100 text-green-800",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [] },
    onDrop: (files) => {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
      }
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Package className="w-8 h-8 text-indigo-600" />
          <h2 className="text-3xl font-bold text-indigo-600">สต็อกพัสดุ Real-time</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2 shadow-md">
            <PackagePlus className="w-4 h-4" /> เพิ่มพัสดุใหม่
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
          {filterCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table Content */}
      <div className="rounded-xl bg-white shadow-lg overflow-hidden flex-grow relative border border-slate-100">
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-[50px]">#</th>
                <th className="px-6 py-4 w-[100px]">รูป</th>
                <th className="px-6 py-4 w-[120px]">รหัส</th>
                <th className="px-6 py-4">ชื่อพัสดุ</th>
                <th className="px-6 py-4">หมวดหมู่</th>
                <th className="px-6 py-4 text-center">คงเหลือ</th>
                <th className="px-6 py-4 text-center text-orange-600">ขั้นต่ำ</th>
                <th className="px-6 py-4">ตำแหน่ง</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{item.code}</td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4 text-slate-500">{item.category}</td>
                  <td className="px-6 py-4 text-center font-bold">{item.stock} {item.unit}</td>
                  <td className="px-6 py-4 text-center text-orange-600 bg-orange-50/30 font-bold">{item.minStock} {item.unit}</td>
                  <td className="px-6 py-4">{item.location}</td>
                  <td className="px-6 py-4"><Badge status={item.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEditModal(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                   <td colSpan={10} className="text-center py-10 text-slate-500">ไม่พบข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Modal - Unified for Add/Edit */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">{isAddModalOpen ? "เพิ่มรายการพัสดุ" : "แก้ไขข้อมูลพัสดุ"}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-slate-700">ชื่อพัสดุ</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">หมวดหมู่</label>
                <select disabled={isEditModalOpen} value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50">
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {options.category?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">หน่วยนับ</label>
                <select value={formData.unit_id} onChange={e => setFormData({...formData, unit_id: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- เลือกหน่วย --</option>
                  {options.unit?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">ตำแหน่งเก็บ (คลัง)</label>
                <select value={formData.warehouse_id} onChange={e => setFormData({...formData, warehouse_id: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- เลือกคลัง --</option>
                  {options.warehouse?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">จำนวนขั้นต่ำ (Min Stock)</label>
                <input type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-slate-700">รูปภาพพัสดุ</label>
                <div {...getRootProps()} className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50">
                  <input {...getInputProps()} />
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} className="h-32 mx-auto rounded-lg shadow-md" alt="Preview" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">คลิกหรือลากรูปภาพมาวางที่นี่</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">ยกเลิก</button>
              <button disabled={isLoading} onClick={isAddModalOpen ? handleAddItem : handleEditItem} className="px-8 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg flex items-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAddModalOpen ? "บันทึกข้อมูล" : "อัปเดตข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}