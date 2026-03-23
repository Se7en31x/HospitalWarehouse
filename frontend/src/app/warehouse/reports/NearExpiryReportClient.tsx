"use client";

import React, { useState, useMemo } from "react";
import {
	AlertTriangle,
	Search,
	Download,
	Clock,
	XCircle,
} from "lucide-react";
import type { ExpiringLot } from "@/services/dashboardService";

interface NearExpiryReportClientProps {
	initialLots: ExpiringLot[];
}

const NearExpiryReportClient: React.FC<NearExpiryReportClientProps> = ({
	initialLots,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [daysFilter, setDaysFilter] = useState<"all" | "expired" | "30" | "60" | "90">("all");

	const now = new Date();

	const getExpiryInfo = (expiredAt: string | null) => {
		if (!expiredAt) return { daysLeft: Infinity, label: "ไม่ระบุ", color: "bg-gray-100 text-gray-600" };
		const expDate = new Date(expiredAt);
		const diffMs = expDate.getTime() - now.getTime();
		const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		if (daysLeft < 0) {
			return {
				daysLeft,
				label: `หมดอายุแล้ว ${Math.abs(daysLeft)} วัน`,
				color: "bg-red-100 text-red-700",
			};
		}
		if (daysLeft <= 30) {
			return {
				daysLeft,
				label: `อีก ${daysLeft} วัน`,
				color: "bg-red-100 text-red-700",
			};
		}
		if (daysLeft <= 60) {
			return {
				daysLeft,
				label: `อีก ${daysLeft} วัน`,
				color: "bg-amber-100 text-amber-700",
			};
		}
		return {
			daysLeft,
			label: `อีก ${daysLeft} วัน`,
			color: "bg-yellow-100 text-yellow-700",
		};
	};

	const filteredLots = useMemo(() => {
		let lots = [...initialLots];

		if (searchTerm) {
			const s = searchTerm.toLowerCase();
			lots = lots.filter(
				(l) =>
					l.lot_code.toLowerCase().includes(s) ||
					l.item_name.toLowerCase().includes(s) ||
					l.item_code.toLowerCase().includes(s) ||
					l.warehouse_name.toLowerCase().includes(s)
			);
		}

		if (daysFilter !== "all") {
			lots = lots.filter((l) => {
				if (!l.expired_at) return false;
				const info = getExpiryInfo(l.expired_at);
				if (daysFilter === "expired") return info.daysLeft < 0;
				return info.daysLeft >= 0 && info.daysLeft <= Number(daysFilter);
			});
		}

		// Sort: expired first, then nearest expiry
		lots.sort((a, b) => {
			const da = a.expired_at ? new Date(a.expired_at).getTime() : Infinity;
			const db = b.expired_at ? new Date(b.expired_at).getTime() : Infinity;
			return da - db;
		});

		return lots;
	}, [initialLots, searchTerm, daysFilter]);

	const expiredCount = initialLots.filter(
		(l) => l.expired_at && getExpiryInfo(l.expired_at).daysLeft < 0
	).length;
	const within30 = initialLots.filter((l) => {
		if (!l.expired_at) return false;
		const d = getExpiryInfo(l.expired_at).daysLeft;
		return d >= 0 && d <= 30;
	}).length;
	const within90 = initialLots.filter((l) => {
		if (!l.expired_at) return false;
		const d = getExpiryInfo(l.expired_at).daysLeft;
		return d >= 0 && d <= 90;
	}).length;

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return "-";
		return new Date(dateStr).toLocaleDateString("th-TH", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
			{/* Summary cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4">
					<div className="p-2 bg-red-100 text-red-600 rounded-lg w-fit mb-2">
						<XCircle className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-red-600">{expiredCount}</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						หมดอายุแล้ว
					</p>
				</div>
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
					<div className="p-2 bg-amber-100 text-amber-600 rounded-lg w-fit mb-2">
						<AlertTriangle className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-amber-600">{within30}</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						หมดอายุภายใน 30 วัน
					</p>
				</div>
				<div className="bg-white rounded-2xl border border-yellow-200 shadow-sm p-4">
					<div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg w-fit mb-2">
						<Clock className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-yellow-600">{within90}</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						หมดอายุภายใน 90 วัน
					</p>
				</div>
			</div>

			{/* Search + Filters */}
			<div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-6">
				<div className="flex items-center gap-3 flex-wrap">
					<div className="relative flex-1 min-w-[200px] max-w-md">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="ค้นหาด้วยรหัสล็อต, ชื่อสินค้า..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital focus:border-transparent text-sm"
						/>
					</div>
					<select
						value={daysFilter}
						onChange={(e) => setDaysFilter(e.target.value as typeof daysFilter)}
						className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-hospital focus:border-transparent"
					>
						<option value="all">ทั้งหมด</option>
						<option value="expired">หมดอายุแล้ว</option>
						<option value="30">ภายใน 30 วัน</option>
						<option value="60">ภายใน 60 วัน</option>
						<option value="90">ภายใน 90 วัน</option>
					</select>
					<button
						onClick={() => {
							const csv = [
								["รหัสล็อต", "รหัสสินค้า", "ชื่อสินค้า", "คลัง", "จำนวน", "วันหมดอายุ", "สถานะ"].join(","),
								...filteredLots.map((l) => {
									const info = getExpiryInfo(l.expired_at);
									return [l.lot_code, l.item_code, l.item_name, l.warehouse_name, l.quantity, formatDate(l.expired_at), info.label].join(",");
								}),
							].join("\n");
							const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = `รายงานสินค้าใกล้หมดอายุ_${new Date().toISOString().slice(0, 10)}.csv`;
							a.click();
							URL.revokeObjectURL(url);
						}}
						className="flex items-center gap-1.5 px-3 py-2 bg-hospital text-white rounded-lg hover:bg-hospital-dark transition-colors text-sm ml-auto"
					>
						<Download className="w-4 h-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl shadow-sm overflow-hidden">
				<div className="px-4 sm:px-5 py-3 border-b border-gray-200">
					<h2 className="text-sm font-semibold text-gray-900">
						รายการล็อตใกล้หมดอายุ ({filteredLots.length})
					</h2>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 text-left">
								<th className="px-4 py-3 font-medium text-gray-600 w-8">#</th>
								<th className="px-4 py-3 font-medium text-gray-600">รหัสล็อต</th>
								<th className="px-4 py-3 font-medium text-gray-600">รหัสสินค้า</th>
								<th className="px-4 py-3 font-medium text-gray-600">ชื่อสินค้า</th>
								<th className="px-4 py-3 font-medium text-gray-600">คลัง</th>
								<th className="px-4 py-3 font-medium text-gray-600 text-right">
									จำนวน
								</th>
								<th className="px-4 py-3 font-medium text-gray-600">
									วันหมดอายุ
								</th>
								<th className="px-4 py-3 font-medium text-gray-600">สถานะ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredLots.length > 0 ? (
								filteredLots.map((lot, idx) => {
									const info = getExpiryInfo(lot.expired_at);
									return (
										<tr
											key={lot.id}
											className="hover:bg-gray-50 transition-colors"
										>
											<td className="px-4 py-3 text-gray-400 text-xs">
												{idx + 1}
											</td>
											<td className="px-4 py-3 font-mono text-xs text-gray-700">
												{lot.lot_code}
											</td>
											<td className="px-4 py-3 font-mono text-xs text-gray-700">
												{lot.item_code}
											</td>
											<td className="px-4 py-3 font-medium text-gray-900">
												{lot.item_name}
											</td>
											<td className="px-4 py-3 text-gray-600">
												{lot.warehouse_name}
											</td>
											<td className="px-4 py-3 text-right font-semibold text-gray-900">
												{lot.quantity.toLocaleString()}
											</td>
											<td className="px-4 py-3 text-gray-700">
												{formatDate(lot.expired_at)}
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}
												>
													{info.label}
												</span>
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={8} className="text-center py-12">
										<AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
										<p className="text-sm text-gray-500">
											{initialLots.length === 0
												? "ไม่มีล็อตสินค้าใกล้หมดอายุ"
												: "ไม่พบรายการที่ตรงกับการค้นหา"}
										</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default NearExpiryReportClient;
