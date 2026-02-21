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
  ClipboardCheck,
  History,
  ShoppingCart,
  FileBarChart,
  Tags,
  Settings,
  FileText,
  FileSignature,
  FileInput,
  HandHelping,
  Undo2,
  Archive,
  ChevronLeft
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  let type: 'warehouse' | 'procurement' | 'requests' = 'warehouse';
  if (pathname.startsWith('/procurement')) type = 'procurement';
  else if (pathname.startsWith('/requests')) type = 'requests';

  // จัดหมวดหมู่เมนูใหม่
  const menus = {
    warehouse: [
      {
        group: 'ภาพรวม',
        items: [{ name: 'แดชบอร์ด', path: '/warehouse', icon: LayoutDashboard }]
      },
      {
        group: 'จัดการ',
        items: [
          { name: 'สต็อกพัสดุ', path: '/warehouse/items', icon: PackageSearch },
          { name: 'จัดการล็อตพัสดุ', path: '/warehouse/lots', icon: Layers },
          { name: 'บันทึกนำเข้า', path: '/warehouse/stockin', icon: ArrowDownToLine },
        ]
      },
      {
        group: 'ธุรกรรม',
        items: [
          { name: 'ตรวจสอบคำขอ', path: '/warehouse/requests', icon: ClipboardCheck },
          { name: 'จัดการการคืน', path: '/warehouse/returns', icon: Undo2 },
          { name: 'คำขอสั่งซื้อ (PR)', path: '/warehouse/purchaserequests', icon: ShoppingCart },
        ]
      },
      {
        group: 'อื่นๆ',
        items: [
          { name: 'ประวัติรายการ', path: '/warehouse/history', icon: History },
          { name: 'รายงานคลัง', path: '/warehouse/reports', icon: FileBarChart },
          { name: 'หมวดหมู่', path: '/warehouse/categories', icon: Tags },
          { name: 'ตั้งค่า', path: '/warehouse/settings', icon: Settings },
        ]
      }
    ],
    procurement: [
      {
        group: 'งานจัดซื้อ',
        items: [
          { name: 'คำขอสั่งซื้อ (PR)', path: '/procurement/pr', icon: FileSignature },
          { name: 'ขอราคา (RFQ)', path: '/procurement/rfq', icon: FileInput },
          { name: 'ผู้จำหน่าย', path: '/procurement/suppliers', icon: HandHelping },
        ]
      },
      {
        group: 'รายงาน & ตั้งค่า',
        items: [
          { name: 'รายงานจัดซื้อ', path: '/procurement/reports', icon: FileText },
          { name: 'ตั้งค่า', path: '/procurement/settings', icon: Settings },
        ]
      }
    ],
    requests: [
      {
        group: 'เมนูหลัก',
        items: [{ name: 'แดชบอร์ด', path: '/requests', icon: LayoutDashboard }]
      },
      {
        group: 'การเบิกจ่าย',
        items: [
          { name: 'เบิกใช้พัสดุ', path: '/requests/withdraw', icon: Archive },
          { name: 'ยืมพัสดุ', path: '/requests/borrow', icon: HandHelping },
        ]
      },
      {
        group: 'ติดตามผล',
        items: [
          { name: 'ประวัติการทำรายการ', path: '/requests/history', icon: History },
          { name: 'รายงาน', path: '/requests/reports', icon: FileBarChart },
        ]
      }
    ],
  };

  const currentMenuGroups = menus[type] || [];

  const isActive = (menuPath: string) => {
    const isDashboard = ['/warehouse', '/procurement', '/requests'].includes(menuPath);
    return isDashboard ? pathname === menuPath : pathname.startsWith(menuPath);
  };

  return (
    <aside
      className={`relative h-screen ${collapsed ? 'w-20' : 'w-64'} 
      bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-sm z-20`}
    >
      {/* Header Toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 border-b border-slate-50`}>
        {!collapsed && <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Main Menu</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide space-y-5">
        {currentMenuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {group.group}
              </h3>
            )}
            <ul className="space-y-0.5">
              {group.items.map((menu) => {
                const active = isActive(menu.path);
                const Icon = menu.icon;
                return (
                  <li key={menu.path} className="relative group">
                    <Link
                      href={menu.path}
                      className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start gap-3'} 
                      px-3 py-2 rounded-lg transition-all duration-150 
                      ${active 
                        ? 'bg-blue-50 text-blue-600 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {!collapsed && <span className="text-sm">{menu.name}</span>}
                    </Link>
                    
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-slate-800 text-white text-[11px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {menu.name}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-50">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          {!collapsed && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {type} system active
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}