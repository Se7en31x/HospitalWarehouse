export const dynamic = "force-dynamic";

import React from 'react';
import WithdrawClient from './WithdrawClient';
import { getInventoryItems } from '@/services/itemsService';
import { createClient } from '@/lib/supabase/server';
import { UiItem } from '@/types/items_type';

export const metadata = {
  title: "ระบบเบิกพัสดุ (Withdrawal System)",
};

export default async function WithdrawPage() {
  let items: UiItem[] = [];
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    items = await getInventoryItems({ allowed_req: true }, token);
  } catch (error) {
    console.error("[WithdrawPage] SSR fetch failed — client will re-fetch on mount:", error instanceof Error ? error.message : error);
    items = [];
  }

  return (
    <main>
      <WithdrawClient initialItems={items} />
    </main>
  );
}