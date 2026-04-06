"use client";

import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import ReportTypeSelector, { type ReportPage } from "./ReportTypeSelector";
import ReportsClient from "./ReportsClient";
import ItemsReportClient from "./ItemsReportClient";
import LowStockReportClient from "./LowStockReportClient";
import NearExpiryReportClient from "./NearExpiryReportClient";
import { type Report } from "@/types/report_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";

interface ReportsWrapperProps {
	initialReports: Report[];
	initialItems: UiItem[];
	initialLowStockItems: UiItem[];
	initialExpiringLots: ExpiringLot[];
	counts: {
		totalItems: number;
		totalRequisitions: number;
		totalReceives: number;
		lowStockCount: number;
		nearExpiryCount: number;
	};
}

const pageTitles: Record<ReportPage, string> = {
	all: "รายงานทั้งหมด",
	"all-items": "รายงานสินค้าทั้งหมด",
	requisition: "รายงานคำขอเบิก/ยืม",
	stockin: "รายงานรับเข้า",
	"low-stock": "รายงานสินค้าต่ำกว่าจุดต่ำสุด",
	"near-expiry": "รายงานสินค้าใกล้หมดอายุ",
};

const ReportsWrapper: React.FC<ReportsWrapperProps> = ({
	initialReports,
	initialItems,
	initialLowStockItems,
	initialExpiringLots,
	counts,
}) => {
	const [selectedType, setSelectedType] = useState<ReportPage>("all");
	const [showSelector, setShowSelector] = useState(true);

	const handleSelectType = (type: ReportPage) => {
		setSelectedType(type);
		setShowSelector(false);
	};

	const handleBackToSelector = () => {
		setShowSelector(true);
	};

	if (showSelector) {
		return (
			<ReportTypeSelector
				onSelectType={handleSelectType}
				selectedType={selectedType}
				counts={counts}
			/>
		);
	}

	const renderReportContent = () => {
		switch (selectedType) {
			case "all-items":
				return <ItemsReportClient initialItems={initialItems} />;
			case "low-stock":
				return <LowStockReportClient initialItems={initialLowStockItems} />;
			case "near-expiry":
				return <NearExpiryReportClient initialLots={initialExpiringLots} />;
			case "requisition":
				return (
					<ReportsClient
						initialReports={initialReports.filter(
							(r) => r.type === "requisition"
						)}
						selectedType="requisition"
					/>
				);
			case "stockin":
				return (
					<ReportsClient
						initialReports={initialReports.filter(
							(r) => r.type === "stockin"
						)}
						selectedType="stockin"
					/>
				);
			default:
				return (
					<ReportsClient
						initialReports={initialReports}
						selectedType="all"
					/>
				);
		}
	};

	return (
		<div>
			{/* Back button */}
			<div className="bg-white border-b border-gray-200 sticky top-0 z-30">
				<div className="px-4 sm:px-6 py-3 flex items-center gap-3">
					<button
						onClick={handleBackToSelector}
						className="flex items-center gap-1.5 text-hospital hover:text-hospital-dark font-medium transition-colors text-sm"
					>
						<ChevronLeft className="w-4 h-4" />
						กลับ
					</button>
					<span className="text-gray-300">|</span>
					<h2 className="text-sm font-semibold text-gray-800">
						{pageTitles[selectedType]}
					</h2>
				</div>
			</div>

			{/* Report content */}
			{renderReportContent()}
		</div>
	);
};

export default ReportsWrapper;
