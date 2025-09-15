"use client";

import { useState } from "react";
import { Clock, Search, Eye, ChevronDown, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// ข้อมูลตัวอย่างประวัติ (รวมคำขอและการทำรายการเดี่ยว)
const initialHistory = [
  // คำขอ (Request)
  {
    id: "req-001",
    type: "คำขอ",
    date: "2025-09-10",
    user: "นาย ก",
    status: "สำเร็จ",
    items: [
      { item: "เครื่องวัดความดัน", category: "ครุภัณฑ์", quantity: 5, unit: "ชิ้น" },
      { item: "ยาพาราเซตามอล", category: "ยา", quantity: 100, unit: "แผง" },
      { item: "ผ้าก๊อซ", category: "เวชภัณฑ์ที่ไม่ใช่ยา", quantity: 20, unit: "ม้วน" },
    ],
  },
  {
    id: "req-002",
    type: "คำขอ",
    date: "2025-09-09",
    user: "นาง ข",
    status: "รออนุมัติ",
    items: [
      { item: "กระดาษ A4", category: "วัสดุ", quantity: 50, unit: "รีม" },
      { item: "เข็มฉีดยา", category: "เวชภัณฑ์ที่ไม่ใช่ยา", quantity: 200, unit: "ชิ้น" },
      { item: "ยาน้ำแก้ไอ", category: "ยา", quantity: 30, unit: "ขวด" },
      { item: "ถุงมือแพทย์", category: "เวชภัณฑ์ที่ไม่ใช่ยา", quantity: 50, unit: "คู่" },
      { item: "ปากกา", category: "วัสดุ", quantity: 100, unit: "ด้าม" },
      { item: "เครื่องคอมพิวเตอร์", category: "ครุภัณฑ์", quantity: 2, unit: "ชิ้น" },
      { item: "น้ำเกลือ", category: "เวชภัณฑ์ที่ไม่ใช่ยา", quantity: 20, unit: "ถุง" },
      { item: "ยาพาราเซตามอล", category: "ยา", quantity: 50, unit: "แผง" },
      { item: "ผ้าก๊อซ", category: "เวชภัณฑ์ที่ไม่ใช่ยา", quantity: 10, unit: "ม้วน" },
      { item: "เข็มฉีดยา", category: "เวชภัณฑ์ที่ไม่ใช่ยา", quantity: 100, unit: "ชิ้น" },
      { item: "ถุงมือแพทย์", category: "เวชภัณฑ์ที่ไม่ใช่ยา", quantity: 20, unit: "คู่" },
      { item: "กระดาษ A4", category: "วัสดุ", quantity: 20, unit: "รีม" },
      { item: "ปากกา", category: "วัสดุ", quantity: 50, unit: "ด้าม" },
      { item: "ยาน้ำแก้ไอ", category: "ยา", quantity: 10, unit: "ขวด" },
      { item: "เครื่องวัดความดัน", category: "ครุภัณฑ์", quantity: 2, unit: "ชิ้น" },
    ],
  },
  // การทำรายการเดี่ยว (Single Transaction)
  {
    id: "tx-001",
    type: "นำเข้า",
    date: "2025-09-08",
    user: "นาย ค",
    status: "สำเร็จ",
    item: "เครื่องคอมพิวเตอร์",
    category: "ครุภัณฑ์",
    quantity: 10,
    unit: "ชิ้น",
  },
  {
    id: "tx-002",
    type: "นำออก",
    date: "2025-09-07",
    user: "นาง ง",
    status: "สำเร็จ",
    item: "ยาพาราเซตามอล",
    category: "ยา",
    quantity: 50,
    unit: "แผง",
  },
  {
    id: "tx-003",
    type: "ยืม",
    date: "2025-09-06",
    user: "นาย จ",
    status: "รออนุมัติ",
    item: "ผ้าก๊อซ",
    category: "เวชภัณฑ์ที่ไม่ใช่ยา",
    quantity: 30,
    unit: "ม้วน",
  },
  {
    id: "tx-004",
    type: "เบิกใช้",
    date: "2025-09-05",
    user: "นาง ฉ",
    status: "ยกเลิก",
    item: "ถุงมือแพทย์",
    category: "เวชภัณฑ์ที่ไม่ใช่ยา",
    quantity: 100,
    unit: "คู่",
  },
];

// ข้อมูลประเภทสำหรับตัวกรอง
const categories = [
  { id: "cat-001", name: "ครุภัณฑ์" },
  { id: "cat-002", name: "ยา" },
  { id: "cat-003", name: "วัสดุ" },
  { id: "cat-004", name: "เวชภัณฑ์ที่ไม่ใช่ยา" },
];

// ข้อมูลประเภทการทำรายการสำหรับตัวกรอง
const transactionTypes = [
  { id: "type-001", name: "คำขอ" },
  { id: "type-002", name: "นำเข้า" },
  { id: "type-003", name: "นำออก" },
  { id: "type-004", name: "ยืม" },
  { id: "type-005", name: "เบิกใช้" },
];

type RequestItem = {
  item: string;
  category: string;
  quantity: number;
  unit: string;
};

type HistoryEntry = {
  id: string;
  type: string;
  date: string;
  user: string;
  status: string;
  items?: RequestItem[];
  item?: string;
  category?: string;
  quantity?: number;
  unit?: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  // กรองประวัติตามประเภทพัสดุ, ประเภทการทำรายการ, และคำค้นหา
  const filteredHistory = history.filter((entry) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (entry.items
        ? entry.items.some((item) => item.category === selectedCategory)
        : entry.category === selectedCategory);
    const matchesType = selectedType === "all" || entry.type === selectedType;
    const matchesSearch =
      entry.id.toLowerCase().includes(search.toLowerCase()) ||
      entry.user.toLowerCase().includes(search.toLowerCase()) ||
      (entry.items
        ? entry.items.some((item) => item.item.toLowerCase().includes(search.toLowerCase()))
        : entry.item?.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesType && matchesSearch;
  });

  const handleViewDetails = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Clock className="w-8 h-8 text-indigo-600 animate-pulse" />
          <h1 className="text-3xl font-bold text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
            ประวัติการทำรายการ
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาโดยชื่อพัสดุ, รหัส, หรือผู้ทำรายการ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-80 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300"
          />
        </div>
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-300"
          >
            <option value="all">ทุกประเภทพัสดุ</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-300"
          >
            <option value="all">ทุกประเภทการทำรายการ</option>
            {transactionTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-white">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                รหัส
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                ประเภทการทำรายการ
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                วันที่
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                ผู้ทำรายการ
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                รายการ
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                รายละเอียด
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors duration-200">
                  <td className="px-6 py-4 text-sm text-slate-800">{entry.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entry.user}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        entry.status === "สำเร็จ"
                          ? "bg-green-100 text-green-800"
                          : entry.status === "รออนุมัติ"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {entry.items ? `${entry.items.length} รายการ` : entry.item}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewDetails(entry)}
                      className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-all duration-200"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-slate-500">
                  ไม่พบประวัติการทำรายการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                รายละเอียดการทำรายการ
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <span className="text-sm font-semibold text-slate-700">รหัส:</span>
                <span className="ml-2 text-sm text-slate-600">{selectedEntry.id}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700">ประเภทการทำรายการ:</span>
                <span className="ml-2 text-sm text-slate-600">{selectedEntry.type}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700">วันที่:</span>
                <span className="ml-2 text-sm text-slate-600">{selectedEntry.date}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700">ผู้ทำรายการ:</span>
                <span className="ml-2 text-sm text-slate-600">{selectedEntry.user}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700">สถานะ:</span>
                <span
                  className={`ml-2 text-sm px-3 py-1 rounded-full ${
                    selectedEntry.status === "สำเร็จ"
                      ? "bg-green-100 text-green-800"
                      : selectedEntry.status === "รออนุมัติ"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedEntry.status}
                </span>
              </div>
              {selectedEntry.items ? (
                <>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">จำนวนรายการ:</span>
                    <span className="ml-2 text-sm text-slate-600">{selectedEntry.items.length}</span>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-700">รายการย่อย:</h4>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              รายการ
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              ประเภท
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              จำนวน
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              หน่วย
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedEntry.items.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors duration-200">
                              <td className="px-4 py-2 text-sm text-slate-600">{item.item}</td>
                              <td className="px-4 py-2 text-sm text-slate-600">{item.category}</td>
                              <td className="px-4 py-2 text-sm text-slate-600">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-slate-600">{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">รายการ:</span>
                    <span className="ml-2 text-sm text-slate-600">{selectedEntry.item}</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">ประเภท:</span>
                    <span className="ml-2 text-sm text-slate-600">{selectedEntry.category}</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-700">จำนวน:</span>
                    <span className="ml-2 text-sm text-slate-600">{selectedEntry.quantity} {selectedEntry.unit}</span>
                  </div>
                </>
              )}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-xl hover:bg-slate-300 transition-all duration-200"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}