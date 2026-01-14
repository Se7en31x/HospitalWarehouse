// services/itemLotService.ts

// ดึงค่าจาก ENV (ใช้ชื่อเดียวกับที่เราแก้ในรอบที่แล้วเพื่อให้ทำงานได้แน่นอน)
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const AUTH_TOKEN = process.env.JWT_SECRET || process.env.JWT_JWT_SECRET; 

// --- Interfaces ---
export interface LotItem {
  id: string;          
  item_id: number;     
  item_code: string;   
  item_name: string;   
  image_url: string;   
  category_name: string; 
  unit_name: string;   
  quantity: number;    
  expiry_date: string; 
  cost_price: number;  
  status: "active" | "near-expiry" | "expired" | "damaged" | "out_of_stock"; 
  created_at?: string;
}

export interface AdjustLotPayload {
  quantity: number;
  type: "adjust" | "damage" | "expire";
  reason: string;
}

export interface DeleteLotPayload {
  user_id?: number | string;
  username?: string;
}

// --- Helper สำหรับ Headers ---
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
});

// --- 1. ดึงข้อมูล Lot ทั้งหมด (Real API) ---
export async function getAllLots(): Promise<LotItem[]> {
  try {
    const res = await fetch(`${API_URL}/lot`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store' 
    });

    if (!res.ok) throw new Error(`Error fetching lots: ${res.statusText}`);
    
    // ใช้ Type Casting แทน any เพื่อไม่ให้โค้ดแดง
    const response = await res.json() as { data: LotItem[] };
    return response.data || []; 

  } catch (error) {
    console.error("🔥 Get Lots Error:", error);
    return []; 
  }
}

// --- 2. ดึงข้อมูล Lot ตาม ID ---
export async function getLotById(id: string): Promise<LotItem | null> {
  try {
    const res = await fetch(`${API_URL}/lot/${id}`, { 
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store' 
    });
    
    if (!res.ok) throw new Error("Lot not found");
    
    const response = await res.json() as { data: LotItem };
    return response.data;
  } catch (error) {
    console.error("🔥 Get Lot By ID Error:", error);
    return null;
  }
}

// --- 3. ฟังก์ชันปรับยอด ---
export async function adjustLotStock(id: string, payload: AdjustLotPayload) {
  try {
    const res = await fetch(`${API_URL}/lot/adjust/${id}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorData = await res.json() as { message?: string };
        throw new Error(errorData.message || "Failed to adjust stock");
    }

    return await res.json(); 
  } catch (error) {
    console.error("🔥 Adjust Lot Error:", error);
    throw error;
  }
}

// --- 4. ลบ Lot ---
export async function deleteLot(id: string, userPayload?: DeleteLotPayload) {
  try {
    const res = await fetch(`${API_URL}/lot/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify(userPayload || {}) 
    });

    if (!res.ok) {
        const errorData = await res.json() as { message?: string };
        throw new Error(errorData.message || "Failed to delete lot");
    }

    return await res.json();
  } catch (error) {
    console.error("🔥 Delete Lot Error:", error);
    throw error;
  }
}