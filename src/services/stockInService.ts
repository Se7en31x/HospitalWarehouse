import Cookies from "js-cookie";
import type * as StockIn from "@/types/stockin_type";

// Export types for external use
export type StockInRecord = StockIn.StockInRecord;
export type StockInItem = StockIn.StockInItem;
export type CreatePayload = StockIn.CreatePayload;
export type DraftPayload = StockIn.DraftPayload;
export type Option = StockIn.Option;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => ({
	"Content-Type": "application/json",
	Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function parseJson<T>(res: Response): Promise<T> {
	const contentType = res.headers.get("content-type") || "";
	if (!contentType.includes("application/json")) {
		const raw = await res.text();
		console.warn(`Response content-type is not JSON (${contentType}), status: ${res.status}`);
		console.warn("Response body:", raw.substring(0, 500)); // Log first 500 chars of response
		if (res.status === 404) {
			console.warn("Endpoint not found (404)");
		}
		throw new Error(`Expected JSON but got ${contentType || "unknown type"}. Status: ${res.status}. Response: ${raw.substring(0, 200)}`);
	}
	try {
		return (await res.json()) as T;
	} catch (error) {
		console.warn("Failed to parse JSON response:", error);
		throw new Error("Invalid JSON response from server");
	}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");

	const fullUrl = `${API_URL}${path}`;
	const method = options?.method || "GET";
	
	try {
		console.log(`[API] ${method} ${fullUrl}`);
		
		const res = await fetch(fullUrl, {
			...options,
			headers: {
				...getHeaders(),
				...(options?.headers || {}),
			},
			cache: "no-store",
		});

		let body;
		try {
			body = await parseJson<{ data: T; message?: string; error?: string }>(res);
		} catch (parseError) {
			console.error(`[API] Failed to parse response for ${method} ${fullUrl}. Status: ${res.status}`);
			// Return empty array for GET requests on parse errors
			if (options?.method !== "POST" && options?.method !== "PUT" && options?.method !== "DELETE") {
				return [] as unknown as T;
			}
			throw parseError;
		}

		if (!res.ok) {
			const errorMessage = body?.error || body?.message || `HTTP ${res.status}`;
			console.warn(`[API] Error response from ${method} ${fullUrl}:`, errorMessage);
			// Return empty array for GET requests on HTTP errors
			if (options?.method !== "POST" && options?.method !== "PUT" && options?.method !== "DELETE") {
				return [] as unknown as T;
			}
			throw new Error(errorMessage);
		}

		if (!body || body.data === undefined) {
			console.warn("[API] Empty data returned from:", path);
			return [] as unknown as T; // Return empty array for list endpoints
		}

		return body.data;
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error(`[API] Request failed for ${method} ${fullUrl}:`, errorMsg);
		// Re-throw for POST/PUT/DELETE, but return empty for GET
		if (options?.method !== "POST" && options?.method !== "PUT" && options?.method !== "DELETE") {
			return [] as unknown as T;
		}
		throw error;
	}
}


// ============ API Functions ============

/**
 * Create a new stock in record
 * @param payload - Stock in creation payload
 * @returns Created stock in record
 */
export async function createStockIn(
	payload: CreatePayload
): Promise<StockInRecord> {
	// Build payload directly without Prisma-style transformation
	const newPayload: Record<string, any> = {};

	if (payload.item_id) {
		newPayload.item_id = payload.item_id;
	}
	if (payload.warehouse_id) {
		newPayload.warehouse_id = payload.warehouse_id;
	}
	if (payload.quantity || payload.quantity_received) {
		newPayload.quantity = payload.quantity_received || payload.quantity;
	}
	if (payload.cost_price) {
		newPayload.cost_price = payload.cost_price;
	}
	if (payload.supplier_id) {
		newPayload.supplier_id = payload.supplier_id;
	}
	if (payload.expried_at) {
		newPayload.expried_at = payload.expried_at;
	}

	console.log("Creating stock in with payload:", newPayload);

	return request<StockInRecord>("/v1/lots", {
		method: "POST",
		body: JSON.stringify(newPayload),
	});
}

/**
 * Save multiple lots to the API
 * @param items - Array of stock in items to save
 * @returns Response from API with lot codes
 */
export async function saveLots(items: StockIn.StockInItem[]): Promise<any> {
	const lotsPayload = items.map((item) => {
		const payload: Record<string, any> = {};

		if (item.itemId) {
			payload.item_id = item.itemId;
		}
		if (item.warehouseId) {
			payload.warehouse_id = item.warehouseId;
		}
		if (item.quantityReceived) {
			payload.quantity = item.quantityReceived;
		}
		if (item.costPrice) {
			payload.cost_price = item.costPrice;
		}
		if (item.supplierId) {
			payload.supplier_id = item.supplierId;
		}
		if (item.expiryDate) {
			payload.expried_at = item.expiryDate;
		}
		if (item.poNumber) {
			payload.po_number = item.poNumber;
		}
		if (item.lotCode) {
			payload.lot_code = item.lotCode;
		}
		if (item.mfgDate) {
			payload.mfg_date = item.mfgDate;
		}

		return payload;
	});

	console.log("Saving lots with payload:", lotsPayload);

	try {
		// Handle both single and batch submissions
		if (lotsPayload.length === 1) {
			// Single item - use /stock-in endpoint
			return await request<any>("/v1/lots/stock-in", {
				method: "POST",
				body: JSON.stringify(lotsPayload[0]),
			});
		} else {
			// Multiple items - save each individually
			const results = [];
			for (const payload of lotsPayload) {
				const result = await request<any>("/v1/lots/stock-in", {
					method: "POST",
					body: JSON.stringify(payload),
				});
				results.push(result);
			}
			return results;
		}
	} catch (error) {
		console.error("Error saving lots:", error);
		// Re-throw with more context
		if (error instanceof Error) {
			throw new Error(`Failed to save lots: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Save draft lots (PENDING items without received quantity)
 * @param items - Array of stock in items to save as draft
 * @returns Response from API
 */
export async function saveDraftLots(items: StockIn.StockInItem[]): Promise<any> {
	const draftsPayload = items.map((item) => {
		const payload: Record<string, any> = {
			item_id: item.itemId,
			warehouse_id: item.warehouseId,
			expected_qty: item.quantityOrdered,
			qty: 0, // Draft items have qty 0
			status: "PENDING",
		};

		if (item.costPrice) {
			payload.cost_price = item.costPrice;
		}
		if (item.supplierId) {
			payload.supplier_id = item.supplierId;
		}
		if (item.poNumber) {
			payload.po_number = item.poNumber;
		}

		return payload;
	});

	console.log("Saving draft lots with payload:", draftsPayload);

	try {
		// Handle both single and batch submissions
		if (draftsPayload.length === 1) {
			// Single item - use /stock-in/draft endpoint
			return await request<any>("/v1/lots/stock-in/draft", {
				method: "POST",
				body: JSON.stringify(draftsPayload[0]),
			});
		} else {
			// Multiple items - save each individually
			const results = [];
			for (const payload of draftsPayload) {
				const result = await request<any>("/v1/lots/stock-in/draft", {
					method: "POST",
					body: JSON.stringify(payload),
				});
				results.push(result);
			}
			return results;
		}
	} catch (error) {
		console.error("Error saving draft lots:", error);
		// Re-throw with more context
		if (error instanceof Error) {
			throw new Error(`Failed to save draft lots: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Fetch suppliers list
 * @returns Array of suppliers
 */
export async function getSuppliers(): Promise<Option[]> {
	try {
		console.log("Fetching suppliers from /v1/suppliers/option");
		const data = await request<Option[]>(`/v1/suppliers/option`);
		return data || [];
	} catch (error) {
		console.debug("Suppliers endpoint /v1/suppliers/option not available, trying alternative endpoint");
		
		// Try alternative endpoint
		try {
			const data = await request<Option[]>(`/v1/suppliers`);
			if (Array.isArray(data)) {
				return data;
			}
		} catch (altError) {
			console.debug("Alternative suppliers endpoint also not available");
		}
		
		// Gracefully return empty array if endpoints unavailable
		console.debug("Suppliers data will be unavailable");
		return [];
	}
}

/**
 * Fetch detailed item information
 * @param itemId - Item ID to fetch details for
 * @returns Item detail with warehouse information
 */
export async function getItemDetail(itemId: string): Promise<any | null> {
	try {
		const itemData = await request<any>(`/v1/items/${itemId}`);
		return itemData || null;
	} catch (error) {
		console.error("Error fetching item detail:", error);
		return null;
	}
}

/**
 * Fetch detailed lot information
 * @param lotId - Lot ID to fetch details for
 * @returns Lot detail with quantity information
 */
export async function getLotDetail(lotId: string): Promise<any | null> {
	try {
		console.log(`Fetching lot detail for ${lotId}`);
		const lotData = await request<any>(`/v1/lots/${lotId}`);
		return lotData || null;
	} catch (error) {
		console.error("Error fetching lot detail:", error);
		return null;
	}
}

/**
 * Update lot quantity received
 * @param lotId - Lot ID to update
 * @param quantityReceived - New quantity received amount
 * @returns Updated lot record
 */
export async function updateLotQuantity(lotId: string, quantityReceived: number): Promise<any> {
	try {
		console.log(`Updating lot ${lotId} with quantity: ${quantityReceived}`);
		return await request<any>(`/v1/lots/${lotId}`, {
			method: "PATCH",
			body: JSON.stringify({
				quantity_received: quantityReceived,
			}),
		});
	} catch (error) {
		console.error("Error updating lot quantity:", error);
		throw error;
	}
}

/**
 * Fetch all stock in records
 * Transforms lot data into stock in document format
 * @returns Array of stock in records with supplier and item details
 */
export async function getAllStockIn(): Promise<any[]> {
	try {
		console.log("Fetching stock in records from /v1/lots");
		
		// Try fetching with different query parameters to find the right one
		let data;
		try {
			data = await request<any[]>(`/v1/lots`);
		} catch (error) {
			console.warn("Failed to fetch /v1/lots without params, attempting with limit param");
			data = await request<any[]>(`/v1/lots?limit=100`);
		}
		
		if (!Array.isArray(data)) {
			console.warn("API returned non-array data:", data);
			return [];
		}

		// Map each lot directly to StockInRecord format
		const records = data.map((lot: any) => {
			// Generate readable lot code if not present (fallback)
			let lotCode = lot.lot_code || "";
			if (!lotCode) {
				// Format: PREFIX-YYMMDD-XXXXX (readable format)
				const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
				const dateStr = today.replace(/-/g, "").slice(-6); // YYMMDD from end
				const shortId = lot.id?.substring(0, 5).toUpperCase() || "XXXX";
				lotCode = `SR-${dateStr}-${shortId}`;
			}
			
			return {
				id: lot.id || "",
				date: lot.created_at 
					? new Date(lot.created_at).toISOString().split("T")[0]
					: new Date().toISOString().split("T")[0],
				docNo: lotCode,
				supplier: lot.supplier?.name || lot.supplier_name || "ไม่ระบุ",
				supplierId: lot.supplier_id || lot.supplier?.id || "",
				totalAmount: (lot.cost_price || 0) * (lot.quantity || lot.quantity_received || 0),
				status: lot.status || "PENDING",
			};
		});

		console.log("Stock in records fetched successfully:", records.length);
		return records;
	} catch (error) {
		console.warn("Error fetching stock in records:", error);
		// Log detailed error for debugging
		if (error instanceof Error) {
			console.warn("Error details:", error.message);
		}
		// Always return empty array as fallback to avoid breaking the UI
		return [];
	}
}

/**
 * Create Receive Document - PO Based (Normal or Draft Mode)
 * @param payload - Receive document payload
 * @returns Response from API
 */
export async function createReceive(payload: any): Promise<any> {
	try {
		console.log("Create receive payload:", payload);
		
		const response = await request<any>("/v1/receives", {
			method: "POST",
			body: JSON.stringify(payload),
		});
		
		console.log("Create receive successful:", response);
		return response;
	} catch (error) {
		console.error("Error creating receive:", error);
		if (error instanceof Error) {
			throw new Error(`Failed to create receive: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Quick Receive - One-Stop receive for DONATION or PURCHASE
 * Automatically creates PENDING bill for shortfall items
 * @param payload - Receive payload with items
 * @returns Response from API
 */
export async function quickReceive(payload: any): Promise<any> {
	try {
		console.log("Quick receive payload:", payload);
		
		const response = await request<any>("/v1/receives", {
			method: "POST",
			body: JSON.stringify(payload),
		});
		
		console.log("Quick receive successful:", response);
		return response;
	} catch (error) {
		console.error("Error in quick receive:", error);
		if (error instanceof Error) {
			throw new Error(`Failed to process quick receive: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Confirm Receive from Draft - Update PENDING bill with actual received items
 * Vehicle arrived, open PENDING bill from draft to count items
 * @param receiveHeaderId - ID of receive_header row to confirm
 * @param receiveDate - Actual receive date (when truck arrived at warehouse)
 * @param items - Array of received items with item_id, qty, lot_code, expired_at
 * @returns Response from API with confirmed receive details
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
	try {
		const payload = {
			receive_date: receiveDate,
			items: items,
		};

		console.log(`Confirming receive ${receiveHeaderId} with payload:`, payload);

		const response = await request<any>(`/v1/receives/${receiveHeaderId}/confirm`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});

		console.log("Receive confirmed successfully:", response);
		return response;
	} catch (error) {
		console.error("Error confirming receive:", error);
		if (error instanceof Error) {
			throw new Error(`Failed to confirm receive: ${error.message}`);
		}
		throw error;
	}
}

