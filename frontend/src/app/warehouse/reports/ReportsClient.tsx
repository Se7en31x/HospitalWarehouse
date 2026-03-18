"use client";

import React, { useState, useEffect } from "react";
import {
	FileText,
	Search,
	Calendar,
	Download,
	ArrowDownToLine,
	ArrowUpFromLine,
	ClipboardCheck,
	RotateCw,
	Eye,
	Filter,
	ChevronDown,
} from "lucide-react";
import {
	getAllReports,
	getReportSummary,
	exportReports,
	type Report,
	type ReportFilterParams,
	type ReportSummary,
} from "@/services/reportService";

interface ReportsClientProps {
	initialReports: Report[];
	selectedType?: string;
}

const ReportsClient: React.FC<ReportsClientProps> = ({
	initialReports,
	selectedType: propSelectedType = "all",
}) => {
	const [reports, setReports] = useState<Report[]>(initialReports);
	const [filteredReports, setFilteredReports] = useState<Report[]>(initialReports);
	const [isLoading, setIsLoading] = useState(false);
	const [summary, setSummary] = useState<ReportSummary[]>([]);

	// Filter states
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedType, setSelectedType] = useState<string>(propSelectedType);
	const [selectedStatus, setSelectedStatus] = useState<string>("all");
	const [selectedDepartment, setSelectedDepartment] = useState("all");
	const [dateRange, setDateRange] = useState({ start: "", end: "" });
	const [showFilters, setShowFilters] = useState(false);

	// Sync with prop changes
	useEffect(() => {
		setSelectedType(propSelectedType);
	}, [propSelectedType]);

	// Extract unique departments
	const departments = Array.from(
		new Set(
			reports
				.filter((r) => "department" in r && r.department)
				.map((r) => ("department" in r ? r.department : ""))
				.filter(Boolean)
		)
	);

	// Initialize summary
	useEffect(() => {
		const summaryData = getReportSummary(reports);
		setSummary(summaryData);
	}, [reports]);

	// Apply filters
	useEffect(() => {
		let filtered = [...reports];

		// Filter by type
		if (selectedType !== "all") {
			filtered = filtered.filter((r) => r.type === selectedType);
		}

		// Filter by status
		if (selectedStatus !== "all") {
			filtered = filtered.filter((r) => r.status === selectedStatus);
		}

		// Filter by department
		if (selectedDepartment !== "all") {
			filtered = filtered.filter((r) => {
				if ("department" in r) return r.department === selectedDepartment;
				return true;
			});
		}

		// Filter by date range
		if (dateRange.start) {
			filtered = filtered.filter((r) => r.date >= dateRange.start);
		}
		if (dateRange.end) {
			filtered = filtered.filter((r) => r.date <= dateRange.end);
		}

		// Filter by search term
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(r) =>
					r.reportNo.toLowerCase().includes(search) ||
					("requester" in r && r.requester?.toLowerCase().includes(search)) ||
					("department" in r && r.department?.toLowerCase().includes(search)) ||
					r.items.some((item) => item.itemName.toLowerCase().includes(search))
			);
		}

		setFilteredReports(filtered);
	}, [reports, selectedType, selectedStatus, selectedDepartment, dateRange, searchTerm]);

	// Refresh reports
	const handleRefresh = async () => {
		setIsLoading(true);
		try {
			const freshReports = await getAllReports();
			setReports(freshReports);
		} catch (error) {
			console.error("Error refreshing reports:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Export reports
	const handleExport = async (format: "pdf" | "excel") => {
		try {
			setIsLoading(true);
			await exportReports(filteredReports, format);
			console.log(`ส่งออกรายงาน ${format.toUpperCase()} เรียบร้อย`);
		} catch (error) {
			console.error("Export error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Get type label
	const getTypeLabel = (type: string): string => {
		const labels: Record<string, string> = {
			stockin: "นำเข้า",
			stockout: "นำออก",
			requisition: "คำขอ/ยืม",
			adjustment: "ปรับปรุง",
			return: "คืนสินค้า",
		};
		return labels[type] || type;
	};

	// Get type icon
	const getTypeIcon = (type: string) => {
		const icons: Record<string, React.ReactNode> = {
			stockin: <ArrowDownToLine className="w-4 h-4 text-blue-600" />,
			stockout: <ArrowUpFromLine className="w-4 h-4 text-rose-600" />,
			requisition: <ClipboardCheck className="w-4 h-4 text-indigo-600" />,
			adjustment: <RotateCw className="w-4 h-4 text-amber-600" />,
			return: <ArrowDownToLine className="w-4 h-4 text-green-600" />,
		};
		return icons[type] || null;
	};

	// Get status badge
	const getStatusBadge = (status: string) => {
		const statusConfig: Record<string, { color: string; text: string }> = {
			DRAFT: { color: "bg-gray-100 text-gray-800", text: "ร่างสัญญา" },
			PENDING: { color: "bg-yellow-100 text-yellow-800", text: "รอดำเนินการ" },
			APPROVED: { color: "bg-green-100 text-green-800", text: "อนุมัติ" },
			COMPLETED: { color: "bg-blue-100 text-blue-800", text: "เสร็จสมบูรณ์" },
			REJECTED: { color: "bg-red-100 text-red-800", text: "ปฏิเสธ" },
			CANCELLED: { color: "bg-gray-100 text-gray-800", text: "ยกเลิก" },
		};
		const config = statusConfig[status] || statusConfig.PENDING;
		return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>{config.text}</span>;
	};

	// Format date
	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("th-TH", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Format currency
	const formatCurrency = (value: number): string => {
		return value.toLocaleString("th-TH", {
			style: "currency",
			currency: "THB",
		});
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-indigo-100 rounded-lg">
							<FileText className="w-6 h-6 text-indigo-600" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								{selectedType === "all"
									? "ระบบรายงานรวมทั้งหมด"
									: `รายงาน${getTypeLabel(selectedType)}`}
							</h1>
							<p className="text-sm text-gray-600 mt-1">
								{selectedType === "all"
									? "ภาพรวมการนำเข้า นำออก คำขอ และการปรับปรุงสต็อก"
									: undefined}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							onClick={handleRefresh}
							disabled={isLoading}
							className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
						>
							<RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
							รีเฟรช
						</button>
						<button
							onClick={() => handleExport("pdf")}
							disabled={isLoading || filteredReports.length === 0}
							className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
						>
							<Download className="w-4 h-4" />
							PDF
						</button>
						<button
							onClick={() => handleExport("excel")}
							disabled={isLoading || filteredReports.length === 0}
							className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
						>
							<Download className="w-4 h-4" />
							Excel
						</button>
					</div>
				</div>

				{/* Summary Cards - Only show all if "all" is selected */}
				{selectedType === "all" && (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
						{summary.map((item) => (
							<div key={item.type} className={`${item.bgColor} rounded-lg p-4`}>
								<div className="flex items-center justify-between mb-2">
									<h3 className={`text-sm font-semibold ${item.color}`}>{item.label}</h3>
									<span className="text-lg">{item.icon}</span>
								</div>
								<div className="space-y-1">
									<p className="text-xs text-gray-600">จำนวน: {item.count} รายการ</p>
									<p className={`text-sm font-semibold ${item.color}`}>{formatCurrency(item.totalValue)}</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Search and Filters */}
			<div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
				<div className="flex items-center gap-2 mb-4">
					<Filter className="w-4 h-4 text-gray-600" />
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-1"
					>
						ตัวกรอง {showFilters && <ChevronDown className="w-4 h-4 rotate-180" />}
					</button>
				</div>

				{/* Search */}
				<div className="flex-1 mb-4">
					<div className="relative">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="ค้นหาด้วยเลขที่, ชื่อผู้ขอ, แผนก หรือชื่อสินค้า..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
						/>
					</div>
				</div>

				{/* Filters (Collapsible) */}
				{showFilters && (
					<div className="space-y-4 border-t pt-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							{/* Type Filter - Only show if viewing all reports */}
							{selectedType === "all" && (
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">ประเภท</label>
									<select
										value={selectedType}
										onChange={(e) => setSelectedType(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
									>
										<option value="all">ทั้งหมด</option>
										<option value="stockin">นำเข้า</option>
										<option value="stockout">นำออก</option>
										<option value="requisition">คำขอ/ยืม</option>
										<option value="adjustment">ปรับปรุง</option>
										<option value="return">คืนสินค้า</option>
									</select>
								</div>
							)}

							{/* Status Filter */}
							<div className={selectedType !== "all" ? "sm:col-span-2 lg:col-span-4" : ""}>
								<label className="block text-xs font-medium text-gray-700 mb-1">สถานะ</label>
								<select
									value={selectedStatus}
									onChange={(e) => setSelectedStatus(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
								>
									<option value="all">ทั้งหมด</option>
									<option value="DRAFT">ร่างสัญญา</option>
									<option value="PENDING">รอดำเนินการ</option>
									<option value="APPROVED">อนุมัติ</option>
									<option value="COMPLETED">เสร็จสมบูรณ์</option>
									<option value="REJECTED">ปฏิเสธ</option>
								</select>
							</div>

							{/* Department Filter */}
							{departments.length > 0 && (
								<div className={selectedType !== "all" ? "sm:col-span-2 lg:col-span-3" : ""}>
									<label className="block text-xs font-medium text-gray-700 mb-1">แผนก</label>
									<select
										value={selectedDepartment}
										onChange={(e) => setSelectedDepartment(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
									>
										<option value="all">ทั้งหมด</option>
										{departments.map((dept) => (
											<option key={dept} value={dept}>
												{dept}
											</option>
										))}
									</select>
								</div>
							)}

							{/* Date Range */}
							<div className={selectedType !== "all" ? "sm:col-span-2 lg:col-span-1" : "sm:col-span-2 lg:col-span-1"}>
								<label className="block text-xs font-medium text-gray-700 mb-1">วันที่</label>
								<div className="flex gap-2">
									<div className="relative flex-1">
										<input
											type="date"
											value={dateRange.start}
											onChange={(e) =>
												setDateRange({ ...dateRange, start: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
										/>
										<Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
									</div>
									<div className="relative flex-1">
										<input
											type="date"
											value={dateRange.end}
											onChange={(e) =>
												setDateRange({ ...dateRange, end: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
										/>
										<Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Reports List */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="px-4 sm:px-6 py-4 border-b border-gray-200">
					<h2 className="text-base font-semibold text-gray-900">
						รายการรายงาน ({filteredReports.length})
					</h2>
				</div>

				{filteredReports.length > 0 ? (
					<div className="divide-y divide-gray-200">
						{filteredReports.map((report) => (
							<div
								key={`${report.type}-${report.id}`}
								className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-start justify-between gap-4 flex-wrap">
									{/* Left Content */}
									<div className="flex-1 min-w-0">
										{/* Header Row */}
										<div className="flex items-center gap-3 mb-3 flex-wrap">
											<div className="flex items-center gap-2">
												{getTypeIcon(report.type)}
												<h3 className="text-base font-semibold text-gray-900">
													{report.reportNo}
												</h3>
											</div>
											{getStatusBadge(report.status)}
										</div>

										{/* Details Grid */}
										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
											<div>
												<span className="text-gray-500 text-xs">วันที่:</span>
												<p className="text-gray-900 font-medium">
													{formatDate(report.date)}
												</p>
											</div>

											<div>
												<span className="text-gray-500 text-xs">ประเภท:</span>
												<p className="text-gray-900 font-medium">
													{getTypeLabel(report.type)}
												</p>
											</div>

											{("requester" in report || "department" in report) && (
												<div>
													<span className="text-gray-500 text-xs">
														{"requester" in report ? "ผู้ขอ:" : "ผู้ดำเนินการ:"}
													</span>
													<p className="text-gray-900 font-medium">
														{("requester" in report && report.requester) || "Unknown"}
													</p>
												</div>
											)}

											{"department" in report && (
												<div>
													<span className="text-gray-500 text-xs">แผนก:</span>
													<p className="text-gray-900 font-medium">{report.department}</p>
												</div>
											)}

											<div>
												<span className="text-gray-500 text-xs">จำนวน:</span>
												<p className="text-gray-900 font-medium">
													{report.totalItems} รายการ
												</p>
											</div>

											<div>
												<span className="text-gray-500 text-xs">มูลค่า:</span>
												<p className="text-gray-900 font-semibold">
													{formatCurrency(report.totalValue)}
												</p>
											</div>

											{report.items.length > 0 && (
												<div className="sm:col-span-2 lg:col-span-3">
													<span className="text-gray-500 text-xs">สินค้า:</span>
													<div className="flex flex-wrap gap-2 mt-1">
														{report.items.slice(0, 3).map((item, idx) => (
															<span
																key={idx}
																className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
															>
																{item.itemName}
																<span className="text-gray-500">x{item.quantity}</span>
															</span>
														))}
														{report.items.length > 3 && (
															<span className="text-xs text-gray-600 italic">
																+{report.items.length - 3} รายการอื่น
															</span>
														)}
													</div>
												</div>
											)}
										</div>
									</div>

									{/* Action Button */}
									<button
										onClick={() => console.log("View details:", report)}
										className="p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex-shrink-0"
										title="ดูรายละเอียด"
									>
										<Eye className="w-4 h-4" />
									</button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
						<h3 className="text-base font-medium text-gray-900 mb-1">
							{isLoading ? "กำลังโหลด..." : "ไม่มีรายงาน"}
						</h3>
						<p className="text-sm text-gray-600">
							{isLoading
								? "รอสักครู่..."
								: "ไม่มีรายงานที่ตรงกับเงื่อนไขการค้นหา"}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default ReportsClient;
