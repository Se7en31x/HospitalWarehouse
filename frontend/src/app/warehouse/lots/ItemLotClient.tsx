"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Layers, Search, Download, X,
    ChevronLeft, ChevronRight, ChevronDown,
    AlertTriangle, Wrench, Trash2, Archive
} from "lucide-react";
import { debounce } from "lodash";
import toast, { Toaster } from "react-hot-toast";

// ✅ Import Service ทั้งหมดที่เราสร้างไว้
// (ตรวจสอบ path ให้ถูกต้องตามโครงสร้างโปรเจคของคุณ)
import { LotItem, adjustLotStock, deleteLot } from "@/services/itemLotService";

// =======================
// 1. Interfaces & Types
// =======================

interface AdjustmentData {
    quantity: string;
    adjustmentType: "adjust" | "damage" | "expire";
    reason: string;
}

// =======================
// 2. Constants & Helpers
// =======================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: any = {
        active: { color: "bg-green-100 text-green-800", text: "ใช้งานได้", icon: null },
        "near-expiry": { color: "bg-yellow-100 text-yellow-800", text: "ใกล้หมดอายุ", icon: null },
        expired: { color: "bg-red-100 text-red-800", text: "หมดอายุ", icon: <AlertTriangle className="w-3 h-3" /> },
        damaged: { color: "bg-gray-500 text-white", text: "ชำรุด", icon: <X className="w-3 h-3" /> },
        out_of_stock: { color: "bg-gray-200 text-gray-600", text: "สินค้าหมด", icon: <X className="w-3 h-3" /> }
    }[status] || { color: "bg-gray-100 text-gray-800", text: status, icon: null };

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.icon}
            {config.text}
        </span>
    );
};

