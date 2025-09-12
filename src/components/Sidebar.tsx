"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ClipboardCheck,
  FileText,
  Settings,
  Zap,
  ArrowUpFromLine,
  ShoppingCart,
  Layers,
  
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
      { name: "จัดการ Lot", path: "/warehouse/lots", icon: Layers }, // เพิ่มเมนู
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
      className={`relative h-full ${collapsed ? "w-20" : "w-64"
        } bg-white border-r border-gray-100 shadow-md flex flex-col transition-all duration-500 ease-in-out`}
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between px-4 py-4 border-b border-gray-100 bg-white">
        {!collapsed && (
          <h2 className="text-lg font-bold text-gray-800 truncate">
            {type === "warehouse"
              ? "ระบบคลังพัสดุ"
              : type === "procurement"
                ? "ระบบการจัดซื้อ"
                : "ระบบเบิก-ยืม-คืน"}
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* เมนู */}
      <nav className="flex-1 px-2 py-6 w-full overflow-y-auto scrollbar-hidden">
        <ul className="space-y-1">
          {currentMenu.map((menu) => {
            const active = isActive(menu.path);
            const Icon = menu.icon;
            return (
              <li key={menu.path} className="relative">
                <Link
                  href={menu.path}
                  className={`relative flex items-center ${collapsed ? "justify-center" : "justify-start gap-3"
                    } px-3 py-2.5 rounded-md text-[15px] font-medium transition-all duration-300 group ${active
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-0 h-full w-1.5 bg-indigo-600 rounded-r"></span>
                  )}
                  <Icon
                    className={`w-5 h-5 transition-colors ${active ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                      }`}
                  />
                  {!collapsed && <span>{menu.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        {!collapsed ? (
          <div className="text-xs text-gray-500 text-center truncate">
            {type === "warehouse"
              ? "Warehouse"
              : type === "procurement"
                ? "Procurement"
                : "Requests"}
          </div>
        ) : (
          <div className="flex justify-center">
            <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
}