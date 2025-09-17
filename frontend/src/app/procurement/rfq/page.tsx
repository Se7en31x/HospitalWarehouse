"use client";

import { useState } from "react";
import { FileInput, Eye, Loader2 } from "lucide-react";

type Supplier = {
  id: number;
  name: string;
  contact: string;
};

type RFQItem = {
  name: string;
  qty: number;
  unit: string;
};

type RFQ = {
  id: number;
  rfq_code: string;
  date: string;
  pr_code: string;
  suppliers: Supplier[];
  items: RFQItem[];
  status: string;
};

const mockRFQs: RFQ[] = [
  {
    id: 1,
    rfq_code: "RFQ-2025-001",
    date: "2025-09-15",
    pr_code: "PR-2025-001",
    suppliers: [
      { id: 1, name: "บ.ฟาร์มาไทย", contact: "02-111-2222" },
      { id: 2, name: "บ.เมดิคอลซัพพลาย", contact: "02-333-4444" },
    ],
    items: [
      { name: "ยาพาราเซตามอล 500mg", qty: 200, unit: "แผง" },
      { name: "ถุงมือยาง", qty: 1000, unit: "ชิ้น" },
    ],
    status: "pending",
  },
  {
    id: 2,
    rfq_code: "RFQ-2025-002",
    date: "2025-09-16",
    pr_code: "PR-2025-002",
    suppliers: [{ id: 3, name: "บ.เครื่องมือแพทย์เจริญ", contact: "02-555-6666" }],
    items: [{ name: "สายสวนปัสสาวะ", qty: 150, unit: "ชิ้น" }],
    status: "responded",
  },
];

export default function RFQPage() {
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">รอเสนอราคา</span>;
      case "responded":
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">มีการตอบกลับ</span>;
      case "closed":
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">ปิดงาน</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileInput className="w-6 h-6 text-blue-600" />
        คำขอเสนอราคา (RFQ)
      </h1>

      {/* ตาราง RFQ */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">เลขที่ RFQ</th>
              <th className="px-4 py-3 text-left">วันที่</th>
              <th className="px-4 py-3 text-left">อ้างอิง PR</th>
              <th className="px-4 py-3 text-left">จำนวนผู้จำหน่าย</th>
              <th className="px-4 py-3 text-left">สถานะ</th>
              <th className="px-4 py-3 text-center">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {mockRFQs.map((rfq) => (
              <tr key={rfq.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{rfq.rfq_code}</td>
                <td className="px-4 py-3">{rfq.date}</td>
                <td className="px-4 py-3">{rfq.pr_code}</td>
                <td className="px-4 py-3">{rfq.suppliers.length}</td>
                <td className="px-4 py-3">{statusBadge(rfq.status)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setSelectedRFQ(rfq)}
                    className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1 mx-auto"
                  >
                    <Eye className="w-4 h-4" /> ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal รายละเอียด RFQ */}
      {selectedRFQ && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-[650px] p-6">
            <h2 className="text-xl font-bold mb-4">รายละเอียด {selectedRFQ.rfq_code}</h2>
            <p className="text-sm text-gray-600 mb-2">
              อ้างอิง PR: <span className="font-medium">{selectedRFQ.pr_code}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              วันที่สร้าง: <span className="font-medium">{selectedRFQ.date}</span>
            </p>

            <h3 className="font-semibold mb-2">รายการพัสดุ</h3>
            <table className="w-full text-sm mb-4 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">ชื่อพัสดุ</th>
                  <th className="px-3 py-2 text-center">จำนวน</th>
                  <th className="px-3 py-2 text-center">หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {selectedRFQ.items.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-center">{item.qty}</td>
                    <td className="px-3 py-2 text-center">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-semibold mb-2">ผู้จำหน่ายที่ส่ง RFQ</h3>
            <ul className="list-disc pl-5 text-sm mb-4">
              {selectedRFQ.suppliers.map((s) => (
                <li key={s.id}>
                  {s.name} — <span className="text-gray-600">{s.contact}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-center mt-4">
              <div>{statusBadge(selectedRFQ.status)}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" /> บันทึกใบเสนอราคา
                </button>
                <button
                  onClick={() => setSelectedRFQ(null)}
                  className="px-3 py-1 text-sm rounded bg-gray-300 hover:bg-gray-400"
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