// =======================
// 3. Main Component
// =======================
export default function LotClient({ initialLots }: { initialLots: LotItem[] }) {
    const router = useRouter();

    // --- State ---
    const [lots, setLots] = useState<LotItem[]>(initialLots || []);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const [expiryFilter, setExpiryFilter] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);

    // Modal
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [lotToAdjust, setLotToAdjust] = useState<LotItem | null>(null);
    const [adjustmentData, setAdjustmentData] = useState<AdjustmentData>({
        quantity: "",
        adjustmentType: "adjust",
        reason: "",
    });
    const [error, setError] = useState("");

    // --- Derived State (Categories) ---
    const categories = useMemo(() => {
        const uniqueCats = Array.from(new Set(lots.map(l => l.category_name).filter(Boolean)));
        return ["ทั้งหมด", ...uniqueCats];
    }, [lots]);

    // --- Logic: Filter ---
    const handleSearchChange = useCallback(
        debounce((value: string) => {
            setSearchTerm(value);
            setCurrentPage(1);
        }, 300),
        []
    );

    const filteredLots = useMemo(() => {
        return lots.filter((lot) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                lot.id.toLowerCase().includes(searchLower) ||
                lot.item_code.toLowerCase().includes(searchLower) ||
                lot.item_name.toLowerCase().includes(searchLower);

            const matchesCategory = selectedCategory === "ทั้งหมด" || lot.category_name === selectedCategory;
            const matchesExpiry = !expiryFilter || (lot.expiry_date && lot.expiry_date.split('T')[0] <= expiryFilter);

            return matchesSearch && matchesCategory && matchesExpiry;
        });
    }, [lots, searchTerm, selectedCategory, expiryFilter]);

    const totalPages = Math.ceil(filteredLots.length / itemsPerPage);
    const paginatedLots = filteredLots.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- Logic: Modal & Actions ---
    const handleOpenAdjustModal = (lot: LotItem, type: AdjustmentData["adjustmentType"]) => {
        setLotToAdjust(lot);
        setAdjustmentData({
            quantity: type === "adjust" || type === "damage" ? "" : "0", // ถ้า expire ใส่ 0 ไว้ก่อน (เดี๋ยวไปทับตอน save)
            adjustmentType: type,
            reason: "",
        });
        setError("");
        setIsAdjustModalOpen(true);
    };

    const handleCloseAdjustModal = () => {
        setIsAdjustModalOpen(false);
        setLotToAdjust(null);
    };

    // ✅ 1. ฟังก์ชันบันทึกข้อมูล (แก้ไข Logic ตรงนี้ครับ)
    const validateAndSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lotToAdjust) return;
        if (isLoading) return;

        let adjustQty = 0;

        // --- Logic ใหม่: จัดการเรื่องจำนวน ---
        if (adjustmentData.adjustmentType === 'expire') {
            // กรณีหมดอายุ: บังคับใช้จำนวนคงเหลือทั้งหมดทันที (User ไม่ต้องกรอก)
            adjustQty = lotToAdjust.quantity; 
        } else {
            // กรณีอื่นๆ: รับค่าจาก Input
            adjustQty = parseInt(adjustmentData.quantity || "0");
            
            // Validation สำหรับเคสที่ไม่ใช่ expire
            if (isNaN(adjustQty)) return setError("กรุณาระบุจำนวนที่ถูกต้อง");

            if (adjustmentData.adjustmentType === "adjust") {
               if (adjustQty < 0) return setError("จำนวนต้องไม่ติดลบ");
            }
            
            if (adjustmentData.adjustmentType === "damage") {
                if (adjustQty <= 0) return setError("กรุณาระบุจำนวนที่ชำรุด");
                if (adjustQty > lotToAdjust.quantity) return setError("จำนวนที่ชำรุดเกินจำนวนที่มีอยู่");
            }
        }

        // เช็คเหตุผล (บังคับทุกเคส หรือ ยกเว้น expire ก็ได้ แล้วแต่ตกลง)
        if (!adjustmentData.reason) {
            return setError("กรุณาระบุเหตุผล / รายละเอียด");
        }

        setIsLoading(true);
        try {
            const payload = {
                quantity: adjustQty, // ส่งค่าที่คำนวณแล้วไป
                type: adjustmentData.adjustmentType,
                reason: adjustmentData.reason
            };

            const response = await adjustLotStock(lotToAdjust.id, payload);

            // อัปเดต State หน้าจอทันที
            setLots(prev => prev.map(item => {
                if (item.id === lotToAdjust.id) {
                    return {
                        ...item,
                        quantity: response.data?.quantity ?? item.quantity,
                        status: response.data?.status ?? item.status
                    };
                }
                return item;
            }));

            toast.success("บันทึกข้อมูลเรียบร้อย");
            handleCloseAdjustModal();
            router.refresh();

        } catch (err: any) {
            toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ 2. ฟังก์ชันลบ Lot
    const handleDelete = async (lotId: string) => {
        if (!confirm("คุณต้องการลบ Lot นี้ใช่หรือไม่? \n(หากมีการใช้งานแล้ว ข้อมูลจะถูกซ่อนแทนการลบถาวร)")) {
            return;
        }

        setIsLoading(true);
        try {
            const currentUser = { user_id: 1, username: "Current User" }; // Mock User
            await deleteLot(lotId, currentUser);

            setLots(prev => prev.filter(item => item.id !== lotId));
            toast.success("ลบข้อมูลเรียบร้อย");
            router.refresh();

        } catch (err: any) {
            toast.error(err.message || "ไม่สามารถลบข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        toast.success("กำลังดาวน์โหลด CSV...");
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <Toaster position="top-right" />

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-white rounded-xl shadow-sm p-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Layers className="w-8 h-8 text-indigo-600" />
                        จัดการ Lot สินค้า
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 ml-11">บริหารจัดการวันหมดอายุและสถานะสินค้า</p>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium transition-all active:scale-95">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </header>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white p-5 rounded-xl shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="ค้นหา Lot, รหัส, ชื่อสินค้า..." onChange={(e) => handleSearchChange(e.target.value)} className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="relative">
                    <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="w-full rounded-lg border border-gray-200 py-2.5 pl-4 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white text-gray-700">
                        {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                    <input type="date" value={expiryFilter} onChange={(e) => { setExpiryFilter(e.target.value); setCurrentPage(1); }} className="w-full rounded-lg border border-gray-200 py-2.5 pl-4 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-600" />
                </div>
                <div className="relative">
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="w-full rounded-lg border border-gray-200 py-2.5 pl-4 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white text-gray-700">
                        <option value={8}>8 รายการ / หน้า</option>
                        <option value={15}>15 รายการ / หน้า</option>
                        <option value={50}>50 รายการ / หน้า</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto flex-grow">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium uppercase text-xs border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 w-[5%]">#</th>
                                <th className="px-6 py-4 w-[5%]">รูปภาพ</th>
                                <th className="px-6 py-4 w-[10%]">รหัสสินค้า</th>
                                <th className="px-6 py-4 w-[12%]">รหัส Lot</th>
                                <th className="px-6 py-4 w-[20%]">ชื่อสินค้า</th>
                                <th className="px-6 py-4 w-[10%]">หมวดหมู่</th>
                                <th className="px-6 py-4 text-center w-[8%]">คงเหลือ</th>
                                <th className="px-6 py-4 w-[10%]">วันหมดอายุ</th>
                                <th className="px-6 py-4 w-[10%]">สถานะ</th>
                                <th className="px-6 py-4 text-center w-[15%]">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedLots.length > 0 ? (
                                paginatedLots.map((lot, index) => (
                                    <tr key={lot.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-gray-500 font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>

                                        <td className="px-6 py-4">
                                            <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                                {lot.image_url ?
                                                    <img src={lot.image_url} alt={lot.item_name} className="w-full h-full object-cover" /> :
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Layers className="w-5 h-5" /></div>
                                                }
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 font-medium text-gray-900">{lot.item_code}</td>
                                        <td className="px-6 py-4 font-mono text-gray-600 bg-gray-50 rounded px-1">{lot.id}</td>
                                        <td className="px-6 py-4 text-gray-800 font-medium">{lot.item_name}</td>
                                        <td className="px-6 py-4 text-gray-500">{lot.category_name}</td>

                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-3 py-1 bg-gray-100 rounded-lg font-bold text-gray-700">
                                                {lot.quantity} <span className="text-xs font-normal text-gray-500">{lot.unit_name}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString("th-TH") : "-"}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={lot.status} /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center items-center gap-2 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">

                                                {/* ปุ่ม Adjust Group */}
                                                <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100">
                                                    <button disabled={isLoading} onClick={() => handleOpenAdjustModal(lot, "adjust")} className="p-1.5 text-blue-600 hover:bg-white hover:shadow-sm rounded transition-all" title="ปรับยอดสต๊อก"><Wrench className="w-4 h-4" /></button>
                                                    <button disabled={isLoading} onClick={() => handleOpenAdjustModal(lot, "damage")} className="p-1.5 text-orange-600 hover:bg-white hover:shadow-sm rounded transition-all" title="แจ้งชำรุด"><Archive className="w-4 h-4" /></button>
                                                    <button disabled={isLoading} onClick={() => handleOpenAdjustModal(lot, "expire")} className="p-1.5 text-red-600 hover:bg-white hover:shadow-sm rounded transition-all" title="ตัดจ่ายหมดอายุ"><AlertTriangle className="w-4 h-4" /></button>
                                                </div>

                                                {/* ปุ่มลบ */}
                                                <button
                                                    disabled={isLoading}
                                                    onClick={() => handleDelete(lot.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                    title="ลบรายการ (กรอกผิด)"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                    <Layers className="w-12 h-12 text-gray-300" />
                                    <p>ไม่พบข้อมูล Lot สินค้า</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">แสดง {filteredLots.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLots.length)} จาก {filteredLots.length}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-4 py-2 font-medium text-gray-700">หน้า {currentPage} / {totalPages || 1}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Adjust Modal */}
            {isAdjustModalOpen && lotToAdjust && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {adjustmentData.adjustmentType === 'adjust' && <><Wrench className="w-5 h-5 text-blue-600" /> ปรับยอดคงเหลือ</>}
                                {adjustmentData.adjustmentType === 'damage' && <><Archive className="w-5 h-5 text-orange-600" /> แจ้งสินค้าชำรุด</>}
                                {adjustmentData.adjustmentType === 'expire' && <><AlertTriangle className="w-5 h-5 text-red-600" /> ตัดจ่ายหมดอายุ</>}
                            </h3>
                            <button disabled={isLoading} onClick={handleCloseAdjustModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={validateAndSubmit} className="p-6 space-y-4">
                            <div className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-16 h-16 rounded-lg bg-white overflow-hidden border border-gray-200 flex-shrink-0">
                                    {lotToAdjust.image_url ?
                                        <img src={lotToAdjust.image_url} className="w-full h-full object-cover" /> :
                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Layers className="w-6 h-6" /></div>
                                    }
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 line-clamp-1">{lotToAdjust.item_name}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">Lot: {lotToAdjust.id}</div>
                                    <div className="text-xs text-gray-500 mt-1">คงเหลือ: <span className="font-bold text-indigo-600 text-sm">{lotToAdjust.quantity} {lotToAdjust.unit_name}</span></div>
                                </div>
                            </div>

                            {/* ซ่อนช่องกรอกจำนวนเมื่อเป็นเคส expire */}
                            {adjustmentData.adjustmentType !== 'expire' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {adjustmentData.adjustmentType === 'adjust' ? 'ยอดคงเหลือจริง (นับได้)' : 'จำนวนที่ชำรุด'}
                                    </label>
                                    <input
                                        type="number"
                                        value={adjustmentData.quantity}
                                        onChange={e => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="ระบุจำนวน"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผล / หมายเหตุ</label>
                                <textarea
                                    rows={2}
                                    value={adjustmentData.reason}
                                    onChange={e => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                                    placeholder={adjustmentData.adjustmentType === 'expire' ? "ระบุหมายเหตุการหมดอายุ..." : (adjustmentData.adjustmentType === 'adjust' ? "เช่น ตรวจนับประจำเดือน" : "ระบุสาเหตุ...")}
                                    disabled={isLoading}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 mt-4 pt-2 border-t border-gray-100">
                                <button type="button" disabled={isLoading} onClick={handleCloseAdjustModal} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</button>
                                <button type="submit" disabled={isLoading} className={`flex-1 px-4 py-2.5 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 ${adjustmentData.adjustmentType === 'adjust' ? 'bg-blue-600 hover:bg-blue-700' :
                                    adjustmentData.adjustmentType === 'damage' ? 'bg-orange-600 hover:bg-orange-700' :
                                        'bg-red-600 hover:bg-red-700'
                                    }`}>
                                    {isLoading ? "กำลังบันทึก..." : "บันทึก"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}