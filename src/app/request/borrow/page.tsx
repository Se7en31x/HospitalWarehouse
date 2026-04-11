import React from 'react';
import BorrowClient from './BorrowClient';
import { getInventoryItems } from '@/services/itemsService';

export const metadata = {
  title: "ระบบยืม-คืน ครุภัณฑ์ (Borrow System)",
};

export default async function BorrowPage() {
  let items = [];
  
  try {
    // พยายามดึงข้อมูลที่ Server (จะสำเร็จถ้า Token ใน Cookie พร้อม)
    items = await getInventoryItems({ allowed_borrow: true, type: "REUSABLE" });
  } catch (error) {
    // ถ้าติด 401 (Unauthorized) ให้ส่งอาเรย์ว่างไปก่อน หน้าเว็บจะไม่แดง
    console.warn("⚠️ BorrowPage: Server-side fetch failed, fallback to client-side.");
    items = [];
  }
  
  // ส่ง items (ที่มีค่าหรือเป็น []) ไปให้ Client Component จัดการต่อ
  return <BorrowClient initialItems={items} />;
}