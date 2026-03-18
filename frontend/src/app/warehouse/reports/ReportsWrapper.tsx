"use client";

import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import ReportTypeSelector from "./ReportTypeSelector";
import ReportsClient from "./ReportsClient";
import { type Report, type ReportType } from "@/types/reports_type";

interface ReportsWrapperProps {
	initialReports: Report[];
}

const ReportsWrapper: React.FC<ReportsWrapperProps> = ({ initialReports }) => {
	const [selectedType, setSelectedType] = useState<ReportType | "all">("all");
	const [showSelector, setShowSelector] = useState(true);

	const handleSelectType = (type: ReportType | "all") => {
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
			/>
		);
	}

	return (
		<div>
			{/* Back button */}
			<div className="bg-white border-b border-gray-200 sticky top-0 z-30">
				<div className="px-4 sm:px-6 py-3">
					<button
						onClick={handleBackToSelector}
						className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
					>
						<ChevronLeft className="w-4 h-4" />
						กลับไปเลือกประเภทรายงาน
					</button>
				</div>
			</div>

			{/* Report view */}
			<ReportsClient
				initialReports={initialReports}
				selectedType={selectedType}
			/>
		</div>
	);
};

export default ReportsWrapper;
