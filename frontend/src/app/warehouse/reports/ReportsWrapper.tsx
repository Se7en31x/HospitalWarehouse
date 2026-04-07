"use client";

import React, { useState } from "react";
import ReportTypeSelector, { type ReportPage } from "./ReportTypeSelector";
import ReportsClient from "./ReportsClient";
import RequisitionReportClient from "./RequisitionReportClient";
import StockInReportClient from "./StockInReportClient";
import StockOutReportClient from "./StockOutReportClient";
import StockBalanceReportClient from "./StockBalanceReportClient";
import ExpiredLotsReportClient from "./ExpiredLotsReportClient";
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
		totalStockOuts: number;
		totalStockBalance: number;
		totalExpiredLots: number;
		lowStockCount: number;
		nearExpiryCount: number;
	};
}
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

	const renderReportContent = () => {
		if (selectedType === "all-items") {
			return <ItemsReportClient initialItems={initialItems} onBack={handleBackToSelector} />;
		}

		if (selectedType === "low-stock") {
			return (
				<LowStockReportClient
					initialItems={initialLowStockItems}
					onBack={handleBackToSelector}
				/>
			);
		}

		if (selectedType === "near-expiry") {
			return (
				<NearExpiryReportClient
					initialLots={initialExpiringLots}
					onBack={handleBackToSelector}
				/>
			);
		}

		if (selectedType === "requisition") {
			return <RequisitionReportClient onBack={handleBackToSelector} />;
		}

		if (selectedType === "stockin") {
			return <StockInReportClient onBack={handleBackToSelector} />;
		}

		if (selectedType === "stockout") {
			return <StockOutReportClient onBack={handleBackToSelector} />;
		}

		if (selectedType === "stock-balance") {
			return (
				<StockBalanceReportClient
					initialItems={initialItems}
					onBack={handleBackToSelector}
				/>
			);
		}

		if (selectedType === "expired-lots") {
			return (
				<ExpiredLotsReportClient
					initialLots={initialExpiringLots}
					onBack={handleBackToSelector}
				/>
			);
		}

		return (
			<ReportsClient
				initialReports={initialReports}
				selectedType="all"
			/>
		);
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

	return (
		<div>
			{/* Report content */}
			{renderReportContent()}
		</div>
	);
};

export default ReportsWrapper;
