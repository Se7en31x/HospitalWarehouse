'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, PackageSearch, Layers, ArrowDownToLine, ClipboardCheck, History, FileBarChart, Tags, Settings, Undo2, ChevronLeft, PackageCheck   } from 'lucide-react';

export default function WarehouseSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1536) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    // Check immediately on mount
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menus = [
    {
      group: 'ภาพรวม',
      items: [{ name: 'แดชบอร์ด', path: '/warehouse', icon: LayoutDashboard }]
    },
    {
      group: 'คลังพัสดุ',
      items: [
        { name: 'รายการพัสดุ', path: '/warehouse/items', icon: PackageSearch },
        { name: 'ล็อตพัสดุ', path: '/warehouse/lots', icon: Layers },
        { name: 'จัดการครุภัณฑ์', path: '/warehouse/assets', icon: Tags },
        { name: 'รับพัสดุเข้าคลัง', path: '/warehouse/receives', icon: ArrowDownToLine },
      ]
    },
    {
      group: 'การเบิก-ยืม-คืน',
      items: [
        { name: 'คำขอเบิก-ยืม', path: '/warehouse/requests', icon: ClipboardCheck },
        { name: 'รับคืนพัสดุ', path: '/warehouse/returns', icon: Undo2 },
        { name: 'รับคืนจากแผนก', path: '/warehouse/returns-department', icon: PackageCheck  },

      ]
    },
    {
      group: 'อื่นๆ',
      items: [
        { name: 'ประวัติการเคลื่อนไหว', path: '/warehouse/stock-movement', icon: History },
        { name: 'รายงาน', path: '/warehouse/reports', icon: FileBarChart },
        { name: 'ตั้งค่าระบบ', path: '/warehouse/settings', icon: Settings },
      ]
    }
  ];

  const isActive = (menuPath: string) => {
    if (menuPath === '/warehouse') {
      return pathname === menuPath;
    }
    return pathname === menuPath || pathname.startsWith(menuPath + '/');
  };

  return (
    <aside className={`relative h-screen shrink-0 ${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-sm z-20`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 border-b border-slate-50`}>
        {!collapsed && <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Main Menu</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide space-y-5">
        {menus.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && <h3 className="px-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">{group.group}</h3>}
            <ul className="space-y-0.5">
              {group.items.map((menu) => {
                const active = isActive(menu.path);
                const Icon = menu.icon;
                return (
                  <li key={menu.path} className="relative group">
                    <Link href={menu.path} className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start gap-3'} px-3 py-2 rounded-lg transition-all duration-150 ${active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-800 font-normal hover:bg-slate-50 hover:text-slate-900'}`}>
                      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                      {!collapsed && <span className="text-[15px]">{menu.name}</span>}
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

      <div className="p-4 border-t border-slate-50">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          {!collapsed && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">warehouse system</span>}
        </div>
      </div>
    </aside>
  );
}