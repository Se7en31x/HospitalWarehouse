"use client";

import React, { useState } from "react";
import {
	FileText,
	ArrowDownToLine,
	ArrowUpFromLine,
	ClipboardCheck,
	RotateCw,
	Package,
} from "lucide-react";
import { type ReportType } from "@/types/reports_type";

interface ReportTypeSelectorProps {
	onSelectType: (type: ReportType | "all") => void;
	selectedType: ReportType | "all";
}

const reportTypeOptions = [
	{
		id: "all",
		label: "รายงานรวมทั้งหมด",
		description: "ดูรายงานทุกประเภท",
		icon: FileText,
		color: "from-slate-500 to-slate-600",
		bgColor: "bg-slate-100",
		textColor: "text-slate-700",
	},
	{
		id: "requisition",
		label: "รายงานคำขอ/ยืม",
		description: "ดูรายงานการเบิก ยืม คืนสินค้า",
		icon: ClipboardCheck,
		color: "from-indigo-500 to-indigo-600",
		bgColor: "bg-indigo-100",
		textColor: "text-indigo-700",
	},
	{
		id: "stockin",
		label: "รายงานนำเข้า",
		description: "ดูรายงานการรับเข้าสต็อก",
		icon: ArrowDownToLine,
		color: "from-blue-500 to-blue-600",
		bgColor: "bg-blue-100",
		textColor: "text-blue-700",
	},
	{
		id: "stockout",
		label: "รายงานนำออก",
		description: "ดูรายงานการจ่ายสินค้า",
		icon: ArrowUpFromLine,
		color: "from-rose-500 to-rose-600",
		bgColor: "bg-rose-100",
		textColor: "text-rose-700",
	},
	{
		id: "adjustment",
		label: "รายงานปรับปรุง",
		description: "ดูรายงานการปรับปรุงสต็อก",
		icon: RotateCw,
		color: "from-amber-500 to-amber-600",
		bgColor: "bg-amber-100",
		textColor: "text-amber-700",
	},
	{
		id: "return",
		label: "รายงานคืนสินค้า",
		description: "ดูรายงานการคืนสินค้า",
		icon: Package,
		color: "from-green-500 to-green-600",
		bgColor: "bg-green-100",
		textColor: "text-green-700",
	},
];

const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
	onSelectType,
	selectedType,
}) => {
	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-indigo-100 rounded-lg">
						<FileText className="w-6 h-6 text-indigo-600" />
					</div>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">เลือกประเภทรายงาน</h1>
						<p className="text-gray-600 mt-1">
							เลือกรายงานที่คุณต้องการดู
						</p>
					</div>
				</div>
			</div>

			{/* Report Type Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{reportTypeOptions.map((option) => {
					const Icon = option.icon;
					const isSelected =
						selectedType === (option.id as ReportType | "all");

					return (
						<button
							key={option.id}
							onClick={() => onSelectType(option.id as ReportType | "all")}
							className={`group relative overflow-hidden rounded-lg p-6 text-left transition-all duration-300 transform hover:scale-105 ${
								isSelected
									? `bg-white shadow-lg ring-2 ring-${option.id === "all" ? "slate" : option.id === "requisition" ? "indigo" : option.id === "stockin" ? "blue" : option.id === "stockout" ? "rose" : option.id === "adjustment" ? "amber" : "green"}-500`
									: "bg-white shadow-md hover:shadow-lg"
							}`}
						>
							{/* Background gradient on hover */}
							<div
								className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-5 transition-opacity`}
							/>

							{/* Content */}
							<div className="relative z-10">
								<div className="flex items-start justify-between mb-3">
									<div
										className={`p-2.5 rounded-lg ${option.bgColor}`}
									>
										<Icon className={`w-6 h-6 ${option.textColor}`} />
									</div>
									{isSelected && (
										<div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
											<svg
												className="w-4 h-4 text-white"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
									)}
								</div>

								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									{option.label}
								</h3>
								<p className="text-sm text-gray-600">
									{option.description}
								</p>
							</div>

							{/* Bottom border accent */}
							<div
								className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${option.color} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}
							/>
						</button>
					);
				})}
			</div>

			{/* Info card */}
			<div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
				<p className="text-sm text-blue-800">
					<span className="font-semibold">💡 แนะนำ:</span> เลือกประเภทรายงานเพื่อดูรายงานที่เกี่ยวข้อง
					หรือเลือก "รายงานรวมทั้งหมด" เพื่อดูทุกประเภท
				</p>
			</div>
		</div>
	);
};

export default ReportTypeSelector;
