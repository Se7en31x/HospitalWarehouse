"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Search, Plus, Minus, ShoppingCart, X, PackagePlus, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import * as ItemSvc from "@/services/itemsService";
import * as RequisitionSvc from "@/services/requisitionService";
import { useAuth } from "@/lib/useAuth";
import { socket } from "@/lib/socket";

const MySwal = withReactContent(Swal);

// Helper function เพื่อดึงข้อความ Error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

interface Props {
  initialItems: ItemSvc.UiItem[];
}

interface CartItem extends ItemSvc.UiItem {
  quantity: number;
}

export default function WithdrawClient({ initialItems }: Props) {
  const { departments, isLoading: isAuthLoaded } = useAuth();

  // ✅ State สำหรับรายการ Items
  const [items, setItems] = useState<ItemSvc.UiItem[]>(initialItems || []);
  const [options, setOptions] = useState<ItemSvc.ItemOptions>({
    category: [],
    unit: [],
    warehouse: []
  });

  // ✅ State สำหรับ Cart และ Shopping
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  // ✅ State สำหรับ UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedUnit, setSelectedUnit] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showCartModal, setShowCartModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // --- [Data Fetching Logic] ---
  const refreshData = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await ItemSvc.getInventoryItems();
      setItems(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- [Real-time Socket.io Connection] ---
  useEffect(() => {
    // 1. เชื่อมต่อ Socket
    if (!socket.connected) socket.connect();

    // 2. ฟังก์ชันจัดการเมื่อได้รับสัญญาณ
    const handleRefreshSignal = (message: string) => {
      if (message === "ITEMS") {
        console.log("⚡ Socket: Received Refresh Signal -> Reloading Data...");
        refreshData();
      }
    };

    // 3. ฟัง Event ชื่อ 'REFRESH_DATA'
    socket.on("REFRESH_DATA", handleRefreshSignal);

    // 4. Cleanup function เมื่อ Component ถูกทำลาย
    return () => {
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [refreshData]);

  // --- [Initialize Data & LocalStorage] ---
  useEffect(() => {
    setIsMounted(true);

    // โหลด Cart จาก LocalStorage
    const savedCart = localStorage.getItem("withdraw_cart");
    if (savedCart) {
      try {
        setSelectedItems(JSON.parse(savedCart));
      } catch (e) {
        console.error(e);
      }
    }

    // โหลด Options
    const fetchOptions = async () => {
      try {
        const data = await ItemSvc.getItemOptions();
        setOptions(data || { category: [], unit: [], warehouse: [] });
      } catch (err) {
        console.error("Load options failed", err);
      }
    };
    fetchOptions();

    // โหลดข้อมูล Items หากไม่มีข้อมูลเริ่มต้น
    if (!initialItems || initialItems.length === 0) {
      refreshData();
    }
  }, [initialItems, refreshData]);

  // --- [Initialize Department Selection] ---
  useEffect(() => {
    if (isAuthLoaded && departments.length > 0 && !selectedDeptId) {
      const savedDept = localStorage.getItem("withdraw_dept");
      if (savedDept && departments.some((d) => d.code === savedDept)) {
        setSelectedDeptId(savedDept);
      } else if (departments.length === 1) {
        setSelectedDeptId(departments[0].code);
      }
    }
  }, [isAuthLoaded, departments, selectedDeptId]);

  // --- [Persist Cart & Department to LocalStorage] ---
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("withdraw_cart", JSON.stringify(selectedItems));
      localStorage.setItem("withdraw_dept", selectedDeptId);
    }
  }, [selectedItems, selectedDeptId, isMounted]);

  // --- [Filter Logic] ---
  const filterCategories = ["ทั้งหมด", ...(options.category || []).map((c) => c.name)];
  const filterUnits = ["ทั้งหมด", ...(options.unit || []).map((u) => u.name)];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (item.code || "").toLowerCase().includes(term) ||
        (item.name || "").toLowerCase().includes(term);

      const matchesCat = selectedCategory === "ทั้งหมด" || item.category === selectedCategory;
      const matchesUnit = selectedUnit === "ทั้งหมด" || item.unit === selectedUnit;

      return matchesSearch && matchesCat && matchesUnit;
    });
  }, [items, selectedCategory, selectedUnit, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const displayItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // --- [Handlers] ---
  const addToCart = useCallback(
    (item: ItemSvc.UiItem) => {
      const qty = quantities[item.id] || 1;
      if (qty <= 0 || qty > item.stock) {
        MySwal.fire({
          icon: "error",
          title: "สินค้าไม่พอ",
          timer: 1000,
          showConfirmButton: false,
        });
        return;
      }
      setIsCartBouncing(true);
      setTimeout(() => setIsCartBouncing(false), 300);
      setSelectedItems((prev) => {
        const exist = prev.find((i) => i.id === item.id);
        if (exist) {
          const newQty = exist.quantity + qty;
          return newQty > item.stock
            ? prev
            : prev.map((i) =>
                i.id === item.id ? { ...i, quantity: newQty } : i
              );
        }
        return [...prev, { ...item, quantity: qty }];
      });
      // รีเซ็ต quantity input หลังเพิ่มลงตะกร้า
      setQuantities((prev) => {
        const newQty = { ...prev };
        delete newQty[item.id];
        return newQty;
      });
    },
    [quantities]
  );

  const removeItem = useCallback((id: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback(
    (id: string, delta: number) => {
      setSelectedItems((prev) =>
        prev.map((i) => {
          if (i.id === id) {
            const n = i.quantity + delta;
            const stock = items.find((orig) => orig.id === id)?.stock || 0;
            if (n > 0 && n <= stock) return { ...i, quantity: n };
          }
          return i;
        })
      );
    },
    [items]
  );

  const handleSubmit = async () => {
    if (!selectedDeptId || selectedItems.length === 0) {
      MySwal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณาเลือกแผนกและสินค้า",
      });
      return;
    }

    // ค้นหาชื่อแผนกจาก Code ที่เลือก
    const currentDept = departments.find((d) => d.code === selectedDeptId);
    const deptName = currentDept ? currentDept.name : "แผนกทั่วไป";

    setShowCartModal(false);

    const confirm = await MySwal.fire({
      title: "ยืนยันการส่งใบเบิก?",
      html: `เบิกในนามแผนก: <b class="text-indigo-600">${deptName}</b>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) {
      setShowCartModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RequisitionSvc.RequisitionPayload = {
        type: "WITHDRAW",
        department_id: selectedDeptId,
        department_name: deptName,
        items: selectedItems.map((i) => ({
          item_id: Number(i.id),
          qty: i.quantity,
        })),
        note: "เบิกออนไลน์ผ่านระบบ",
      };

      const res = await RequisitionSvc.createRequisition(payload);
      if (res.success) {
        await MySwal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: "ส่งใบเบิกเรียบร้อย",
          timer: 1500,
        });
        setSelectedItems([]);
        localStorage.removeItem("withdraw_cart");
      } else throw new Error(res.message);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      await MySwal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: msg,
      });
      setShowCartModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="w-full bg-slate-50 min-h-screen p-4 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes cart-bounce { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } .animate-bounce-custom { animation: cart-bounce 0.3s ease-in-out; }`,
        }}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <PackagePlus size={20} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">เบิกพัสดุ</h1>
        </div>
        <button
          onClick={() => setShowCartModal(true)}
          className={`bg-slate-900 text-white px-5 py-2 rounded-lg flex items-center gap-2 relative transition-transform active:scale-95 ${
            isCartBouncing ? "animate-bounce-custom" : ""
          }`}
        >
          <ShoppingCart size={18} />
          <span className="text-sm font-bold">ตะกร้า ({selectedItems.length})</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 md:items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือรหัส..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {filterCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {filterUnits.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Table Content */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden relative flex flex-col mb-6">
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase text-xs tracking-widest sticky top-0">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">รหัสพัสดุ</th>
                <th className="px-4 py-3">ชื่อรายการ</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">ตำแหน่ง</th>
                <th className="px-4 py-3 text-center">คงเหลือ</th>
                <th className="px-4 py-3 text-center w-[120px]">จำนวน</th>
                <th className="px-4 py-3 text-right w-[80px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors h-[56px]">
                  <td className="px-4 text-slate-400 text-xs">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="px-4 font-mono text-xs font-bold text-slate-700">
                    {item.code}
                  </td>
                  <td className="px-4 text-sm font-medium">{item.name}</td>
                  <td className="px-4 text-sm text-slate-600">{item.category}</td>
                  <td className="px-4 text-sm text-slate-600">{item.location}</td>
                  <td className="px-4 text-center text-sm font-bold">
                    {item.stock} {item.unit}
                  </td>
                  <td className="px-4 text-center">
                    <input
                      type="number"
                      className="w-16 p-1 border border-slate-200 rounded text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={quantities[item.id] || 1}
                      min="1"
                      max={item.stock}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [item.id]: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                    />
                  </td>
                  <td className="px-4 text-right">
                    <button
                      onClick={() => addToCart(item)}
                      disabled={item.stock <= 0}
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {displayItems.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          แสดง {displayItems.length} จาก {filteredItems.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-600" /> ตะกร้าของฉัน
              </h2>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Department Selection */}
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <label className="text-[10px] font-bold text-indigo-600 uppercase mb-2 block">
                  ระบุแผนกที่เบิก
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- กรุณาเลือกแผนก --</option>
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>
                      แผนก{d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items */}
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.code}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {selectedItems.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    ตะกร้าว่างเปล่า
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowCartModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  !selectedDeptId || selectedItems.length === 0 || isSubmitting
                }
                className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "กำลังส่ง..." : "ยืนยันใบเบิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}