"use client";

import { useState } from "react";
import { Tags, Plus, Edit, Trash, Search } from "lucide-react";

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([
    { id: 1, name: "เครื่องเขียน", type: "Category", unit: "ชิ้น" },
    { id: 2, name: "อุปกรณ์สำนักงาน", type: "Category", unit: "ชุด" },
    { id: 3, name: "วัสดุสิ้นเปลือง", type: "Category", unit: "กล่อง" },
  ]);

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(search.toLowerCase()) ||
      category.unit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tags className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
            จัดการประเภท/หน่วย
          </h1>
        </div>
        <button
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          เพิ่มประเภท/หน่วย
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="ค้นหาประเภทหรือหน่วย..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-white">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">ชื่อประเภท</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">ประเภท</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">หน่วย</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  className="hover:bg-slate-50 transition-colors duration-200"
                >
                  <td className="px-4 py-3 text-slate-800 font-medium">{category.name}</td>
                  <td className="px-4 py-3 text-slate-600">{category.type}</td>
                  <td className="px-4 py-3 text-slate-600">{category.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-md">
                        <Edit className="w-4 h-4" />
                        แก้ไข
                      </button>
                      <button className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-md">
                        <Trash className="w-4 h-4" />
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-slate-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}