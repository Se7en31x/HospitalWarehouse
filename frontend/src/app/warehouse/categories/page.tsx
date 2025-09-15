"use client";

import { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Tags,
  Ruler,
  X,
  Check,
  Search,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// ข้อมูลตัวอย่างสำหรับหมวดหมู่และหน่วย
const initialCategories = [
  { id: "cat-001", name: "ครุภัณฑ์", code: "EQUIP", itemCount: 120, isActive: true },
  { id: "cat-002", name: "ยา", code: "DRUG", itemCount: 350, isActive: true },
  { id: "cat-003", name: "วัสดุ", code: "SUPP", itemCount: 200, isActive: true },
  { id: "cat-004", name: "เวชภัณฑ์ที่ไม่ใช่ยา", code: "MED-NON", itemCount: 180, isActive: true },
  { id: "cat-005", name: "อุปกรณ์สำนักงาน", code: "OFFICE", itemCount: 90, isActive: false },
  { id: "cat-006", name: "เครื่องมือแพทย์", code: "MED-EQ", itemCount: 50, isActive: true },
  { id: "cat-007", name: "วัสดุสิ้นเปลือง", code: "CONS", itemCount: 300, isActive: true },
  { id: "cat-008", name: "อุปกรณ์ไอที", code: "IT", itemCount: 75, isActive: true },
];

const initialUnits = [
  { id: "unit-001", name: "ชิ้น", description: "สำหรับพัสดุชิ้นเดี่ยว เช่น เข็มฉีดยา", isActive: true },
  { id: "unit-002", name: "กล่อง", description: "สำหรับพัสดุที่บรรจุในกล่อง เช่น หน้ากากอนามัย", isActive: true },
  { id: "unit-003", name: "แผง", description: "สำหรับยาเม็ดที่จัดเป็นแผง", isActive: true },
  { id: "unit-004", name: "ขวด", description: "สำหรับยาน้ำหรือของเหลว", isActive: true },
  { id: "unit-005", name: "ชุด", description: "สำหรับชุดอุปกรณ์ เช่น ชุดผ่าตัด", isActive: true },
  { id: "unit-006", name: "หลอด", description: "สำหรับยาทา เช่น ครีม", isActive: false },
  { id: "unit-007", name: "ม้วน", description: "สำหรับวัสดุ เช่น ผ้าก๊อซ", isActive: true },
  { id: "unit-008", name: "คู่", description: "สำหรับถุงมือแพทย์", isActive: true },
];

type Category = {
  id: string;
  name: string;
  code: string;
  itemCount: number;
  isActive: boolean;
};

type Unit = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

export default function CategoriesAndUnitsPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "units">("categories");
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<Category | Unit | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: "category" | "unit" } | null>(null);

  const handleOpenModal = (item: Category | Unit | null = null) => {
    setCurrentEditItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentEditItem(null);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const isActive = formData.get("isActive") === "on";

    if (activeTab === "categories") {
      const code = formData.get("code") as string;
      if (currentEditItem) {
        setCategories(
          categories.map((cat) =>
            cat.id === (currentEditItem as Category).id
              ? { ...cat, name, code, isActive }
              : cat
          )
        );
      } else {
        setCategories([
          ...categories,
          { id: uuidv4(), name, code, itemCount: 0, isActive },
        ]);
      }
    } else {
      const description = formData.get("description") as string;
      if (currentEditItem) {
        setUnits(
          units.map((unit) =>
            unit.id === (currentEditItem as Unit).id
              ? { ...unit, name, description, isActive }
              : unit
          )
        );
      } else {
        setUnits([
          ...units,
          { id: uuidv4(), name, description, isActive },
        ]);
      }
    }
    handleCloseModal();
  };

  const handleOpenConfirmModal = (id: string, type: "category" | "unit") => {
    setItemToDelete({ id, type });
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setItemToDelete(null);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === "category") {
        setCategories(categories.filter((cat) => cat.id !== itemToDelete.id));
      } else {
        setUnits(units.filter((unit) => unit.id !== itemToDelete.id));
      }
      handleCloseConfirmModal();
    }
  };

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUnits = units.filter(
    (unit) =>
      unit.name.toLowerCase().includes(search.toLowerCase()) ||
      unit.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Tags className="w-8 h-8 text-indigo-600 animate-pulse" />
          <h1 className="text-3xl font-bold text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
            จัดการประเภท/หน่วย
          </h1>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          เพิ่มใหม่
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all duration-300 ${
            activeTab === "categories"
              ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white rounded-t-lg shadow-md"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Tags className="w-5 h-5" />
          ประเภทพัสดุ
        </button>
        <button
          onClick={() => setActiveTab("units")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all duration-300 ${
            activeTab === "units"
              ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white rounded-t-lg shadow-md"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Ruler className="w-5 h-5" />
          หน่วยนับ
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-700">
            {activeTab === "categories" ? "รายการประเภทพัสดุ" : "รายการหน่วยนับ"}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`ค้นหา${activeTab === "categories" ? "ประเภท" : "หน่วย"}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-72 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gradient-to-r from-slate-50 to-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  ชื่อ{activeTab === "categories" ? "ประเภท" : "หน่วย"}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {activeTab === "categories" ? "รหัส" : "คำอธิบาย"}
                </th>
                {activeTab === "categories" && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    จำนวนพัสดุ
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  การจัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeTab === "categories" ? (
                filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cat.code}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cat.itemCount}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            cat.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cat.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(cat)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-all duration-200"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleOpenConfirmModal(cat.id, "category")}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-all duration-200"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                      ไม่พบข้อมูลประเภท
                    </td>
                  </tr>
                )
              ) : filteredUnits.length > 0 ? (
                filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{unit.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-sm">{unit.description}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          unit.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {unit.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(unit)}
                          className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-all duration-200"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOpenConfirmModal(unit.id, "unit")}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-all duration-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-500">
                    ไม่พบข้อมูลหน่วย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                {currentEditItem ? "แก้ไข" : "เพิ่ม"}
                {activeTab === "categories" ? "ประเภทพัสดุ" : "หน่วยนับ"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  ชื่อ{activeTab === "categories" ? "ประเภท" : "หน่วย"}
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={currentEditItem?.name || ""}
                  required
                  className="mt-1 block w-full rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 transition-all duration-200"
                  placeholder={`เช่น ${activeTab === "categories" ? "ครุภัณฑ์" : "ชิ้น"}`}
                />
              </div>
              {activeTab === "categories" ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    รหัสประเภท
                  </label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={(currentEditItem as Category)?.code || ""}
                    required
                    className="mt-1 block w-full rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 transition-all duration-200"
                    placeholder="เช่น EQUIP, DRUG"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    คำอธิบาย
                  </label>
                  <textarea
                    name="description"
                    defaultValue={(currentEditItem as Unit)?.description || ""}
                    rows={3}
                    className="mt-1 block w-full rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 transition-all duration-200"
                    placeholder="เช่น สำหรับยาน้ำหรือของเหลว"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked={currentEditItem ? currentEditItem.isActive : true}
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-700">
                  ใช้งาน
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-xl hover:bg-slate-300 hover:text-slate-800 transition-all duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
                >
                  <Check className="w-4 h-4 inline-block mr-1" />
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center transform transition-all duration-300 scale-100">
            <div className="flex justify-center mb-4">
              <Trash2 className="w-12 h-12 text-red-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">ยืนยันการลบ</h3>
            <p className="mt-2 text-sm text-slate-600">
              คุณแน่ใจหรือไม่ที่จะลบ{activeTab === "categories" ? "ประเภท" : "หน่วย"}นี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleCloseConfirmModal}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-xl hover:bg-slate-300 transition-all duration-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg transition-all duration-300"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}