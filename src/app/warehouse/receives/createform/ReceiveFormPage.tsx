"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Search, Trash2, X, CheckCircle2, Pencil,
} from "lucide-react";
import Swal from "sweetalert2";
import toast, { Toaster } from "react-hot-toast";

import * as ReceiveSvc from "@/services/receiveService";
import * as ItemSvc from "@/services/itemsService";
import * as DeptSvc from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";
import { resolveBarcode } from "@/services/barcodeService";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReceiveSource = "purchase" | "donation";
type ItemKind = "CONSUMABLE" | "REUSABLE" | "MED_ASSET";

interface CatalogItem {
  id: string; name: string; code: string; kind: ItemKind;
  category: string; unit: string; warehouseId: string; warehouseName: string;
}

interface LineItem {
  lineId: string; itemId: string; itemName: string; itemCode: string;
  category: string;
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
  { val: "purchase", icon: "🛒", label: "รับเข้าจัดซื้อ" },
  { val: "donation", icon: "🎁", label: "รับเข้าจากการบริจาค" },
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
  return "REC";
}

function makeLine(item: CatalogItem): LineItem {
  return {
    lineId: `${Date.now()}-${Math.random()}`,
    itemId: item.id, itemName: item.name, itemCode: item.code,
    category: item.category || "",
    kind: item.kind, unit: item.unit, warehouseId: item.warehouseId,
    expectedQty: 1, qty: 1, costPrice: 0,
    lotCode: "", expiryDate: "", mfgDate: "",
    warrantyDate: "", departmentId: null,
  };
}

// ── LocalStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "receive_form_draft";

