import React from "react";
import { X, Package, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { StockMovement, StockMovementType } from "@/types/stockmovement_type";

// ---- config ----
export const typeConfig: Record<
  StockMovementType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  RECEIVE_IN: {
    label: "รับเข้า",
    color: "text-emerald-700 bg-emerald-50",
    icon: <ArrowDownCircle className="w-3.5 h-3.5" />,
  },
  RECEIVE_CANCEL: {
    label: "ยกเลิกรับ",
    color: "text-rose-700 bg-rose-50",
    icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
  },
  OUT: {
    label: "เบิกจ่าย",
    color: "text-orange-700 bg-orange-50",
    icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
  },
  ADJUST_IN: {
    label: "ปรับเพิ่ม",
    color: "text-blue-700 bg-blue-50",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  ADJUST_OUT: {
    label: "ปรับลด",
    color: "text-amber-700 bg-amber-50",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  UPDATE: {
    label: "อัปเดต",
    color: "text-slate-600 bg-slate-100",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
};

// ---- TypeBadge ----
export const TypeBadge = ({ type }: { type: string }) => {
  const cfg = typeConfig[type as StockMovementType];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        {type}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ---- Detail Modal ----
export const MovementDetailModal = ({
  movement,
  onClose,
}: {
  movement: StockMovement;
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900">รายละเอียดการเคลื่อนไหว</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {/* Item */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg mb-6">
            {movement.item?.image_url ? (
              <img
                src={movement.item.image_url}
                alt={movement.item.name}
                className="w-16 h-16 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center">
                <Package className="w-7 h-7 text-slate-400" />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-800">
                {movement.item?.name ?? "ไม่ระบุสินค้า"}
              </p>
              <p className="text-xs text-slate-500">
                รหัส: {movement.item?.code ?? "-"}
              </p>
              <p className="text-xs text-slate-500">
                หมวดหมู่: {movement.item?.category ?? "-"} | หน่วย:{" "}
                {movement.item?.unit ?? "-"}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-6">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">ประเภท</p>
              <TypeBadge type={movement.type} />
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">จำนวน</p>
              <p
                className={`font-bold text-lg ${
                  ["DISPENSE", "ADJUST_OUT", "TRANSFER_OUT"].includes(movement.type)
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              >
                {["DISPENSE", "ADJUST_OUT", "TRANSFER_OUT"].includes(movement.type)
                  ? "-"
                  : "+"}
                {movement.quantity} {movement.item?.unit ?? ""}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">ผู้ดำเนินการ</p>
              <p className="font-medium text-slate-700">
                {movement.created_by ?? "-"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">วันที่/เวลา</p>
              <p className="font-medium text-slate-700">
                {new Date(movement.created_at).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          {movement.note && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">หมายเหตุ</p>
              <p className="text-sm text-slate-700">{movement.note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition font-medium"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
