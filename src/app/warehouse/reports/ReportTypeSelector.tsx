"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

export type ReportPage =
	| "all"
	| "all-items"
	| "requisition"
	| "stockin"
	| "stockout"
	| "stock-balance"
	| "expired-lots"
	| "low-stock"
	| "near-expiry";

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
		id: "stockin",
		label: "รายงานรับเข้า",
		description: "ตรวจสอบรายการรับเข้าและค้นหาตามช่วงเวลา",
		countBg: "bg-emerald-50",
		countText: "text-emerald-700",
		ringColor: "ring-emerald-300",
		countKey: "totalReceives",
	},
	{
		id: "stockout",
		label: "รายงานจ่ายออก",
		description: "ดูรายการจ่ายออกพร้อมตรวจสอบสถานะย้อนหลัง",
		countBg: "bg-rose-50",
		countText: "text-rose-700",
		ringColor: "ring-rose-300",
		countKey: "totalStockOuts",
	},
	{
		id: "stock-balance",
		label: "รายงานคงคลัง",
		description: "ตรวจสอบรายการคงเหลือและระดับสต็อกปัจจุบัน",
		countBg: "bg-cyan-50",
		countText: "text-cyan-700",
		ringColor: "ring-cyan-300",
		countKey: "totalStockBalance",
	},
	{
		id: "expired-lots",
		label: "รายงานล็อตหมดอายุ",
		description: "ติดตามล็อตที่หมดอายุหรือใกล้หมดอายุ",
		countBg: "bg-orange-50",
		countText: "text-orange-700",
		ringColor: "ring-orange-300",
		countKey: "totalExpiredLots",
	},
	{
		id: "low-stock",
		label: "รายงานสต็อกต่ำ",
		description: "ดูสินค้าที่ต่ำกว่า Min Stock พร้อมเรียงตามความเสี่ยง",
		countBg: "bg-amber-50",
		countText: "text-amber-700",
		ringColor: "ring-amber-300",
		countKey: "lowStockCount",
	},
	{
		id: "near-expiry",
		label: "รายงานใกล้หมดอายุ",
		description: "ตรวจสอบล็อตที่ใกล้ถึงกำหนดหมดอายุตามช่วงเวลา",
		countBg: "bg-red-50",
		countText: "text-red-700",
		ringColor: "ring-red-300",
		countKey: "nearExpiryCount",
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

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
				{reportTypeOptions.map((option) => {
					const isSelected = selectedType === option.id;
					const count =
						counts && option.countKey ? counts[option.countKey] : undefined;

					return (
						<button
							key={option.id}
							onClick={() => onSelectType(option.id)}
							aria-pressed={isSelected}
							className={`group relative min-h-[184px] overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]`}
						>
							<div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

							<div className="relative z-10">
								<div className="flex items-start justify-between gap-3 mb-5">
									<div
										className={`min-w-[52px] rounded-2xl px-3 py-2.5 text-center shadow-sm ${option.countBg}`}
									>
										<span
											className={`block text-[22px] leading-none font-semibold ${option.countText}`}
										>
											{count !== undefined ? count.toLocaleString() : "0"}
										</span>
									</div>
									<ChevronRight className="mt-1 h-5 w-5 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400" />
								</div>

								<h3 className="text-[15px] sm:text-base font-semibold text-slate-900 leading-snug mb-2">
									{option.label}
								</h3>
								<p className="text-sm leading-6 text-slate-500">
									{option.description}
								</p>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default ReportTypeSelector;
