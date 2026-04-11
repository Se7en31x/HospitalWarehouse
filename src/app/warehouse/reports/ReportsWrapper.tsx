"use client";

import React, { useState } from "react";
import ReportTypeSelector, { type ReportPage } from "./ReportTypeSelector";
import RequisitionReportClient from "./RequisitionReportClient";
import StockBalanceReportClient from "./StockBalanceReportClient";
import ItemsReportClient from "./ItemsReportClient";
import LowStockReportClient from "./LowStockReportClient";
import AssetReportClient from "./AssetReportClient";
import ReusableItemsReportClient from "./ReusableItemsReportClient";
import InventoryBalanceReportClient from "./InventoryBalanceReportClient";
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
		switch (selectedType) {
			case "all-items":
				return <ItemsReportClient initialItems={initialItems} onBack={handleBackToSelector} />;

			case "low-stock":
				return (
					<LowStockReportClient
						initialItems={initialLowStockItems}
						onBack={handleBackToSelector}
					/>
				);

			case "requisition":
				return <RequisitionReportClient onBack={handleBackToSelector} />;

			case "stock-balance":
				return <StockBalanceReportClient onBack={handleBackToSelector} />;

			case "inventory-balance":
				return <InventoryBalanceReportClient onBack={handleBackToSelector} />;

			case "assets":
				return <AssetReportClient onBack={handleBackToSelector} />;

			case "reusable-items":
				return <ReusableItemsReportClient onBack={handleBackToSelector} />;

			default:
				return null;
		}
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

	return <div>{renderReportContent()}</div>;
};

export default ReportsWrapper;
