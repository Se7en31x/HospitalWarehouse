'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Menu,
  X,
  LayoutDashboard,
  PackageSearch,
  Layers,
  ArrowDownToLine,
  ClipboardCheck,
  History,
  FileBarChart,
  Tags,
  Settings,
  Undo2,
  PackageCheck,
  Archive,
} from 'lucide-react';

const REQUEST_PORTAL_WITHDRAW_URL = 'https://warehouse.hpk-hms.site/request/withdraw';

interface NavItem {
  name: string;
  icon: typeof LayoutDashboard;
  path: string;
  /** ถ้า path เป็น URL เต็ม ใช้ prefix เหล่านี้ตรวจไฮไลต์เมนูขณะอยู่ในแอป */
  activePathPrefixes?: string[];
}

interface MenuGroup {
  title: string;
  items: NavItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'ภาพรวม',
    items: [{ name: 'ภาพรวมระบบคลังหลัก', path: '/warehouse', icon: LayoutDashboard }],
  },
  {
    title: 'คลังพัสดุ',
    items: [
      { name: 'รายการพัสดุ', path: '/warehouse/items', icon: PackageSearch },
      { name: 'รับพัสดุเข้าคลัง', path: '/warehouse/receives', icon: ArrowDownToLine },
      { name: 'ล็อตสินค้า', path: '/warehouse/lots', icon: Layers },
      { name: 'จัดการครุภัณฑ์', path: '/warehouse/assets', icon: Tags },
    ],
  },
  {
    title: 'เบิก-ยืม-คืน',
    items: [
      {
        name: 'ระบบเบิก-ยืม-คืน',
        path: REQUEST_PORTAL_WITHDRAW_URL,
        icon: Archive,
        activePathPrefixes: [
          '/request/withdraw',
          '/request/borrow',
          '/request/returnitem',
          '/request/return-requests',
          '/request/history',
        ],
      },
      { name: 'คำขอเบิก-ยืม', path: '/warehouse/requests', icon: ClipboardCheck },
      { name: 'รับคืนจากบุคคลภายนอก', path: '/warehouse/returns', icon: Undo2 },
      { name: 'รับคืนจากแผนกต่าง ๆ', path: '/warehouse/returns-department', icon: PackageCheck },
    ],
  },
  {
    title: 'รายงาน',
    items: [
      { name: 'ประวัติการเคลื่อนไหว', path: '/warehouse/stock-movement', icon: History },
      { name: 'รายงาน', path: '/warehouse/reports', icon: FileBarChart },
      { name: 'ตั้งค่าระบบ', path: '/warehouse/settings', icon: Settings },
    ],
  },
];

function pathIsActive(pathname: string, path: string) {
  if (path === '/warehouse') return pathname === '/warehouse';
  return pathname === path || pathname.startsWith(path + '/');
}

function navItemIsActive(pathname: string, item: NavItem) {
  if (item.activePathPrefixes?.length) {
    return item.activePathPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }
  return pathIsActive(pathname, item.path);
}

function isExternalNavHref(path: string) {
  return path.startsWith('http://') || path.startsWith('https://');
}

function NavContent({
  collapsed,
  onLinkClick,
  toggleSidebar,
  onClose,
}: {
  collapsed: boolean;
  onLinkClick?: () => void;
  toggleSidebar: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full select-none bg-white">

      {/* Hamburger — same px-2 container + px-3 button as nav rows so icon aligns */}
      <div className="border-b border-slate-100 px-2 py-2">
        <button
          type="button"
          onClick={onClose ?? toggleSidebar}
          className="ml-1 p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95"
          title={onClose ? 'ปิดเมนู' : collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
        >
          {onClose ? <X className="w-5 h-5 shrink-0" /> : <Menu className="w-5 h-5 shrink-0" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {menuGroups.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-3' : ''}>
            <div className={`mb-1 transition-all duration-200 ${collapsed ? 'px-2 py-1' : 'px-5'}`}>
              {collapsed ? (
                <div className="ml-3 w-6 h-px bg-black/10" />
              ) : (
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                  {group.title}
                </span>
              )}
            </div>

            <div className="px-2 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = navItemIsActive(pathname, item);
                const className = `
                      flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100/80 hover:bg-blue-100/80'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }
                    `;

                if (isExternalNavHref(item.path)) {
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={onLinkClick}
                      title={collapsed ? item.name : ''}
                      className={className}
                    >
                      <Icon className="w-[22px] h-[22px] shrink-0" />
                      {!collapsed && (
                        <span className={`text-[17px] whitespace-nowrap ${
                          isActive ? 'font-semibold' : 'font-medium'
                        }`}>
                          {item.name}
                        </span>
                      )}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={onLinkClick}
                    title={collapsed ? item.name : ''}
                    className={className}
                  >
                    <Icon className="w-[22px] h-[22px] shrink-0" />
                    {!collapsed && (
                      <span className={`text-[17px] whitespace-nowrap ${
                        isActive ? 'font-semibold' : 'font-medium'
                      }`}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function WarehouseSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => setIsCollapsed((c) => !c);
  const onMobileClose = () => setIsMobileOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed z-[35] left-4 top-[104px] p-2 rounded-lg text-slate-500 bg-white border border-slate-200 shadow-md hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95"
        aria-label="เปิดเมนู"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
        aria-hidden={!isMobileOpen}
      />

      <aside
        className={`
          hidden lg:flex flex-col shrink-0 h-full overflow-hidden
          bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
        `}
      >
        <NavContent collapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      </aside>

      <aside
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col
          bg-white transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <NavContent
          collapsed={false}
          toggleSidebar={toggleSidebar}
          onClose={onMobileClose}
          onLinkClick={onMobileClose}
        />
      </aside>
    </>
  );
}
