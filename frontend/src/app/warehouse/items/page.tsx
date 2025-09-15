"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import toast, { Toaster } from "react-hot-toast";
import {
  PackagePlus,
  Search,
  ClipboardList,
  Edit,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

const initialItems = [
  { id: "ITM001", name: "ชุดตรวจ ATK", category: "อุปกรณ์ทางการแพทย์", stock: 150, unit: "ชิ้น", location: "คลังกลาง A1", price: 85.0, status: "ปกติ", imageUrl: "https://via.placeholder.com/60?text=ATK" },
  { id: "ITM002", name: "ถุงมือยาง", category: "วัสดุสิ้นเปลือง", stock: 25, unit: "กล่อง", location: "คลังกลาง B2", price: 120.0, status: "ต่ำ", imageUrl: "https://via.placeholder.com/60?text=Gloves" },
  { id: "ITM003", name: "ผ้าก๊อซปลอดเชื้อ", category: "อุปกรณ์ทางการแพทย์", stock: 0, unit: "กล่อง", location: "คลังกลาง C1", price: 50.0, status: "หมด", imageUrl: "" },
  { id: "ITM004", name: "แอลกอฮอล์ 70%", category: "วัสดุสิ้นเปลือง", stock: 80, unit: "ขวด", location: "คลังกลาง D5", price: 45.5, status: "ปกติ", imageUrl: "https://via.placeholder.com/60?text=Alcohol" },
  { id: "ITM005", name: "เข็มฉีดยา", category: "อุปกรณ์ทางการแพทย์", stock: 3, unit: "กล่อง", location: "คลังกลาง A3", price: 95.0, status: "ต่ำ", imageUrl: "https://via.placeholder.com/60?text=Syringe" },
  { id: "ITM006", name: "หน้ากากอนามัย N95", category: "อุปกรณ์ป้องกัน", stock: 40, unit: "ชิ้น", location: "คลังกลาง E2", price: 15.0, status: "ปกติ", imageUrl: "" },
  { id: "ITM007", name: "ยาพาราเซตามอล", category: "ยา", stock: 200, unit: "เม็ด", location: "คลังยา F1", price: 2.0, status: "ปกติ", imageUrl: "https://via.placeholder.com/60?text=Paracetamol" },
  { id: "ITM008", name: "เครื่องวัดความดัน", category: "เครื่องมือแพทย์", stock: 10, unit: "เครื่อง", location: "คลังกลาง M4", price: 1500.0, status: "ปกติ", imageUrl: "https://via.placeholder.com/60?text=BP" },
  { id: "ITM009", name: "สารละลายเกลือ", category: "วัสดุสิ้นเปลือง", stock: 5, unit: "ขวด", location: "คลังกลาง B4", price: 35.0, status: "ต่ำ", imageUrl: "" },
  { id: "ITM010", name: "สำลี", category: "วัสดุสิ้นเปลือง", stock: 0, unit: "ห่อ", location: "คลังกลาง B6", price: 25.0, status: "หมด", imageUrl: "" },
  { id: "ITM011", name: "กระดาษชำระ", category: "วัสดุสำนักงาน", stock: 20, unit: "ม้วน", location: "คลังกลาง S2", price: 12.0, status: "ปกติ", imageUrl: "https://via.placeholder.com/60?text=Paper" },
  { id: "ITM012", name: "ปากกา", category: "วัสดุสำนักงาน", stock: 5, unit: "ด้าม", location: "คลังกลาง S8", price: 8.0, status: "ต่ำ", imageUrl: "https://via.placeholder.com/60?text=Pen" },
  { id: "ITM013", name: "อุปกรณ์ทำแผล", category: "อุปกรณ์ทางการแพทย์", stock: 75, unit: "ชุด", location: "คลังกลาง A5", price: 75.0, status: "ปกติ", imageUrl: "https://via.placeholder.com/60?text=Kit" },
  { id: "ITM014", name: "แว่นตานิรภัย", category: "อุปกรณ์ป้องกัน", stock: 12, unit: "ชิ้น", location: "คลังกลาง E1", price: 200.0, status: "ต่ำ", imageUrl: "" },
  { id: "ITM015", name: "เครื่องพ่นยา", category: "เครื่องมือแพทย์", stock: 2, unit: "เครื่อง", location: "คลังกลาง M1", price: 2500.0, status: "ต่ำ", imageUrl: "https://via.placeholder.com/60?text=Nebulizer" },
  { id: "ITM016", name: "ยาแก้ไข้", category: "ยา", stock: 100, unit: "เม็ด", location: "คลังยา F2", price: 5.0, status: "ปกติ", imageUrl: "https://via.placeholder.com/60?text=Med" },
  { id: "ITM017", name: "กระบอกฉีดยา", category: "อุปกรณ์ทางการแพทย์", stock: 200, unit: "ชิ้น", location: "คลังกลาง A1", price: 3.0, status: "ปกติ", imageUrl: "" },
  { id: "ITM018", name: "ยาแก้ปวด", category: "ยา", stock: 15, unit: "กล่อง", location: "คลังยา F1", price: 150.0, status: "ต่ำ", imageUrl: "https://via.placeholder.com/60?text=Pain" },
];

export default function StockItemsPage() {
  const [items, setItems] = useState(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category: "",
    stock: 0,
    unit: "",
    location: "",
    price: 0,
    status: "ปกติ",
    imageUrl: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const itemsPerPage = 10;

  const categories = ["ทั้งหมด", ...new Set(items.map((item) => item.category))];
  const statuses = ["ทั้งหมด", ...new Set(items.map((item) => item.status))];
  const units = ["ชิ้น", "กล่อง", "ขวด", "เม็ด", "เครื่อง", "ม้วน", "ด้าม", "ชุด", "ห่อ"];

  const filteredItems = items.filter(
    (item) =>
      (item.id.includes(searchTerm.toUpperCase()) ||
        item.name.includes(searchTerm) ||
        item.category.includes(searchTerm)) &&
      (selectedCategory === "ทั้งหมด" || item.category === selectedCategory) &&
      (selectedStatus === "ทั้งหมด" || item.status === selectedStatus)
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalStockValue = filteredItems.reduce((sum, item) => sum + item.stock * item.price, 0);

  const getStatusStyle = (status) => {
    switch (status) {
      case "ปกติ":
        return "bg-green-100 text-green-800";
      case "ต่ำ":
        return "bg-yellow-100 text-yellow-800";
      case "หมด":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const Badge = ({ status }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}>
      {status}
    </span>
  );

  const validateForm = () => {
    const errors = {};
    if (!formData.id) errors.id = "กรุณากรอกรหัสพัสดุ";
    else if (items.some((item) => item.id === formData.id && item.id !== (selectedItem?.id || ""))) errors.id = "รหัสพัสดุซ้ำ";
    if (!formData.name) errors.name = "กรุณากรอกชื่อพัสดุ";
    if (!formData.category) errors.category = "กรุณาเลือกหมวดหมู่";
    if (formData.stock < 0) errors.stock = "จำนวนต้องไม่ติดลบ";
    if (!formData.unit) errors.unit = "กรุณาเลือกหน่วย";
    if (!formData.location) errors.location = "กรุณากรอกตำแหน่งเก็บ";
    if (formData.price < 0) errors.price = "ราคาต้องไม่ติดลบ";
    if (!formData.status) errors.status = "กรุณาเลือกสถานะ";
    if (!selectedFile && !formData.imageUrl && isAddModalOpen) errors.imageUrl = "กรุณาอัปโหลดรูปภาพ";
    return errors;
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setFormErrors({ ...formErrors, imageUrl: "กรุณาอัปโหลดไฟล์ .jpg หรือ .png เท่านั้น" });
        toast.error("กรุณาอัปโหลดไฟล์ .jpg หรือ .png เท่านั้น");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFormErrors({ ...formErrors, imageUrl: "ไฟล์ต้องมีขนาดไม่เกิน 2MB" });
        toast.error("ไฟล์ต้องมีขนาดไม่เกิน 2MB");
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, imageUrl: url });
      setFormErrors({ ...formErrors, imageUrl: "" });
      toast.success("เลือกไฟล์สำเร็จ!");
    } else {
      toast.error("ไม่พบไฟล์ที่เลือก");
    }
  }, [formData, formErrors]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxSize: 2 * 1024 * 1024,
  });

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUrl: "" });
    setSelectedFile(null);
    setFormErrors({ ...formErrors, imageUrl: "" });
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("ลบรูปภาพเรียบร้อย");
  };

  const simulateUpload = (file) => {
    return new Promise((resolve) => {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            toast.success("อัปโหลดรูปภาพสำเร็จ!");
            resolve(URL.createObjectURL(file));
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    });
  };

  const handleAddItem = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    let finalImageUrl = formData.imageUrl;
    if (selectedFile) {
      finalImageUrl = await simulateUpload(selectedFile);
    }

    setItems([...items, { ...formData, id: formData.id || `ITM${String(items.length + 1).padStart(3, "0")}`, imageUrl: finalImageUrl }]);
    setIsAddModalOpen(false);
    setFormData({ id: "", name: "", category: "", stock: 0, unit: "", location: "", price: 0, status: "ปกติ", imageUrl: "" });
    setSelectedFile(null);
    setFormErrors({});
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("เพิ่มพัสดุสำเร็จ!");
  };

  const handleEditItem = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    let finalImageUrl = formData.imageUrl;
    if (selectedFile) {
      finalImageUrl = await simulateUpload(selectedFile);
    }

    setItems(items.map((item) => (item.id === selectedItem.id ? { ...formData, imageUrl: finalImageUrl } : item)));
    setIsEditModalOpen(false);
    setFormData({ id: "", name: "", category: "", stock: 0, unit: "", location: "", price: 0, status: "ปกติ", imageUrl: "" });
    setSelectedFile(null);
    setFormErrors({});
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("แก้ไขพัสดุสำเร็จ!");
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData(item);
    setSelectedFile(null);
    setIsEditModalOpen(true);
    setUploadProgress(0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Package className="w-8 h-8 text-indigo-600 animate-pulse" />
          <h2 className="text-3xl font-bold text-indigo-600">สต็อกรายการ</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm">
            <ClipboardList className="w-4 h-4" /> รายงาน
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-md"
          >
            <PackagePlus className="w-4 h-4" /> เพิ่มพัสดุใหม่
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหารหัส, ชื่อ หรือหมวดหมู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-sm"
          />
        </div>
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none pl-4 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-300 shadow-sm"
          >
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none pl-4 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-300 shadow-sm"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-lg overflow-hidden flex-grow flex flex-col">
        <div className="w-full h-full overflow-y-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider w-[4%]">#</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider w-[6%]">รูปภาพ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider w-[8%]">รหัส</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider w-[18%]">ชื่อพัสดุ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider w-[12%]">หมวดหมู่</th>
                <th className="h-12 px-6 text-center font-semibold text-slate-700 uppercase tracking-wider w-[10%]">คงเหลือ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider w-[12%]">ตำแหน่งเก็บ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider w-[6%]">สถานะ</th>
                <th className="h-12 px-6 text-right font-semibold text-slate-700 uppercase tracking-wider w-[10%]">ราคาต่อหน่วย</th>
                <th className="h-12 px-6 text-right font-semibold text-slate-700 uppercase tracking-wider w-[7%]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-200 h-16">
                    <td className="py-2 px-6 text-slate-700 truncate w-[4%]">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="py-2 px-6 w-[7%]">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm hover:scale-105 transition-transform duration-200">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <img src="https://googleusercontent.com/image_collection/image_retrieval/1767448798255701701_0" alt="No image available" className="w-full h-full object-cover p-1" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-6 font-medium text-slate-900 truncate w-[10%]">{item.id}</td>
                    <td className="py-2 px-6 text-slate-700 truncate w-[18%]">{item.name}</td>
                    <td className="py-2 px-6 text-slate-500 truncate w-[12%]">{item.category}</td>
                    <td className="py-2 px-6 text-center font-semibold text-slate-700 truncate w-[8%]">{item.stock} {item.unit}</td>
                    <td className="py-2 px-6 text-slate-700 truncate w-[12%]">{item.location}</td>
                    <td className="py-2 px-6 w-[8%]">
                      <Badge status={item.status} />
                    </td>
                    <td className="py-2 px-6 text-right text-slate-700 truncate w-[10%]">{item.price.toFixed(2)}</td>
                    <td className="py-2 px-6 text-center flex justify-center w-[11%]">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 rounded-md hover:bg-indigo-50 text-indigo-600 transition-all duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-xl p-8 shadow-inner">
                      <img src="https://googleusercontent.com/image_collection/image_retrieval/7548326021255649466_0" alt="Empty stock" className="w-16 h-16 animate-pulse" />
                      <p className="text-lg font-semibold text-slate-600">ไม่มีรายการพัสดุ</p>
                      <p className="text-sm text-slate-500">เริ่มต้นโดยการเพิ่มพัสดุใหม่เพื่อจัดการสต็อกของคุณ</p>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-md"
                      >
                        <PackagePlus className="w-4 h-4" /> เพิ่มพัสดุใหม่
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center py-4">
        <span className="text-sm text-slate-600">
          แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
        </span>
        <div className="flex items-center gap-3">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-700">
            หน้า {currentPage} จาก {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md">
          <div className="bg-slate-50 rounded-2xl shadow-xl p-10 w-full max-w-4xl mx-4 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-indigo-600">{isAddModalOpen ? "เพิ่มพัสดุใหม่" : "แก้ไขพัสดุ"}</h3>
              <button
                onClick={() => {
                  if (isAddModalOpen) setIsAddModalOpen(false);
                  else setIsEditModalOpen(false);
                  setFormErrors({});
                  setFormData({ id: "", name: "", category: "", stock: 0, unit: "", location: "", price: 0, status: "ปกติ", imageUrl: "" });
                  setSelectedFile(null);
                  setUploadProgress(0);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-6">
              <div>
                <label className="text-base font-semibold text-slate-700">รหัสพัสดุ</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300"
                  placeholder="เช่น ITM016"
                />
                {formErrors.id && <p className="text-xs text-red-600 mt-1">{formErrors.id}</p>}
              </div>
              <div>
                <label className="text-base font-semibold text-slate-700">ชื่อพัสดุ</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300"
                  placeholder="เช่น ยาไอบูโพรเฟน"
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="text-base font-semibold text-slate-700">หมวดหมู่</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.filter((cat) => cat !== "ทั้งหมด").map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {formErrors.category && <p className="text-xs text-red-600 mt-1">{formErrors.category}</p>}
              </div>
              <div>
                <label className="text-base font-semibold text-slate-700">จำนวนคงเหลือ</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300 cursor-not-allowed bg-slate-100"
                  placeholder="เช่น 100"
                  readOnly
                />
                {formErrors.stock && <p className="text-xs text-red-600 mt-1">{formErrors.stock}</p>}
              </div>
              <div>
                <label className="text-base font-semibold text-slate-700">หน่วย</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300"
                >
                  <option value="">เลือกหน่วย</option>
                  {units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                {formErrors.unit && <p className="text-xs text-red-600 mt-1">{formErrors.unit}</p>}
              </div>
              <div>
                <label className="text-base font-semibold text-slate-700">ตำแหน่งเก็บ</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300"
                  placeholder="เช่น คลังกลาง A1"
                />
                {formErrors.location && <p className="text-xs text-red-600 mt-1">{formErrors.location}</p>}
              </div>
              <div>
                <label className="text-base font-semibold text-slate-700">ราคาต่อหน่วย (บาท)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300"
                  placeholder="เช่น 50.00"
                  step="0.01"
                />
                {formErrors.price && <p className="text-xs text-red-600 mt-1">{formErrors.price}</p>}
              </div>
              <div>
                <label className="text-base font-semibold text-slate-700">สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-slate-200 py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 transition-all duration-300"
                >
                  <option value="">เลือกสถานะ</option>
                  {statuses.filter((s) => s !== "ทั้งหมด").map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {formErrors.status && <p className="text-xs text-red-600 mt-1">{formErrors.status}</p>}
              </div>
              <div className="col-span-3 space-y-4">
                <label className="text-base font-semibold text-slate-700">อัปโหลดรูปภาพ (.jpg, .png)</label>
                <div
                  {...getRootProps()}
                  className={`mt-1 border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                    isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white"
                  } hover:bg-slate-100 cursor-pointer`}
                >
                  <input {...getInputProps()} ref={fileInputRef} />
                  <Upload className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">
                    {isDragActive
                      ? "วางไฟล์ที่นี่ ..."
                      : "ลากและวางไฟล์รูปภาพ (.jpg, .png) หรือคลิกเพื่อเลือกไฟล์"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">ขนาดไฟล์สูงสุด 2MB</p>
                  {formData.imageUrl && (
                    <div className="mt-4 relative">
                      <img src={formData.imageUrl} alt="Preview" className="w-40 h-40 rounded-lg object-cover shadow-sm mx-auto" />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-200 transform hover:scale-110"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">กำลังอัปโหลด... {uploadProgress}%</p>
                  </div>
                )}
                {formErrors.imageUrl && <p className="text-xs text-red-600 mt-1">{formErrors.imageUrl}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  if (isAddModalOpen) setIsAddModalOpen(false);
                  else setIsEditModalOpen(false);
                  setFormErrors({});
                  setFormData({ id: "", name: "", category: "", stock: 0, unit: "", location: "", price: 0, status: "ปกติ", imageUrl: "" });
                  setSelectedFile(null);
                  setUploadProgress(0);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-8 py-4 text-base font-semibold text-slate-700 bg-slate-200 rounded-xl hover:bg-slate-300 hover:shadow-lg transition-all duration-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={isAddModalOpen ? handleAddItem : handleEditItem}
                className="px-8 py-4 text-base font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 hover:shadow-lg transition-all duration-200"
              >
                {isAddModalOpen ? "เพิ่ม" : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}