"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    Search, ChevronLeft, ChevronRight, Loader2, Edit, X, Save, 
    ArrowLeft, Package, MapPin, Hash, FileText, Calendar, AlertTriangle
} from "lucide-react";

import * as assetService from "@/services/assetService";
import type { Asset } from "@/services/assetService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";

// ============ Helpers ============

const STATUS_CONFIG: Record<string, { color: string; label: string; dot: string }> = {
    READY: { color: "bg-emerald-100 text-emerald-700", label: "พร้อมใช้งาน", dot: "bg-emerald-500" },
    IN_USE: { color: "bg-blue-100 text-blue-700", label: "ถูกใช้งาน", dot: "bg-blue-500" },
    REPAIR: { color: "bg-amber-100 text-amber-700", label: "ส่งซ่อม", dot: "bg-amber-500" },
    DISPOSED: { color: "bg-rose-100 text-rose-700", label: "จำหน่ายออก", dot: "bg-rose-500" },
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? { color: "bg-slate-100 text-slate-700", label: status, dot: "bg-slate-400" };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

// ============ Main Component ============

export default function AssetRegistryClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const itemId = searchParams.get("itemId");

    const [records, setRecords] = useState<Asset[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [masterItem, setMasterItem] = useState<{ name: string; code: string } | null>(null);

    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isFetching, setIsFetching] = useState(false);

    // Filters
    const [keyword, setKeyword] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;

    // Edit Modal State
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [editSerialNo, setEditSerialNo] = useState("");
    const [editDeptId, setEditDeptId] = useState("");
    const [editStatus, setEditStatus] = useState("READY");
    const [editNote, setEditNote] = useState("");
    const [editWarranty, setEditWarranty] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        departmentService.getDepartmentOptions().then(setDepartments).catch(console.error);
    }, []);

    const fetchData = useCallback(async () => {
        if (!itemId) return;
        setIsFetching(true);
        try {
            const response = await assetService.getAssets({
                page,
                limit,
                keyword,
                department_id: departmentFilter,
                status: statusFilter,
                item_id: itemId
            });

            setRecords(response.items);
            setTotal(response.total);
            setTotalPages(response.totalPages);

            if (response.items.length > 0) {
                setMasterItem({
                    name: response.items[0].item_name,
                    code: response.items[0].item_code
                });
            }
        } catch (err) {
            toast.error("ดึงข้อมูลทะเบียนไม่สำเร็จ");
        } finally {
            setIsFetching(false);
        }
    }, [page, keyword, departmentFilter, statusFilter, itemId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveEdit = async () => {
        if (!editingAsset) return;
        setIsSaving(true);
        try {
            await assetService.updateAsset(editingAsset.id, {
                serial_no: editSerialNo || null,
                department_id: editDeptId ? Number(editDeptId) : null,
                status: editStatus,
                note: editNote || null,
                warranty_expire: editWarranty || null,
            });
            toast.success("อัปเดตข้อมูลเรียบร้อย");
            setEditingAsset(null);
            fetchData();
        } catch (err) {
            toast.error("บันทึกไม่สำเร็จ");
        } finally {
            setIsSaving(false);
        }
    };

    if (!itemId) return <div className="p-20 text-center font-bold text-slate-300 uppercase">Missing Item Context</div>;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 p-8 text-slate-800">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                <button onClick={() => router.back()} className="p-3 bg-white hover:bg-slate-100 rounded-2xl shadow-sm border border-slate-200 transition-all text-slate-600">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-mono text-sm font-bold mb-1 uppercase tracking-tighter">
                        <Hash className="w-4 h-4" /> {masterItem?.code || "..."}
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                        {masterItem?.name || "กำลังโหลด..."}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">จัดการทะเบียนพัสดุรายเครื่อง (Individual Serial Tracker)</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขครุภัณฑ์ หรือ Serial Number..."
                        value={keyword}
                        onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                        className="w-full rounded-xl border border-slate-100 py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 transition-all font-medium"
                    />
                </div>
                <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }} className="border border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none bg-slate-50/50 min-w-[200px] font-bold text-slate-600 cursor-pointer">
                    <option value="">แผนกทั้งหมด</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none bg-slate-50/50 min-w-[150px] font-bold text-slate-600 cursor-pointer">
                    <option value="">ทุกสถานะ</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative flex flex-col flex-1" style={{ minHeight: '55vh' }}>
                {isFetching && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    </div>
                )}
                
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-12 tracking-widest text-center">#</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-40 tracking-widest">รหัสครุภัณฑ์</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-40 tracking-widest">Serial Number</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-48 tracking-widest">แผนกประจำการ</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-48 tracking-widest">เลขที่เอกสารรับเข้า</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-40 tracking-widest">วันหมดอายุประกัน</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-36 text-center tracking-widest">สถานะ</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] w-20 text-right tracking-widest">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.map((rec, idx) => {
                                const isExpired = rec.warranty_expire && new Date(rec.warranty_expire) < new Date();
                                return (
                                    <tr key={rec.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">{(page - 1) * limit + idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">{rec.asset_code}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600 font-bold">{rec.serial_no || <span className="text-slate-300 italic font-normal text-xs">N/A</span>}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-700 font-bold">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {rec.department_name || "ส่วนกลาง"}
                                            </div>
                                        </td>
                                        {/* 🟢 คอลัมน์แยกใหม่: เลขที่เอกสาร */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                                                <FileText className="w-3.5 h-3.5 text-slate-300" /> {rec.receive_doc_no || "---"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className={`flex items-center gap-1.5 font-bold ${isExpired ? 'text-rose-500' : 'text-slate-600'}`}>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {rec.warranty_expire ? new Date(rec.warranty_expire).toLocaleDateString('th-TH') : "ไม่มีประกัน"}
                                                </div>
                                                {isExpired && (
                                                    <span className="inline-flex items-center gap-1 w-fit bg-rose-50 text-rose-600 text-[9px] px-1.5 py-0.5 rounded font-black uppercase border border-rose-100">
                                                        <AlertTriangle className="w-2.5 h-2.5" /> Expired
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={rec.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setEditingAsset(rec);
                                                    setEditSerialNo(rec.serial_no || "");
                                                    setEditDeptId(rec.department_id ? String(rec.department_id) : "");
                                                    setEditStatus(rec.status);
                                                    setEditNote(rec.note || "");
                                                    setEditWarranty(rec.warranty_expire ? rec.warranty_expire.split('T')[0] : "");
                                                }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-blue-100 transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {records.length === 0 && !isFetching && (
                        <div className="py-24 text-center">
                            <Package className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No individual assets found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Container */}
            <div className="flex items-center justify-between mt-6 px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Showing {records.length} of {total} units
                </p>
                <div className="flex items-center gap-1">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border border-slate-200 bg-white rounded-xl disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 shadow-sm">
                        {page} <span className="text-slate-300 mx-1">/</span> {totalPages || 1}
                    </div>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border border-slate-200 bg-white rounded-xl disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Edit Modal */}
            {editingAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">แก้ไขข้อมูลรายเครื่อง</h3>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">{editingAsset.asset_code}</p>
                            </div>
                            <button onClick={() => setEditingAsset(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-10 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.15em]">Serial Number</label>
                                <input type="text" value={editSerialNo} onChange={(e) => setEditSerialNo(e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none bg-slate-50/50 font-mono font-bold" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.15em]">สถานะเครื่อง</label>
                                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none bg-white font-black text-slate-700">
                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.15em]">แผนกประจำการ</label>
                                    <select value={editDeptId} onChange={(e) => setEditDeptId(e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none bg-white font-black text-slate-700">
                                        <option value="">ส่วนกลาง / ไม่ระบุ</option>
                                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.15em]">วันหมดอายุประกัน</label>
                                <input type="date" value={editWarranty} onChange={(e) => setEditWarranty(e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none bg-white font-bold text-slate-700" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.15em]">หมายเหตุ</label>
                                <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none bg-slate-50/50 resize-none" />
                            </div>
                        </div>

                        <div className="px-10 py-8 bg-slate-50 flex gap-4">
                            <button onClick={() => setEditingAsset(null)} className="flex-1 py-4 text-xs font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest text-center">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={isSaving} className="flex-[2] flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 disabled:opacity-50 transition-all uppercase tracking-[0.2em] text-xs">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Update Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}