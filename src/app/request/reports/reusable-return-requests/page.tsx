"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";

import * as reusableSvc from "@/services/reusableUnitService";

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "รอดำเนินการ",
  PROCESSING: "กำลังตรวจรับ",
  COMPLETED: "เสร็จสิ้น",
};

export default function ReusableReturnRequestsReportPage() {
  const [rows, setRows] = useState<reusableSvc.ReusableReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");

  useEffect(() => {
    const fetchRows = async () => {
      setIsLoading(true);
      try {
        const res = await reusableSvc.getReusableReturnRequests({ page: 1, limit: 10 });
        setRows(res.items || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const keyword = searchTerm.toLowerCase();
      const matchesSearch =
        row.doc_no.toLowerCase().includes(keyword) ||
        (row.department_name || "").toLowerCase().includes(keyword) ||
        (row.requested_by_name || "").toLowerCase().includes(keyword) ||
        row.items.some((item) => (item.item_name || "").toLowerCase().includes(keyword));

      const matchesStatus = statusFilter === "ทั้งหมด" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const exportCSV = () => {
    const headers = ["เลขที่คำขอ", "แผนก", "ผู้ขอ", "วันที่ขอ", "นัดรับ", "สถานะ", "จำนวนรายการ", "จำนวนที่ขอคืนรวม"];
    const csvRows = filtered.map((row) => [
      row.doc_no,
      row.department_name || "-",
      row.requested_by_name || "-",
      new Date(row.created_at).toLocaleString("th-TH"),
      row.preferred_pickup_at ? new Date(row.preferred_pickup_at).toLocaleString("th-TH") : "-",
      STATUS_LABEL[row.status] || row.status,
      String(row.items.length),
      String(row.items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0)),
    ]);

    const content = [headers.join(","), ...csvRows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reusable_return_requests_report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-amber-600" />
            รายงานคำขอส่งคืนคลัง (Reusable)
          </h2>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 text-sm sm:text-base"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            ส่งออก CSV
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="ค้นหาเลขคำขอ, แผนก, หรือรายการที่คืน..."
              className="w-full pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-all duration-200 text-sm sm:text-base"
          >
            <option value="ทั้งหมด">ทั้งหมด</option>
            <option value="REQUESTED">รอดำเนินการ</option>
            <option value="PROCESSING">กำลังตรวจรับ</option>
            <option value="COMPLETED">เสร็จสิ้น</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-amber-50 text-amber-900">
              <tr>
                <th className="px-4 py-3 text-left w-[150px]">เลขที่คำขอ</th>
                <th className="px-4 py-3 text-left w-[150px]">แผนก</th>
                <th className="px-4 py-3 text-left w-[150px]">ผู้ขอ</th>
                <th className="px-4 py-3 text-left w-[160px]">วันที่ขอ</th>
                <th className="px-4 py-3 text-left w-[160px]">นัดรับของ</th>
                <th className="px-4 py-3 text-left w-[120px]">สถานะ</th>
                <th className="px-4 py-3 text-center w-[100px]">รายการ</th>
                <th className="px-4 py-3 text-center w-[100px]">ขอคืนรวม</th>
                <th className="px-4 py-3 text-left">รายการที่ขอคืน</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">กำลังโหลด...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">ไม่พบข้อมูลรายงาน</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold">{row.doc_no}</td>
                    <td className="px-4 py-3">{row.department_name || "-"}</td>
                    <td className="px-4 py-3">{row.requested_by_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{new Date(row.created_at).toLocaleString("th-TH")}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.preferred_pickup_at ? new Date(row.preferred_pickup_at).toLocaleString("th-TH") : "-"}</td>
                    <td className="px-4 py-3">{STATUS_LABEL[row.status] || row.status}</td>
                    <td className="px-4 py-3 text-center">{row.items.length}</td>
                    <td className="px-4 py-3 text-center">{row.items.reduce((sum, item) => sum + Number(item.requested_qty || 0), 0)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {(row.items || []).map((item) => `${item.item_name || "-"} x ${item.requested_qty}`).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
