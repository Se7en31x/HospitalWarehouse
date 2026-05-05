"use client";

import { useState, useCallback, useEffect } from "react";
import {
  PackagePlus, Search, Edit, Package, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown,
  Trash2, X, Printer
} from "lucide-react";

import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import {
  LIST_TABLE_HEAD_ROW,
  LIST_TABLE_TH_COMPACT,
  LIST_TABLE_TH_ICON,
  LIST_TABLE_TH_WIDE,
  LIST_TABLE_TBODY,
} from "@/lib/tableUi";

import * as ItemSvc from "@/services/itemsService";
import * as Item from "@/types/items_type";
import { getAssetCounts } from "@/services/assetService";
import { socket } from "../../../lib/socket";
import ItemFormModal from "./ItemFormModal";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printLabels, type LabelData } from "@/lib/printLabel";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const PAGE_LIMIT = 10;

// คงเหลือที่ใช้แสดงในตารางและคำนวณสถานะ — REUSABLE=available, MED_ASSET=จำนวนครุภัณฑ์ที่ลงทะเบียน, อื่นๆ=current_stock
const getEffectiveStock = (item: Item.UiItem, assetRegisteredByItemId?: Record<string, number>): number => {
  if (item.type === "REUSABLE") {
    return typeof item.availableStock === "number" ? item.availableStock : 0;
  }
  if (item.type === "MED_ASSET") {
    return assetRegisteredByItemId?.[item.id] ?? 0;
  }
  return item.stock;
};

/** สถานะคงคลังในตาราง / ฟิลเตอร์ — ยึดตัวเลขเดียวกับคอลัมน์คงเหลือ */
function getStockLevelLabel(
  item: Item.UiItem,
  assetRegisteredByItemId?: Record<string, number>,
): "ปกติ" | "ต่ำ" | "หมด" | "ระงับ" {
  const lifecycle = String(item.status ?? "ACTIVE").trim().toUpperCase();
  if (lifecycle === "INACTIVE" || lifecycle === "UNAVAILABLE") return "ระงับ";

  const qty = getEffectiveStock(item, assetRegisteredByItemId);
  const min = Math.max(0, Number(item.minStock) || 0);
  if (qty <= 0) return "หมด";
  if (min > 0 && qty <= min) return "ต่ำ";
  return "ปกติ";
}

