import React from 'react';
import WithdrawClient from './WithdrawClient';
// Import Service ที่เราเคยทำไว้
import { getInventoryItems } from '@/services/itemsService';

export const metadata = {
  title: "ระบบเบิกพัสดุ (Withdrawal System)",
};

export default async function WithdrawPage() {
  let items = [];
  try {
    // 1. ลองดึงข้อมูล ถ้าพัง (เพราะไม่มี Token) มันจะเข้า catch
    items = await getInventoryItems({ allowed_req: true }); 
  } catch (error) {
    console.warn("⚠️ Server Fetch failed, switching to client-side fetch.");
    items = []; // ส่ง Array ว่างไปก่อน เดี๋ยว WithdrawClient จะไปดึงเองที่หน้าบ้าน
  }

  return (
    <main>
        <WithdrawClient initialItems={items} />
    </main>
  );
}