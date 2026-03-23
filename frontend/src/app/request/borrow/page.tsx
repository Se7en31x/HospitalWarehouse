import React from 'react';
import BorrowClient from './BorrowClient';
import { getInventoryItems } from '@/services/itemsService';

export const metadata = {
  title: "ระบบยืม-คืน ครุภัณฑ์ (Borrow System)",
};

export default async function BorrowPage() {
  // ดึงเฉพาะของที่อนุญาตให้ยืม
  const items = await getInventoryItems({ allowed_borrow: true });
  
  return <BorrowClient initialItems={items} />;
}