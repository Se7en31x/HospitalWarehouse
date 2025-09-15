"use client";

import { useState } from "react";
import {
  PackagePlus,
  Search,
  ClipboardList,
  Package,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  Plus,
  Minus,
  Wrench,
  AlertTriangle,
  MoreVertical,
  CircleCheck,
  Tag,
  MapPin,
  Info,
  Building,
  Truck,
  History,
  Clock,
  Eye,
} from "lucide-react";

// จำลองข้อมูลพัสดุ (เพิ่มรายละเอียดเพิ่มเติม)
const mockItems = [
  {
    id: "ITM001",
    name: "ชุดตรวจ ATK",
    category: "อุปกรณ์ทางการแพทย์",
    stock: 150,
    unit: "ชิ้น",
    price: 85.0,
    status: "ปกติ",
    description: "ชุดตรวจ Antigen Test Kit สำหรับการตรวจหาเชื้อ COVID-19 แบบรวดเร็ว",
    location: "ชั้น 1, โซน A, ชั้นวาง 3",
    supplier: "บริษัท เมดิคอล ซัพพลาย จำกัด",
    lastUpdated: "12/09/2568 10:30",
  },
  {
    id: "ITM002",
    name: "ถุงมือยาง",
    category: "วัสดุสิ้นเปลือง",
    stock: 25,
    unit: "กล่อง",
    price: 120.0,
    status: "ต่ำ",
    description: "ถุงมือยางอนามัยแบบใช้แล้วทิ้ง ขนาด M",
    location: "ชั้น 2, โซน C, ชั้นวาง 12",
    supplier: "บริษัท ถุงมือคุณภาพ จำกัด",
    lastUpdated: "12/09/2568 09:15",
  },
  {
    id: "ITM003",
    name: "ผ้าก๊อซปลอดเชื้อ",
    category: "อุปกรณ์ทางการแพทย์",
    stock: 0,
    unit: "กล่อง",
    price: 50.0,
    status: "หมด",
    description: "ผ้าก๊อซสำหรับทำแผล ขนาด 4x4 นิ้ว บรรจุ 100 แผ่น/กล่อง",
    location: "ชั้น 1, โซน B, ชั้นวาง 5",
    supplier: "บริษัท ผ้าก๊อซสะอาด จำกัด",
    lastUpdated: "11/09/2568 17:00",
  },
  {
    id: "ITM004",
    name: "แอลกอฮอล์ 70%",
    category: "วัสดุสิ้นเปลือง",
    stock: 80,
    unit: "ขวด",
    price: 45.5,
    status: "ปกติ",
    description: "แอลกอฮอล์สำหรับฆ่าเชื้อ ขนาด 450 มล.",
    location: "ชั้น 2, โซน C, ชั้นวาง 1",
    supplier: "บริษัท ไทยเคมีคอล จำกัด",
    lastUpdated: "12/09/2568 11:45",
  },
  {
    id: "ITM005",
    name: "เข็มฉีดยา",
    category: "อุปกรณ์ทางการแพทย์",
    stock: 3,
    unit: "กล่อง",
    price: 95.0,
    status: "ต่ำ",
    description: "เข็มฉีดยาแบบใช้แล้วทิ้ง ขนาด 21G บรรจุ 100 ชิ้น/กล่อง",
    location: "ชั้น 1, โซน B, ชั้นวาง 8",
    supplier: "บริษัท เครื่องมือแพทย์ทันสมัย จำกัด",
    lastUpdated: "12/09/2568 13:20",
  },
  {
    id: "ITM006",
    name: "หน้ากากอนามัย N95",
    category: "อุปกรณ์ป้องกัน",
    stock: 40,
    unit: "ชิ้น",
    price: 15.0,
    status: "ปกติ",
    description: "หน้ากากป้องกันฝุ่นละอองและเชื้อโรค N95",
    location: "ชั้น 2, โซน A, ชั้นวาง 6",
    supplier: "บริษัท มาสก์พรีเมียม จำกัด",
    lastUpdated: "12/09/2568 08:00",
  },
  {
    id: "ITM007",
    name: "ยาพาราเซตามอล",
    category: "ยา",
    stock: 200,
    unit: "เม็ด",
    price: 2.0,
    status: "ปกติ",
    description: "ยาบรรเทาอาการปวดและลดไข้",
    location: "ชั้น 3, โซน Y, ชั้นวาง 1",
    supplier: "บริษัท ยาดี จำกัด",
    lastUpdated: "12/09/2568 15:50",
  },
  {
    id: "ITM008",
    name: "เครื่องวัดความดัน",
    category: "เครื่องมือแพทย์",
    stock: 10,
    unit: "เครื่อง",
    price: 1500.0,
    status: "ปกติ",
    description: "เครื่องวัดความดันโลหิตแบบดิจิทัล",
    location: "ชั้น 3, โซน M, ชั้นวาง 4",
    supplier: "บริษัท เฮลธ์แกดเจ็ต จำกัด",
    lastUpdated: "10/09/2568 14:00",
  },
  {
    id: "ITM009",
    name: "สารละลายเกลือ",
    category: "วัสดุสิ้นเปลือง",
    stock: 5,
    unit: "ขวด",
    price: 35.0,
    status: "ต่ำ",
    description: "Normal Saline Solution สำหรับล้างแผล",
    location: "ชั้น 1, โซน B, ชั้นวาง 10",
    supplier: "บริษัท ซอลท์เมด จำกัด",
    lastUpdated: "12/09/2568 16:10",
  },
  {
    id: "ITM010",
    name: "สำลี",
    category: "วัสดุสิ้นเปลือง",
    stock: 0,
    unit: "ห่อ",
    price: 25.0,
    status: "หมด",
    description: "สำลีแผ่นสำหรับทำความสะอาดทั่วไป",
    location: "ชั้น 2, โซน C, ชั้นวาง 15",
    supplier: "บริษัท คอตตอนโกลด์ จำกัด",
    lastUpdated: "11/09/2568 18:00",
  },
  {
    id: "ITM011",
    name: "กระดาษชำระ",
    category: "วัสดุสำนักงาน",
    stock: 20,
    unit: "ม้วน",
    price: 12.0,
    status: "ปกติ",
    description: "กระดาษชำระแบบม้วนใหญ่",
    location: "ชั้น 2, โซน S, ชั้นวาง 2",
    supplier: "บริษัท กระดาษดีดี จำกัด",
    lastUpdated: "10/09/2568 09:00",
  },
  {
    id: "ITM012",
    name: "ปากกา",
    category: "วัสดุสำนักงาน",
    stock: 5,
    unit: "ด้าม",
    price: 8.0,
    status: "ต่ำ",
    description: "ปากกาลูกลื่นสีน้ำเงิน",
    location: "ชั้น 2, โซน S, ชั้นวาง 8",
    supplier: "บริษัท สเตชันเนอรี่ จำกัด",
    lastUpdated: "12/09/2568 10:00",
  },
];

