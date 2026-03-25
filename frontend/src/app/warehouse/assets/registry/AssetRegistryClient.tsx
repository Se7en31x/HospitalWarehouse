"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    Search, ChevronLeft, ChevronRight, ChevronDown, Edit, X, Save,
    ArrowLeft, Package, MapPin, FileText, Calendar, AlertTriangle, Loader2
} from "lucide-react";

import * as assetService from "@/services/assetService";
import type { Asset } from "@/services/assetService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";

// ============ Helpers ============

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    READY: { color: "bg-green-100 text-green-800", label: "พร้อมใช้งาน" },
    IN_USE: { color: "bg-blue-100 text-blue-800", label: "ถูกใช้งาน" },
    REPAIR: { color: "bg-yellow-100 text-yellow-800", label: "ส่งซ่อม" },
    DISPOSED: { color: "bg-red-100 text-red-800", label: "จำหน่ายออก" },
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? { color: "bg-gray-100 text-gray-700", label: status };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
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

    // Dropdown open states
    const [isDeptOpen, setIsDeptOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("[data-filter-dept]")) setIsDeptOpen(false);
            if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
        };
        if (isDeptOpen || isStatusOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isDeptOpen, isStatusOpen]);

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

    // Dropdown helpers
    const selectedDeptLabel = departmentFilter
        ? departments.find(d => String(d.id) === departmentFilter)?.name || "แผนกทั้งหมด"
        : "แผนกทั้งหมด";
    const selectedStatusLabel = statusFilter
        ? STATUS_CONFIG[statusFilter]?.label || "ทุกสถานะ"
        : "ทุกสถานะ";

    if (!itemId) return <div className="p-20 text-center font-bold text-slate-300">ไม่พบข้อมูลรายการ</div>;

    return (
        <div className="flex flex-col min-h-screen bg-white p-8">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-semibold text-gray-800">
                        {masterItem?.name || "กำลังโหลด..."}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        รหัส: {masterItem?.code || "..."} — ทะเบียนครุภัณฑ์รายเครื่อง
                    </p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
                >
                    ย้อนกลับ
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ค้นหารหัส / Serial..."
                        value={keyword}
                        onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                        className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
                    />
                </div>

                {/* Department Dropdown */}
                <div className="relative" data-filter-dept>
                    <button
                        type="button"
                        onClick={() => { setIsDeptOpen(!isDeptOpen); setIsStatusOpen(false); }}
                        className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
                    >
                        <span className="text-slate-800 font-medium truncate">{selectedDeptLabel}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isDeptOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isDeptOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
                            <ul className="py-1">
                                <li>
                                    <button type="button" onClick={() => { setDepartmentFilter(""); setIsDeptOpen(false); setPage(1); }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!departmentFilter ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                                        แผนกทั้งหมด
                                    </button>
                                </li>
                                {departments.map(d => (
                                    <li key={d.id}>
                                        <button type="button" onClick={() => { setDepartmentFilter(String(d.id)); setIsDeptOpen(false); setPage(1); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${departmentFilter === String(d.id) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                                            {d.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Status Dropdown */}
                <div className="relative" data-filter-status>
                    <button
                        type="button"
                        onClick={() => { setIsStatusOpen(!isStatusOpen); setIsDeptOpen(false); }}
                        className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm w-[200px] justify-between"
                    >
                        <span className="text-slate-800 font-medium">{selectedStatusLabel}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isStatusOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
                            <ul className="py-1">
                                <li>
                                    <button type="button" onClick={() => { setStatusFilter(""); setIsStatusOpen(false); setPage(1); }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!statusFilter ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                                        ทุกสถานะ
                                    </button>
                                </li>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <li key={k}>
                                        <button type="button" onClick={() => { setStatusFilter(k); setIsStatusOpen(false); setPage(1); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${statusFilter === k ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                                            {v.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Table Content */}
            <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
                {isFetching && (
                    <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                        <div className="animate-spin">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 w-[50px]">#</th>
                                <th className="px-6 py-4 w-[150px]">รหัสครุภัณฑ์</th>
                                <th className="px-6 py-4 w-[150px]">Serial Number</th>
                                <th className="px-6 py-4 w-[180px]">แผนกประจำการ</th>
                                <th className="px-6 py-4 w-[180px]">เลขที่เอกสารรับเข้า</th>
                                <th className="px-6 py-4 w-[160px]">วันหมดอายุประกัน</th>
                                <th className="px-6 py-4 w-[130px] text-center">สถานะ</th>
                                <th className="px-6 py-4 w-[80px] text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {records.map((rec, idx) => {
                                const isExpired = rec.warranty_expire && new Date(rec.warranty_expire) < new Date();
                                return (
                                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 w-[50px]">{(page - 1) * limit + idx + 1}</td>
                                        <td className="px-6 py-4">{rec.asset_code}</td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{rec.serial_no || <span className="text-slate-300 italic text-xs">N/A</span>}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-700">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {rec.department_name || "ส่วนกลาง"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                <FileText className="w-3.5 h-3.5 text-slate-300" /> {rec.receive_doc_no || "---"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className={`flex items-center gap-1.5 text-sm ${isExpired ? 'text-rose-500 font-medium' : 'text-slate-600'}`}>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {rec.warranty_expire ? new Date(rec.warranty_expire).toLocaleDateString('th-TH') : "ไม่มีประกัน"}
                                                </div>
                                                {isExpired && (
                                                    <span className="inline-flex items-center gap-1 w-fit bg-rose-50 text-rose-600 text-[9px] px-1.5 py-0.5 rounded font-medium border border-rose-100">
                                                        <AlertTriangle className="w-2.5 h-2.5" /> หมดประกัน
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
                                                className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {records.length === 0 && !isFetching && (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                                            </svg>
                                            <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-500">แสดง {records.length} จาก {total} รายการ</p>
                <div className="flex items-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-medium">หน้า {page} / {totalPages || 1}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Edit Modal */}
            {editingAsset && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all" onClick={() => setEditingAsset(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-white border-b border-slate-200 px-8 py-6 flex flex-shrink-0 items-center justify-between z-10 sticky top-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Package className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">
                                        แก้ไขข้อมูลครุภัณฑ์
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        อัปเดตข้อมูลรายเครื่องหมายเลข <span className="text-indigo-600 font-medium">{editingAsset.asset_code}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingAsset(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50/30">
                            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Edit className="w-5 h-5 text-slate-500" />
                                    รายละเอียด
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-slate-700">Serial Number</label>
                                        <div className="relative">
                                            <input type="text" value={editSerialNo} onChange={(e) => setEditSerialNo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white font-mono" placeholder="ระบุ Serial Number" />
                                            {editSerialNo && (
                                                <button type="button" onClick={() => setEditSerialNo("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-slate-700">สถานะเครื่อง</label>
                                            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white font-medium text-slate-700 pr-10">
                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-slate-700">แผนกประจำการ</label>
                                            <select value={editDeptId} onChange={(e) => setEditDeptId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white font-medium text-slate-700 pr-10">
                                                <option value="">ส่วนกลาง / ไม่ระบุ</option>
                                                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-slate-700">วันหมดอายุประกัน</label>
                                        <input type="date" value={editWarranty} onChange={(e) => setEditWarranty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-700" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-slate-700">หมายเหตุ</label>
                                        <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 bg-white border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
                            <button onClick={() => setEditingAsset(null)} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={handleSaveEdit} disabled={isSaving} className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}