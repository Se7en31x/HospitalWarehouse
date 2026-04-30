'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, LayoutDashboard, PackageSearch, Layers, ArrowDownToLine,
  ClipboardCheck, History, FileBarChart, Tags, Settings, Undo2, PackageCheck,
} from 'lucide-react';

const menus = [
  {
    group: 'ภาพรวม',
    items: [
      { name: 'แดชบอร์ด', path: '/warehouse', icon: LayoutDashboard },
    ],
  },
  {
    group: 'คลังพัสดุ',
    items: [
      { name: 'รายการพัสดุ', path: '/warehouse/items', icon: PackageSearch },
      { name: 'ล็อตสินค้า', path: '/warehouse/lots', icon: Layers },
      { name: 'ครุภัณฑ์', path: '/warehouse/assets', icon: Tags },
      { name: 'รับพัสดุเข้าคลัง', path: '/warehouse/receives', icon: ArrowDownToLine },
    ],
  },
  {
    group: 'เบิก-ยืม-คืน',
    items: [
      { name: 'คำขอเบิก-ยืม', path: '/warehouse/requests', icon: ClipboardCheck },
      { name: 'รับคืนพัสดุยืม', path: '/warehouse/returns', icon: Undo2 },
      { name: 'รับคืนพัสดุนำกลับ', path: '/warehouse/returns-department', icon: PackageCheck },
    ],
  },
  {
    group: 'รายงาน',
    items: [
      { name: 'ประวัติการเคลื่อนไหว', path: '/warehouse/stock-movement', icon: History },
      { name: 'รายงาน', path: '/warehouse/reports', icon: FileBarChart },
      { name: 'ตั้งค่าระบบ', path: '/warehouse/settings', icon: Settings },
    ],
  },
];

export default function WarehouseSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth <= 1536);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isActive = (path: string) =>
    path === '/warehouse' ? pathname === path : pathname === path || pathname.startsWith(path + '/');

  return (
    <aside
      className={`relative h-screen shrink-0 flex flex-col bg-white z-20 shadow-[2px_0_16px_rgba(0,0,0,0.07)] transition-[width] duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-64'}`}
    >
      {/* Toggle */}
      <div className={`flex items-center py-4 border-b border-slate-100 ${collapsed ? 'justify-center' : 'justify-end px-3'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Menu className="w-[22px] h-[22px]" strokeWidth={2.25} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4">
        {menus.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
            {/* Group label */}
            {!collapsed ? (
              <p className="px-4 mb-2 text-[10px] font-bold text-slate-500">
                {group.group}
              </p>
            ) : gi > 0 ? (
              <div className="mx-auto w-6 border-t border-slate-100 mb-3 mt-1" />
            ) : null}

            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <li key={item.path} className="relative group">
                    {/* Active indicator — expanded only */}
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[#0786F5] rounded-r-full" />
                    )}

                    <Link
                      href={item.path}
                      className={`flex items-center rounded-xl transition-colors duration-150 ${
                        collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                      } ${
                        active
                          ? 'bg-[#0786F5]/[0.14] text-[#0554B0] font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        strokeWidth={2.25}
                        className={`w-6 h-6 shrink-0 ${
                          active ? 'text-[#0786F5]' : 'text-slate-500 group-hover:text-slate-700'
                        }`}
                      />
                      {!collapsed && (
                        <span className="text-[14px] leading-none flex-1 whitespace-nowrap">
                          {item.name}
                        </span>
                      )}
                    </Link>

                    {/* Tooltip */}
                    {collapsed && (
                      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                        {item.name}
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
      <div className={`py-4 border-t border-slate-100 flex ${collapsed ? 'justify-center' : 'px-4 justify-start'}`}>
        <div className="w-2 h-2 rounded-full bg-[#0786F5] shadow-[0_0_6px_rgba(7,134,245,0.5)]" />
      </div>
    </aside>
  );
}
