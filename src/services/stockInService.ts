import { api, PaginatedResponse } from "@/lib/apiClient";
import type * as StockIn from "@/types/stockin_type";

// Export types สำหรับการเรียกใช้งานภายนอก
export type StockInRecord = StockIn.StockInRecord;
export type StockInItem = StockIn.StockInItem;
export type CreatePayload = StockIn.CreatePayload;
export type DraftPayload = StockIn.DraftPayload;
export type Option = StockIn.Option;

// ============ API Functions ============

/**
 * สร้างรายการนำเข้าพัสดุแบบเดี่ยว (Legacy Support)
 */
export async function createStockIn(payload: CreatePayload): Promise<StockInRecord> {
    const newPayload: Record<string, any> = {
        item_id: payload.item_id,
        warehouse_id: payload.warehouse_id,
        quantity: payload.quantity_received || payload.quantity,
        cost_price: payload.cost_price,
        supplier_id: payload.supplier_id,
        expried_at: payload.expried_at,
    };

    return api.post<StockInRecord>("/v1/lots", newPayload);
}

/**
 * บันทึกรายการพัสดุเข้าคลัง (Lots) แบบหลายรายการ
 */
export async function saveLots(items: StockIn.StockInItem[]): Promise<any> {
    const lotsPayload = items.map((item) => ({
        item_id: item.itemId,
        warehouse_id: item.warehouseId,
        quantity: item.quantityReceived,
        cost_price: item.costPrice,
        supplier_id: item.supplierId,
        expried_at: item.expiryDate,
        po_number: item.poNumber,
        lot_code: item.lotCode,
        mfg_date: item.mfgDate,
    }));

    // ถ้ามีรายการเดียวใช้ endpoint ปกติ ถ้าหลายรายการวนลูปบันทึก (หรือใช้ batch endpoint ถ้าหลังบ้านรองรับ)
    if (lotsPayload.length === 1) {
        return api.post("/v1/lots/stock-in", lotsPayload[0]);
    } else {
        const results = await Promise.all(
            lotsPayload.map(payload => api.post("/v1/lots/stock-in", payload))
        );
        return results;
    }
}

/**
 * บันทึกร่างรายการนำเข้า (Status: PENDING)
 */
export async function saveDraftLots(items: StockIn.StockInItem[]): Promise<any> {
    const draftsPayload = items.map((item) => ({
        item_id: item.itemId,
        warehouse_id: item.warehouseId,
        expected_qty: item.quantityOrdered,
        qty: 0,
        status: "PENDING",
        cost_price: item.costPrice,
        supplier_id: item.supplierId,
        po_number: item.poNumber,
    }));

    if (draftsPayload.length === 1) {
        return api.post("/v1/lots/stock-in/draft", draftsPayload[0]);
    } else {
        return Promise.all(
            draftsPayload.map(payload => api.post("/v1/lots/stock-in/draft", payload))
        );
    }
}

/**
 * ดึงรายการผู้จัดจำหน่าย
 */
export async function getSuppliers(): Promise<Option[]> {
    try {
        const data = await api.get<Option[]>("/v1/suppliers/option");
        return data || [];
    } catch {
        // Fallback กรณี endpoint option ไม่ว่าง
        try {
            return await api.get<Option[]>("/v1/suppliers") || [];
        } catch {
            return [];
        }
    }
}

/**
 * ดึงรายละเอียดพัสดุ
 */
export async function getItemDetail(itemId: string): Promise<any | null> {
    return api.get(`/v1/items/${itemId}`).catch(() => null);
}

/**
 * ดึงรายละเอียด Lot
 */
export async function getLotDetail(lotId: string): Promise<any | null> {
    return api.get(`/v1/lots/${lotId}`).catch(() => null);
}

/**
 * อัปเดตจำนวนพัสดุใน Lot
 */
export async function updateLotQuantity(lotId: string, quantityReceived: number): Promise<any> {
    return api.patch(`/v1/lots/${lotId}`, {
        quantity_received: quantityReceived,
    });
}

/**
 * ดึงรายการประวัตินำเข้าทั้งหมด (แปลงข้อมูลจาก Lot)
 */
export async function getAllStockIn(): Promise<any[]> {
    try {
        const data = await api.get<any[]>("/v1/lots", { limit: 100 });
        
        if (!Array.isArray(data)) return [];

        return data.map((lot: any) => ({
            id: lot.id || "",
            date: lot.created_at ? new Date(lot.created_at).toISOString().split("T")[0] : "-",
            docNo: lot.lot_code || `SR-${lot.id?.substring(0, 8).toUpperCase()}`,
            supplier: lot.supplier?.name || lot.supplier_name || "ไม่ระบุ",
            supplierId: lot.supplier_id || lot.supplier?.id || "",
            totalAmount: (lot.cost_price || 0) * (lot.quantity || lot.quantity_received || 0),
            status: lot.status || "PENDING",
        }));
    } catch (error) {
        console.warn("Error fetching stock in history:", error);
        return [];
    }
}

/**
 * สร้างเอกสารรับสินค้า (PO Based)
 */
export async function createReceive(payload: any): Promise<any> {
    return api.post("/v1/receives", payload);
}

/**
 * รับสินค้าแบบด่วน (Quick Receive)
 */
export async function quickReceive(payload: any): Promise<any> {
    return api.post("/v1/receives", payload);
}

/**
 * ยืนยันการรับสินค้าจากสถานะร่าง (Confirm Draft)
 */
export async function confirmReceive(
    receiveHeaderId: string,
    receiveDate: string,
    items: Array<{
        item_id: string;
        qty: number;
        lot_code: string;
        expired_at: string;
    }>
): Promise<any> {
    const payload = {
        receive_date: receiveDate,
        items: items,
    };
    return api.patch(`/v1/receives/${receiveHeaderId}/confirm`, payload);
}