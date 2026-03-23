"use client";

import React from "react";
import {
	FileText,
	Package,
	ClipboardList,
	ArrowDownToLine,
	TrendingDown,
	AlertTriangle,
	BarChart3,
} from "lucide-react";

export type ReportPage =
	| "all"
	| "all-items"
	| "requisition"
	| "stockin"
	| "low-stock"
	| "near-expiry";

interface ReportTypeSelectorProps {
	onSelectType: (type: ReportPage) => void;
	selectedType: ReportPage;
	counts?: {
		totalItems?: number;
		totalRequisitions?: number;
		totalReceives?: number;
		lowStockCount?: number;
		nearExpiryCount?: number;
	};
}

const reportTypeOptions: {
	id: ReportPage;
	label: string;
	description: string;
	icon: React.ElementType;
	color: string;
	bgColor: string;
	textColor: string;
	ringColor: string;
	countKey?: keyof NonNullable<ReportTypeSelectorProps["counts"]>;
	badgeColor?: string;
}[] = [
	{
		id: "all",
		label: "รายงานทั้งหมด",
		description: "ดูภาพรวมรายงานทุกประเภทในระบบ",
		icon: BarChart3,
		color: "from-slate-500 to-slate-700",
		bgColor: "bg-slate-100",
		textColor: "text-slate-700",
		ringColor: "ring-slate-400",
	},
	{
		id: "all-items",
		label: "รายงานสินค้าทั้งหมด",
		description: "รายงานสินค้าและพัสดุทั้งหมดในคลัง",
		icon: Package,
		color: "from-blue-500 to-blue-700",
		bgColor: "bg-blue-100",
		textColor: "text-blue-700",
		ringColor: "ring-blue-400",
		countKey: "totalItems",
	},
	{
		id: "requisition",
		label: "รายงานคำขอเบิก/ยืม",
		description: "รายงานการเบิก ยืม คืนพัสดุ",
		icon: ClipboardList,
		color: "from-indigo-500 to-indigo-700",
		bgColor: "bg-indigo-100",
		textColor: "text-indigo-700",
		ringColor: "ring-indigo-400",
		countKey: "totalRequisitions",
	},
	{
		id: "stockin",
		label: "รายงานรับเข้า",
		description: "รายงานการรับพัสดุเข้าคลัง",
		icon: ArrowDownToLine,
		color: "from-emerald-500 to-emerald-700",
		bgColor: "bg-emerald-100",
		textColor: "text-emerald-700",
		ringColor: "ring-emerald-400",
		countKey: "totalReceives",
	},
	{
		id: "low-stock",
		label: "รายงานสินค้าต่ำกว่าจุดต่ำสุด",
		description: "สินค้าที่มีจำนวนคงเหลือต่ำกว่า Min Stock",
		icon: TrendingDown,
		color: "from-amber-500 to-amber-700",
		bgColor: "bg-amber-100",
		textColor: "text-amber-700",
		ringColor: "ring-amber-400",
		countKey: "lowStockCount",
		badgeColor: "bg-amber-500",
	},
	{
		id: "near-expiry",
		label: "รายงานสินค้าใกล้หมดอายุ",
		description: "ล็อตพัสดุที่ใกล้ถึงหรือเลยวันหมดอายุ",
		icon: AlertTriangle,
		color: "from-red-500 to-red-700",
		bgColor: "bg-red-100",
		textColor: "text-red-700",
		ringColor: "ring-red-400",
		countKey: "nearExpiryCount",
		badgeColor: "bg-red-500",
	},
];

const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
	onSelectType,
	selectedType,
	counts,
}) => {
	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-1">
					<div className="p-2.5 bg-hospital/10 rounded-xl">
						<FileText className="w-7 h-7 text-hospital" />
					</div>
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
							ศูนย์รายงาน
						</h1>
						<p className="text-gray-500 text-sm mt-0.5">
							เลือกประเภทรายงานที่ต้องการเรียกดู
						</p>
					</div>
				</div>
			</div>

			{/* Report Type Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
				{reportTypeOptions.map((option) => {
					const Icon = option.icon;
					const isSelected = selectedType === option.id;
					const count =
						counts && option.countKey ? counts[option.countKey] : undefined;

					return (
						<button
							key={option.id}
							onClick={() => onSelectType(option.id)}
							className={`group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-left transition-all duration-200 hover:-translate-y-1 ${
								isSelected
									? `bg-white shadow-lg ${option.ringColor} ring-2`
									: "bg-white shadow-sm border border-gray-200 hover:shadow-md"
							}`}
						>
							{/* Background gradient on hover */}
							<div
								className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`}
							/>

							<div className="relative z-10">
								{/* Icon + Badge row */}
								<div className="flex items-start justify-between mb-4">
									<div className={`p-3 rounded-xl ${option.bgColor}`}>
										<Icon className={`w-6 h-6 ${option.textColor}`} />
									</div>
									{count !== undefined && count > 0 && option.badgeColor && (
										<span
											className={`${option.badgeColor} text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[28px] text-center`}
										>
											{count}
										</span>
									)}
									{count !== undefined && count > 0 && !option.badgeColor && (
										<span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
											{count.toLocaleString()}
										</span>
									)}
								</div>

								{/* Title */}
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5">
									{option.label}
								</h3>
								{/* Description */}
								<p className="text-sm text-gray-500 leading-relaxed">
									{option.description}
								</p>
							</div>

							{/* Bottom accent bar */}
							<div
								className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${option.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}
							/>
						</button>
					);
				})}
			</div>

			{/* Info card */}
			<div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
				<span className="text-lg">💡</span>
				<p className="text-sm text-blue-800">
					<span className="font-semibold">แนะนำ:</span> เลือกประเภทรายงานเพื่อดูข้อมูลเชิงลึก
					หรือเลือก &quot;รายงานทั้งหมด&quot; เพื่อดูภาพรวมทุกประเภท
				</p>
			</div>
		</div>
	);
};

export default ReportTypeSelector;
