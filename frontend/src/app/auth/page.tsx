'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  id: string;
  role: string;
  departments: Array<{ code: string; name: string }>;
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // 1. เพิ่ม Security Options ตอนเซ็ตคุกกี้
      // sameSite: 'strict' ป้องกันเว็บอื่นแอบสั่งให้เบราว์เซอร์ส่งคุกกี้ของเราไป
      const cookieOptions = { 
        expires: 1, 
        secure: process.env.NODE_ENV === 'production', // ใช้ HTTPS เท่านั้นถ้าอยู่บน Production
        sameSite: 'strict' as const 
      };

      Cookies.set('user_token', token, cookieOptions);

      try {
        const decoded = jwtDecode<DecodedToken>(token);
        const role = decoded.role;

        // 2. เก็บข้อมูลแผนก
        if (decoded.departments?.length > 0) {
          Cookies.set('user_dept_code', decoded.departments[0].code, cookieOptions);
        }

        // --- แยกเส้นทางตาม Role ---
        const warehouseRoles = ['admin', 'warehouse_manager', 'warehouse_staff'];
        const requesterRoles = ['doctor', 'nurse', 'pharmacist', 'nurse_assistant'];
        const procurementRoles = ['purchasing_staff'];

        if (warehouseRoles.includes(role)) {
          router.push('/warehouse');
        } 
        else if (requesterRoles.includes(role)) {

          router.push('/requests/withdraw'); 
        } 
        else if (procurementRoles.includes(role)) {
          router.push('/procurement');
        } 
        else {
          router.push('/unauthorized'); 
        }

      } catch (error) {
        console.error("Token Decode Error:", error);
        router.push('/login-error');
      }
    } else {
       
       router.push('/unauthorized');
    }
  }, [searchParams, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">กำลังตรวจสอบสิทธิ์การเข้าถึงระบบ...</p>
      </div>
    </div>
  );
}