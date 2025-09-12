"use client";

import { useState, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  Search,
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Download,
  Stethoscope,
  Pill,
  Box,
  Syringe,
} from "lucide-react";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { debounce } from "lodash";

// เนื่องจากไม่สามารถใช้ Link จาก Next.js ได้ในสภาพแวดล้อมนี้ จึงเปลี่ยนเป็น div ที่มี cursor:pointer เพื่อให้ดูเหมือนปุ่มที่กดได้
// และใช้ a tag สำหรับ "ดูรายละเอียด" ที่จะสามารถนำไปหน้าอื่นได้ในภายหลัง
const DivLink = ({ children, href }) => (
  <div className="cursor-pointer">
    {children}
  </div>
);

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ข้อมูลจำลอง
const mockItems = [
  { id: "EQP001", name: "เครื่องวัดความดัน", category: "ครุภัณฑ์", stock: 10, unit: "เครื่อง", price: 1500.0, status: "ปกติ", lots: [{ lotId: "LOT001", quantity: 10, expiryDate: null, status: "ปกติ" }] },
  { id: "EQP002", name: "เครื่องพ่นยา", category: "ครุภัณฑ์", stock: 2, unit: "เครื่อง", price: 2500.0, status: "ต่ำ", lots: [{ lotId: "LOT002", quantity: 2, expiryDate: null, status: "ปกติ" }] },
  {
    id: "DRG001", name: "ยาพาราเซตามอล", category: "ยา", stock: 200, unit: "เม็ด", price: 2.0, status: "ปกติ", lots: [
      { lotId: "LOT003", quantity: 100, expiryDate: "2026-12-31", status: "ปกติ" },
      { lotId: "LOT004", quantity: 100, expiryDate: "2027-06-30", status: "ปกติ" },
    ]
  },
  {
    id: "DRG002", name: "ยาแก้แพ้", category: "ยา", stock: 50, unit: "เม็ด", price: 5.0, status: "ต่ำ", lots: [
      { lotId: "LOT005", quantity: 50, expiryDate: "2025-11-30", status: "ใกล้หมดอายุ" },
    ]
  },
  {
    id: "SUP001", name: "ถุงมือยาง", category: "วัสดุสิ้นเปลือง", stock: 25, unit: "กล่อง", price: 120.0, status: "ต่ำ", lots: [
      { lotId: "LOT006", quantity: 25, expiryDate: "2025-11-30", status: "ใกล้หมดอายุ" },
    ]
  },
  {
    id: "SUP002", name: "แอลกอฮอล์ 70%", category: "วัสดุสิ้นเปลือง", stock: 80, unit: "ขวด", price: 45.5, status: "ปกติ", lots: [
      { lotId: "LOT007", quantity: 80, expiryDate: "2026-03-31", status: "ปกติ" },
    ]
  },
  { id: "SUP003", name: "สำลี", category: "วัสดุสิ้นเปลือง", stock: 0, unit: "ห่อ", price: 25.0, status: "หมด", lots: [] },
  {
    id: "SUP004", name: "กระดาษชำระ", category: "วัสดุสิ้นเปลือง", stock: 20, unit: "ม้วน", price: 12.0, status: "ปกติ", lots: [
      { lotId: "LOT008", quantity: 20, expiryDate: null, status: "ปกติ" },
    ]
  },
  {
    id: "MED001", name: "ชุดตรวจ ATK", category: "เวชภัณฑ์ที่ไม่ใช่ยา", stock: 150, unit: "ชิ้น", price: 85.0, status: "ปกติ", lots: [
      { lotId: "LOT009", quantity: 100, expiryDate: "2025-12-31", status: "ปกติ" },
      { lotId: "LOT010", quantity: 50, expiryDate: "2026-06-30", status: "ปกติ" },
    ]
  },
  { id: "MED002", name: "ผ้าก๊อซปลอดเชื้อ", category: "เวชภัณฑ์ที่ไม่ใช่ยา", stock: 0, unit: "กล่อง", price: 50.0, status: "หมด", lots: [] },
  {
    id: "MED003", name: "เข็มฉีดยา", category: "เวชภัณฑ์ที่ไม่ใช่ยา", stock: 3, unit: "กล่อง", price: 95.0, status: "ต่ำ", lots: [
      { lotId: "LOT011", quantity: 3, expiryDate: "2025-10-31", status: "ใกล้หมดอายุ" },
    ]
  },
  {
    id: "MED004", name: "หน้ากากอนามัย N95", category: "เวชภัณฑ์ที่ไม่ใช่ยา", stock: 40, unit: "ชิ้น", price: 15.0, status: "ปกติ", lots: [
      { lotId: "LOT012", quantity: 40, expiryDate: "2026-01-31", status: "ปกติ" },
    ]
  },
  {
    id: "MED005", name: "อุปกรณ์ทำแผล", category: "เวชภัณฑ์ที่ไม่ใช่ยา", stock: 75, unit: "ชุด", price: 75.0, status: "ปกติ", lots: [
      { lotId: "LOT013", quantity: 75, expiryDate: "2026-02-28", status: "ปกติ" },
    ]
  },
  {
    id: "MED006", name: "แว่นตานิรภัย", category: "เวชภัณฑ์ที่ไม่ใช่ยา", stock: 12, unit: "ชิ้น", price: 200.0, status: "ต่ำ", lots: [
      { lotId: "LOT014", quantity: 12, expiryDate: null, status: "ปกติ" },
    ]
  },
  {
    id: "MED007", name: "สารละลายเกลือ", category: "เวชภัณฑ์ที่ไม่ใช่ยา", stock: 5, unit: "ขวด", price: 35.0, status: "ต่ำ", lots: [
      { lotId: "LOT015", quantity: 5, expiryDate: "2025-09-30", status: "ใกล้หมดอายุ" },
    ]
  },
];

