"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Search, ChevronLeft, ChevronRight, ChevronDown, Edit, X, Trash2,
    AlertTriangle, Printer, Cpu
} from "lucide-react";

import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import { LIST_TABLE_HEAD_ROW, LIST_TABLE_TH_WIDE, LIST_TABLE_TBODY } from "@/lib/tableUi";
import { printLabels, type LabelData } from "@/lib/printLabel";

import * as assetService from "@/services/assetService";
import type { Asset } from "@/services/assetService";
import * as departmentService from "@/services/departmentService";
import type { DepartmentOption } from "@/services/departmentService";
import { SweetAlertUtils } from "@/utils/sweetAlert";

// ============ Constants ============

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    READY: { color: "bg-green-100 text-green-800", label: "พร้อมใช้งาน" },
    IN_USE: { color: "bg-blue-100 text-blue-800", label: "ถูกใช้งาน" },
    REPAIR: { color: "bg-yellow-100 text-yellow-800", label: "ส่งซ่อม" },
    DISPOSED: { color: "bg-red-100 text-red-800", label: "จำหน่ายออก" },
};

// ============ Helpers ============

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? { color: "bg-gray-100 text-gray-700", label: status };
    return (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
};

// ============ Props ============

interface AssetRegistryClientProps {
    /** itemId is the item TYPE UUID — passed from the Server Component. */
    itemId: string;
    /** Item name pre-fetched on the server via GET /v1/items/:id */
    initialItemName: string;
    initialItemCode: string;
    /** Asset list pre-fetched on the server via GET /v1/assets?item_id=... */
    initialAssets: Asset[];
}

// ============ Main Component ============