export default function ItemsClient({ initialItems }: { initialItems: Item.UiItem[] }) {
  const [allItems, setAllItems] = useState<Item.UiItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [registeredCounts, setRegisteredCounts] = useState<Record<string, number>>({});

  const [categories, setCategories] = useState<Item.categoryOptions>([]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const result = await ItemSvc.getAllInventoryItems({});
      setAllItems(result || []);
      const medAssetIds = (result || []).filter(i => i.type === "MED_ASSET").map(i => i.id);
      if (medAssetIds.length > 0) {
        const counts = await getAssetCounts(medAssetIds);
        setRegisteredCounts(counts || {});
      } else {
        setRegisteredCounts({});
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      if (!silent) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS") fetchAll(true);
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchAll]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const categoryData = await ItemSvc.getcategoriesOptions();
        setCategories(categoryData || []);
      } catch (err) {
        console.error("Load categories options failed", err);
      }
    };

    fetchOptions();
    fetchAll();
  }, [fetchAll]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
  const [selectedLocation, setSelectedLocation] = useState("ตำแหน่งทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
      if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
      if (!target.closest("[data-filter-location]")) setIsLocationOpen(false);
    };
    if (isCategoryOpen || isStatusOpen || isLocationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCategoryOpen, isStatusOpen, isLocationOpen]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item.UiItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, LabelData>>(new Map());

  const toggleSelect = (item: Item.UiItem) =>
    setSelectedItems((prev) => {
      const s = new Map(prev);
      s.has(item.id) ? s.delete(item.id) : s.set(item.id, { name: item.name, code: item.code });
      return s;
    });

  const toggleSelectAll = () => {
    const allSelected = paginatedItems.every((i) => selectedItems.has(i.id));
    setSelectedItems((prev) => {
      const s = new Map(prev);
      allSelected
        ? paginatedItems.forEach((i) => s.delete(i.id))
        : paginatedItems.forEach((i) => s.set(i.id, { name: i.name, code: i.code }));
      return s;
    });
  };

  const handleBulkPrint = () => {
    printLabels(Array.from(selectedItems.values()));
  };

  const filterCategories = ["หมวดหมู่ทั้งหมด", ...categories.map(c => c.name)];
  const filterLocations = [
    "ตำแหน่งทั้งหมด",
    ...Array.from(new Set(allItems.map((item) => item.location).filter(Boolean))),
  ];

  const filteredItems = allItems.filter((item) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch = !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.code.toLowerCase().includes(keyword);
    const matchesCat = selectedCategory === "หมวดหมู่ทั้งหมด" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "สถานะทั้งหมด" || getStockLevelLabel(item, registeredCounts) === selectedStatus;
    const matchesLocation = selectedLocation === "ตำแหน่งทั้งหมด" || item.location === selectedLocation;
    return matchesSearch && matchesCat && matchesStatus && matchesLocation;
  });

  const totalPages = Math.ceil(filteredItems.length / PAGE_LIMIT);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT);

  const handleDelete = async (id: string) => {
    const result = await SweetAlertUtils.delete("ลบพัสดุ", "คุณต้องการลบรายการนี้ใช่หรือไม่?");
    if (!result.isConfirmed) return;
    try {
      await ItemSvc.deleteInventoryItem(id);
      SweetAlertUtils.success("สำเร็จ", "ลบรายการเรียบร้อย");
      fetchAll();
    } catch (error) {
      SweetAlertUtils.error("เกิดข้อผิดพลาด", getErrorMessage(error));
    }
  };

  const openEditModal = (item: Item.UiItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchAll();
  };

  const Badge = ({ label }: { label: string }) => {
    const styles: Record<string, string> = {
      "ปกติ": "bg-green-100 text-green-500",
      "ต่ำ": "bg-amber-100 text-amber-500",
      "หมด": "bg-red-100 text-red-500",
      "ระงับ": "bg-red-100 text-red-500",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${styles[label] || "bg-slate-100 text-slate-700"}`}>
        {label}
      </span>
    );
  };

  const getTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      "MED_ASSET": "ครุภัณฑ์ภายในองค์กร",
      "REUSABLE": "ของใช้ซ้ำรายชิ้น",
      "CONSUMABLE": "วัสดุสิ้นเปลือง",
    };
    return typeMap[type] || type;
  };

  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-4">
          <PageHeadingIconBox icon={Package} tone="stock" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">รายการพัสดุ</h2>
            <p className="text-sm text-slate-500 mt-0.5">ค้นหา เพิ่ม และจัดการพัสดุในคลังสินค้า</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkPrint}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์บาร์โค้ด ({selectedItems.size})
            </button>
          )}
          <button onClick={() => { setSelectedItem(null); setIsAddModalOpen(true); }} className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md">
            <PackagePlus className="w-4 h-4" /> เพิ่มพัสดุใหม่
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="ค้นหาชื่อ / รหัส..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
        </div>

        <div className="relative w-full sm:w-auto" data-filter-category>
          <button
            type="button"
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedCategory}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterCategories.map(c => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(c); setIsCategoryOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-auto" data-filter-status>
          <button
            type="button"
            onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); setIsLocationOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedStatus === "สถานะทั้งหมด" ? "สถานะทั้งหมด" : selectedStatus}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {[{ value: "สถานะทั้งหมด", label: "สถานะทั้งหมด" }, { value: "ปกติ", label: "ปกติ" }, { value: "ต่ำ", label: "ต่ำ" }, { value: "หมด", label: "หมด" }, { value: "ระงับ", label: "ระงับ" }].map(s => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onClick={() => { setSelectedStatus(s.value); setIsStatusOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-auto" data-filter-location>
          <button
            type="button"
            onClick={() => { setIsLocationOpen(!isLocationOpen); setIsCategoryOpen(false); setIsStatusOpen(false); }}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">{selectedLocation}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLocationOpen ? "rotate-180" : ""}`} />
          </button>
          {isLocationOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {filterLocations.map(l => (
                  <li key={l}>
                    <button
                      type="button"
                      onClick={() => { setSelectedLocation(l); setIsLocationOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedLocation === l ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Clear filters */}
        {(searchTerm || selectedCategory !== "หมวดหมู่ทั้งหมด" || selectedStatus !== "สถานะทั้งหมด" || selectedLocation !== "ตำแหน่งทั้งหมด") && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("หมวดหมู่ทั้งหมด");
              setSelectedStatus("สถานะทั้งหมด");
              setSelectedLocation("ตำแหน่งทั้งหมด");
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
        {isFetching ? (
          <div className="flex flex-col flex-1 min-h-[22rem]">
            <span className="sr-only">กำลังโหลดรายการพัสดุ</span>
            <DataTableSkeleton
              headers={["", "รูป", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "ประเภท", "คงเหลือ", "ขั้นต่ำ", "หน่วย", "ตำแหน่งจัดเก็บ", "สถานะ", "จัดการ"]}
              rowCount={10}
              showPaginationFooter
              ariaLabel="กำลังโหลดรายการพัสดุ"
              thClassName="px-3 py-4 whitespace-nowrap text-base font-semibold"
              tdClassName="px-3 py-3"
            />
          </div>
        ) : (
          <>
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
          <table className="w-full table-fixed text-sm text-left">
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-[80px]" />
              <col className="w-[13%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead className={LIST_TABLE_HEAD_ROW}>
              <tr>
                <th className="px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedItems.has(i.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                    title="เลือกทั้งหมดในหน้านี้"
                  />
                </th>
                <th className={`${LIST_TABLE_TH_ICON} px-6`}>รูป</th>
                <th className={LIST_TABLE_TH_COMPACT}>รหัสรายการ</th>
                <th className={LIST_TABLE_TH_COMPACT}>ชื่อพัสดุ</th>
                <th className={LIST_TABLE_TH_WIDE}>หมวดหมู่</th>
                <th className={LIST_TABLE_TH_WIDE}>ประเภท</th>
                <th className={`${LIST_TABLE_TH_WIDE} w-[120px]`}>คงเหลือ</th>
                <th className={`${LIST_TABLE_TH_WIDE} w-[120px]`}>ขั้นต่ำ</th>
                <th className={LIST_TABLE_TH_WIDE}>หน่วย</th>
                <th className={LIST_TABLE_TH_WIDE}>ตำแหน่งจัดเก็บ</th>
                <th className={LIST_TABLE_TH_WIDE}>สถานะ</th>
                <th className={`${LIST_TABLE_TH_WIDE} text-center`}>จัดการ</th>
              </tr>
            </thead>
            <tbody className={LIST_TABLE_TBODY}>
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelect(item)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                      {item.imageUrl ? (
                        <button
                          onClick={() => setLightboxImage({ url: item.imageUrl!, name: item.name })}
                          className="w-full h-full focus:outline-none"
                        >
                          <img src={item.imageUrl} className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-zoom-in" alt={item.name} />
                        </button>
                      ) : (
                        <Package className="w-5 h-5 m-auto mt-2.5 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">{item.code}</td>
                  <td className="px-3 py-3">
                    <span className="block truncate" title={item.name}>
                      {item.name}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 truncate">{item.category}</td>
                  <td className="px-6 py-3 text-sm truncate">
                    {getTypeDisplay(item.type)}
                  </td>
                  <td className="px-6 py-3 w-[120px]">
                    {item.type === "REUSABLE" ? (
                      <div className="relative group inline-block cursor-help">
                        <span className={`font-bold text-base ${
                          getEffectiveStock(item, registeredCounts) <= 0 ? "text-red-500" :
                          getEffectiveStock(item, registeredCounts) <= item.minStock ? "text-orange-500" :
                          "text-emerald-600"
                        }`}>
                          {getEffectiveStock(item, registeredCounts)}
                        </span>
                        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          ทั้งหมดในคลัง: {item.stock} {item.unit}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    ) : item.type === "MED_ASSET" ? (
                      <div className="flex flex-col">
                        <span className={`font-bold ${
                          getEffectiveStock(item, registeredCounts) <= 0 ? "text-red-500" :
                          getEffectiveStock(item, registeredCounts) <= item.minStock ? "text-orange-500" :
                          "text-emerald-600"
                        }`}>
                          {getEffectiveStock(item, registeredCounts)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className={`font-bold ${
                          item.stock <= 0 ? "text-red-500" :
                          item.stock <= item.minStock ? "text-orange-500" :
                          "text-emerald-600"
                        }`}>
                          {item.stock}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 w-[120px]">
                    <span className="text-black font-semibold">
                      {item.minStock ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-3 truncate max-w-0" title={item.unit}>{item.unit}</td>
                  <td className="px-6 py-3 text-slate-600 truncate">{item.location || "-"}</td>
                  <td className="px-6 py-3"><Badge label={getStockLevelLabel(item, registeredCounts)} /></td>
                  {/* <td className="px-6 py-3 w-[160px] hidden sm:table-cell">
                    {(() => {
                      const dt = formatThaiDateTime(item.updatedAt);
                      if (!dt) return <span className="text-slate-400 text-xs">-</span>;
                      return (
                        <div className="flex flex-col leading-tight">
                          <span className="text-slate-800 text-xs">{dt.date}</span>
                          <span className="text-slate-400 text-xs">{dt.time}</span>
                        </div>
                      );
                    })()}
                  </td> */}
                  <td className="px-6 py-3 text-center">
                    <div className="flex justify-between gap-1">
                      <button onClick={() => openEditModal(item)} className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg"><Edit className="w-5 h-5"/></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={12}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
                      <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
          <p className="text-sm text-slate-500">
            แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
            {filteredItems.length !== allItems.length && (
              <span className="text-slate-400"> (ทั้งหมด {allItems.length} รายการ)</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
          </>
        )}
      </div>

      <ItemFormModal
        isOpen={isAddModalOpen || isEditModalOpen}
        isEdit={isEditModalOpen}
        initialData={selectedItem}
        onCloseAction={handleModalClose}
        onSuccessAction={handleModalSuccess}
      />

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-lg shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="w-[350px] h-[280px] object-contain rounded-lg"
            />
            <p className="text-center text-sm text-slate-600 mt-2 pb-1">{lightboxImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}