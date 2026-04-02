"use client";

import React from "react";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
// ✅ ใช้ Path Alias และชื่อไฟล์ตัวเล็กตามที่ตกลงกัน
import * as RequisitionSvc from "@/services/requisitionService";
import { Department } from "@/lib/useAuth";
import { RequisitionPayload } from "@/types/requisition_type";

const MySwal = withReactContent(Swal);

// ✅ กำหนด Interface ให้ชัดเจนแทน any
interface CartItem {
  id: string;
  name: string;
  code: string;
  category: string;
  location: string;
  stock: number;
  unit: string;
  imageUrl?: string;
  quantity: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  selectedDeptId: string; // รับมาจาก State ภายนอก (มักเป็น string จาก select)
  departments: Department[];
  onDeptChange: (deptId: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onSuccess: () => void;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export default function CartModal({
  isOpen,
  onClose,
  selectedItems,
  selectedDeptId,
  departments,
  onDeptChange,
  onRemoveItem,
  onUpdateQty,
  onSuccess,
}: CartModalProps) {

  const handleSubmit = async (): Promise<void> => {
    if (!selectedDeptId || selectedItems.length === 0) {
      MySwal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณาเลือกแผนกและสินค้าในตะกร้า",
      });
      return;
    }

    // ✅ ดึงชื่อแผนกมาโชว์ใน Confirm Dialog เฉยๆ (เพื่อให้ User มั่นใจก่อนกด)
    const currentDept = departments.find((d) => String(d.id) === selectedDeptId);
    const deptDisplayName = currentDept ? currentDept.name : "แผนกที่เลือก";

    onClose();

    const confirm = await MySwal.fire({
      title: "ยืนยันการส่งใบเบิก?",
      html: `เบิกในนามแผนก: <b class="text-indigo-600">${deptDisplayName}</b>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#f1f5f9",
      confirmButtonText: "ยืนยันส่งข้อมูล",
      cancelButtonText: "ตรวจสอบอีกครั้ง",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      const payload: RequisitionPayload = {
        type: "WITHDRAW",
        department_id: selectedDeptId,
        items: selectedItems.map((i) => ({
          item_id: i.id,
          qty: Number(i.quantity),
        })),
        note: "เบิกออนไลน์ผ่านระบบ Portal",
      };

      const res = await RequisitionSvc.createRequisition(payload);

      if (res.status === "ok" || res.success) {
        await MySwal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: "ส่งใบเบิกเข้าสู่ระบบเรียบร้อยแล้ว",
          timer: 2000,
          showConfirmButton: false,
        });

        // ✅ เรียก onClose() และ onSuccess() ตรงนี้หลังจากทำเสร็จชัวร์ๆ
        onSuccess();
        onClose();
      } else {
        throw new Error(res.message || "เกิดข้อผิดพลาดจาก Server");
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      await MySwal.fire({
        icon: "error",
        title: "ไม่สามารถส่งใบเบิกได้",
        text: msg, // ตรงนี้แหละที่มันเอาคำว่า "create requisition success" มาโชว์เพราะมันนึกว่าคือข้อความ Error
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart size={20} className="text-indigo-600" /> ตะกร้าของฉัน
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {/* Department Selection */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <label className="text-[10px] font-bold text-indigo-600 uppercase mb-2 block">
              ระบุแผนกที่เบิก
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => onDeptChange(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- กรุณาเลือกแผนก --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}> {/* ✅ ใช้ ID เป็น Value */}
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700 w-16">รูป</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">ชื่อรายการ</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700 w-32">ประเภท</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700 w-60">จำนวนที่ต้องการเบิก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 w-16">
                        <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden">
                          {item.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1">
                              <button onClick={() => onUpdateQty(item.id, -1)} className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-500">
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center font-bold text-sm text-indigo-600">
                                {item.quantity}
                              </span>
                              <button onClick={() => onUpdateQty(item.id, 1)} className="p-1 hover:bg-slate-100 rounded transition-colors text-indigo-600">
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="text-slate-500 font-medium text-xs ml-1">{item.unit}</span>
                          </div>
                          <button onClick={() => onRemoveItem(item.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedItems.length === 0 && (
                <div className="text-center py-10 text-slate-400">ตะกร้าว่างเปล่า</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedDeptId || selectedItems.length === 0}
            className="px-8 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            ยืนยันใบเบิก
          </button>
        </div>
      </div>
    </div>
  );
}