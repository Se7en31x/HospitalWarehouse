import Cookies from "js-cookie";
import * as Lot from "../interfaces/lot.interface";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Cookies.get('user_token')}`
});

// --- Helper: Mapper (ปรับให้ตรงกับ JSON จริง) ---
const mapApiToUi = (data: any): Lot.UiLot => {
    return {
        id: data.lot_code,
        itemId: data.item_id,
        // เจาะเข้าไปเอา String ออกมา (ตาม JSON ที่ส่งมา items เป็น Object)
        itemCode: data.items?.code || "-",
        itemName: data.items?.name || "Unknown Item",
        category: data.items?.category?.name || "-", // items -> category -> name
        warehouseId: data.warehouse_id,
        warehouse: data.warehouse?.name || "-",      // warehouse -> name
        supplierId: data.supplier_id,
        supplierName: data.supplier?.name || "-",    // supplier เป็น null ได้ ต้องระวัง
        quantity: data.quantity,
        unit: data.items?.unit?.name || "หน่วย",     // items -> unit -> name
        cost: Number(data.cost_price),               // แปลง String "0" เป็น Number
        expiryDate: data.expried_at,
        status: data.status
    };
};

export async function getLots(): Promise<Lot.UiLot[]> {
    try {
        const res = await fetch(`${API_URL}/lot`, {
            method: 'GET',
            headers: getHeaders(),
            cache: 'no-store'
        });

        if (!res.ok) throw new Error("Failed to fetch lots");

        const responseBody = await res.json();
        // console.log("📦 Response:", responseBody);
        let listData: any[] = [];

        // ✅ แก้ไข: เจาะจงไปที่ data.data ตาม JSON ที่ส่งมา
        if (responseBody?.data?.data && Array.isArray(responseBody.data.data)) {
            listData = responseBody.data.data;
        } 
        // เผื่อ Backend เปลี่ยนโครงสร้างในอนาคต (Defensive check)
        else if (Array.isArray(responseBody?.data)) {
            listData = responseBody.data;
        }

        return listData.map(mapApiToUi);

    } catch (error) {
        console.error("🔥 Get Lots Error:", error);
        return [];
    }
}

// 2. Get Single Lot (เผื่อใช้ตอน Edit)
export async function getLotById(id: string): Promise<Lot.UiLot | null> {
    try {
        const res = await fetch(`${API_URL}/lot/${id}`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (!res.ok) return null;
        
        const { data } = await res.json();
        return mapApiToUi(data);
    } catch (error) {
        console.error("🔥 Get Lot By ID Error:", error);
        return null;
    }
}

// 3. Create Lot (รับของเข้า)
export async function createLot(payload: Lot.CreateLotDto): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_URL}/lot`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create");
        
        return { success: true };
    } catch (error: any) {
        console.error("🔥 Create Lot Error:", error);
        return { success: false, message: error.message };
    }
}

// 4. Adjust Lot 
export async function adjustLot(id: string, payload: Lot.AdjustLotDto): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_URL}/lot/adjust/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to adjust");

        return { success: true };
    } catch (error: any) {
        console.error("🔥 Adjust Lot Error:", error);
        return { success: false, message: error.message };
    }
}

// 5. Delete Lot
export async function deleteLot(id: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/lot/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        if (!res.ok) throw new Error("Failed to delete");
        return true;
    } catch (error) {
        console.error("🔥 Delete Lot Error:", error);
        return false;
    }
}

// ==========================================
// Master Data Services (สำหรับ Dropdown)
// ==========================================

// ดึงรายการสินค้าทั้งหมด
export async function getMasterItems(): Promise<Lot.MasterItem[]> {
    try {
        // สมมติ Route: /item
        const res = await fetch(`${API_URL}/item`, { headers: getHeaders() });
        if (!res.ok) return [];
        const { data } = await res.json();
        return data || [];
    } catch (error) {
        return [];
    }
}

// ดึงรายการคลังสินค้า
export async function getMasterWarehouses(): Promise<Lot.MasterWarehouse[]> {
    try {
        // สมมติ Route: /warehouse
        const res = await fetch(`${API_URL}/warehouse`, { headers: getHeaders() });
        if (!res.ok) return [];
        const { data } = await res.json();
        return data || [];
    } catch (error) {
        return [];
    }
}

// ดึงรายการ Supplier
export async function getMasterSuppliers(): Promise<Lot.MasterSupplier[]> {
    try {
        // สมมติ Route: /supplier
        const res = await fetch(`${API_URL}/supplier`, { headers: getHeaders() });
        if (!res.ok) return [];
        const { data } = await res.json();
        return data || [];
    } catch (error) {
        return [];
    }
}