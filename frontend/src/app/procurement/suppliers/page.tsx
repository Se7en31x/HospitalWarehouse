"use client";

import { useState } from "react";
import { HandHelping, Plus, Edit, Trash2 } from "lucide-react";

type Supplier = {
  id: number;
  name: string;
  tax_id: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
};

const mockSuppliers: Supplier[] = [
  {
    id: 1,
    name: "บ.ฟาร์มาไทย จำกัด",
    tax_id: "0105551234567",
    contact: "สมชาย ใจดี",
    email: "sales@pharmathai.com",
    phone: "02-111-2222",
    category: "ยา เวชภัณฑ์",
  },
  {
    id: 2,
    name: "บ.เมดิคอลซัพพลาย",
    tax_id: "0105557654321",
    contact: "ศิริพร ใจงาม",
    email: "contact@medicalsupply.co.th",
    phone: "02-333-4444",
    category: "อุปกรณ์การแพทย์",
  },
  {
    id: 3,
    name: "บ.เครื่องมือแพทย์เจริญ",
    tax_id: "0105559876543",
    contact: "อนันต์ วิริยะ",
    email: "support@charoenmed.com",
    phone: "02-555-6666",
    category: "ครุภัณฑ์",
  },
];

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HandHelping className="w-6 h-6 text-blue-600" />
          ผู้จำหน่าย (Suppliers)
        </h1>
        <button className="px-3 py-2 text-sm rounded bg-green-500 text-white hover:bg-green-600 flex items-center gap-1">
          <Plus className="w-4 h-4" /> เพิ่มผู้จำหน่าย
        </button>
      </div>

      {/* ตาราง Supplier */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">ชื่อบริษัท</th>
              <th className="px-4 py-3 text-left">เลขผู้เสียภาษี</th>
              <th className="px-4 py-3 text-left">ผู้ติดต่อ</th>
              <th className="px-4 py-3 text-left">อีเมล</th>
              <th className="px-4 py-3 text-left">เบอร์โทร</th>
              <th className="px-4 py-3 text-left">หมวดหมู่</th>
              <th className="px-4 py-3 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.tax_id}</td>
                <td className="px-4 py-3">{s.contact}</td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">{s.phone}</td>
                <td className="px-4 py-3">{s.category}</td>
                <td className="px-4 py-3 text-center flex justify-center gap-2">
                  <button className="px-2 py-1 rounded bg-yellow-400 text-white hover:bg-yellow-500 flex items-center gap-1">
                    <Edit className="w-4 h-4" /> แก้ไข
                  </button>
                  <button className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1">
                    <Trash2 className="w-4 h-4" /> ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
