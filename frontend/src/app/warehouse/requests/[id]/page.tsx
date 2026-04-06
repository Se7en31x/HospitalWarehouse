"use client";

import React, { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  X, PackageCheck, Building2, User, Loader2, Minus, Plus, ScanLine, Trash2, ArrowRight
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  getRequisitionById,
  approveRequisition,
  rejectRequisition,
  completeRequisitionDelivery
} from "../../../../services/requisitionService";
import { RequisitionHeader, RequisitionItem, RequisitionItemLots, RequisitionItemUnits } from "../../../../types/requisition_type";
import { useAuth } from "@/lib/useAuth"; 

export interface ItemAllocation {
  qty: number;
  lots: Record<string, number>; 
  units: string[]; 
}

export default function RequisitionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const reqId = parseInt(unwrappedParams.id, 10);
  
  const { departments } = useAuth();
  const [requisition, setRequisition] = useState<RequisitionHeader | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const [allocations, setAllocations] = useState<Record<number, ItemAllocation>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [scanInput, setScanInput] = useState("");

  const isPending = requisition?.status === 'PENDING';
  const isApproved = requisition?.status === 'APPROVED';
  const canCompleteDelivery = isApproved && requisition?.type === 'WITHDRAW';

  const displayDeptName = useCallback((req: RequisitionHeader): string => {
    const deptInAuth = departments?.find(d => d.id === req.department_id);
    if (deptInAuth) return deptInAuth.name;
    return req.department_id ? `แผนก (${req.department_id})` : "ไม่ระบุแผนก";
  }, [departments]);
  
  const displayRequesterName = (req: RequisitionHeader): string => {
    return req.requester || req.requester_id || "ไม่ระบุผู้ทำรายการ";
  };

  const fetchRequisition = async () => {
    setIsFetching(true);
    try {
      const res = await getRequisitionById(reqId);
      if (res.success && res.data) {
        setRequisition(res.data);
      } else {
        toast.error(res.message || "ไม่สามารถโหลดรายละเอียดได้");
        router.push("/warehouse/requests");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ 서버");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!isNaN(reqId)) {
      fetchRequisition();
    }
  }, [reqId]);

  useEffect(() => {
    if (requisition && requisition.items) {
      if (Object.keys(allocations).length === 0) {
          const initialAllocs: Record<number, ItemAllocation> = {};
          requisition.items.forEach((item: RequisitionItem) => {
            initialAllocs[item.id] = { qty: 0, lots: {}, units: [] };
          });
          setAllocations(initialAllocs);
          if (requisition.items.length > 0) {
            setSelectedItemId(requisition.items[0].id);
          }
      }
    }
  }, [requisition]);

  useEffect(() => {
    if (!requisition || !isPending) return;
    
    setAllocations(prev => {
      const newAllocs = { ...prev };
      let changed = false;
      
      requisition.items.forEach((item: RequisitionItem) => {
        const isReusable = item.itemType === 'REUSABLE';
        const alloc = newAllocs[item.id];
        
        if (!isReusable && item.available_lots && alloc && alloc.qty === 0 && Object.keys(alloc.lots).length === 0) {
          let remaining = item.qty || 0;
          const autoLots: Record<string, number> = {};
          let totalTaken = 0;

          item.available_lots.forEach((lot: RequisitionItemLots) => {
            if (remaining <= 0 || lot.quantity <= 0) return;
            const take = Math.min(remaining, lot.quantity);
            autoLots[lot.id.toString()] = take;
            remaining -= take;
            totalTaken += take;
          });

          newAllocs[item.id] = { qty: totalTaken, lots: autoLots, units: [] };
          changed = true;
        }
      });
      return changed ? newAllocs : prev;
    });
  }, [requisition, isPending]);

  const updateAllocation = (id: number, val: ItemAllocation) => {
    setAllocations(prev => ({ ...prev, [id]: val }));
  };

  const handleUpdateLotQty = (id: number, lotId: string, newQty: number, maxLotQty: number) => {
    const validQty = Math.max(0, Math.min(newQty, maxLotQty));
    const alloc = allocations[id];
    if (!alloc) return;

    const newLots = { ...alloc.lots };
    newLots[lotId] = validQty;

    const newTotal = Object.values(newLots).reduce((sum, q) => sum + q, 0);

    updateAllocation(id, {
      ...alloc,
      qty: newTotal,
      lots: newLots
    });
  };

  const handleScanUnit = (currentItem: RequisitionItem) => {
    const raw = scanInput.trim();
    if (!raw) return;

    const alloc = allocations[currentItem.id];
    if (!alloc) return;

    if (alloc.qty >= currentItem.qty) {
      toast.error("ยิงบาร์โค้ดครบจำนวนที่ขอแล้ว");
      setScanInput("");
      return;
    }

    const foundUnit = currentItem.available_units?.find((u: RequisitionItemUnits) => u.unit_code.toLowerCase() === raw.toLowerCase());
    if (!foundUnit) {
      toast.error(`ไม่พบบาร์โค้ด ${raw} ในรายการที่พร้อมใช้งาน`);
      setScanInput("");
      return;
    }

    if (alloc.units.includes(foundUnit.id)) {
      toast.error(`สแกนบาร์โค้ด ${raw} ไปแล้ว`);
      setScanInput("");
      return;
    }

    const newUnits = [...alloc.units, foundUnit.id];
    updateAllocation(currentItem.id, {
      ...alloc,
      qty: newUnits.length,
      units: newUnits
    });
    
    toast.success(`เพิ่ม ${foundUnit.unit_code} สำเร็จ!`);
    setScanInput("");
  };

  const handleApprove = async () => {
    if (!requisition) return;

    if (Object.values(allocations).every(a => a.qty === 0)) {
        toast.error("กรุณาระบุจำนวนที่จะจ่ายอย่างน้อย 1 รายการ");
        return;
    }

    const loadId = toast.loading("กำลังตรวจสอบและตัดสต็อกเจาะจง...");
    setIsLoading(true);
    try {
      const payload: Record<string, ItemAllocation> = {};
      Object.entries(allocations).forEach(([k, v]) => {
          if (v.qty > 0) payload[k] = v;
      });

      const res = await approveRequisition(requisition.id, payload);
      if (res.success) {
        toast.success("อนุมัติและตัดสต็อกสำเร็จ!", { id: loadId });
        router.push("/warehouse/requests");
      } else {
        throw new Error(res.message || "เกิดข้อผิดพลาดจากระบบ");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอนุมัติ";
      toast.error(errMsg, { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requisition) return;
    const reason = window.prompt("ระบุเหตุผลที่ปฏิเสธการเบิก:");
    if (!reason?.trim()) return;

    const loadId = toast.loading("กำลังดำเนินการ...");
    setIsLoading(true);
    try {
      const res = await rejectRequisition(requisition.id, reason.trim());
      if (res.success) {
        toast.success("ปฏิเสธรายการแล้ว", { id: loadId });
        router.push("/warehouse/requests");
      } else {
        throw new Error(res.message || "ไม่สามารถดำเนินการได้");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(errMsg, { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!requisition) return;
    const confirmed = window.confirm(`ยืนยันนำส่งใบ ${requisition.doc_no} แล้วใช่หรือไม่?`);
    if (!confirmed) return;

    const loadId = toast.loading("กำลังบันทึกการนำส่ง...");
    setIsLoading(true);
    try {
      const res = await completeRequisitionDelivery(requisition.id);
      if (res.success) {
        toast.success("บันทึกการนำส่งเรียบร้อย", { id: loadId });
        router.push("/warehouse/requests");
      } else {
        throw new Error(res.message || "ไม่สามารถบันทึกการนำส่งได้");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(errMsg, { id: loadId });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedItem = useMemo(() => {
    return requisition?.items?.find((i: RequisitionItem) => i.id === selectedItemId);
  }, [requisition, selectedItemId]);

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลใบเบิก...</p>
      </div>
    );
  }

  if (!requisition) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Header Bar */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10 w-full">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/warehouse/requests")} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X size={24} />
          </button>
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-sm">
            <PackageCheck size={18} />
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{requisition.doc_no}</h2>
            <span className={`px-2 py-0.5 rounded textxs font-bold uppercase ${requisition.type === 'BORROW' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {requisition.type === 'BORROW' ? 'ยืมครุภัณฑ์' : 'เบิกของสิ้นเปลือง'}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
               <User size={16} className="text-slate-400" />
               <span className="text-slate-600 font-medium">{displayRequesterName(requisition)}</span>
            </div>
            <div className="flex items-center gap-2">
               <Building2 size={16} className="text-slate-400" />
               <span className="text-slate-600 font-medium">{displayDeptName(requisition)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isPending ? (
             <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border">รอดำเนินการตัดคลัง</span>
          ) : (
             <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">{requisition.status}</span>
          )}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden w-full" style={{ height: "calc(100vh - 64px - 64px)" }}>
        
        {/* Left Side (70%) - Big Table */}
        <div className="w-[70%] bg-white flex flex-col border-r border-slate-200">
          <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               รายการที่ต้องเบิกจ่าย <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs">{requisition.items?.length || 0}</span>
             </h3>
             <p className="text-xs text-slate-500">* คลิกที่รายการเพื่อระบุการจ่าย (Lot / บาร์โค้ดชิ้น) ทางด้านขวามือ</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
                <tr className="uppercase text-[10px] font-black text-slate-400 tracking-wider">
                  <th className="px-6 py-4 text-left w-20">รูป</th>
                  <th className="px-6 py-4 text-left">รายละเอียดสินค้า</th>
                  <th className="px-6 py-4 text-center w-28">ยอดคงคลัง</th>
                  <th className="px-6 py-4 text-center w-28">ยอดที่ขอ</th>
                  <th className="px-6 py-4 text-right w-36">ยอดเตรียมจ่าย</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisition.items?.map((item: RequisitionItem) => {
                  const alloc = allocations[item.id] || { qty: 0, lots: {}, units: [] };
                  const isSelected = selectedItemId === item.id;
                  const isComplete = alloc.qty === item.qty;
                  const isOver = alloc.qty > item.qty;
                  
                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected 
                          ? 'bg-indigo-50 border-l-4 border-l-indigo-600 shadow-inner' 
                          : 'border-l-4 border-l-transparent hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-3">
                        <div className="w-12 h-12 rounded-lg bg-white border shadow-sm overflow-hidden flex items-center justify-center relative">
                          {item.image_url ? 
                            <img src={item.image_url} className="w-full h-full object-cover" alt="" 
                                 onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: item.image_url!, name: item.name }); }} /> :
                            <PackageCheck className="w-5 h-5 text-slate-300" />
                          }
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-400 font-mono">{item.code}</p>
                          {item.itemType === 'REUSABLE' && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold uppercase">ยิงบาร์โค้ด</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                         <span className={`font-bold ${item.current_stock > 0 ? 'text-slate-600' : 'text-rose-500'}`}>{item.current_stock}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                         <span className="font-black text-slate-400 text-lg">{item.qty}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                         {isPending ? (
                            <span className={`font-black text-xl ${isComplete ? 'text-emerald-600' : isOver ? 'text-rose-600' : alloc.qty > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                              {alloc.qty}
                            </span>
                         ) : (
                            <span className="font-black text-lg text-emerald-600">{item.issued}</span>
                         )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-transform ${isSelected ? 'bg-indigo-600 text-white translate-x-0' : 'text-slate-300 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                           <ArrowRight size={14} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side (30%) - Detail & Allocations */}
        <div className="w-[30%] bg-slate-50 flex flex-col p-4 z-0">
           {selectedItem ? (() => {
              const alloc = allocations[selectedItem.id] || { qty: 0, lots: {}, units: [] };
              const isReusable = selectedItem.itemType === 'REUSABLE';

              return (
                <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                   {/* Info Header */}
                   <div className="p-5 border-b bg-gradient-to-br from-indigo-50 to-white">
                      <p className="text-xs font-bold text-indigo-400 tracking-wider uppercase mb-1">กำลังจัดการ</p>
                      <h4 className="font-black text-lg text-indigo-950 leading-tight mb-2">{selectedItem.name}</h4>
                      <div className="flex bg-white rounded-lg border border-indigo-100 p-2 gap-4">
                        <div className="flex-1 text-center border-r border-slate-100">
                          <p className="text-[10px] text-slate-400 font-bold">ยอดขอ</p>
                          <p className="font-black text-lg text-slate-700">{selectedItem.qty}</p>
                        </div>
                        <div className="flex-1 text-center border-r border-slate-100">
                         <p className="text-[10px] text-slate-400 font-bold">คงเหลือในคลัง</p>
                          <p className="font-black text-lg text-slate-700">{selectedItem.current_stock}</p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-indigo-400 font-bold">เตรียมจ่าย</p>
                          <p className="font-black text-lg text-indigo-600">{alloc.qty}</p>
                        </div>
                      </div>
                   </div>

                   {/* Allocator Body */}
                   <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
                     {!isPending ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                          <PackageCheck size={40} className="mb-3 opacity-30" />
                          <p className="font-bold text-slate-600">พัสดุนี้อนุมัติไปแล้ว {selectedItem.issued} ชิ้น</p>
                        </div>
                     ) : isReusable ? (
                        <div className="space-y-5">
                          <div className="bg-indigo-600 text-white rounded-[14px] p-4 shadow-lg shadow-indigo-200">
                            <label className="text-xs font-bold text-indigo-200 mb-2 flex items-center gap-1"><ScanLine size={14}/> แสกนบาร์โค้ดเพิ่ม ({alloc.units.length}/{selectedItem.qty})</label>
                            <div className="flex bg-white/10 rounded-lg p-1">
                              <input
                                type="text"
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleScanUnit(selectedItem);
                                  }
                                }}
                                placeholder="ยิงที่นี่..."
                                className="w-full bg-transparent border-none text-white placeholder:text-indigo-300 px-3 py-1.5 focus:ring-0 outline-none text-sm font-mono"
                                autoFocus
                              />
                            </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-slate-500 mb-3 ml-1">จิ้มบาร์โค้ดจากรายการที่ว่าง</p>
                            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                              {selectedItem.available_units?.map((unit: RequisitionItemUnits) => {
                                const isSelected = alloc.units.includes(unit.id);
                                return (
                                  <button
                                    key={unit.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        const nu = alloc.units.filter(id => id !== unit.id);
                                        updateAllocation(selectedItem.id, { ...alloc, qty: nu.length, units: nu });
                                      } else {
                                        if (alloc.qty >= selectedItem.qty) return toast.error("เลือกครบกดยอดแล้ว");
                                        const nu = [...alloc.units, unit.id];
                                        updateAllocation(selectedItem.id, { ...alloc, qty: nu.length, units: nu });
                                      }
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-lg border text-sm font-bold transition-all ${
                                      isSelected 
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-400'
                                    }`}
                                  >
                                    <span className="font-mono text-xs">{unit.unit_code}</span>
                                    {isSelected ? <Trash2 size={14} className="text-white/60 hover:text-white" /> : <Plus size={14} className="text-slate-300" />}
                                  </button>
                                );
                              })}
                              {(!selectedItem.available_units || selectedItem.available_units.length === 0) && (
                                <p className="text-center text-xs text-rose-500 font-bold p-4">❌ สินค้าหมดคลัง (ไม่มีให้ยืม)</p>
                              )}
                            </div>
                          </div>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-700 text-sm">เลือกล็อตที่ต้องการจ่ายออก</h4>
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">FEFO Auto-Fill</span>
                           </div>
                           
                           {selectedItem.available_lots && selectedItem.available_lots.length > 0 ? (
                             <div className="flex flex-col gap-3">
                               {selectedItem.available_lots.map((lot: RequisitionItemLots) => {
                                  const lotAllocQty = alloc.lots[lot.id.toString()] || 0;
                                  const isExpired = new Date(lot.expired_at) < new Date();
                                  const isActive = lotAllocQty > 0;
                                  return (
                                    <div key={lot.id} className={`bg-white rounded-xl border p-3 transition-colors ${isActive ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500/20' : 'border-slate-200'}`}>
                                      <div className="mb-2">
                                        <p className="font-bold text-slate-700 text-sm">{lot.lot_code}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <p className={`text-[10px] font-bold ${isExpired ? 'text-rose-500' : 'text-slate-400'}`}>หมด: {new Date(lot.expired_at).toLocaleDateString('th-TH')}</p>
                                          <p className="text-[10px] text-slate-400">คงเหลือ: <span className="font-black text-slate-600">{lot.quantity}</span></p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center bg-slate-50 border rounded-lg h-9 w-full">
                                        <button
                                          autoFocus={false}
                                          onClick={() => handleUpdateLotQty(selectedItem.id, lot.id.toString(), lotAllocQty - 1, lot.quantity)}
                                          className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded-l-lg transition-colors"
                                        >
                                          <Minus size={14} strokeWidth={3} />
                                        </button>
                                        <input
                                          type="number"
                                          value={lotAllocQty}
                                          onChange={(e) => handleUpdateLotQty(selectedItem.id, lot.id.toString(), Number(e.target.value) || 0, lot.quantity)}
                                          className="flex-1 w-full bg-transparent text-center font-black text-base outline-none text-indigo-700"
                                        />
                                        <button
                                          autoFocus={false}
                                          onClick={() => handleUpdateLotQty(selectedItem.id, lot.id.toString(), lotAllocQty + 1, lot.quantity)}
                                          className="w-10 h-full flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-r-lg transition-colors"
                                        >
                                          <Plus size={14} strokeWidth={3} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                               })}
                             </div>
                           ) : (
                             <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                               <p className="text-rose-600 font-bold text-sm mb-1">ไม่มี Lot ที่สามารถจ่ายได้</p>
                             </div>
                           )}
                        </div>
                     )}
                   </div>
                </div>
              );
           })() : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200">
                <ArrowRight className="text-slate-300 w-12 h-12 mb-4 animate-bounce shrink-0" />
                <p className="font-bold text-slate-500 mb-1">คลิกเลือกรายการที่ฝั่งซ้ายมือ</p>
                <p className="text-xs text-slate-400">เพื่อเปิดแผงควบคุมการตัดสต็อก</p>
             </div>
           )}
        </div>
      </div>

      {/* Global Actions Footer Bar */}
      <div className="h-16 border-t bg-white flex justify-between items-center px-6 shrink-0 z-20">
         <div className="text-xs text-slate-500">
           {isPending ? (
              <p>ระบบจะบันทึกการตัดคลังแบบอัตโนมัติ กรุณาแน่ใจก่อนกดอนุมัติ</p>
           ) : (
              <p>รายการนี้ถูกอนุมัติไปแล้วอยู่ในสถานะ {requisition?.status}</p>
           )}
         </div>
         <div className="flex items-center gap-3">
           {isPending && (
              <>
                <button
                  onClick={handleReject}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-rose-600 bg-white border border-rose-200 text-sm font-bold rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  ปฏิเสธ
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackageCheck size={18} />}
                  ยืนยันการอนุมัติ
                </button>
              </>
           )}
           {canCompleteDelivery && (
             <button
               onClick={handleCompleteDelivery}
               disabled={isLoading}
               className="px-8 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
             >
               {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackageCheck size={18} />}
               ปิดงานนำส่งเรียบร้อย
             </button>
           )}
         </div>
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={previewImage.url} alt={previewImage.name} className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20" />
            <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold hover:text-rose-400 transition-colors">
              ปิดรูปภาพ <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
