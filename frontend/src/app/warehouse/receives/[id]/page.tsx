import React from "react";
import ReceiveDetailClient from "./ReceiveDetailClient";

interface ReceiveDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ReceiveDetailPage({ params }: ReceiveDetailPageProps) {
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
      <ReceiveDetailClient receiveId={resolvedParams.id} />
    </main>
  );
}
