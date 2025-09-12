"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  ShoppingCart,
  Layers,
  FileText,
  Settings,
  Tags,
  Clock,
  Zap,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // ตรวจสอบโมดูลจาก path
  let type: "warehouse" | "procurement" | "requests" = "warehouse";
  if (pathname.startsWith("/procurement")) type = "procurement";
  else if (pathname.startsWith("/requests")) type = "requests";

  const menus = {
    warehouse: [
      { name: "แดชบอร์ด", path: "/warehouse", icon: LayoutDashboard },
      { name: "รายการพัสดุ", path: "/warehouse/items", icon: Package },
      { name: "นำเข้าพัสดุ", path: "/warehouse/stockin", icon: ArrowDownToLine },
      { name: "นำออกพัสดุ", path: "/warehouse/stockout", icon: ArrowUpFromLine },
      { name: "คำขอ/อนุมัติ", path: "/warehouse/requests", icon: ClipboardCheck },
      { name: "ขอสั่งซื้อ", path: "/warehouse/purchaserequests", icon: ShoppingCart },
      { name: "จัดการ Lot", path: "/warehouse/lots", icon: Layers },
      { name: "จัดการประเภท/หน่วย", path: "/warehouse/categories", icon: Tags },
      { name: "ประวัติการทำรายการ", path: "/warehouse/history", icon: Clock },
      { name: "รายงาน", path: "/warehouse/reports", icon: FileText },
      { name: "ตั้งค่า", path: "/warehouse/settings", icon: Settings },
    ],
    procurement: [
      { name: "แดชบอร์ด", path: "/procurement", icon: LayoutDashboard },
      { name: "ใบขอซื้อ (PR)", path: "/procurement/pr", icon: Package },
      { name: "ขอราคา (RFQ)", path: "/procurement/rfq", icon: Package },
      { name: "ใบสั่งซื้อ (PO)", path: "/procurement/po", icon: Package },
      { name: "รายงาน", path: "/procurement/reports", icon: FileText },
      { name: "ตั้งค่า", path: "/procurement/settings", icon: Settings },
    ],
    requests: [
      { name: "แดชบอร์ด", path: "/requests", icon: LayoutDashboard },
      { name: "ยืมพัสดุ", path: "/requests/borrow", icon: Package },
      { name: "คืนพัสดุ", path: "/requests/return", icon: Package },
      { name: "เบิกใช้", path: "/requests/withdraw", icon: Package },
      { name: "รายงาน", path: "/requests/reports", icon: FileText },
      { name: "ตั้งค่า", path: "/requests/settings", icon: Settings },
    ],
  };

  const currentMenu = menus[type] || [];

  const isActive = (menuPath: string) => {
    const isDashboard =
      menuPath === "/warehouse" ||
      menuPath === "/procurement" ||
      menuPath === "/requests";
    return isDashboard ? pathname === menuPath : pathname.startsWith(menuPath);
  };

  return (
    <aside
      className={`relative h-screen ${collapsed ? "w-20" : "w-72"
        } bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg flex flex-col transition-all duration-300 ease-in-out transform-gpu overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {!collapsed && (
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 truncate tracking-tight">
            {type === "warehouse"
              ? "ระบบคลังพัสดุ"
              : type === "procurement"
              ? "ระบบการจัดซื้อ"
              : "ระบบเบิก-ยืม-คืน"}
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-6 h-6 text-gray-500 dark:text-gray-300" />
        </button>
      </div>

      {/* เมนู */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <ul className="space-y-1.5">
          {currentMenu.map((menu) => {
            const active = isActive(menu.path);
            const Icon = menu.icon;
            return (
              <li key={menu.path} className="relative group">
                <Link
                  href={menu.path}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start gap-4"
                    } px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${active
                      ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100"
                    }`}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500 dark:bg-indigo-400 rounded-r"></span>
                  )}
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                      }`}
                  />
                  {!collapsed && (
                    <span className="truncate">{menu.name}</span>
                  )}
                  {collapsed && (
                    <span className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 p-2 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      {menu.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {!collapsed ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center truncate font-medium">
            {type === "warehouse"
              ? "Warehouse Management"
              : type === "procurement"
              ? "Procurement System"
              : "Requests System"}
          </div>
        ) : (
          <div className="flex justify-center">
            <Zap className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
} 