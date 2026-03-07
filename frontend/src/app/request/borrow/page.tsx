import React from 'react';
import BorrowClient from './BorrowClient';
import { getInventoryItems } from '@/services/itemsService';

export const metadata = {
  title: "ระบบยืม-คืน ครุภัณฑ์ (Borrow System)",
};

export default async function BorrowPage() {
  const items = await getInventoryItems();
  return <BorrowClient initialItems={items} />;
}