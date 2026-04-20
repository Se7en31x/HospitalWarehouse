"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ChevronLeft, Loader2, Printer, Search, Trash2, X, Zap,
} from "lucide-react";
import Swal from "sweetalert2";
import toast, { Toaster } from "react-hot-toast";

import * as ReceiveSvc from "@/services/receiveService";
import * as ItemSvc from "@/services/itemsService";
import * as DeptSvc from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";
import { resolveBarcode } from "@/services/barcodeService";
import { printLabels } from "@/lib/printLabel";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReceiveSource = "purchase" | "donation" | "transfer";
type ItemKind = "CONSUMABLE" | "REUSABLE" | "MED_ASSET";

interface CatalogItem {
  id: string; name: string; code: string; kind: ItemKind;
  category: string; unit: string; warehouseId: string; warehouseName: string;
}

interface LineItem {
  lineId: string; itemId: string; itemName: string; itemCode: string;
  kind: ItemKind; unit: string; warehouseId: string;
  expectedQty: number; qty: number; costPrice: number;
  // CONSUMABLE
  lotCode: string; expiryDate: string; mfgDate: string;
  // REUSABLE / MED_ASSET
  warrantyDate: string; departmentId: number | null;
}

interface DocMeta {
  receiveDate: string; poNumber: string; supplierId: string;
  donorName: string; transferFrom: string; note: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KIND_CFG: Record<ItemKind, {
  label: string; colorCls: string; bgCls: string;
  badgeCls: string; ringCls: string;
}> = {
  CONSUMABLE: {
    label: "วัสดุสิ้นเปลือง",
    colorCls: "text-blue-700", bgCls: "bg-blue-50",
    badgeCls: "bg-blue-100 text-blue-700", ringCls: "focus:ring-blue-300",
  },
  REUSABLE: {
    label: "ของใช้ซ้ำ",
    colorCls: "text-violet-700", bgCls: "bg-violet-50",
    badgeCls: "bg-violet-100 text-violet-700", ringCls: "focus:ring-violet-300",
  },
  MED_ASSET: {
    label: "ครุภัณฑ์",
    colorCls: "text-amber-700", bgCls: "bg-amber-50",
    badgeCls: "bg-amber-100 text-amber-700", ringCls: "focus:ring-amber-300",
  },
};

const SOURCE_OPTIONS: { val: ReceiveSource; icon: string; label: string }[] = [
  { val: "purchase", icon: "🛒", label: "จัดซื้อ" },
  { val: "donation", icon: "🎁", label: "บริจาค" },
  { val: "transfer", icon: "🔄", label: "รับโอน" },
];

const INIT_DOC: DocMeta = {
  receiveDate: "", poNumber: "", supplierId: "",
  donorName: "", transferFrom: "", note: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeKind(type: string): ItemKind {
  const t = (type || "").toUpperCase();
  if (t === "REUSABLE") return "REUSABLE";
  if (t === "ASSET" || t === "MED_ASSET") return "MED_ASSET";
  return "CONSUMABLE";
}

function docNoPrefix(source: ReceiveSource, kind: ItemKind): string {
  if (kind === "REUSABLE") return "RUI";
  if (kind === "MED_ASSET") return "ASSET";
  if (source === "donation") return "DON";
  if (source === "transfer") return "TRF";
  return "REC";
}

function makeLine(item: CatalogItem): LineItem {
  return {
    lineId: `${Date.now()}-${Math.random()}`,
    itemId: item.id, itemName: item.name, itemCode: item.code,
    kind: item.kind, unit: item.unit, warehouseId: item.warehouseId,
    expectedQty: 1, qty: 1, costPrice: 0,
    lotCode: "", expiryDate: "", mfgDate: "",
    warrantyDate: "", departmentId: null,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReceiveFormPage() {
  const router = useRouter();

  const [catalog, setCatalog]     = useState<CatalogItem[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [source, setSource]   = useState<ReceiveSource>("purchase");
  const [docMeta, setDocMeta] = useState<DocMeta>(INIT_DOC);
  const patchDoc = (p: Partial<DocMeta>) => setDocMeta(d => ({ ...d, ...p }));

  const [lines, setLines]     = useState<LineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Scanner state
  const scanRef  = useRef<HTMLInputElement>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scannedRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [scanInput,  setScanInput]  = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [flashState, setFlashState] = useState<"idle" | "ok" | "err">("idle");
  const [lastScanned, setLastScanned] = useState<CatalogItem | null>(null);

  // Catalog manual search
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Supplier dropdown
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [items, supps, depts] = await Promise.all([
          ItemSvc.getInventoryItems(),
          ReceiveSvc.getSuppliers(),
          DeptSvc.getDepartmentOptions(),
        ]);
        setCatalog((items || []).map(item => ({
          id: item.id,
          name: item.name || "ไม่ระบุชื่อ",
          code: item.code || item.id,
          kind: normalizeKind(item.type || ""),
          category: item.category || "",
          unit: item.unit || "",
          warehouseId: item.warehouseId || "",
          warehouseName: item.location || "",
        })));
        setSuppliers(supps || []);
        setDepartments(depts || []);
      } catch {
        toast.error("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Outside-click — close dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-supplier-dd]")) setIsSupplierOpen(false);
      if (!t.closest("[data-catalog-dd]")) setIsCatalogOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Scanner helpers ───────────────────────────────────────────────────────

  const refocus = useCallback(() => setTimeout(() => scanRef.current?.focus(), 60), []);

  const flash = useCallback((type: "ok" | "err") => {
    setFlashState(type);
    clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setFlashState("idle"), 700);
  }, []);

  const addItem = useCallback((item: CatalogItem) => {
    setLines(prev => [...prev, makeLine(item)]);
    setLastScanned(item);
    clearTimeout(scannedRef.current);
    scannedRef.current = setTimeout(() => setLastScanned(null), 2500);
    flash("ok");
    setScanInput("");
    setCatalogSearch("");
    setIsCatalogOpen(false);
    refocus();
  }, [flash, refocus]);

  const handleScan = useCallback(async () => {
    const raw = scanInput.trim();
    if (!raw) return;
    setIsScanning(true);
    try {
      const result = await resolveBarcode(raw);
      if (!result) {
        flash("err");
        toast.error(`ไม่พบรหัส "${raw}"`);
        setScanInput("");
        refocus();
        return;
      }
      let itemId: string | null = null;
      if (result.type === "ITEM") itemId = result.item.id;
      else if (result.type === "LOT")  itemId = result.lot.item_id;
      else if (result.type === "UNIT") itemId = result.unit.item_id;

      const found = itemId ? catalog.find(c => c.id === itemId) : null;
      if (!found) {
        flash("err");
        toast.error("พบบาร์โค้ด แต่ไม่มีสินค้านี้ในแคตตาล็อก");
        setScanInput("");
        refocus();
        return;
      }
      addItem(found);
    } catch {
      flash("err");
      toast.error("เกิดข้อผิดพลาดในการสแกน");
    } finally {
      setIsScanning(false);
    }
  }, [scanInput, catalog, addItem, flash, refocus]);

  // ── Lines ─────────────────────────────────────────────────────────────────

  const updateLine = useCallback((id: string, patch: Partial<LineItem>) =>
    setLines(p => p.map(l => l.lineId === id ? { ...l, ...patch } : l)), []);

  const removeLine = useCallback((id: string) => {
    setLines(p => p.filter(l => l.lineId !== id));
    refocus();
  }, [refocus]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (lines.length === 0) { toast.error("ไม่มีรายการ"); return; }
    if (source === "donation" && !docMeta.donorName.trim()) {
      toast.error("กรุณาระบุชื่อผู้บริจาค"); return;
    }
    for (const l of lines) {
      if (l.expectedQty <= 0) { toast.error(`จำนวนในใบกำกับต้องมากกว่า 0 (${l.itemName})`); return; }
      if (l.qty < 0) { toast.error(`จำนวนรับจริงต้องไม่ติดลบ (${l.itemName})`); return; }
      if (l.qty > l.expectedQty) { toast.error(`จำนวนรับจริงต้องไม่เกินจำนวนในใบกำกับ (${l.itemName})`); return; }
      if (l.kind === "CONSUMABLE") {
        if (!l.lotCode.trim()) { toast.error(`กรุณาระบุ Lot Code: "${l.itemName}"`); return; }
        if (!l.expiryDate)      { toast.error(`กรุณาระบุวันหมดอายุ: "${l.itemName}"`); return; }
      }
    }

    setIsSaving(true);
    const ts         = Date.now();
    const batchNo    = `RCV-${ts}`;
    const isDonation = source === "donation";
    const receiveDateIso = docMeta.receiveDate
      ? new Date(docMeta.receiveDate).toISOString()
      : new Date().toISOString();

    const noteStr = [
      source === "transfer" && docMeta.transferFrom ? `รับโอนจาก: ${docMeta.transferFrom}` : null,
      docMeta.note || null,
    ].filter(Boolean).join(" — ") || null;

    // Group lines by kind
    const byKind = new Map<ItemKind, LineItem[]>();
    for (const l of lines) {
      if (!byKind.has(l.kind)) byKind.set(l.kind, []);
      byKind.get(l.kind)!.push(l);
    }

    const results: Array<{ docNo: string; kind: ItemKind; total: number }> = [];

    try {
      // Step 1: Create the batch record
      const acquisitionType = isDonation ? "DONATION" : source === "transfer" ? "TRANSFER" : "PURCHASE";
      const batch = await ReceiveSvc.createBatch({
        batch_no:         batchNo,
        acquisition_type: acquisitionType,
        supplier_id:      !isDonation ? (docMeta.supplierId || null) : null,
        donor_name:       isDonation  ? (docMeta.donorName  || null) : null,
        receive_date:     receiveDateIso,
        note:             noteStr,
      });

      // Step 2: Create a header per item-kind
      for (const [kind, kl] of byKind) {
        const docNo = `${docNoPrefix(source, kind)}-${ts}`;

        if (kind === "REUSABLE") {
          const res = await ReceiveSvc.createReusableReceive({
            doc_no:   docNo,
            batch_id: batch.id,
            note:     noteStr,
            items: kl.map(l => ({
              item_id:    l.itemId,
              cost_price: l.costPrice || 0,
              units: Array.from({ length: l.qty }).map(() => ({
                department_id: l.departmentId ? String(l.departmentId) : null,
                status:    "AVAILABLE" as const,
                condition: "GOOD"      as const,
              })),
            })),
          });
          results.push({ docNo: res.doc_no, kind, total: kl.reduce((a, l) => a + l.qty, 0) });

        } else if (kind === "MED_ASSET") {
          const buildNote = (l: LineItem) => {
            const parts: string[] = [];
            if (noteStr) parts.push(noteStr);
            if (l.qty < l.expectedQty) parts.push(`รับจริง ${l.qty}/${l.expectedQty} ชิ้น`);
            return parts.join(" — ") || null;
          };
          const res = await ReceiveSvc.createReceive({
            doc_no:   docNo,
            type:     "PURCHASE_ASSET",
            status:   "COMPLETED",
            batch_id: batch.id,
            note:     noteStr,
            items: kl.map(l => ({
              item_id:      l.itemId,
              warehouse_id: l.warehouseId || null,
              expected_qty: l.expectedQty,
              qty:          l.qty,
              cost_price:   l.costPrice || 0,
              note:         buildNote(l),
              department_id: l.departmentId || null,
            })),
          });
          results.push({ docNo: res.doc_no, kind, total: kl.reduce((a, l) => a + l.qty, 0) });

        } else {
          const res = await ReceiveSvc.createReceive({
            doc_no:   docNo,
            type:     isDonation ? "DONATION" : "PURCHASE",
            status:   "COMPLETED",
            batch_id: batch.id,
            note:     noteStr,
            items: kl.map(l => {
              const discrepancy = l.qty < l.expectedQty ? `รับจริง ${l.qty}/${l.expectedQty} ชิ้น` : null;
              return {
                item_id:      l.itemId,
                warehouse_id: l.warehouseId || null,
                expected_qty: l.expectedQty,
                qty:          l.qty,
                lot_code:     l.lotCode   || null,
                cost_price:   l.costPrice || 0,
                expired_at:   l.expiryDate ? new Date(l.expiryDate).toISOString() : null,
                note:         discrepancy,
              };
            }),
          });
          results.push({ docNo: res.doc_no, kind, total: kl.reduce((a, l) => a + l.qty, 0) });
        }
      }

      const isMixed = results.length > 1;
      const summaryRows = results.map(r => {
        const bg = r.kind === "CONSUMABLE" ? "#dbeafe" : r.kind === "REUSABLE" ? "#ede9fe" : "#fef3c7";
        const fg = r.kind === "CONSUMABLE" ? "#1d4ed8" : r.kind === "REUSABLE" ? "#6d28d9" : "#b45309";
        return `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f1f5f9">
          <span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:${bg};color:${fg};font-weight:700">${KIND_CFG[r.kind].label}</span>
          <code style="font-size:12px;color:#374151;font-family:monospace">${r.docNo}</code>
          <span style="color:#9ca3af;font-size:11px;margin-left:auto">${r.total} ชิ้น</span>
        </div>`;
      }).join("");

      await Swal.fire({
        title: isMixed ? "Mixed Receive สำเร็จ" : "บันทึกสำเร็จ",
        html: `
          <p style="font-size:12px;color:#6b7280;margin-bottom:10px">
            Batch: <code style="background:#f3f4f6;padding:2px 7px;border-radius:4px;font-size:13px;color:#374151">${batchNo}</code>
          </p>
          <div style="text-align:left">${summaryRows}</div>
        `,
        icon: "success",
        confirmButtonText: "ดูรายละเอียด",
        confirmButtonColor: "#2563eb",
      });

      setLines([]);
      setDocMeta(INIT_DOC);
      router.push(`/warehouse/receives/${batch.id}`);
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedSupplierName = useMemo(
    () => suppliers.find(s => s.id === docMeta.supplierId)?.name || "",
    [suppliers, docMeta.supplierId]
  );
  const filteredSuppliers = useMemo(
    () => suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())),
    [suppliers, supplierSearch]
  );
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalog.slice(0, 60);
    return catalog.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [catalog, catalogSearch]);

  const totalQty      = lines.reduce((a, l) => a + l.expectedQty, 0);
  const isMixedBatch  = new Set(lines.map(l => l.kind)).size > 1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 leading-tight">รับพัสดุเข้าคลัง</h1>
          {isMixedBatch && (
            <p className="text-xs text-violet-600 font-semibold">Mixed Batch — หลายประเภทในคราวเดียว</p>
          )}
        </div>
        {lines.length > 0 && (
          <span className="text-sm text-slate-500 shrink-0">
            <span className="font-bold text-slate-800">{lines.length}</span> รายการ ·{" "}
            <span className="font-bold text-slate-800">{totalQty}</span> ชิ้น
          </span>
        )}
        <button onClick={handleSave}
          disabled={lines.length === 0 || isSaving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0 shadow-sm">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          ยืนยันรับเข้า
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-5 space-y-4 pb-16">

        {/* ── Doc Header Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

          {/* Segmented Source Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5">
            {SOURCE_OPTIONS.map(opt => (
              <button key={opt.val}
                onClick={() => { setSource(opt.val); setDocMeta(INIT_DOC); setLines([]); refocus(); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  source === opt.val
                    ? "bg-white shadow-sm text-blue-700 border border-blue-100"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                <span>{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>

          {/* Dynamic fields grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            <FieldBox label="วันที่รับ">
              <input type="date" value={docMeta.receiveDate}
                onChange={e => patchDoc({ receiveDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </FieldBox>

            {source === "purchase" && (<>
              <FieldBox label="เลขที่ PO">
                <input type="text" value={docMeta.poNumber}
                  onChange={e => patchDoc({ poNumber: e.target.value })}
                  placeholder="PO-XXXX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </FieldBox>
              <FieldBox label="ผู้จำหน่าย">
                <div className="relative" data-supplier-dd>
                  <input type="text"
                    value={docMeta.supplierId ? selectedSupplierName : supplierSearch}
                    onChange={e => { setSupplierSearch(e.target.value); setIsSupplierOpen(true); if (docMeta.supplierId) patchDoc({ supplierId: "" }); }}
                    onFocus={() => setIsSupplierOpen(true)}
                    placeholder="ค้นหาผู้จำหน่าย..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 pr-8" />
                  {docMeta.supplierId && (
                    <button type="button"
                      onClick={() => { patchDoc({ supplierId: "" }); setSupplierSearch(""); refocus(); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSupplierOpen && !docMeta.supplierId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-40 max-h-48 overflow-y-auto">
                      {filteredSuppliers.length > 0
                        ? filteredSuppliers.map(s => (
                          <button key={s.id} type="button"
                            onClick={() => { patchDoc({ supplierId: s.id }); setSupplierSearch(""); setIsSupplierOpen(false); refocus(); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50">{s.name}</button>
                        ))
                        : <p className="px-4 py-3 text-sm text-slate-400 text-center">ไม่พบผู้จำหน่าย</p>
                      }
                    </div>
                  )}
                </div>
              </FieldBox>
            </>)}

            {source === "donation" && (
              <FieldBox label={<>ชื่อผู้บริจาค <span className="text-red-500">*</span></>}>
                <input type="text" value={docMeta.donorName}
                  onChange={e => patchDoc({ donorName: e.target.value })}
                  placeholder="ระบุชื่อผู้บริจาค"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                    !docMeta.donorName.trim() ? "border-red-300 bg-red-50" : "border-slate-300"
                  }`} />
              </FieldBox>
            )}

            {source === "transfer" && (
              <FieldBox label="หน่วยงานต้นทาง">
                <input type="text" value={docMeta.transferFrom}
                  onChange={e => patchDoc({ transferFrom: e.target.value })}
                  placeholder="ชื่อหน่วยงาน / แผนก"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </FieldBox>
            )}

            <div className={source === "purchase" ? "md:col-span-3" : "col-span-2"}>
              <FieldBox label="หมายเหตุ">
                <input type="text" value={docMeta.note}
                  onChange={e => patchDoc({ note: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </FieldBox>
            </div>
          </div>
        </div>

        {/* ── Command Center ── */}
        <div className={`rounded-2xl border-2 p-4 transition-all duration-300 shadow-sm ${
          flashState === "ok"  ? "border-green-400 bg-green-50 shadow-green-100/50" :
          flashState === "err" ? "border-red-400 bg-red-50 shadow-red-100/50"       :
          "border-slate-200 bg-white"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className={`w-4 h-4 shrink-0 transition-colors ${
              flashState === "ok" ? "text-green-500" : flashState === "err" ? "text-red-500" : "text-blue-500"
            }`} />
            <span className="text-sm font-bold text-slate-700">Command Center</span>
            <span className="text-xs text-slate-400 hidden sm:inline">— สแกนบาร์โค้ดหรือพิมพ์รหัสแล้วกด Enter</span>
            {isLoading && (
              <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />กำลังโหลด...
              </span>
            )}
          </div>

          {/* Hero scanner input */}
          <div className="flex gap-2 mb-3">
            <input ref={scanRef} autoFocus type="text" value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleScan(); } }}
              placeholder="สแกนบาร์โค้ด หรือพิมพ์รหัสสินค้า..."
              disabled={isLoading}
              className={`flex-1 text-base font-medium px-4 py-3 rounded-xl border-2 outline-none transition-colors placeholder:font-normal ${
                flashState === "ok"  ? "border-green-300 bg-green-50 text-green-900"   :
                flashState === "err" ? "border-red-300 bg-red-50 text-red-900"         :
                "border-slate-200 bg-white text-slate-900 focus:border-blue-400"
              }`} />
            <button type="button" onClick={() => void handleScan()}
              disabled={isScanning || !scanInput.trim() || isLoading}
              className="px-5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2 transition-colors shrink-0">
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              สแกน
            </button>
          </div>

          {/* Last scanned toast */}
          {lastScanned && (
            <div className="mb-3 flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${KIND_CFG[lastScanned.kind].badgeCls}`}>
                {KIND_CFG[lastScanned.kind].label}
              </span>
              <span className="font-semibold text-green-800 text-sm truncate">{lastScanned.name}</span>
              <span className="text-xs text-green-500 font-mono shrink-0 ml-auto">{lastScanned.code}</span>
            </div>
          )}

          {/* Manual catalog search */}
          <div className="relative" data-catalog-dd>
            <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${
              isCatalogOpen ? "bg-white border-blue-300 ring-2 ring-blue-100" : "bg-slate-50 border-slate-200"
            }`}>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input type="text" value={catalogSearch}
                onChange={e => { setCatalogSearch(e.target.value); setIsCatalogOpen(true); }}
                onFocus={() => setIsCatalogOpen(true)}
                placeholder="ค้นหาสินค้าจากรายการ (ทุกประเภท)..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400" />
              {catalogSearch && (
                <button type="button" onClick={() => { setCatalogSearch(""); setIsCatalogOpen(false); }}
                  className="text-slate-400 hover:text-slate-600 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {isCatalogOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto">
                {filteredCatalog.length > 0
                  ? filteredCatalog.map(item => (
                    <button key={item.id} type="button" onClick={() => addItem(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${KIND_CFG[item.kind].badgeCls}`}>
                          {KIND_CFG[item.kind].label}
                        </span>
                        <span className="font-medium text-slate-900 truncate text-sm">{item.name}</span>
                        <span className="text-xs text-slate-400 font-mono shrink-0 ml-auto">{item.code}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 pl-0.5">{item.category}</p>
                    </button>
                  ))
                  : (
                    <p className="px-4 py-5 text-sm text-slate-400 text-center">
                      {isLoading ? "กำลังโหลด..." : catalogSearch ? "ไม่พบสินค้า" : "พิมพ์ชื่อหรือรหัสสินค้าเพื่อค้นหา"}
                    </p>
                  )
                }
              </div>
            )}
          </div>
        </div>

        {/* ── Item Table ── */}
        {lines.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-sm">รายการรับพัสดุ</span>
                {isMixedBatch && (
                  <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Mixed</span>
                )}
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                {lines.length} รายการ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 w-9 text-center">#</th>
                    <th className="px-4 py-3 w-48">สินค้า</th>
                    <th className="px-4 py-3">รายละเอียด</th>
                    <th className="px-4 py-3 w-20 text-center">ใบกำกับ</th>
                    <th className="px-4 py-3 w-20 text-center">รับจริง</th>
                    <th className="px-4 py-3 w-28">ต้นทุน</th>
                    <th className="px-4 py-3 w-12 text-center">🖨️</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lines.map((line, idx) => (
                    <LineRow key={line.lineId} line={line} idx={idx}
                      departments={departments}
                      onUpdate={updateLine} onRemove={removeLine} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {lines.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <Zap className="w-10 h-10 text-slate-200" />
            <p className="text-sm font-medium">ยังไม่มีรายการ — เริ่มสแกนบาร์โค้ดหรือค้นหาจากรายการด้านบน</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FieldBox ──────────────────────────────────────────────────────────────────

function FieldBox({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── LineRow ───────────────────────────────────────────────────────────────────

interface LineRowProps {
  line: LineItem;
  idx: number;
  departments: DepartmentOption[];
  onUpdate: (id: string, p: Partial<LineItem>) => void;
  onRemove:  (id: string) => void;
}

function LineRow({ line, idx, departments, onUpdate, onRemove }: LineRowProps) {
  const cfg = KIND_CFG[line.kind];
  const up  = (p: Partial<LineItem>) => onUpdate(line.lineId, p);

  return (
    <tr className="group hover:bg-slate-50/70 transition-colors align-middle">

      {/* # */}
      <td className="px-4 py-2.5 text-center text-xs text-slate-400">{idx + 1}</td>

      {/* Item info */}
      <td className="px-4 py-2.5">
        <div className="flex items-start gap-2">
          <span className={`inline-flex shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.badgeCls}`}>
            {cfg.label}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm leading-snug truncate" title={line.itemName}>
              {line.itemName}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">{line.itemCode}</p>
          </div>
        </div>
      </td>

      {/* Dynamic extra fields */}
      <td className="px-4 py-2">

        {line.kind === "CONSUMABLE" && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <input type="text" value={line.lotCode}
              onChange={e => up({ lotCode: e.target.value })}
              placeholder="Lot Code *"
              className={`w-24 text-xs px-2.5 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-300 font-mono ${
                !line.lotCode ? "border-red-200 bg-red-50 placeholder:text-red-400" : "border-slate-200"
              }`} />
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 shrink-0">Exp</span>
              <input type="date" value={line.expiryDate}
                onChange={e => up({ expiryDate: e.target.value })}
                className={`text-xs px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-300 ${
                  !line.expiryDate ? "border-red-200 bg-red-50" : "border-slate-200"
                }`} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 shrink-0">Mfg</span>
              <input type="date" value={line.mfgDate}
                onChange={e => up({ mfgDate: e.target.value })}
                className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        )}

        {line.kind === "REUSABLE" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border shrink-0 ${cfg.bgCls} ${cfg.colorCls} border-violet-200`}>
              Auto Unit Code × {line.qty}
            </span>
            {line.qty < line.expectedQty && (
              <span className="text-[11px] text-amber-600 font-semibold">
                (ใบกำกับ {line.expectedQty})
              </span>
            )}
            <select value={line.departmentId ?? ""}
              onChange={e => up({ departmentId: e.target.value ? Number(e.target.value) : null })}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-violet-300 max-w-[160px]">
              <option value="">ส่วนกลาง / ไม่ระบุ</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {line.kind === "MED_ASSET" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border shrink-0 ${cfg.bgCls} ${cfg.colorCls} border-amber-200`}>
              Auto Asset Code × {line.qty}
            </span>
            {line.qty < line.expectedQty && (
              <span className="text-[11px] text-amber-600 font-semibold">
                (ใบกำกับ {line.expectedQty})
              </span>
            )}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 shrink-0">ประกัน</span>
              <input type="date" value={line.warrantyDate}
                onChange={e => up({ warrantyDate: e.target.value })}
                className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <select value={line.departmentId ?? ""}
              onChange={e => up({ departmentId: e.target.value ? Number(e.target.value) : null })}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-300 max-w-[150px]">
              <option value="">ส่วนกลาง / ไม่ระบุ</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
      </td>

      {/* Expected Qty (invoice) */}
      <td className="px-4 py-2.5 text-center">
        <input type="number" min="1" value={line.expectedQty}
          onChange={e => {
            const v = Math.max(1, Number(e.target.value));
            up({ expectedQty: v, qty: Math.min(line.qty, v) });
          }}
          className="w-16 text-center text-sm font-bold px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-300" />
      </td>

      {/* Actual Qty (received) */}
      <td className="px-4 py-2.5 text-center">
        <input type="number" min="0" max={line.expectedQty} value={line.qty}
          onChange={e => up({ qty: Math.min(Math.max(0, Number(e.target.value)), line.expectedQty) })}
          className={`w-16 text-center text-sm font-bold px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-blue-300 ${
            line.qty < line.expectedQty ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200"
          }`} />
      </td>

      {/* Cost */}
      <td className="px-4 py-2.5">
        <input type="number" min="0" step="0.01" value={line.costPrice}
          onChange={e => up({ costPrice: Number(e.target.value) })}
          className="w-full text-sm px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-300" />
      </td>

      {/* Print */}
      <td className="px-4 py-2.5 text-center">
        <button type="button" title="พิมพ์สติกเกอร์"
          onClick={() => printLabels([{ name: line.itemName, code: line.itemCode }])}
          className="p-1.5 text-slate-300 group-hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
          <Printer className="w-4 h-4" />
        </button>
      </td>

      {/* Remove */}
      <td className="px-4 py-2.5 text-center">
        <button type="button" onClick={() => onRemove(line.lineId)}
          className="p-1.5 text-slate-200 group-hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
