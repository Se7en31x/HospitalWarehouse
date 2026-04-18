import React from "react";
import ReturnItemDetailClient from "./ReturnItemDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ReturnItemDetailPage({ params }: PageProps) {
  const resolvedParams = await params;

  if (!resolvedParams?.id) {
    return (
      <main className="p-8 text-center text-red-600">
        <h1 className="text-2xl font-bold">ไม่พบรหัสเอกสาร</h1>
        <p>URL ไม่ถูกต้อง หรือไม่ได้ระบุรหัสเอกสาร</p>
      </main>
    );
  }

  return (
    <main>
      <ReturnItemDetailClient returnId={resolvedParams.id} />
    </main>
  );
}
