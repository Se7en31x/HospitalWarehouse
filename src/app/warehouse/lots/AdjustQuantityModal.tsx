"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench, X, Save, ArrowRight,
  TrendingUp, TrendingDown, Loader2, BarChart3, Package,
} from "lucide-react";
import type * as LotInterface from "@/types/lot_type";

interface AdjustQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newQty: number, reason: string) => void;
  lot: LotInterface.UiLot | null;
  isAdjusting: boolean;
}

export default function AdjustQuantityModal({
  isOpen,
  onClose,
  onConfirm,
  lot,
  isAdjusting,
}: AdjustQuantityModalProps) {
  const [newQty, setNewQty] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (isOpen && lot) {
      setNewQty(lot.quantity);
      setReason("");
      setShowError(false);
    }
  }, [isOpen, lot]);

  if (!isOpen || !lot) return null;

  const diff = newQty - lot.quantity;

  const handleConfirm = () => {
    if (isAdjusting) return;
    // Guard: reason must not be empty — show red border instead of blocking the button
    if (reason.trim().length === 0) {
      setShowError(true);
      return;
    }
    console.log("Confirming with:", newQty, reason);
    onConfirm(Number(newQty), reason);
  };

  return (
    <>
      {/* ── Overlay ──────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-slate-900/50 z-[99]"
        onClick={isAdjusting ? undefined : onClose}
      />

      {/* ── Modal shell (pointer-events-none wrapper) ─────────────────────  */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">

        {/* Inner container — NOT a <form> so browser validation never blocks */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto flex flex-col border border-slate-200 max-h-[90vh]">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-slate-200 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Wrench className="w-5 h-5 text-[#0055FF]" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">ปรับปรุงยอดคงเหลือ</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isAdjusting}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Scrollable content ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Item Info — 3-column */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                <Package className="w-4 h-4" />
                ข้อมูลพัสดุ
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">ชื่อพัสดุ</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{lot.itemName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">หมวดหมู่</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{lot.category || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">คลัง</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{lot.warehouse || "—"}</p>
                </div>
              </div>
            </div>

            {/* Adjust section */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
                <BarChart3 className="w-4 h-4" />
                รายละเอียดการปรับยอด
              </p>

              {/*
                ── Quantity comparison row ──────────────────────────────
                Both boxes: identical h-[110px] + flex-col + justify-between
                Label pinned to top, number in middle, unit pinned to bottom.
                Arrow is a flex sibling → always vertically centered.
              */}
              <div className="flex items-center gap-3 mb-4">

                {/* Old qty — read-only
                    Structure: label (fixed top) / number (flex-1, true center) / unit (fixed bottom)
                    Mirrors the input box exactly so numbers sit on the same line. */}
                <div className="flex-1 flex flex-col items-center h-[110px] rounded-xl bg-white border border-slate-200">
                  <span className="pt-3 pb-1 text-xs font-semibold text-slate-400">
                    ยอดเดิม
                  </span>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-3xl font-bold text-slate-600 leading-none tabular-nums">
                      {lot.quantity.toLocaleString()}
                    </span>
                  </div>
                  <span className="pb-3 pt-1 text-xs text-slate-400">{lot.unit}</span>
                </div>

                {/* Arrow — vertically centered by flex items-center on parent */}
                <ArrowRight className="w-6 h-6 text-slate-300 shrink-0" />

                {/* New qty — editable, identical structure to left box */}
                <div className="flex-1 flex flex-col items-center h-[110px] rounded-xl bg-white border-2 border-[#0055FF]">
                  <span className="pt-3 pb-1 text-xs font-semibold text-[#0055FF]">
                    ยอดใหม่
                  </span>
                  <div className="flex-1 flex items-center justify-center w-full">
                    <input
                      type="number"
                      min="0"
                      value={newQty}
                      onChange={(e) =>
                        setNewQty(
                          e.target.value === ""
                            ? 0
                            : Math.max(0, Number(e.target.value))
                        )
                      }
                      className="w-full text-center text-3xl font-bold text-[#0055FF] bg-transparent outline-none leading-none tabular-nums"
                    />
                  </div>
                  <span className="pb-3 pt-1 text-xs text-[#0055FF]/60">{lot.unit}</span>
                </div>
              </div>

              {/* Diff badge — centered horizontally */}
              <div className="flex justify-center mb-5">
                {diff !== 0 ? (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                      diff > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {diff > 0
                      ? <TrendingUp className="w-3.5 h-3.5" />
                      : <TrendingDown className="w-3.5 h-3.5" />}
                    {diff > 0 ? "เพิ่มขึ้น" : "ลดลง"}{" "}
                    {Math.abs(diff).toLocaleString()} {lot.unit}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-slate-400 px-3 py-1.5 rounded-full bg-slate-100 border border-dashed border-slate-300">
                    ไม่มีการเปลี่ยนแปลง
                  </span>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  สาเหตุการปรับปรุง <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (showError) setShowError(false);
                  }}
                  placeholder="ระบุสาเหตุ เช่น นับสต็อกใหม่, สินค้าชำรุด, ตัดยอดผิดพลาด..."
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all focus:ring-2 ${
                    showError && reason.trim().length === 0
                      ? "border-red-500 bg-red-50 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 bg-white focus:ring-[#0055FF]/25 focus:border-[#0055FF]"
                  }`}
                />
                {showError && reason.trim().length === 0 && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    กรุณาระบุสาเหตุการปรับปรุงยอด
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer — shrink-0 ensures it is ALWAYS visible ──────────── */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isAdjusting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>

            {/*
              Confirm button — type="button" + explicit onClick bypasses ALL
              form/browser-validation interference.
              Color: solid #0055FF when active, clear slate-200 when disabled.
            */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isAdjusting}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[140px] bg-[#0055FF] hover:bg-[#0044DD] text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  ยืนยันปรับยอด
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
