// src/services/stockInService.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const AUTH_TOKEN = process.env.JWT_SECRET || process.env.JWT_JWT_SECRET;

// --- Interfaces ---
export interface StockInRecord {
  id: string;
  date: string;
  supplier: string;
  docNo: string;
  totalAmount: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
}

// --- Helper สำหรับ Headers ---
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
});

/**
 * ฟังก์ชันดึงข้อมูลประวัติการรับเข้าทั้งหมด (Real API)
 */
export const getAllStockInHistory = async (): Promise<StockInRecord[]> => {
  try {
    const res = await fetch(`${API_URL}/stock-in`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error(`❌ API Error: ${res.status}`);
      return [];
    }

    // ใช้ Type Casting ระบุโครงสร้างที่ Backend ส่งมา (สมมติว่าเป็น { data: [...] })
    const response = await res.json() as { data: StockInRecord[] };
    
    // คืนค่า data หรือถ้าไม่มีให้เป็น Array ว่าง
    return response.data || [];

  } catch (error: unknown) {
    console.error("🔥 StockIn Service Error:", error);
    return []; // พังก็ส่ง Array ว่างกลับไป หน้าบ้านจะได้ไม่ Crash
  }
};