import Cookies from "js-cookie";
import type * as Returns from "@/types/returns_type";
import type * as Item from "@/types/items_type";
import { apiClient } from "@/lib/apiClient";

// ============ Mapping Functions ============
const mapApiBorrowToUiReturn = (borrow: Returns.ApiBorrow): Returns.UiReturn => {
	const dueDate = new Date(borrow.due_date);
	const today = new Date();
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
		returnDate: borrow.return_date,
		status: (borrow.status as Returns.ReturnStatus) || "รอการคืน",
		notes: borrow.notes,
		daysOverdue,
	};
};

// ============ API Functions ============

/**
 * Get borrowed items that need to be returned
 */
export async function getBorrowedItems(
	page: number = 1,
	limit: number = 100
): Promise<Returns.PagedResponse<Returns.UiReturn>> {
	try {
		const response = await apiClient.get("/api/requisition/history");

		if (response.data.success && response.data.data) {
			// Filter for BORROW type only
			const borrowRequisitions = response.data.data.filter((req: any) => req.type === "BORROW");

			// Flatten items from requisitions
			const borrowedItems = borrowRequisitions.flatMap((req: any) =>
				(req.requisition_item || []).map((item: any) => ({
					id: `${req.id}-${item.id}`,
					item_id: item.item?.id,
					quantity: item.req_qty,
					borrowed_by: req.requester_id,
					borrow_date: req.request_date,
					due_date: new Date(new Date(req.request_date).getTime() + 30 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0], // Default 30 days
					status: req.status === "APPROVED" ? "รอการคืน" : "ค้างคืน",
					item: item.item,
					notes: req.notes,
				}))
			);

			// Apply pagination
			const paginated = borrowedItems.slice((page - 1) * limit, page * limit);

			return {
				data: (paginated || []).map((item: any) => mapApiBorrowToUiReturn(item)),
				total: borrowedItems.length,
				page,
				limit,
			};
		}

		return {
			data: [],
			total: 0,
			page: 1,
			limit: 100,
		};
	} catch (error) {
		console.error("Failed to fetch borrowed items:", error);
		return {
			data: [],
			total: 0,
			page: 1,
			limit: 100,
		};
	}
}

/**
 * Get a single borrowed item by ID
 */
export async function getBorrowedItemById(id: string): Promise<Returns.UiReturn | null> {
	try {
		const response = await apiClient.get("/api/requisition/history");

		if (response.data.success && response.data.data) {
			const borrowRequisitions = response.data.data.filter((req: any) => req.type === "BORROW");
			const borrowedItems = borrowRequisitions.flatMap((req: any) =>
				(req.requisition_item || []).map((item: any) => ({
					id: `${req.id}-${item.id}`,
					item_id: item.item?.id,
					quantity: item.req_qty,
					borrowed_by: req.requester_id,
					borrow_date: req.request_date,
					due_date: new Date(new Date(req.request_date).getTime() + 30 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0],
					status: req.status === "APPROVED" ? "รอการคืน" : "ค้างคืน",
					item: item.item,
					notes: req.notes,
				}))
			);

			const found = borrowedItems.find((item: any) => item.id === id);
			return found ? mapApiBorrowToUiReturn(found) : null;
		}

		return null;
	} catch (error) {
		console.error("Failed to fetch borrowed item:", error);
		return null;
	}
}

/**
 * Record a return
 */
export async function recordReturn(
	id: string,
	returnDate: string,
	quantity: number,
	notes?: string
): Promise<void> {
	try {
		// This would typically call your backend API to record the return
		// For now, it's a placeholder
		console.log("Recording return:", { id, returnDate, quantity, notes });
	} catch (error) {
		console.error("Failed to record return:", error);
		throw error;
	}
}

/**
 * Get return statistics
 */
export async function getReturnStats(): Promise<Returns.ReturnStats> {
	try {
		const response = await apiClient.get("/api/requisition/history");

		if (response.data.success && response.data.data) {
			const borrowRequisitions = response.data.data.filter((req: any) => req.type === "BORROW");
			const borrowedItems = borrowRequisitions.flatMap((req: any) =>
				(req.requisition_item || []).map((item: any) => ({
					status: req.status === "APPROVED" ? "รอการคืน" : "ค้างคืน",
					quantity: item.req_qty,
					due_date: new Date(new Date(req.request_date).getTime() + 30 * 24 * 60 * 60 * 1000),
				}))
			);

			const today = new Date();
			const pending = borrowedItems.filter((item: any) => item.status === "รอการคืน").length;
			const overdue = borrowedItems.filter(
				(item: any) =>
					item.status === "รอการคืน" &&
					new Date(item.due_date) < today
			).length;
			const totalQuantity = borrowedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

			return {
				totalBorrowed: borrowedItems.length,
				returned: 0,
				pending,
				overdue,
				totalQuantity,
			};
		}

		return {
			totalBorrowed: 0,
			returned: 0,
			pending: 0,
			overdue: 0,
			totalQuantity: 0,
		};
	} catch (error) {
		console.error("Failed to fetch return stats:", error);
		return {
			totalBorrowed: 0,
			returned: 0,
			pending: 0,
			overdue: 0,
			totalQuantity: 0,
		};
	}
}
