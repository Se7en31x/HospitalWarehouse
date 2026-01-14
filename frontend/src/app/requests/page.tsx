'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestsPage() {
  const router = useRouter();

  useEffect(() => {
    // ส่ง User ตรงไปที่หน้าที่คุณทำไว้ในโฟลเดอร์ withdraw ทันที
    router.replace('/requests/withdraw'); 
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-gray-500 animate-pulse">กำลังเข้าสู่หน้าเบิกพัสดุ...</p>
    </div>
  );
}