const mockRequests = [
  { id: "PR-2025-001", date: "2025-09-10", department: "คลังกลาง", totalItems: 30, totalValue: 3500, status: "pending" },
  { id: "PR-2025-002", date: "2025-09-11", department: "แผนกศัลยกรรม", totalItems: 2, totalValue: 5000, status: "approved" },
  { id: "PR-2025-003", date: "2025-09-12", department: "แผนกอายุรกรรม", totalItems: 10, totalValue: 1500, status: "pending" },
];

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

  // หมวดหมู่
  const categories = ["ทั้งหมด", "ครุภัณฑ์", "ยา", "วัสดุสิ้นเปลือง", "เวชภัณฑ์ที่ไม่ใช่ยา"];

  // ข้อมูลสรุป
  const summary = useMemo(() => {
    const equipment = mockItems.filter((item) => item.category === "ครุภัณฑ์").length;
    const drugs = mockItems.filter((item) => item.category === "ยา").length;
    const supplies = mockItems.filter((item) => item.category === "วัสดุสิ้นเปลือง").length;
    const medicalSupplies = mockItems.filter((item) => item.category === "เวชภัณฑ์ที่ไม่ใช่ยา").length;
    const lowStock = mockItems.filter((item) => item.status === "ต่ำ").length;
    const outOfStock = mockItems.filter((item) => item.status === "หมด").length;
    const nearExpiryLots = mockItems
      .flatMap((item) => item.lots)
      .filter((lot) => lot.expiryDate && new Date(lot.expiryDate) < new Date("2025-12-12")).length;
    const pendingRequests = mockRequests.filter((req) => req.status === "pending").length;

    return {
      equipment,
      drugs,
      supplies,
      medicalSupplies,
      lowStock,
      outOfStock,
      nearExpiryLots,
      pendingRequests,
    };
  }, []);

  // ข้อมูลการแจ้งเตือน
  const alerts = useMemo(() => {
    const lowStockItems = mockItems
      .filter((item) => item.status === "ต่ำ" || item.status === "หมด")
      .map((item) => ({
        id: item.id,
        type: item.status === "ต่ำ" ? "สต็อกต่ำ" : "สต็อกหมด",
        message: `${item.name} (${item.category}): ${item.stock} ${item.unit}`,
        category: item.category,
      }));

    const nearExpiryLots = mockItems
      .flatMap((item) =>
        item.lots.map((lot) => ({
          ...lot,
          itemName: item.name,
          category: item.category,
        }))
      )
      .filter((lot) => lot.expiryDate && new Date(lot.expiryDate) < new Date("2025-12-12"))
      .map((lot) => ({
        id: lot.lotId,
        type: "ใกล้หมดอายุ",
        message: `${lot.itemName} (Lot ${lot.lotId}): หมดอายุ ${new Date(lot.expiryDate).toLocaleDateString("th-TH")}`,
        category: lot.category,
      }));

    return [...lowStockItems, ...nearExpiryLots].filter(
      (alert) =>
        (alert.id.includes(searchTerm.toUpperCase()) || alert.message.includes(searchTerm)) &&
        (selectedCategory === "ทั้งหมด" || alert.category === selectedCategory)
    );
  }, [searchTerm, selectedCategory]);

  // ข้อมูลกราฟ
  const stockChartData = {
    labels: ["ครุภัณฑ์", "ยา", "วัสดุสิ้นเปลือง", "เวชภัณฑ์ที่ไม่ใช่ยา"],
    datasets: [{
      label: "จำนวนสินค้า",
      data: [
        summary.equipment,
        summary.drugs,
        summary.supplies,
        summary.medicalSupplies,
      ],
      backgroundColor: ["#0891b2", "#c026d3", "#06b6d4", "#4f46e5"],
    }],
  };
  
  const stockChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  const statusChartData = {
    labels: ["ปกติ", "ต่ำ", "หมด"],
    datasets: [{
      label: "สถานะสต็อก",
      data: [
        mockItems.filter((item) => item.status === "ปกติ").length,
        mockItems.filter((item) => item.status === "ต่ำ").length,
        mockItems.filter((item) => item.status === "หมด").length,
      ],
      backgroundColor: ["#10b981", "#fbbf24", "#f43f5e"],
    }],
  };
  
  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  const requestChartData = {
    labels: ["รอดำเนินการ", "อนุมัติ"],
    datasets: [{
      data: [
        mockRequests.filter((req) => req.status === "pending").length,
        mockRequests.filter((req) => req.status === "approved").length,
      ],
      backgroundColor: ["#fbbf24", "#10b981"],
    }],
  };
  
  const requestChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  // Debounce การค้นหา
  const debouncedSetSearchTerm = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // ฟังก์ชันส่งออก
  const handleExport = useCallback((format) => {
    console.log(`ส่งออก Dashboard เป็น ${format}`);
  }, []);

  const Button = ({ children, variant, ...props }) => (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${variant === "outline"
          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          : "bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
        } px-5 py-2.5 shadow-md`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 bg-gray-100 min-h-screen w-full">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-800">
          <span className="flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-sky-600" /> แดชบอร์ดคลังเวชภัณฑ์
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport("pdf")}>
            <Download className="mr-2 h-4 w-4" /> ส่งออก PDF
          </Button>
        </div>
      </div>

      {/* การ์ดสรุป */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DivLink href="/warehouse/items?category=ครุภัณฑ์">
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4 hover:bg-gray-50 transition">
            <div className="p-3 bg-teal-100 rounded-lg">
              <Box className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ครุภัณฑ์</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.equipment}</p>
            </div>
          </div>
        </DivLink>
        <DivLink href="/warehouse/items?category=ยา">
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4 hover:bg-gray-50 transition">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Pill className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ยา</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.drugs}</p>
            </div>
          </div>
        </DivLink>
        <DivLink href="/warehouse/items?category=วัสดุสิ้นเปลือง">
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4 hover:bg-gray-50 transition">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Package className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">วัสดุสิ้นเปลือง</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.supplies}</p>
            </div>
          </div>
        </DivLink>
        <DivLink href="/warehouse/items?category=เวชภัณฑ์ที่ไม่ใช่ยา">
          <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4 hover:bg-gray-50 transition">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Syringe className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">เวชภัณฑ์ที่ไม่ใช่ยา</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.medicalSupplies}</p>
            </div>
          </div>
        </DivLink>
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">สต็อกต่ำ</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.lowStock}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4">
          <div className="p-3 bg-rose-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">สต็อกหมด</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.outOfStock}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Lot ใกล้หมดอายุ</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.nearExpiryLots}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-4">
          <div className="p-3 bg-violet-100 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">คำขอรอดำเนินการ</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.pendingRequests}</p>
          </div>
        </div>
      </div>

      {/* กราฟ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">จำนวนสินค้าตามหมวดหมู่</h3>
          <div className="h-64">
            <Bar data={stockChartData} options={stockChartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">สถานะสต็อก</h3>
          <div className="h-64">
            <Bar data={statusChartData} options={statusChartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">สถานะคำขอสั่งซื้อ</h3>
          <div className="h-64">
            <Pie data={requestChartData} options={requestChartOptions} />
          </div>
        </div>
      </div>

      {/* การแจ้งเตือน */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">การแจ้งเตือน</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาการแจ้งเตือน..."
                onChange={(e) => debouncedSetSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${alert.type === "สต็อกต่ำ" ? "bg-yellow-100" : alert.type === "สต็อกหมด" ? "bg-red-100" : "bg-orange-100"}`}>
                    {alert.type === "สต็อกต่ำ" || alert.type === "สต็อกหมด" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.type}</p>
                    <p className="text-xs text-gray-600">{alert.message}</p>
                  </div>
                </div>
                {/* ใช้ a tag แทน Link */}
                <a href={alert.type === "ใกล้หมดอายุ" ? `/warehouse/lots?lotId=${alert.id}` : `/warehouse/items?itemId=${alert.id}`}>
                  <Button variant="outline" size="sm">
                    ดูรายละเอียด
                  </Button>
                </a>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">ไม่มีการแจ้งเตือน</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
