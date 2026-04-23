"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronLeft, ChevronRight, ChevronDown,
  Eye, Package, X, Plus,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import * as reusableSvc from "@/services/reusableUnitService";
import { socket } from "@/lib/socket";

// === Helper Functions ===

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const fmtDateTime = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// === Types ===

interface ReturnRequest {
  id: number;
  doc_no: string;
  department_name: string | null;
  requested_by_name?: string | null;
  status: string;
  created_at: string;
  requester?: string;
  item_count?: number;
}

// === Status Badge Component ===

const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
    PENDING: { label: "รอดำเนินการ", bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-200" },
    APPROVED: { label: "อนุมัติแล้ว", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
    REJECTED: { label: "ปฏิเสธ", bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
    COMPLETED: { label: "เสร็จสิ้น", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
    PENDING_RETURN_CHECK: { label: "รอตรวจรับคืน", bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  };
  const s = statusMap[status] || { label: status, bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
};

// === Main Component ===

export default function ReturnItemClient() {
  const router = useRouter();

  // ✅ State สำหรับรายการ Records
  const [records, setRecords] = useState<ReturnRequest[]>([]);

  // ✅ State สำหรับ UI
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedDepartment, setSelectedDepartment] = useState("แผนกทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);
  const [isFetching, setIsFetching] = useState(true);

  // --- [Data Fetching Logic] ---
  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await reusableSvc.getReusableReturnRequests();
      setRecords(res.items || []);
    } catch (error) {
      toast.error(getErrorMessage(error) || "โหลดข้อมูลไม่สำเร็จ");
      setRecords([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Initialize Data] ---
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current) return;
      if (isRefreshingRef.current) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try {
          await fetchData();
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 220);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REQUISITIONS" || message === "RETURN_REQUESTS") {
        scheduleRefresh();
      }
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchData]);

  // --- [Close dropdowns when clicking outside] ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-department-dropdown]")) {
        setIsDepartmentDropdownOpen(false);
      }
      if (!target.closest("[data-status-dropdown]")) {
        setIsStatusDropdownOpen(false);
      }
    };

    if (isDepartmentDropdownOpen || isStatusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDepartmentDropdownOpen, isStatusDropdownOpen]);

  // --- [Navigate to Detail Page] ---
  const openDetail = useCallback((id: number) => {
    router.push(`/request/return-requests/${id}`);
  }, [router]);

  // --- [Filter Options Logic] ---
  const filterDepartments = useMemo(() => {
    const depts = new Set(
      records
        .map((r) => r.department_name)
        .filter((name): name is string => Boolean(name))
    );
    return ["แผนกทั้งหมด", ...Array.from(depts)];
  }, [records]);

  const filterStatuses = useMemo(() => {
    const statuses = new Set(
      records
        .map((r) => r.status)
        .filter((s): s is string => Boolean(s))
    );
    return ["สถานะทั้งหมด", ...Array.from(statuses)];
  }, [records]);

  // --- [Filter & Search Logic] ---
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((r) => {
      // Search filter
      if (term && !(
        r.doc_no.toLowerCase().includes(term) ||
        (r.department_name ?? "").toLowerCase().includes(term) ||
        (r.requested_by_name ?? "").toLowerCase().includes(term) ||
        (r.requester ?? "").toLowerCase().includes(term)
      )) {
        return false;
      }

      // Department filter
      if (selectedDepartment !== "แผนกทั้งหมด" && r.department_name !== selectedDepartment) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "สถานะทั้งหมด" && r.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [records, searchTerm, selectedDepartment, selectedStatus]);

  // --- [Pagination Logic] ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // --- [Render JSX] ---
  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">รายการคำขอคืน</h2>
        </div>
        <button
          type="button"
          onClick={() => router.push("/request/return-requests/create")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          สร้างคำขอคืนของ
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร / แผนก / ผู้ทำรายการ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
          />
        </div>

        {/* Department Dropdown */}
        <div className="relative" data-department-dropdown>
          <button
            onClick={() => { setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen); setIsStatusDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedDepartment}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDepartmentDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDepartmentDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterDepartments.map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDepartment(d);
                        setIsDepartmentDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedDepartment === d
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {d}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative" data-status-dropdown>
          <button
            onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsDepartmentDropdownOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterStatuses.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus(s);
                        setIsStatusDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedStatus === s
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Clear filters */}
        {(searchTerm || selectedDepartment !== "แผนกทั้งหมด" || selectedStatus !== "สถานะทั้งหมด") && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedDepartment("แผนกทั้งหมด");
              setSelectedStatus("สถานะทั้งหมด");
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: '65vh' }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div
          className="flex-1"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            msOverflowStyle: 'auto',
          } as React.CSSProperties}
        >
          <style>{`
            div::-webkit-scrollbar {
              width: 0;
              height: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            div::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-[50px]">#</th>
                <th className="px-5 py-4 w-[180px]">เลขที่เอกสาร</th>
                <th className="px-5 py-4 w-[200px]">แผนก</th>
                <th className="px-5 py-4 w-[200px]">ผู้ทำรายการ</th>
                <th className="px-5 py-4 w-[180px]">สถานะ</th>
                <th className="px-5 py-4 w-[200px]">วันที่สร้าง</th>
                <th className="px-5 py-4 w-[80px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {displayed.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-2 w-[50px] text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-5 py-2 w-[180px] font-mono font-medium text-slate-800">{r.doc_no}</td>
                  <td className="px-5 py-2 w-[200px] text-gray-600">{r.department_name ?? "-"}</td>
                  <td className="px-5 py-2 w-[200px] text-gray-600">{r.requested_by_name || r.requester || "-"}</td>
                  <td className="px-5 py-2 w-[180px]">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-2 w-[200px] text-gray-600">{fmtDateTime(r.created_at)}</td>
                  <td className="px-5 py-2 w-[80px] text-center">
                    <button
                      onClick={() => openDetail(r.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <Package className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-medium">ไม่พบรายการคำขอคืน</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-600">
          แสดง {displayed.length} จาก {filtered.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
