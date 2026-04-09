import { Trash2 } from "lucide-react";

export interface CartItem {
    itemId: string;
    itemName: string;
    category: string;
    unit: string;
    warehouseId: string;
    warehouseName: string;
    expectedQty: number;
    qty: number;
    lotCode: string;
    expiryDate: string;
    mfgDate: string;
    costPrice: number;
}

interface Props {
    items: CartItem[];
    showLotCode: boolean;
    onRemove: (index: number) => void;
}

export default function ReceiveItemsTable({ items, showLotCode, onRemove }: Props) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">รายการที่เพิ่มแล้ว</h3>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                    {items.length} รายการ
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            <th className="px-4 py-3 text-left w-10">#</th>
                            <th className="px-4 py-3 text-left">สินค้า</th>
                            <th className="px-4 py-3 text-left">ประเภท</th>
                            <th className="px-4 py-3 text-center">จำนวน</th>
                            {showLotCode && <th className="px-4 py-3 text-left">Lot Code</th>}
                            {showLotCode && <th className="px-4 py-3 text-left">วันหมดอายุ</th>}
                            <th className="px-4 py-3 text-left">หน่วย</th>
                            <th className="px-4 py-3 text-right w-16">ลบ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                                <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-900">{item.itemName}</p>
                                    {item.warehouseName && (
                                        <p className="text-xs text-slate-400 mt-0.5">{item.warehouseName}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-xs">{item.category}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold">
                                        {showLotCode ? item.qty : item.expectedQty}
                                    </span>
                                </td>
                                {showLotCode && (
                                    <td className="px-4 py-3 font-mono text-slate-700 text-xs">
                                        {item.lotCode || <span className="text-slate-400">—</span>}
                                    </td>
                                )}
                                {showLotCode && (
                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                        {item.expiryDate || <span className="text-slate-400">—</span>}
                                    </td>
                                )}
                                <td className="px-4 py-3 text-slate-600 text-xs">{item.unit}</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => onRemove(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="ลบรายการ"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