function loadDraft() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveDraft(source: ReceiveSource, docMeta: DocMeta, lines: LineItem[], pendingLine: LineItem | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ source, docMeta, lines, pendingLine }, null, 2));
  } catch {
    // Silent fail
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent fail
  }
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
  const [isHydrated, setIsHydrated] = useState(false);

  // Scanner state
  const [scanInput,  setScanInput]  = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [pendingLine, setPendingLine] = useState<LineItem | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // Catalog manual search
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Supplier dropdown
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);

  // ── Bootstrap & Hydration ─────────────────────────────────────────────────

  useEffect(() => {
    // Load from localStorage on mount
    const draft = loadDraft();
    if (draft) {
      setSource(draft.source || "purchase");
      setDocMeta(draft.docMeta || INIT_DOC);
      setLines(
        (draft.lines || []).map((l: LineItem) => ({ ...l, category: l.category ?? "" })),
      );
      setPendingLine(
        draft.pendingLine
          ? { ...draft.pendingLine, category: draft.pendingLine.category ?? "" }
          : null,
      );
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [rawItems, supps, depts] = await Promise.all([
          ItemSvc.getInventoryApiItems(),
          ReceiveSvc.getSuppliers(),
          DeptSvc.getDepartmentOptions(),
        ]);
        setCatalog((rawItems || []).map(raw => {
          const ui = ItemSvc.mapApiToUi(raw);
          const categoryLabel = ItemSvc.resolveApiItemCategory(raw);
          return {
            id: ui.id,
            name: ui.name || "ไม่ระบุชื่อ",
            code: ui.code || ui.id,
            kind: normalizeKind(ui.type || ""),
            category: categoryLabel || (ui.category !== "-" ? ui.category : ""),
            unit: ui.unit || "",
            warehouseId: ui.warehouseId || "",
            warehouseName: ui.location || "",
          };
        }));
        setSuppliers(supps || []);
        setDepartments(depts || []);
      } catch {
        toast.error("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Save to localStorage ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isHydrated) return;
    saveDraft(source, docMeta, lines, pendingLine);
  }, [source, docMeta, lines, pendingLine, isHydrated]);

  // ── Handle source change ──────────────────────────────────────────────────

  const handleSourceChange = useCallback(async (newSource: ReceiveSource) => {
    if (newSource === source) return;
    if (lines.length === 0) {
      setSource(newSource);
      setDocMeta(INIT_DOC);
      return;
    }
    const result = await Swal.fire({
      icon: "warning",
      title: "เปลี่ยนประเภท",
      text: `คุณมีรายการ ${lines.length} รายการแล้ว ต้องการจะลบหรือไม่?`,
      showCancelButton: true,
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });
    if (result.isConfirmed) {
      setSource(newSource);
      setDocMeta(INIT_DOC);
      setLines([]);
      setPendingLine(null);
      setTimeout(() => {
        const input = document.querySelector('input[data-scan-input]') as HTMLInputElement;
        input?.focus();
      }, 60);
    }
  }, [source, lines.length]);

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

  const refocus = useCallback(() => setTimeout(() => {
    const input = document.querySelector('input[data-scan-input]') as HTMLInputElement;
    input?.focus();
  }, 60), []);

  const addItem = useCallback((item: CatalogItem) => {
    if (lines.some(l => l.itemId === item.id)) {
      Swal.fire({
        icon: "warning",
        title: "ซ้ำแล้ว",
        text: "รายการนี้มีในรายการแล้ว",
        confirmButtonText: "OK",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }
    setPendingLine(makeLine(item));
    setScanInput("");
    setCatalogSearch("");
    setIsCatalogOpen(false);
  }, [lines]);

  const patchPending = useCallback((p: Partial<LineItem>) => {
    setPendingLine(prev => prev ? { ...prev, ...p } : null);
  }, []);

  const confirmPendingLine = useCallback(() => {
    if (!pendingLine) return;
    if (pendingLine.expectedQty <= 0) { toast.error("จำนวนในใบกำกับต้องมากกว่า 0"); return; }
    if (pendingLine.qty < 0) { toast.error("จำนวนรับจริงต้องไม่ติดลบ"); return; }
    if (pendingLine.kind === "CONSUMABLE") {
      if (!pendingLine.lotCode.trim()) { toast.error("กรุณาระบุ Lot Code"); return; }
      if (!pendingLine.expiryDate) { toast.error("กรุณาระบุวันหมดอายุ"); return; }
    }
    if (editingLineId) {
      updateLine(editingLineId, pendingLine);
      setEditingLineId(null);
    } else {
      setLines(prev => [...prev, pendingLine]);
    }
    setPendingLine(null);
    refocus();
  }, [pendingLine, editingLineId, refocus]);

  const cancelPendingLine = useCallback(() => {
    setPendingLine(null);
    setEditingLineId(null);
    refocus();
  }, [refocus]);

  const editLine = useCallback((id: string) => {
    const line = lines.find(l => l.lineId === id);
    if (line) {
      setPendingLine(line);
      setEditingLineId(id);
    }
  }, [lines]);

  const handleScan = useCallback(async () => {
    const raw = scanInput.trim();
    if (!raw) return;
    setIsScanning(true);
    try {
      const result = await resolveBarcode(raw);
      if (!result) {
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
        toast.error("พบบาร์โค้ด แต่ไม่มีสินค้านี้ในแคตตาล็อก");
        setScanInput("");
        refocus();
        return;
      }
      addItem(found);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการสแกน");
    } finally {
      setIsScanning(false);
    }
  }, [scanInput, catalog, addItem, refocus]);

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

    const missingDoc: string[] = [];
    if (!docMeta.receiveDate.trim()) missingDoc.push("วันที่รับเข้า");
    if (source === "purchase") {
      if (!docMeta.poNumber.trim()) missingDoc.push("ใบส่งสินค้า");
      if (!docMeta.supplierId) missingDoc.push("ผู้จำหน่าย");
    }
    if (source === "donation" && !docMeta.donorName.trim()) {
      missingDoc.push("ชื่อผู้บริจาค");
    }
    if (missingDoc.length > 0) {
      const listHtml = missingDoc
        .map(m => `<li style="margin:6px 0">${m}</li>`)
        .join("");
      await Swal.fire({
        title: "ข้อมูลเอกสารไม่ครบ",
        html: `
          <p style="font-size:14px;color:#4b5563;margin:0 0 12px">กรุณากรอกรายการต่อไปนี้:</p>
          <ul style="text-align:left;margin:0;padding:0 0 0 1.25rem;list-style:disc;font-size:14px;color:#111827">
            ${listHtml}
          </ul>
        `,
        icon: "warning",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#2563eb",
      });
      return;
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
      const acquisitionType = isDonation ? "DONATION" : "PURCHASE";
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

      // แจ้งเตือนครั้งเดียวรวมทุก header ของ batch นี้
      ReceiveSvc.notifyBatch(batch.id).catch(() => {/* silent */});

      const isMixed = results.length > 1;
      const summaryRows = results.map(r => (
        `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f1f5f9">
          <code style="font-size:12px;color:#374151;font-family:monospace">${r.docNo}</code>
          <span style="color:#9ca3af;font-size:11px;margin-left:auto">${r.total} ชิ้น</span>
        </div>`
      )).join("");

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
      clearDraft();
      router.push(`/warehouse/receives/${batch.id}`);
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedSupplierName = suppliers.find(s => s.id === docMeta.supplierId)?.name || "";
  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
  const filteredCatalog = (() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalog.slice(0, 60);
    return catalog.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 60);
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Toaster position="top-right" />

      <div className="w-full p-6 flex flex-col flex-1">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-semibold text-gray-800">รับสินค้าเข้าคลัง</h2>
          </div>
          <button onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors">
            ย้อนกลับ
          </button>
        </div>

        <div className="space-y-6 w-full flex-1 flex flex-col">

          {/* ── แถบเลือกจัดซื้อ / บริจาค (แบบ reusable-unit-client) ── */}
          <div className="flex border-b border-slate-200">
            {SOURCE_OPTIONS.map(opt => {
              const isActive = source === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleSourceChange(opt.val)}
                  className={`px-5 py-3.5 text-base font-semibold border-b-2 transition-colors ${
                    isActive
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-6 w-full">
            {/* ── ข้อมูลเอกสาร (Left) ── */}
            <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <p className="text-base font-medium text-slate-600 mb-3">ข้อมูลเอกสาร</p>
              <div className="grid grid-cols-1 gap-4">

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    วันที่รับ <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={docMeta.receiveDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => patchDoc({ receiveDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {source === "purchase" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        ใบส่งสินค้า <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={docMeta.poNumber}
                        onChange={e => patchDoc({ poNumber: e.target.value })}
                        placeholder="เลขที่ใบส่งของ"
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div data-supplier-dd>
                      <label className="block text-sm font-medium text-slate-600 mb-2">
                        ผู้จำหน่าย <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                        <input type="text"
                          value={docMeta.supplierId ? selectedSupplierName : supplierSearch}
                          onChange={e => { setSupplierSearch(e.target.value); setIsSupplierOpen(true); if (docMeta.supplierId) patchDoc({ supplierId: "" }); }}
                          onFocus={() => setIsSupplierOpen(true)}
                          placeholder="ค้นหาผู้จำหน่าย..."
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        {docMeta.supplierId && (
                          <button type="button"
                            onClick={() => { patchDoc({ supplierId: "" }); setSupplierSearch(""); refocus(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {isSupplierOpen && !docMeta.supplierId && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-40 max-h-48 overflow-y-auto">
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
                    </div>
                  </>
                )}

                {source === "donation" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      ชื่อผู้บริจาค <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={docMeta.donorName}
                      onChange={e => patchDoc({ donorName: e.target.value })}
                      placeholder="ระบุชื่อผู้บริจาค"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">หมายเหตุ</label>
                  <input type="text" value={docMeta.note}
                    onChange={e => patchDoc({ note: e.target.value })}
                    placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* ── เพิ่มรายการสินค้า (Right) ── */}
            <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6 overflow-visible shadow-sm">
              <p className="text-base font-medium text-slate-600 mb-3">เพิ่มรายการสินค้า</p>

              <div className="space-y-4 overflow-visible">

                {/* Barcode Quick Scan */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-indigo-900 mb-2">สแกนบาร์โค้ดด่วน</label>
                  <div className="flex gap-2">
                    <input
                      data-scan-input
                      type="text" autoFocus value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleScan(); } }}
                      placeholder="สแกนรหัสเพื่อเติมข้อมูลสินค้า"
                      className="flex-1 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <button type="button" onClick={() => void handleScan()}
                      disabled={isScanning || !scanInput.trim()}
                      className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "สแกน"}
                    </button>
                  </div>
                </div>

                {/* Manual catalog search */}
                <div className="relative overflow-visible" data-catalog-dd>
                  <label className="block text-sm font-medium text-slate-600 mb-2">ค้นหาสินค้าจากรายการ</label>
                  <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors ${
                    isCatalogOpen ? "bg-white border-blue-300 ring-2 ring-blue-100" : "bg-slate-50 border-slate-200"
                  }`}>
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input type="text" value={catalogSearch}
                      onChange={e => { setCatalogSearch(e.target.value); setIsCatalogOpen(true); }}
                      onFocus={() => setIsCatalogOpen(true)}
                      placeholder="ค้นหาสินค้า (ชื่อ / รหัส)..."
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400" />
                    {catalogSearch && (
                      <button type="button" onClick={() => { setCatalogSearch(""); setIsCatalogOpen(false); }}
                        className="text-slate-400 hover:text-slate-600 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isCatalogOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                      {filteredCatalog.length > 0
                        ? filteredCatalog.map(item => (
                          <button key={item.id} type="button" onClick={() => addItem(item)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0">
                            <div className="flex items-center gap-3 min-w-0 w-full text-sm text-slate-500">
                              <span className="shrink-0 w-[6.5rem] truncate text-left" title={item.code}>
                                {item.code}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-left" title={item.name}>
                                {item.name}
                              </span>
                              <span className="shrink-0 max-w-[40%] min-w-0 truncate text-left" title={item.category || ""}>
                                {item.category || "—"}
                              </span>
                            </div>
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
            </div>
          </div>

          {/* ── Pending Line Form ── */}
          {pendingLine && (
            <PendingLineForm
              line={pendingLine}
              departments={departments}
              isEditing={editingLineId !== null}
              onPatch={patchPending}
              onConfirm={confirmPendingLine}
              onCancel={cancelPendingLine}
            />
          )}

          {/* ── Item Table ── */}
          {lines.length > 0 && (
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">รายการสินค้า</p>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                  {lines.length} รายการ
                </span>
              </div>
              <div style={{ overflowX: 'auto', overflowY: 'auto' } as React.CSSProperties}>
                <style>{`
                  div::-webkit-scrollbar {
                    width: 0;
                    height: 8px;
                  }
                  div::-webkit-scrollbar-track {
                    background: #f1f5f9;
                  }
                  div::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                  }
                  div::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                  }
                `}</style>
                <table className="w-full text-sm text-left table-fixed">
                  <thead className="bg-slate-50 text-slate-700 font-semibold shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 w-[40px] text-center">#</th>
                      <th className="px-6 py-4 w-[120px]">รหัส</th>
                      <th className="px-6 py-4 w-[180px] text-left">สินค้า</th>
                      <th className="px-6 py-4 w-[180px] text-left">หมวดหมู่</th>
                      <th className="px-6 py-4 w-[200px]">รายละเอียด</th>
                      <th className="px-6 py-4 w-[100px]">ใบกำกับ</th>
                      <th className="px-6 py-4 w-[80px]">รับจริง</th>
                      <th className="px-6 py-4 w-[80px]">หน่วย</th>
                      <th className="px-6 py-4 w-[120px]">ต้นทุน</th>
                      <th className="px-6 py-4 w-[50px] text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {lines.map((line, idx) => (
                      <LineRow key={line.lineId} line={line} idx={idx}
                        departments={departments}
                        onUpdate={updateLine} onRemove={removeLine} onEdit={editLine} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {lines.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 bg-white rounded-lg border border-dashed border-slate-200 text-slate-400">
              <Search className="w-10 h-10 text-slate-200" />
              <p className="text-sm font-medium">ยังไม่มีรายการ — เริ่มสแกนบาร์โค้ดหรือค้นหาจากรายการด้านบน</p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end mt-auto pt-6">
            <button onClick={handleSave}
              disabled={lines.length === 0 || isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              ยืนยันรับเข้า
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── FieldBox ──────────────────────────────────────────────────────────────────

function FieldBox({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">
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
  onEdit:    (id: string) => void;
}

function LineRow({ line, idx, departments, onUpdate, onRemove, onEdit }: LineRowProps) {
  return (
    <tr className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">

      {/* # */}
      <td className="px-6 py-3 text-center text-sm text-slate-400 font-mono">{idx + 1}</td>

      {/* Item code */}
      <td className="px-6 py-3">
        <p className="text-sm text-slate-600 font-mono">{line.itemCode}</p>
      </td>

      {/* Item name */}
      <td className="px-6 py-3 text-left">
        <p className="text-sm text-slate-600 leading-snug truncate text-left" title={line.itemName}>
          {line.itemName}
        </p>
      </td>

      {/* Category */}
      <td className="px-6 py-3 text-left">
        <p className="text-sm text-slate-600 leading-snug truncate text-left" title={line.category || ""}>
          {line.category || "—"}
        </p>
      </td>

      {/* Dynamic details - Display Only */}
      <td className="px-6 py-3">
        {line.kind === "CONSUMABLE" && (
          <div className="flex flex-col gap-1">
            {line.lotCode && (
              <div className="text-sm">
                <span className="text-slate-400">เลขลอต: </span>
                <span className="font-mono text-slate-900">{line.lotCode}</span>
              </div>
            )}
            {line.mfgDate && (
              <div className="text-sm">
                <span className="text-slate-400">วันผลิต: </span>
                <span className="font-mono text-slate-900">{new Date(line.mfgDate).toLocaleDateString("th-TH")}</span>
              </div>
            )}
            {line.expiryDate && (
              <div className="text-sm">
                <span className="text-slate-400">วันหมดอายุ: </span>
                <span className="font-mono text-slate-900">{new Date(line.expiryDate).toLocaleDateString("th-TH")}</span>
              </div>
            )}
          </div>
        )}

        {line.kind === "REUSABLE" && (
          <div className="flex flex-col gap-1">
            {line.departmentId && (
              <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                {departments.find(d => d.id === line.departmentId)?.name || "—"}
              </span>
            )}
          </div>
        )}

        {line.kind === "MED_ASSET" && (
          <div className="flex flex-col gap-1">
            {line.warrantyDate && (
              <div className="text-sm">
                <span className="text-slate-400">ประกัน: </span>
                <span className="text-slate-900">{new Date(line.warrantyDate).toLocaleDateString("th-TH")}</span>
              </div>
            )}
            {line.departmentId && (
              <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                {departments.find(d => d.id === line.departmentId)?.name || "—"}
              </span>
            )}
          </div>
        )}
      </td>

      {/* Expected Qty - Display Only */}
      <td className="px-6 py-3">
        <span className="text-sm text-slate-900">
          {line.expectedQty}
        </span>
      </td>

      {/* Actual Qty - Display Only */}
      <td className="px-6 py-3">
        <span className="text-sm text-slate-900">
          {line.qty}
        </span>
      </td>

      {/* Unit */}
      <td className="px-6 py-3">
        <span className="text-sm text-slate-600">{line.unit}</span>
      </td>

      {/* Cost - Display Only */}
      <td className="px-6 py-3">
        <span className="text-sm text-slate-900 font-mono">
          {line.costPrice ? `฿${line.costPrice.toFixed(2)}` : "—"}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button type="button" onClick={() => onEdit(line.lineId)}
            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
            <Pencil className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => onRemove(line.lineId)}
            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── PendingLineForm ───────────────────────────────────────────────────────────

interface PendingLineFormProps {
  line: LineItem;
  departments: DepartmentOption[];
  isEditing: boolean;
  onPatch: (p: Partial<LineItem>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function PendingLineForm({ line, departments, isEditing, onPatch, onConfirm, onCancel }: PendingLineFormProps) {
  const cfg = KIND_CFG[line.kind];
  const borderCls =
    line.kind === "CONSUMABLE" ? "border-blue-400"   :
    line.kind === "REUSABLE"   ? "border-violet-400" : "border-amber-400";
  const headerBgCls =
    line.kind === "CONSUMABLE" ? "bg-blue-50"   :
    line.kind === "REUSABLE"   ? "bg-violet-50" : "bg-amber-50";
  const confirmBtnCls =
    line.kind === "CONSUMABLE" ? "bg-blue-600 hover:bg-blue-700"     :
    line.kind === "REUSABLE"   ? "bg-violet-600 hover:bg-violet-700" : "bg-amber-600 hover:bg-amber-700";

  return (
    <div className={`rounded-lg border-2 ${borderCls} bg-white shadow-md overflow-hidden`}>
      {/* Header */}
      <div className={`${headerBgCls} px-6 py-4 flex items-center justify-between border-b border-slate-200 gap-3`}>
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap justify-start text-left">
          <span className="sr-only">{cfg.label}</span>
          <p className="text-sm text-slate-500 shrink-0" title={line.itemCode}>{line.itemCode}</p>
          <p className="text-sm text-slate-500 truncate min-w-0 max-w-lg" title={line.itemName}>
            {line.itemName}
          </p>
          <p className="text-sm text-slate-500 min-w-0 max-w-xs truncate text-left" title={line.category || ""}>
            {line.category || "—"}
          </p>
        </div>
        <button type="button" onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-white/70 text-slate-600 hover:text-slate-700 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="p-6">
        {line.kind === "CONSUMABLE" && (
          <div className="grid grid-cols-6 gap-3 mb-4">
            <FieldBox label="ใบกำกับ (ชิ้น)">
              <input
                type="number" min="1" value={line.expectedQty}
                autoFocus={false}
                onChange={e => {
                  const v = Math.max(1, Number(e.target.value));
                  onPatch({ expectedQty: v, qty: Math.min(line.qty, v) });
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300"
              />
            </FieldBox>

            <FieldBox label="รับจริง (ชิ้น)">
              <input
                type="number" min="0" max={line.expectedQty} value={line.qty}
                onChange={e => onPatch({ qty: Math.min(Math.max(0, Number(e.target.value)), line.expectedQty) })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300"
              />
            </FieldBox>

            <FieldBox label={<>Lot Code <span className="text-red-500">*</span></>}>
              <input
                type="text" value={line.lotCode} autoFocus
                onChange={e => onPatch({ lotCode: e.target.value })}
                placeholder="LOT-XXXX"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-300"
              />
            </FieldBox>

            <FieldBox label="ต้นทุน/ชิ้น (บาท)">
              <input
                type="number" min="0" step="0.01" value={line.costPrice}
                onChange={e => onPatch({ costPrice: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
            </FieldBox>

            <FieldBox label="วันผลิต">
              <input
                type="date" value={line.mfgDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => onPatch({ mfgDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
            </FieldBox>

            <FieldBox label={<>วันหมดอายุ <span className="text-red-500">*</span></>}>
              <input
                type="date" value={line.expiryDate}
                min={line.mfgDate}
                onChange={e => onPatch({ expiryDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
            </FieldBox>
          </div>
        )}

        {line.kind === "REUSABLE" && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <FieldBox label="ใบกำกับ (ชิ้น)">
              <input
                type="number" min="1" value={line.expectedQty}
                autoFocus={true}
                onChange={e => {
                  const v = Math.max(1, Number(e.target.value));
                  onPatch({ expectedQty: v, qty: Math.min(line.qty, v) });
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
              />
            </FieldBox>

            <FieldBox label="รับจริง (ชิ้น)">
              <input
                type="number" min="0" max={line.expectedQty} value={line.qty}
                onChange={e => onPatch({ qty: Math.min(Math.max(0, Number(e.target.value)), line.expectedQty) })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300"
              />
            </FieldBox>

            <FieldBox label="ต้นทุน/ชิ้น (บาท)">
              <input
                type="number" min="0" step="0.01" value={line.costPrice}
                onChange={e => onPatch({ costPrice: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300"
              />
            </FieldBox>

            <FieldBox label="แผนก">
              <select
                value={line.departmentId ?? ""}
                onChange={e => onPatch({ departmentId: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300"
              >
                <option value="">ส่วนกลาง / ไม่ระบุ</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FieldBox>
          </div>
        )}

        {line.kind === "MED_ASSET" && (
          <div className="grid grid-cols-5 gap-3 mb-4">
            <FieldBox label="ใบกำกับ (ชิ้น)">
              <input
                type="number" min="1" value={line.expectedQty}
                autoFocus={true}
                onChange={e => {
                  const v = Math.max(1, Number(e.target.value));
                  onPatch({ expectedQty: v, qty: Math.min(line.qty, v) });
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-300"
              />
            </FieldBox>

            <FieldBox label="รับจริง (ชิ้น)">
              <input
                type="number" min="0" max={line.expectedQty} value={line.qty}
                onChange={e => onPatch({ qty: Math.min(Math.max(0, Number(e.target.value)), line.expectedQty) })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-300"
              />
            </FieldBox>

            <FieldBox label="ต้นทุน/ชิ้น (บาท)">
              <input
                type="number" min="0" step="0.01" value={line.costPrice}
                onChange={e => onPatch({ costPrice: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </FieldBox>

            <FieldBox label="วันหมดประกัน">
              <input
                type="date" value={line.warrantyDate}
                onChange={e => onPatch({ warrantyDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              />
            </FieldBox>

            <FieldBox label="แผนก">
              <select
                value={line.departmentId ?? ""}
                onChange={e => onPatch({ departmentId: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="">ส่วนกลาง / ไม่ระบุ</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FieldBox>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">
            ยกเลิก
          </button>
          <button type="button" onClick={onConfirm}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm text-white shadow-sm transition-colors ${confirmBtnCls}`}>
            <CheckCircle2 className="w-4 h-4" />
            {isEditing ? "บันทึกแก้ไข" : "เพิ่มรายการ"}
          </button>
        </div>
      </div>
    </div>
  );
}
