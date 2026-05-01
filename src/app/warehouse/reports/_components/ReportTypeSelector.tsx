"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

export type ReportPage =
	| "all"
	| "all-items"
	| "requisition"
	| "stock-balance"
	| "inventory-balance"
	| "low-stock"
	| "assets"
	| "reusable-items"
	| "receive-report"
	| "item-ranking"
	| "inventory-value"
	| "expired-lots"
	| "dept-consumption"
	| "return-condition"
	| "overdue-borrow";

interface ReportTypeSelectorProps {
	onSelectType: (type: ReportPage) => void;
	selectedType: ReportPage;
	counts?: {
		totalItems?: number;
		totalRequisitions?: number;
		totalReceives?: number;
		totalStockOuts?: number;
		totalStockBalance?: number;
		totalExpiredLots?: number;
		lowStockCount?: number;
		nearExpiryCount?: number;
	};
}

const reportTypeOptions: {
	id: ReportPage;
	label: string;
	description: string;
	countBg: string;
	countText: string;
	ringColor: string;
	countKey?: keyof NonNullable<ReportTypeSelectorProps["counts"]>;
}[] = [
	{
		id: "all-items",
		label: "รายงานสินค้าทั้งหมด",
		description: "ดูรายการสินค้าทั้งหมดพร้อมตัวกรองหมวดหมู่และคลัง",
		countBg: "bg-indigo-50",
		countText: "text-indigo-700",
		ringColor: "ring-indigo-300",
		countKey: "totalItems",
	},
	{
		id: "requisition",
		label: "รายงานคำขอเบิก/ยืม",
		description: "แยกดูคำขอเบิกและยืมตามฟิลเตอร์สถานะ",
		countBg: "bg-violet-50",
		countText: "text-violet-700",
		ringColor: "ring-violet-300",
		countKey: "totalRequisitions",
	},
	{
		id: "stock-balance",
		label: "รายงานความเคลื่อนไหวสต็อก",
		description: "ติดตามการเคลื่อนไหวสต็อกทั้งหมด รับเข้า จ่ายออก และปรับปรุง",
		countBg: "bg-cyan-50",
		countText: "text-cyan-700",
		ringColor: "ring-cyan-300",
	},
	{
		id: "inventory-balance",
		label: "รายงานคงคลังรายคลัง",
		description: "สรุปสต็อกแยกตามคลัง พร้อมดูรายละเอียดสินค้าแต่ละคลัง",
		countBg: "bg-teal-50",
		countText: "text-teal-700",
		ringColor: "ring-teal-300",
	},
	{
		id: "low-stock",
		label: "รายงานสต็อกต่ำ & ใกล้หมดอายุ",
		description: "ดูสินค้าที่ต่ำกว่า Min Stock และล็อตที่ใกล้หมดอายุในหน้าเดียว",
		countBg: "bg-amber-50",
		countText: "text-amber-700",
		ringColor: "ring-amber-300",
		countKey: "lowStockCount",
	},
	{
		id: "assets",
		label: "รายงานครุภัณฑ์",
		description: "ตรวจสอบสถานะและที่ตั้งของครุภัณฑ์แยกตามแผนก",
		countBg: "bg-purple-50",
		countText: "text-purple-700",
		ringColor: "ring-purple-300",
	},
	{
		id: "reusable-items",
		label: "รายงานของใช้ซ้ำรายชิ้น",
		description: "ดูสถานะและสภาพของสินค้าประเภทใช้ซ้ำแยกตามแผนก",
		countBg: "bg-teal-50",
		countText: "text-teal-700",
		ringColor: "ring-teal-300",
	},
	{
		id: "receive-report",
		label: "รายงานการรับสินค้าเข้าคลัง",
		description: "ดูรายการรับสินค้าทั้งหมด พร้อมจำนวนในใบกำกับ จำนวนรับจริง และราคาต่อหน่วย",
		countBg: "bg-blue-50",
		countText: "text-blue-700",
		ringColor: "ring-blue-300",
		countKey: "totalReceives",
	},
];

const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
	onSelectType,
	selectedType,
	counts,
}) => {
	return (
		<div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงาน</h2>
				</div>
			</div>

			<div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm text-slate-600">
						<thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
							<tr>
								<th className="px-6 py-4 font-bold whitespace-nowrap">ชื่อรายงาน</th>
								<th className="px-6 py-4 font-bold">รายละเอียด</th>
								<th className="px-6 py-4 font-bold text-center whitespace-nowrap w-32"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{reportTypeOptions.map((option) => {
								const isSelected = selectedType === option.id;
								const count =
									counts && option.countKey ? counts[option.countKey] : undefined;

								return (
									<tr
										key={option.id}
										onClick={() => onSelectType(option.id)}
										className="group transition-colors duration-150 cursor-pointer bg-white hover:bg-slate-50"
										aria-selected={isSelected}
									>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors duration-150">
												{option.label}
											</span>
										</td>
										<td className="px-6 py-4">
											<span className="text-slate-500 group-hover:text-slate-700 transition-colors duration-150">
												{option.description}
											</span>
										</td>
										<td className="px-6 py-4 text-center whitespace-nowrap w-32">
											<div className="inline-flex items-center justify-center gap-1 text-slate-500 font-medium group-hover:text-indigo-600 transition-colors duration-150">
												<span className="text-sm">เปิดดู</span>
												<ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default ReportTypeSelector;