type Item = typeof mockItems[0];

export default function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDamagedModalOpen, setIsDamagedModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuItem, setMenuItem] = useState<Item | null>(null);

  const categories = ["ทั้งหมด", ...new Set(mockItems.map((item) => item.category))];
  const statuses = ["ทั้งหมด", ...new Set(mockItems.map((item) => item.status))];

  const filteredItems = mockItems.filter(
    (item) =>
      (item.id.includes(searchTerm.toUpperCase()) ||
        item.name.includes(searchTerm) ||
        item.category.includes(searchTerm)) &&
      (selectedCategory === "ทั้งหมด" || item.category === selectedCategory) &&
      (selectedStatus === "ทั้งหมด" || item.status === selectedStatus)
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ปกติ":
        return "bg-green-100 text-green-800";
      case "ต่ำ":
        return "bg-yellow-100 text-yellow-800";
      case "หมด":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const Badge = ({ status }: { status: string }) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(
        status
      )}`}
    >
      {status}
    </span>
  );

  const Button = ({ children, ...props }: any) => (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        props.variant === "outline"
          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      } px-4 py-2`}
    >
      {children}
    </button>
  );

  const IconButton = ({ children, ...props }: any) => (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 ${props.className}`}
    >
      {children}
    </button>
  );

  const handleOpenAdjustModal = (item: Item) => {
    setSelectedItem(item);
    setIsAdjustModalOpen(true);
  };

  const handleOpenDamagedModal = (item: Item) => {
    setSelectedItem(item);
    setIsDamagedModalOpen(true);
  };
  
  const handleOpenExpiredModal = (item: Item) => {
    setSelectedItem(item);
    setIsExpiredModalOpen(true);
  };

  const handleCloseAllModals = () => {
    setSelectedItem(null);
    setIsAdjustModalOpen(false);
    setIsDamagedModalOpen(false);
    setIsExpiredModalOpen(false);
  };

  const handleToggleMenu = (item: Item) => {
    setMenuItem(item);
    setIsMenuOpen(isMenuOpen && menuItem?.id === item.id ? false : true);
  };

  return (
    <div className="flex flex-col h-screen p-8 pt-6 space-y-8 bg-gray-50">
      {/* Header and Action Buttons */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-800">
          <span className="flex items-center gap-2">
            <Package className="w-8 h-8 text-indigo-600" /> รายการพัสดุ
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <ClipboardList className="mr-2 h-4 w-4" /> รายงาน
          </Button>
          <Button>
            <PackagePlus className="mr-2 h-4 w-4" /> เพิ่มพัสดุใหม่
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหารหัส, ชื่อ หรือหมวดหมู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
          />
        </div>
        <div className="flex-shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-lg border bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="relative w-full overflow-auto flex-1">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b sticky top-0 bg-white z-10">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[120px]">
                  รหัสพัสดุ
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[200px]">
                  ชื่อพัสดุ
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[150px]">
                  หมวดหมู่
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[150px]">
                  จำนวนคงเหลือ
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 min-w-[150px]">
                  สถานะ
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-gray-500 min-w-[120px]">
                  ราคาต่อหน่วย
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-gray-500 w-[80px]">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle font-medium text-gray-900 min-w-[120px]">
                      {item.id}
                    </td>
                    <td className="p-4 align-middle min-w-[200px]">{item.name}</td>
                    <td className="p-4 align-middle text-gray-500 min-w-[150px]">
                      {item.category}
                    </td>
                    <td className="p-4 align-middle font-semibold min-w-[150px]">
                      {item.stock} {item.unit}
                    </td>
                    <td className="p-4 align-middle min-w-[150px]">
                      <Badge status={item.status} />
                    </td>
                    <td className="p-4 align-middle text-right min-w-[120px]">
                      {item.price.toFixed(2)} บาท
                    </td>
                    <td className="p-4 align-middle text-right relative w-[80px]">
                      <IconButton onClick={() => handleToggleMenu(item)}>
                        <MoreVertical className="h-4 w-4" />
                      </IconButton>
                      {isMenuOpen && menuItem?.id === item.id && (
                        <div className="absolute right-0 top-full mt-2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-48 space-y-1">
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="flex items-center gap-3 p-2 w-full text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Settings className="h-5 w-5 text-blue-500" />
                            <span className="text-sm font-medium">ปรับยอด</span>
                          </button>
                          <button
                            onClick={() => handleOpenDamagedModal(item)}
                            className="flex items-center gap-3 p-2 w-full text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Wrench className="h-5 w-5 text-orange-500" />
                            <span className="text-sm font-medium">แจ้งชำรุด</span>
                          </button>
                          <button
                            onClick={() => handleOpenExpiredModal(item)}
                            className="flex items-center gap-3 p-2 w-full text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium">แจ้งหมดอายุ</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-muted">
                  <td colSpan={7} className="h-24 text-center text-gray-500">
                    ไม่พบรายการพัสดุที่ตรงกับที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm h-16">
        <div className="text-sm text-gray-600">
          แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1 text-sm text-gray-700">
            หน้า {currentPage} จาก {totalPages}
          </div>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                ปรับยอดพัสดุ: {selectedItem.name}
              </h3>
              <button
                onClick={handleCloseAllModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  จำนวนปัจจุบัน
                </label>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedItem.stock} {selectedItem.unit}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ปรับยอด
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    defaultValue={0}
                    className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="p-2 rounded-md border border-gray-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-md border border-gray-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  สาเหตุ
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="ระบุเหตุผลในการปรับยอด (เช่น ตรวจนับ, คืนของ)"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Damaged Modal */}
      {isDamagedModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                แจ้งพัสดุชำรุด: {selectedItem.name}
              </h3>
              <button
                onClick={handleCloseAllModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  จำนวนที่ชำรุด
                </label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  placeholder="ระบุจำนวน"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  สาเหตุการชำรุด
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  placeholder="โปรดระบุสาเหตุโดยละเอียด"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  รูปภาพประกอบ (ถ้ามี)
                </label>
                <input
                  type="file"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Expired Modal */}
      {isExpiredModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                แจ้งของหมดอายุ: {selectedItem.name}
              </h3>
              <button
                onClick={handleCloseAllModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  หมายเลขล็อต
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  placeholder="LOT-XXX-YYYYMM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  จำนวนที่หมดอายุ
                </label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  วันที่หมดอายุ
                </label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  หมายเหตุ
                </label>
                <textarea
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  placeholder="หมายเหตุเพิ่มเติม"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}