import React from 'react';
import WithdrawClient from './WithdrawClient';
// Import Service ที่เราเคยทำไว้
import { getInventoryItems } from '@/services/itemsService';

export const metadata = {
  title: "ระบบเบิกพัสดุ (Withdrawal System)",
};

export default async function WithdrawPage() {
  // 1. ดึงข้อมูลสินค้าทั้งหมดจาก Server Side
  const items = await getInventoryItems();

  return (
    <main>
        {/* 2. ส่งข้อมูลไปให้ Client Component */}
        <WithdrawClient initialItems={items} />
    </main>
  );
}