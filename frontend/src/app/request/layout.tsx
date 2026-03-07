// 'use client';
// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Cookies from 'js-cookie';
// import { jwtDecode } from 'jwt-decode';

// // นิยามโครงสร้าง Token เพื่อไม่ให้ใช้ any
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
//       const allowedRoles = ['doctor', 'nurse', 'pharmacist', 'nurse_assistant'];
      
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

import RequestNavbar from '@/components/layouts/RequestNavbar';
import RequestSidebar from '@/components/layouts/RequestSidebar';

export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      <RequestSidebar />
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <RequestNavbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}