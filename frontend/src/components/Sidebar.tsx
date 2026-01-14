'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  LayoutDashboard,
  PackageSearch,
  Layers,
  ArrowDownToLine,
  Scale,
  ClipboardCheck,
  History,
  ShoppingCart,
  FileBarChart,
  Tags,
  Settings,
  FileText,
  FileSignature,
  FileInput,
  FileOutput,
  HandHelping,
  Undo2,
  Archive,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // ระบุประเภทโมดูลจาก path
  let type: 'warehouse' | 'procurement' | 'requests' = 'warehouse';
  if (pathname.startsWith('/procurement')) type = 'procurement';
  else if (pathname.startsWith('/requests')) type = 'requests';

  const menus = {
    warehouse: [
      { name: 'แดชบอร์ด', path: '/warehouse', icon: LayoutDashboard },
      { name: 'สต็อกพัสดุ', path: '/warehouse/items', icon: PackageSearch },
      { name: 'จัดการล็อตพัสดุ', path: '/warehouse/lots', icon: Layers },
      { name: 'บันทึกนำเข้า', path: '/warehouse/stockin', icon: ArrowDownToLine },
      { name: 'ตรวจสอบคำขอ', path: '/warehouse/requests', icon: ClipboardCheck },
      { name: 'จัดการการคืน', path: '/warehouse/returns', icon: Undo2 },
      { name: 'คำขอสั่งซื้อ (PR)', path: '/warehouse/purchaserequests', icon: ShoppingCart },
      { name: 'ประวัติการทำรายการ', path: '/warehouse/history', icon: History },
      { name: 'รายงานคลัง', path: '/warehouse/reports', icon: FileBarChart },
      { name: 'จัดการหมวดหมู่/หน่วยนับ', path: '/warehouse/categories', icon: Tags },
      { name: 'ตั้งค่าระบบ', path: '/warehouse/settings', icon: Settings },
    ],
    procurement: [
      { name: 'คำขอสั่งซื้อ (PR)', path: '/procurement/pr', icon: FileSignature },
      { name: 'ขอราคา (RFQ)', path: '/procurement/rfq', icon: FileInput },
      { name: 'ข้อมูลผู้จำหน่าย (Suppliers)', path: '/procurement/suppliers', icon: HandHelping },
      { name: 'รายงานการจัดซื้อ', path: '/procurement/reports', icon: FileText },
      { name: 'ตั้งค่า', path: '/procurement/settings', icon: Settings },
    ],
    requests: [
      { name: 'แดชบอร์ด', path: '/requests', icon: LayoutDashboard },
      { name: 'เบิกใช้', path: '/requests/withdraw', icon: Archive },
      { name: 'ยืมพัสดุ', path: '/requests/borrow', icon: HandHelping },
      { name: 'ประวัติการเบิก–ยืม', path: '/requests/history', icon: History },
      { name: 'รายงาน', path: '/requests/reports', icon: FileBarChart },
    ],
  };

  const currentMenu = menus[type] || [];

  const isActive = (menuPath: string) => {
    const isDashboard =
      menuPath === '/warehouse' ||
      menuPath === '/procurement' ||
      menuPath === '/requests';
    return isDashboard ? pathname === menuPath : pathname.startsWith(menuPath);
  };

  return (
    <aside
      className={`relative h-screen ${collapsed ? 'w-20' : 'w-72'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm`}
    >
      {/* Toggle */}
      <div
        className={`flex ${collapsed ? 'justify-center' : 'justify-end'
          } px-3 py-3 border-b border-gray-200 bg-gray-50 shadow-sm`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-indigo-100 hover:scale-105 transition-all duration-200 group relative"
        >
          <Menu className="w-6 h-6 text-gray-700" />
          {collapsed && (
            <span className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 bg-indigo-600 text-white text-xs sm:text-sm rounded-lg py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {collapsed ? 'ขยาย' : 'ย่อ'}
            </span>
          )}
        </button>
      </div>

      {/* เมนู */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <ul className="space-y-1">
          {currentMenu.map((menu, i) => {
            const active = isActive(menu.path);
            const Icon = menu.icon;
            return (
              <li
                key={menu.path}
                className="relative group"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Link
                  href={menu.path}
                  className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start gap-4'
                    } px-4 py-3 rounded-lg text-xs sm:text-sm transition-all duration-200 animate-fade-in ${active
                      ? 'bg-indigo-600 text-white font-medium shadow-sm'
                      : 'text-gray-700 font-light hover:bg-indigo-100 hover:text-indigo-700 hover:scale-105'
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${active ? 'text-white' : 'text-gray-500'
                      }`}
                  />
                  {!collapsed && <span className="truncate">{menu.name}</span>}
                </Link>
                {collapsed && (
                  <span className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 bg-indigo-600 text-white text-xs sm:text-sm rounded-lg py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {menu.name}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl shadow-sm">
        {!collapsed && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600 font-light">
            <Settings className="w-4 h-4 text-gray-500" />
            <span>
              {type === 'warehouse'
                ? 'Warehouse Management'
                : type === 'procurement'
                  ? 'Procurement System'
                  : 'Request System'}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