export default function AssetRegistryClient({
    itemId,
    initialItemName,
    initialItemCode,
    initialAssets,
}: AssetRegistryClientProps) {
    const router = useRouter();

    // Pre-populate records from server data — no loading flash.
    const [records, setRecords] = useState<Asset[]>(initialAssets);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [masterItem, setMasterItem] = useState<{ name: string; code: string }>({
        name: initialItemName,
        code: initialItemCode,
    });

    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("แผนกประจำการทั้งหมด");
    const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Dropdown states
    const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("[data-filter-department]")) setIsDepartmentOpen(false);
            if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
        };
        if (isDepartmentOpen || isStatusOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isDepartmentOpen, isStatusOpen]);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [editSerialNo, setEditSerialNo] = useState("");
    const [editDeptId, setEditDeptId] = useState("");
    const [editStatus, setEditStatus] = useState("READY");
    const [editNote, setEditNote] = useState("");
    const [editWarranty, setEditWarranty] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Edit Modal Dropdown States
    const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
    const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);

    // Asset label selection
    const [selectedAssets, setSelectedAssets] = useState<Map<string, LabelData>>(new Map());

    const toggleSelectAsset = (rec: Asset) =>
        setSelectedAssets((prev) => {
            const s = new Map(prev);
            s.has(rec.id)
                ? s.delete(rec.id)
                : s.set(rec.id, { name: masterItem.name, code: rec.asset_code, subLabel: rec.serial_no || undefined });
            return s;
        });

    const toggleSelectAllAssets = () => {
        const allSel = paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedAssets.has(r.id));
        setSelectedAssets((prev) => {
            const s = new Map(prev);
            allSel
                ? paginatedRecords.forEach((r) => s.delete(r.id))
                : paginatedRecords.forEach((r) => s.set(r.id, { name: masterItem.name, code: r.asset_code, subLabel: r.serial_no || undefined }));
            return s;
        });
    };

    // Close edit modal dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("[data-edit-status]")) setIsEditStatusOpen(false);
            if (!target.closest("[data-edit-dept]")) setIsEditDeptOpen(false);
        };
        if (isEditStatusOpen || isEditDeptOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isEditStatusOpen, isEditDeptOpen]);

    // โหลดข้อมูลทั้งหมดมาครั้งเดียว แล้วทำ filter + pagination ใน client
    const fetchAll = useCallback(async () => {
        if (!itemId) return;
        setIsFetching(true);
        setFetchError(null);
        try {
            const response = await assetService.getAssets({ 
                item_id: itemId,
                limit: 9999,
            });
            const assets = response.data || [];
            setRecords(assets);
            if (assets.length > 0) {
                setMasterItem({
                    name: assets[0].item_name || initialItemName,
                    code: assets[0].item_code || initialItemCode,
                });
            }
        } catch (err: any) {
            setRecords([]);
            setFetchError(err?.message || "ดึงข้อมูลทะเบียนครุภัณฑ์ไม่สำเร็จ");
        } finally {
            setIsFetching(false);
        }
    }, [itemId, initialItemName, initialItemCode]);

    useEffect(() => {
        departmentService.getDepartmentOptions().then(setDepartments).catch(console.error);
    }, []);

    const refreshData = useCallback(() => {
        fetchAll();
    }, [fetchAll]);

    const hasMounted = useRef(false);
    useEffect(() => {
        if (!itemId) return;
        if (hasMounted.current) return;
        hasMounted.current = true;
        fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]);

    const handleSaveEdit = async () => {
        if (!editingAsset) return;
        setIsSaving(true);
        try {
            await assetService.updateAsset(editingAsset.id, {
                serial_no: editSerialNo || null,
                department_id: editDeptId && editDeptId !== "0" ? editDeptId : null,
                status: editStatus,
                note: editNote || null,
                warranty_expire: editWarranty || null,
            });
            SweetAlertUtils.success("สำเร็จ", "อัปเดตข้อมูลเรียบร้อย");
            setIsEditModalOpen(false);
            setEditingAsset(null);
            refreshData();
        } catch (err) {
            SweetAlertUtils.error("ข้อผิดพลาด", getErrorMessage(err));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, assetCode: string) => {
        const result = await SweetAlertUtils.delete("ลบครุภัณฑ์", "คุณต้องการลบรายการนี้ใช่หรือไม่?");
        if (!result.isConfirmed) return;
        try {
            await assetService.deleteAsset(id);
            SweetAlertUtils.success("สำเร็จ", "ลบรายการเรียบร้อย");
            refreshData();
        } catch (err) {
            SweetAlertUtils.error("ข้อผิดพลาด", getErrorMessage(err));
        }
    };

    const openEditModal = (asset: Asset) => {
        setEditingAsset(asset);
        setEditSerialNo(asset.serial_no || "");
        setEditDeptId(asset.department_id ? String(asset.department_id) : "0");
        setEditStatus(asset.status);
        setEditNote(asset.note || "");
        setEditWarranty(asset.warranty_expire ? asset.warranty_expire.split('T')[0] : "");
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingAsset(null);
        setEditSerialNo("");
        setEditDeptId("");
        setEditStatus("READY");
        setEditNote("");
        setEditWarranty("");
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    // Filter options
    const filterDepartments = ["แผนกประจำการทั้งหมด", ...departments.map(d => ({ id: d.id, name: d.name }))];
    const filterStatuses = [
        { value: "สถานะทั้งหมด", label: "สถานะทั้งหมด" },
        { value: "READY", label: "พร้อมใช้งาน" },
        { value: "IN_USE", label: "ถูกใช้งาน" },
        { value: "REPAIR", label: "ส่งซ่อม" },
        { value: "DISPOSED", label: "จำหน่ายออก" },
    ];

    const selectedDepartmentLabel =
        selectedDepartment === "แผนกประจำการทั้งหมด"
            ? "แผนกประจำการทั้งหมด"
            : departments.find((d) => String(d.id) === selectedDepartment)?.name ?? selectedDepartment;

    // Client-side filter + pagination
    const filteredRecords = (records || []).filter((record) => {
        const keyword = searchTerm.toLowerCase();
        const matchesSearch = !keyword ||
            record.asset_code.toLowerCase().includes(keyword) ||
            (record.serial_no || "").toLowerCase().includes(keyword);
        const matchesDept = selectedDepartment === "แผนกประจำการทั้งหมด" || 
            (selectedDepartment && String(record.department_id) === selectedDepartment);
        const matchesStatus = selectedStatus === "สถานะทั้งหมด" || record.status === selectedStatus;

        return matchesSearch && matchesDept && matchesStatus;
    });

    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Compute summary counts from loaded records — no extra API call needed.
    const totalRegistered = records.length;
    const readyCount    = records.filter(r => r.status === "READY").length;
    const inUseCount    = records.filter(r => r.status === "IN_USE").length;
    const repairCount   = records.filter(r => r.status === "REPAIR").length;
    const disposedCount = records.filter(r => r.status === "DISPOSED").length;

    // Per-department breakdown: { deptName → count }
    const deptCounts = records.reduce<Record<string, number>>((acc, r) => {
        const key = r.department_name || "ส่วนกลาง";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const handleBulkPrint = () => {
        printLabels(Array.from(selectedAssets.values()));
    };

    return (
        <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-4 mb-1 min-w-0">
                        <PageHeadingIconBox icon={Cpu} tone="assets" className="shrink-0" />
                        <div className="min-w-0">
                            <h2
                                className="text-2xl sm:text-3xl font-bold text-gray-800 truncate"
                                title={masterItem?.name || undefined}
                            >
                                {masterItem?.name || "กำลังโหลด..."}
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                ดูและจัดการครุภัณฑ์รายเครื่องที่ลงทะเบียนไว้ — สถานะ แผนกประจำการ และพิมพ์ป้ายครุภัณฑ์
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap shrink-0">
                    {selectedAssets.size > 0 && (
                        <button
                            onClick={handleBulkPrint}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            พิมพ์ป้ายครุภัณฑ์ ({selectedAssets.size})
                        </button>
                    )}
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-semibold transition-colors"
                    >
                        ย้อนกลับ
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ค้นหารหัส / Serial..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
                    />
                </div>

                {/* Department Dropdown */}
                <div className="relative w-full sm:w-auto" data-filter-department>
                    <button
                        type="button"
                        onClick={() => { setIsDepartmentOpen(!isDepartmentOpen); setIsStatusOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
                    >
                        <span className="text-slate-800 font-medium truncate" title={selectedDepartmentLabel}>
                            {selectedDepartmentLabel}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDepartmentOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isDepartmentOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
                            <ul className="py-1">
                                {filterDepartments.map((dept) => {
                                    const deptValue = typeof dept === "string" ? dept : String(dept.id);
                                    const deptLabel = typeof dept === "string" ? dept : dept.name;
                                    return (
                                        <li key={deptValue}>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedDepartment(deptValue); setIsDepartmentOpen(false); setCurrentPage(1); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDepartment === deptValue ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                            >
                                                {deptLabel}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Status Dropdown */}
                <div className="relative w-full sm:w-auto" data-filter-status>
                    <button
                        type="button"
                        onClick={() => { setIsStatusOpen(!isStatusOpen); setIsDepartmentOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
                    >
                        <span className="text-slate-800 font-medium">{selectedStatus === "ทั้งหมด" ? "สถานะทั้งหมด" : STATUS_CONFIG[selectedStatus]?.label || selectedStatus}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isStatusOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
                            <ul className="py-1">
                                {filterStatuses.map((s) => (
                                    <li key={s.value}>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedStatus(s.value); setIsStatusOpen(false); setCurrentPage(1); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                        >
                                            {s.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Clear filters */}
                {(searchTerm || selectedDepartment !== "แผนกประจำการทั้งหมด" || selectedStatus !== "สถานะทั้งหมด") && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm("");
                            setSelectedDepartment("แผนกประจำการทั้งหมด");
                            setSelectedStatus("สถานะทั้งหมด");
                            setCurrentPage(1);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
                    >
                        <X className="w-3.5 h-3.5" />
                        ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* Table Content */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
                {isFetching ? (
                    <div className="flex flex-col flex-1 min-h-[22rem]">
                        <span className="sr-only">กำลังโหลดทะเบียนครุภัณฑ์</span>
                        <DataTableSkeleton
                            headers={["", "รหัสครุภัณฑ์", "Serial Number", "แผนกประจำการ", "เลขที่เอกสารรับเข้า", "วันหมดอายุประกัน", "สถานะ", "จัดการ"]}
                            rowCount={10}
                            showPaginationFooter
                            ariaLabel="กำลังโหลดทะเบียนครุภัณฑ์"
                            thClassName="px-3 py-4 whitespace-nowrap text-base font-semibold"
                            tdClassName="px-3 py-3"
                        />
                    </div>
                ) : (
                    <>
                        <div
                            className="flex-1"
                            style={{ overflowX: "auto", overflowY: "auto", scrollbarWidth: "auto", msOverflowStyle: "auto" } as React.CSSProperties}
                        >
                            <style>{`
                                div::-webkit-scrollbar { width: 0; height: 8px; }
                                div::-webkit-scrollbar-track { background: #f1f5f9; }
                                div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                                div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                            `}</style>
                            <table className="w-full text-sm text-left table-fixed">
                                <colgroup>
                                    <col className="w-[44px]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[16%]" />
                                    <col className="w-[17%]" />
                                    <col className="w-[15%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[9%]" />
                                </colgroup>
                                <thead className={LIST_TABLE_HEAD_ROW}>
                                    <tr>
                                        <th className="px-4 py-3.5 text-center">
                                            <input
                                                type="checkbox"
                                                checked={paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedAssets.has(r.id))}
                                                onChange={toggleSelectAllAssets}
                                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                title="เลือกทั้งหมดในหน้านี้"
                                            />
                                        </th>
                                        <th className={LIST_TABLE_TH_WIDE}>รหัสครุภัณฑ์</th>
                                        <th className={LIST_TABLE_TH_WIDE}>Serial Number</th>
                                        <th className={LIST_TABLE_TH_WIDE}>แผนกประจำการ</th>
                                        <th className={LIST_TABLE_TH_WIDE}>เลขที่เอกสารรับเข้า</th>
                                        <th className={LIST_TABLE_TH_WIDE}>วันหมดอายุประกัน</th>
                                        <th className={LIST_TABLE_TH_WIDE}>สถานะ</th>
                                        <th className={`${LIST_TABLE_TH_WIDE} text-center`}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className={LIST_TABLE_TBODY}>
                                    {paginatedRecords.map((rec) => {
                                        const isExpired = rec.warranty_expire && new Date(rec.warranty_expire) < new Date();
                                        return (
                                            <tr key={rec.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                                                <td className="px-4 py-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAssets.has(rec.id)}
                                                        onChange={() => toggleSelectAsset(rec)}
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-2.5">{rec.asset_code}</td>
                                                <td className="px-6 py-2.5 font-mono text-slate-600">{rec.serial_no || <span className="text-slate-300 italic text-xs">N/A</span>}</td>
                                                <td className="px-6 py-2.5 text-slate-600">{rec.department_name || "ส่วนกลาง"}</td>
                                                <td className="px-6 py-2.5 text-slate-600 text-xs">{rec.receive_doc_no || "---"}</td>
                                                <td className="px-6 py-2.5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className={`text-sm ${isExpired ? 'text-rose-500 font-medium' : 'text-slate-600'}`}>
                                                            {rec.warranty_expire ? new Date(rec.warranty_expire).toLocaleDateString('th-TH') : "ไม่มีประกัน"}
                                                        </div>
                                                        {isExpired && (
                                                            <span className="inline-flex items-center gap-1 w-fit bg-rose-50 text-rose-600 text-[9px] px-1.5 py-0.5 rounded font-medium border border-rose-100">
                                                                <AlertTriangle className="w-2.5 h-2.5" /> หมดประกัน
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2.5">
                                                    <StatusBadge status={rec.status} />
                                                </td>
                                                <td className="px-6 py-2.5 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => openEditModal(rec)} className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg">
                                                            <Edit className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => handleDelete(rec.id, rec.asset_code)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedRecords.length === 0 && !isFetching && (
                                        <tr>
                                            <td colSpan={8}>
                                                {fetchError ? (
                                                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-rose-400">
                                                        <AlertTriangle className="w-10 h-10 text-rose-300" />
                                                        <p className="text-sm font-medium">{fetchError}</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                                                        </svg>
                                                        <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
                            <p className="text-sm text-slate-500">
                                แสดง {paginatedRecords.length} จาก {filteredRecords.length} รายการ
                                {filteredRecords.length !== records.length && (
                                    <span className="text-slate-400"> (ทั้งหมด {records.length} รายการ)</span>
                                )}
                            </p>
                            <div className="flex items-center gap-2">
                                <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
                                <button disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)} className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors bg-white"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editingAsset && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all" onClick={closeEditModal}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-white border-b border-slate-300 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
                            <h2 className="text-2xl font-bold text-slate-900">
                                แก้ไขข้อมูลครุภัณฑ์
                            </h2>
                            <button
                                onClick={closeEditModal}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50/30">
                            <div className="bg-white rounded-lg p-6 border border-slate-300 shadow-sm">
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
                                        <div data-edit-status>
                                            <label className="block text-sm font-semibold mb-2 text-slate-700">สถานะเครื่อง</label>
                                            <button
                                                type="button"
                                                onClick={() => { setIsEditStatusOpen(!isEditStatusOpen); setIsEditDeptOpen(false); }}
                                                className="w-full flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm justify-between"
                                            >
                                                <span className="text-slate-800 font-medium">{STATUS_CONFIG[editStatus]?.label || editStatus}</span>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEditStatusOpen ? "rotate-180" : ""}`} />
                                            </button>
                                            {isEditStatusOpen && (
                                                <div className="absolute mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-[250px] max-h-64 overflow-y-auto">
                                                    <ul className="py-1">
                                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                            <li key={k}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setEditStatus(k); setIsEditStatusOpen(false); }}
                                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${editStatus === k ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                                                >
                                                                    {v.label}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <div data-edit-dept>
                                            <label className="block text-sm font-semibold mb-2 text-slate-700">แผนกประจำการ</label>
                                            <button
                                                type="button"
                                                onClick={() => { setIsEditDeptOpen(!isEditDeptOpen); setIsEditStatusOpen(false); }}
                                                className="w-full flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm justify-between"
                                            >
                                                <span className="text-slate-800 font-medium">
                                                    {editDeptId === "0" ? "ส่วนกลาง / ไม่ระบุ" : departments.find(d => String(d.id) === editDeptId)?.name || "ส่วนกลาง / ไม่ระบุ"}
                                                </span>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEditDeptOpen ? "rotate-180" : ""}`} />
                                            </button>
                                            {isEditDeptOpen && (
                                                <div className="absolute mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-[250px] max-h-64 overflow-y-auto">
                                                    <ul className="py-1">
                                                        <li>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setEditDeptId("0"); setIsEditDeptOpen(false); }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${editDeptId === "0" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                                            >
                                                                ส่วนกลาง / ไม่ระบุ
                                                            </button>
                                                        </li>
                                                        {departments.map((d) => (
                                                            <li key={d.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setEditDeptId(String(d.id)); setIsEditDeptOpen(false); }}
                                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${String(editDeptId) === String(d.id) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                                                >
                                                                    {d.name}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
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
                        <div className="px-8 py-5 bg-white border-t border-slate-300 flex justify-end gap-3">
                            <button onClick={closeEditModal} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={handleSaveEdit} disabled={isSaving} className="flex items-center gap-2 px-8 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : null}
                                บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}