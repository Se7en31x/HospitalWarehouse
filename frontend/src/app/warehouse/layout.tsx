'use client';

import WarehouseNavbar from "@/components/layouts/WarehouseNavbar";
import WarehouseSidebar from "@/components/layouts/WarehouseSidebar";
// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Cookies from 'js-cookie';
// import { jwtDecode } from 'jwt-decode';


export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      
      <WarehouseNavbar />
      
      <div className="flex flex-1 overflow-hidden w-full">
        <WarehouseSidebar />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

    </div>
  );
}


// interface DecodedToken {
//   role: string;
// }

// export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
//   const router = useRouter();
//   const [isAllowed, setIsAllowed] = useState(false);

//   useEffect(() => {
//     const token = Cookies.get('user_token');
    
//     if (!token) {
//       router.push('/auth');
//       return;
//     }

//     try {
//       // ระบุ Type ให้กับ jwtDecode
//       const decoded = jwtDecode<DecodedToken>(token);
//       const allowedRoles = ['admin', 'warehouse_manager', 'warehouse_staff'];
      
//       if (allowedRoles.includes(decoded.role)) {
//         setIsAllowed(true);
//       } else {
//         router.push('/unauthorized'); // Role ไม่ตรง ดีดออก
//       }
//     } catch (e) {
//       router.push('/auth');
//     }
//   }, [router]);

//   // ถ้ายังเช็คไม่เสร็จ จะไม่เรนเดอร์ children (ป้องกันข้อมูลหลุดแวบๆ)
//   if (!isAllowed) return <div className="p-10 text-center">Checking Permission...</div>;

//   return <>{children}</>;
// }