"use client";

import { useState } from "react";
import {
    PackagePlus,
    Search,
    ClipboardList,
    Edit,
    Trash2,
    Package,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

// จำลองข้อมูลพัสดุ (เพิ่มจำนวนข้อมูลให้มากขึ้น)
const mockItems = [
    { id: "ITM001", name: "ชุดตรวจ ATK", category: "อุปกรณ์ทางการแพทย์", stock: 150, unit: "ชิ้น", price: 85.0, status: "ปกติ" },
    { id: "ITM002", name: "ถุงมือยาง", category: "วัสดุสิ้นเปลือง", stock: 25, unit: "กล่อง", price: 120.0, status: "ต่ำ" },
    { id: "ITM003", name: "ผ้าก๊อซปลอดเชื้อ", category: "อุปกรณ์ทางการแพทย์", stock: 0, unit: "กล่อง", price: 50.0, status: "หมด" },
    { id: "ITM004", name: "แอลกอฮอล์ 70%", category: "วัสดุสิ้นเปลือง", stock: 80, unit: "ขวด", price: 45.5, status: "ปกติ" },
    { id: "ITM005", name: "เข็มฉีดยา", category: "อุปกรณ์ทางการแพทย์", stock: 3, unit: "กล่อง", price: 95.0, status: "ต่ำ" },
    { id: "ITM006", name: "หน้ากากอนามัย N95", category: "อุปกรณ์ป้องกัน", stock: 40, unit: "ชิ้น", price: 15.0, status: "ปกติ" },
    { id: "ITM007", name: "ยาพาราเซตามอล", category: "ยา", stock: 200, unit: "เม็ด", price: 2.0, status: "ปกติ" },
    { id: "ITM008", name: "เครื่องวัดความดัน", category: "เครื่องมือแพทย์", stock: 10, unit: "เครื่อง", price: 1500.0, status: "ปกติ" },
    { id: "ITM009", name: "สารละลายเกลือ", category: "วัสดุสิ้นเปลือง", stock: 5, unit: "ขวด", price: 35.0, status: "ต่ำ" },
    { id: "ITM010", name: "สำลี", category: "วัสดุสิ้นเปลือง", stock: 0, unit: "ห่อ", price: 25.0, status: "หมด" },
    { id: "ITM011", name: "กระดาษชำระ", category: "วัสดุสำนักงาน", stock: 20, unit: "ม้วน", price: 12.0, status: "ปกติ" },
    { id: "ITM012", name: "ปากกา", category: "วัสดุสำนักงาน", stock: 5, unit: "ด้าม", price: 8.0, status: "ต่ำ" },
    { id: "ITM013", name: "อุปกรณ์ทำแผล", category: "อุปกรณ์ทางการแพทย์", stock: 75, unit: "ชุด", price: 75.0, status: "ปกติ" },
    { id: "ITM014", name: "แว่นตานิรภัย", category: "อุปกรณ์ป้องกัน", stock: 12, unit: "ชิ้น", price: 200.0, status: "ต่ำ" },
    { id: "ITM015", name: "เครื่องพ่นยา", category: "เครื่องมือแพทย์", stock: 2, unit: "เครื่อง", price: 2500.0, status: "ต่ำ" },
];

export default function ItemsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

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
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}>
            {status}
        </span>
    );

    const Button = ({ children, ...props }: any) => (
        <button
            {...props}
            className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${props.variant === 'outline' ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'} px-4 py-2`}
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

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            {/* Header และปุ่ม Action */}
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

            {/* แถบค้นหาและตัวกรอง */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                {/* แถบค้นหา */}
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

                {/* ตัวกรองตามหมวดหมู่ */}
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
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>

                {/* ตัวกรองตามสถานะ */}
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
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ตารางแสดงรายการพัสดุ */}
            <div className="rounded-lg border bg-white shadow-sm overflow-hidden flex-grow flex flex-col">
                <div className="relative w-full overflow-auto flex-grow">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500 w-[100px]">รหัสพัสดุ</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">ชื่อพัสดุ</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">หมวดหมู่</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">จำนวนคงเหลือ</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">สถานะ</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">ราคาต่อหน่วย</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-gray-500">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {paginatedItems.length > 0 ? (
                                paginatedItems.map((item) => (
                                    <tr key={item.id} className="border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle font-medium text-gray-900">{item.id}</td>
                                        <td className="p-4 align-middle">{item.name}</td>
                                        <td className="p-4 align-middle text-gray-500">{item.category}</td>
                                        <td className="p-4 align-middle font-semibold">{item.stock} {item.unit}</td>
                                        <td className="p-4 align-middle">
                                            <Badge status={item.status} />
                                        </td>
                                        <td className="p-4 align-middle text-right">{item.price.toFixed(2)} บาท</td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <IconButton className="hover:text-indigo-600">
                                                    <Edit className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton className="hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </IconButton>
                                            </div>
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
            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-gray-600">
                    แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-1 text-sm text-gray-700">
                        หน้า {currentPage} จาก {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}