"use client";

import React, { useState } from "react";
import { FileText, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

type PurchaseRequest = {
  id: string;
  requestor: string;
  department: string;
  requestDate: string;
  status: "pending" | "processing" | "completed";
  items: Item[];
};

type Supplier = {
  id: number;
  name: string;
};

const mockSuppliers: Supplier[] = [
  { id: 1, name: "บ.ฟาร์มาไทย จำกัด" },
  { id: 2, name: "บ.เมดิคอลซัพพลาย" },
  { id: 3, name: "บ.เครื่องมือแพทย์เจริญ" },
];

const mockPRs: PurchaseRequest[] = [
  {
    id: "PR-2025-001",
    requestor: "สมชาย อินทร์ดี",
    department: "คลังพัสดุ",
    requestDate: "2025-09-16",
    status: "pending",
    items: [
      { id: "i1", name: "ยาพาราเซตามอล 500mg", quantity: 200, unit: "แผง", category: "ยา" },
      { id: "i2", name: "ถุงมือยาง", quantity: 1000, unit: "ชิ้น", category: "เวชภัณฑ์" },
    ],
  },
  {
    id: "PR-2025-002",
    requestor: "สุดา เทคโน",
    department: "IT",
    requestDate: "2025-09-15",
    status: "processing",
    items: [
      { id: "i3", name: "คอมพิวเตอร์ตั้งโต๊ะ", quantity: 5, unit: "เครื่อง", category: "อุปกรณ์คอมพิวเตอร์" },
    ],
  },
];

export default function PurchaseRequestPage() {
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);

  const statusConfig = {
    pending: { label: "รอดำเนินการ", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    processing: { label: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    completed: { label: "ปิดงาน", color: "bg-green-100 text-green-800", icon: CheckCircle },
  };

  const toggleSupplier = (id: number) => {
    setSelectedSuppliers((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCreateRFQ = () => {
    if (!selectedPR) return;
    if (selectedSuppliers.length === 0) {
      alert("กรุณาเลือกผู้ขายอย่างน้อย 1 ราย");
      return;
    }

    const newRFQ = {
      rfqId: `RFQ-${Date.now()}`,
      prId: selectedPR.id,
      suppliers: mockSuppliers.filter((s) => selectedSuppliers.includes(s.id)),
      items: selectedPR.items,
      createdAt: new Date().toLocaleString("th-TH"),
    };

    setRfqs((prev) => [...prev, newRFQ]);
    setIsRFQModalOpen(false);
    setSelectedSuppliers([]);
    alert(`สร้าง RFQ จาก ${selectedPR.id} แล้ว`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <FileText className="w-8 h-8 text-blue-600" />
        คำขอจัดซื้อ (PR)
      </h1>

      <div className="grid grid-cols-3 gap-6">
        {/* PR List */}
        <div className="col-span-2 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">รายการ PR</h2>
          <ul className="divide-y">
            {mockPRs.map((pr) => {
              const StatusIcon = statusConfig[pr.status].icon;
              return (
                <li
                  key={pr.id}
                  onClick={() => setSelectedPR(pr)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 rounded-lg ${
                    selectedPR?.id === pr.id ? "bg-indigo-50" : ""
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{pr.id}</span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig[pr.status].color}`}
                    >
                      <StatusIcon className="w-4 h-4 mr-1" />
                      {statusConfig[pr.status].label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {pr.requestor} – {pr.department}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* PR Detail */}
        <div className="bg-white rounded-lg shadow p-4">
          {selectedPR ? (
            <>
              <h2 className="text-lg font-semibold mb-3">รายละเอียด {selectedPR.id}</h2>
              <p className="text-sm text-gray-600 mb-2">
                ผู้ขอ: {selectedPR.requestor} | แผนก: {selectedPR.department}
              </p>
              <h3 className="font-medium mb-2">รายการสินค้า</h3>
              <ul className="list-disc list-inside text-sm mb-4">
                {selectedPR.items.map((item) => (
                  <li key={item.id}>
                    {item.name} – {item.quantity} {item.unit}
                  </li>
                ))}
              </ul>
              {selectedPR.status === "pending" && (
                <button
                  onClick={() => setIsRFQModalOpen(true)}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> สร้าง RFQ
                </button>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-center">เลือก PR เพื่อดูรายละเอียด</p>
          )}
        </div>
      </div>

      {/* RFQ Modal */}
      {isRFQModalOpen && selectedPR && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">สร้าง RFQ จาก {selectedPR.id}</h2>

            <h3 className="font-medium mb-2">เลือกผู้ขาย</h3>
            <div className="space-y-2 mb-4">
              {mockSuppliers.map((s) => (
                <label key={s.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.includes(s.id)}
                    onChange={() => toggleSupplier(s.id)}
                  />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>

            <h3 className="font-medium mb-2">รายการสินค้า</h3>
            <ul className="list-disc list-inside text-sm mb-4">
              {selectedPR.items.map((item) => (
                <li key={item.id}>
                  {item.name} – {item.quantity} {item.unit}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRFQModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateRFQ}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                บันทึก RFQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RFQ Log */}
      {rfqs.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">ประวัติ RFQ ที่ออกแล้ว</h2>
          <ul className="divide-y">
            {rfqs.map((rfq) => (
              <li key={rfq.rfqId} className="p-3">
                {rfq.rfqId} จาก {rfq.prId} → ผู้ขาย {rfq.suppliers.map((s:any) => s.name).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
