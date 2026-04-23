"use client";

import React, { useState } from "react";
import { Minus, Plus, ShoppingCart, X, ChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
// ✅ ใช้ Path Alias และชื่อไฟล์ตัวเล็กตามที่ตกลงกัน
import * as RequisitionSvc from "@/services/requisitionService";
import { useAuth } from "@/hooks/useAuth";
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
  type?: string;
  quantity: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  selectedDeptId: number | null;
  departments: ReturnType<typeof useAuth>["departments"];
  onDeptChange: (deptId: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onSuccess: () => void;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

/** Returns the display name for a department (already Thai from DB). */
const deptTh = (name?: string | null): string => name || "ไม่ระบุ";

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
  const [isDeptOpen, setIsDeptOpen] = useState(false);

  // Show all departments from role, translate name if available
  const mappedDepts = departments;

  // ตัวจัดการ click-outside สำหรับปิด dropdown
  React.useEffect(() => {
    if (!isDeptOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dept-dropdown]")) {
        setIsDeptOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDeptOpen]);

  // ปิด dropdown เมื่อ modal ถูกปิด
  React.useEffect(() => {
    if (!isOpen) {
      setIsDeptOpen(false);
    }
  }, [isOpen]);

  const selectedDept = departments.find((d) => d.id === selectedDeptId);
  const selectedDeptName = selectedDept ? deptTh(selectedDept.name) : "-- กรุณาเลือกแผนก --";

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
    const currentDept = departments.find((d) => d.id === selectedDeptId);
    const deptDisplayName = currentDept ? deptTh(currentDept.name) : "แผนกที่เลือก";

    onClose();

    const confirm = await MySwal.fire({
      title: "ยืนยันการส่งใบเบิก?",
      html: `เบิกในนามแผนก: <b class="text-indigo-600">${deptDisplayName}</b>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0055FF",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "ยืนยันส่งข้อมูล",
      cancelButtonText: "ตรวจสอบอีกครั้ง",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    // Show loading
    MySwal.fire({
      html: `<div style="display:flex;justify-content:center;align-items:center;padding:24px 0">
        <div style="width:52px;height:52px;border-radius:50%;border:5px solid transparent;border-top-color:#0055FF;animation:spin 0.8s linear infinite"></div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: "transparent",
      backdrop: "rgba(0,0,0,0.1)",
      customClass: { popup: "shadow-none" },
    });

    try {
      const payload: RequisitionPayload = {
        type: "WITHDRAW",
        department_id: selectedDeptId as number,
        items: selectedItems.map((i) => ({
          item_id: i.id,
          qty: Number(i.quantity),
        })),
        note: "เบิกออนไลน์ผ่านระบบ Portal",
      };

      const res = await RequisitionSvc.createRequisition(payload);

      if (res.success) {
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
      <div className="bg-white rounded-xl w-full max-w-[min(100%,46.2rem)] shadow-xl flex flex-col max-h-[93.5vh]">

        {/* Header */}
        <div className="px-[1.65rem] py-[1.1rem] border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            ตะกร้าของฉัน
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Department Selection - outside scroll area so dropdown can overflow */}
        <div className="px-[1.65rem] pt-[1.65rem] pb-0">
          <div className="border border-slate-300 rounded-lg p-[1.1rem]">
            <div className="relative" data-dept-dropdown>
              <label className="text-sm font-bold text-slate-800 uppercase mb-3 block">
                ระบุแผนกที่เบิก
              </label>
              <button
                type="button"
                onClick={() => setIsDeptOpen(!isDeptOpen)}
                className="flex items-center justify-between gap-2 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm"
              >
                <span className="text-slate-800 font-medium">{selectedDeptName}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDeptOpen ? "rotate-180" : ""}`} />
              </button>

              {isDeptOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-30 overflow-y-auto" style={{ maxHeight: "242px" }}>
                  <ul className="py-1">
                    {mappedDepts.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onDeptChange(d.id);
                            setIsDeptOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-l-4 ${d.id === selectedDeptId
                              ? "bg-indigo-50 border-indigo-600 text-indigo-700 font-bold"
                              : "border-transparent text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          {deptTh(d.name)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content — กล่องตารางล็อคสูงพอ ~4 แถว (เลื่อนเมื่อรายการเกิน) */}
        <div className="p-[1.65rem] flex-1 min-h-0 flex flex-col overflow-y-auto">

          <div className="border border-slate-200 rounded-lg overflow-hidden h-[24.2rem] min-h-[24.2rem] max-h-[24.2rem] flex flex-col bg-white">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-0 gap-3 text-slate-400 bg-slate-50 px-4">
                <ShoppingCart size={40} className="text-slate-300" />
                <div className="text-center">
                  <p className="font-semibold text-slate-600">ตะกร้าว่างเปล่า</p>
                  <p className="text-xs text-slate-500 mt-1">กรุณาเลือกรายการที่ต้องการเบิก</p>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto min-h-0 flex-1">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-700 w-20">รูป</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-700">ชื่อรายการ</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-700 w-[9.5rem]">หมวดหมู่</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-700 w-52">จำนวนที่ต้องการเบิก</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 w-20 align-top">
                          <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                            {item.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top min-w-0">
                          <div className="font-semibold text-slate-800 break-words">{item.name}</div>
                          <div className="text-xs text-slate-500 font-mono break-all">{item.code}</div>
                        </td>
                        <td className="px-4 py-3 align-top w-[9.5rem]">
                          <span className="text-slate-700 line-clamp-2" title={item.category?.trim() || undefined}>
                            {item.category?.trim() ? item.category : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top w-52">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shrink-0">
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
                              <span className="text-slate-500 font-medium text-xs ml-1 truncate">{item.unit}</span>
                            </div>
                            <button onClick={() => onRemoveItem(item.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.65rem] py-[1.1rem] border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedDeptId || selectedItems.length === 0}
            className="px-8 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            ยืนยันใบเบิก
          </button>
        </div>
      </div>
    </div>
  );
}