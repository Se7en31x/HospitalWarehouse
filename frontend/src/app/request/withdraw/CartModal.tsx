"use client";

import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import * as RequisitionSvc from "@/services/requisitionService";

const MySwal = withReactContent(Swal);

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

interface Department {
  code: string;
  name: string;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  selectedDeptId: string;
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
  const handleSubmit = async () => {
    if (!selectedDeptId || selectedItems.length === 0) {
      MySwal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณาเลือกแผนกและสินค้า",
      });
      return;
    }

    // ค้นหาชื่อแผนกจาก Code ที่เลือก
    const currentDept = departments.find((d) => d.code === selectedDeptId);
    const deptName = currentDept ? currentDept.name : "แผนกทั่วไป";

    onClose();

    const confirm = await MySwal.fire({
      title: "ยืนยันการส่งใบเบิก?",
      html: `เบิกในนามแผนก: <b class="text-indigo-600">${deptName}</b>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      const payload: RequisitionSvc.RequisitionPayload = {
        type: "WITHDRAW",
        department_id: selectedDeptId,
        department_name: deptName,
        items: selectedItems.map((i) => ({
          item_id: Number(i.id),
          qty: i.quantity,
        })),
        note: "เบิกออนไลน์ผ่านระบบ",
      };

      const res = await RequisitionSvc.createRequisition(payload);
      if (res.success) {
        await MySwal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: "ส่งใบเบิกเรียบร้อย",
          timer: 1500,
        });
        onSuccess();
      } else throw new Error(res.message);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      await MySwal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: msg,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart size={20} className="text-indigo-600" /> ตะกร้าของฉัน
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Department Selection */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <label className="text-[10px] font-bold text-indigo-600 uppercase mb-2 block">
              ระบุแผนกที่เบิก
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => onDeptChange(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- กรุณาเลือกแผนก --</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  แผนก{d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700 w-16">รูป</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">ชื่อราคการ</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700 w-32">ประเภท</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700 w-60">จำนวนที่ต้องการเบิก</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 w-16">
                        <div className="w-12 h-12 bg-slate-300 rounded-lg flex-shrink-0"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 w-32">{item.category}</td>
                      <td className="px-4 py-3 text-left w-60">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1">
                              <button
                                onClick={() => onUpdateQty(item.id, -1)}
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center font-bold text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQty(item.id, 1)}
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="text-slate-700 font-semibold text-nowrap">{item.unit}</span>
                          </div>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0"
                            title="ลบรายการ"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedItems.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  ตะกร้าว่างเปล่า
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedDeptId || selectedItems.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ยืนยันใบเบิก
          </button>
        </div>
      </div>
    </div>
  );
}
