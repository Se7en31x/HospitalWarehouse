import { api, PaginatedResponse } from "@/lib/apiClient";
import type * as Returns from "@/types/returns_type";

// ============ Mapping Functions ============
const mapApiBorrowToUiReturn = (borrow: any): Returns.UiReturn => {
    const dueDate = new Date(borrow.due_date);
    const today = new Date();
    
    // ตรวจสอบสถานะและคำนวณวันเกินกำหนด
    const daysOverdue =
        borrow.status === "รอการคืน" && today > dueDate
            ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

    return {
        id: borrow.id,
        itemCode: borrow.item?.code || "-",
        itemName: borrow.item?.name || "-",
        category: borrow.item?.categories?.name || "-",
        unit: borrow.item?.unit?.name || "ชิ้น",
        quantity: borrow.quantity || 0,
        returnedQuantity: borrow.returned_qty || 0,
        borrowedBy: borrow.borrowed_by,
        borrowDate: borrow.borrow_date,
        dueDate: borrow.due_date,
        returnDate: borrow.return_date ?? undefined, 
        status: (borrow.status as Returns.ReturnStatus) || "รอการคืน",
        notes: borrow.notes ?? undefined,
        daysOverdue,
    };
};

/** * Helper: ดึงข้อมูลการเบิกทั้งหมดและคัดกรองเฉพาะประเภท BORROW 
 * เนื่องจาก API ปัจจุบันใช้ endpoint ประวัติรวม
 */
async function fetchAndProcessBorrows(): Promise<any[]> {
    const res = await api.get<any[]>("/v1/requisition/history");
    const history = res || [];
    
    // กรองเฉพาะใบเบิกที่เป็น BORROW และแตกรายการ item ออกมา
    return history
        .filter((req: any) => req.type === "BORROW")
        .flatMap((req: any) =>
            (req.requisition_item || []).map((item: any) => ({
                id: `${req.id}-${item.id}`,
                item_id: item.item?.id,
                quantity: item.req_qty,
                returned_qty: item.returned_qty || 0,
                borrowed_by: req.requester_name || req.requester_id,
                borrow_date: req.request_date,
                // สมมติกำหนดคืน 30 วันถ้าไม่มีระบุมา
                due_date: new Date(new Date(req.request_date).getTime() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                return_date: item.return_date,
                status: req.status === "APPROVED" ? "รอการคืน" : "ค้างคืน",
                item: item.item,
                notes: req.notes,
            }))
        );
}

// ============ API Functions ============

export async function getBorrowedItems(
    page: number = 1,
    limit: number = 10
): Promise<Returns.PagedResponse<Returns.UiReturn>> {
    try {
        const borrowedItems = await fetchAndProcessBorrows();
        const paginated = borrowedItems.slice((page - 1) * limit, page * limit);

        return {
            data: paginated.map(mapApiBorrowToUiReturn),
            total: borrowedItems.length,
            page,
            limit,
        };
    } catch (error) {
        console.error("Failed to fetch borrowed items:", error);
        return { data: [], total: 0, page: 1, limit: 10 };
    }
}

export async function getBorrowedItemById(id: string): Promise<Returns.UiReturn | null> {
    try {
        const borrowedItems = await fetchAndProcessBorrows();
        const found = borrowedItems.find((item: any) => item.id === id);
        return found ? mapApiBorrowToUiReturn(found) : null;
    } catch (error) {
        console.error("Failed to fetch borrowed item:", error);
        return null;
    }
}

export async function getReturnStats(): Promise<Returns.ReturnStats> {
    try {
        const borrowedItems = await fetchAndProcessBorrows();
        const today = new Date();
        
        const pending = borrowedItems.filter((item: any) => item.status === "รอการคืน").length;
        const overdue = borrowedItems.filter(
            (item: any) => item.status === "รอการคืน" && new Date(item.due_date) < today
        ).length;
        const totalQuantity = borrowedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

        return {
            totalBorrowed: borrowedItems.length,
            returned: 0, // ควรดึงจาก API จริงถ้ามีฟิลด์นี้
            pending,
            overdue,
            totalQuantity,
        };
    } catch (error) {
        console.error("Failed to fetch return stats:", error);
        return { totalBorrowed: 0, returned: 0, pending: 0, overdue: 0, totalQuantity: 0 };
    }
}

export async function recordReturn(
    id: string,
    returnDate: string,
    quantity: number,
    notes?: string
): Promise<void> {
    // แยก requisition_id จาก composite id (เช่น "12-34")
    const [headerId] = id.split("-");
    
    await api.put(`/v1/borrows/return/${headerId}`, {
        items: [{
            req_item_id: id.split("-")[1],
            qty_returned: quantity,
            condition: "GOOD", // Default condition
            note: notes
        }]
    });
}