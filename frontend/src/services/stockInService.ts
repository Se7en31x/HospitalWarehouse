import Cookies from "js-cookie";
import type * as StockIn from "@/types/stockin_type";

// Export types for external use
export type StockInRecord = StockIn.StockInRecord;
export type StockInItem = StockIn.StockInItem;
export type CreatePayload = StockIn.CreatePayload;
export type AllOptions = StockIn.AllOptions;
export type Option = StockIn.Option;
export type ItemOption = StockIn.ItemOption;

// API Constants
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const LOTS_BASE = "/v1/lots";
const ITEMS_BASE = "/v1/items";
const CATEGORIES_BASE = "/v1/categories";
const UNITS_BASE = "/v1/units";
const WAREHOUSES_BASE = "/v1/warehouses";
const SUPPLIERS_BASE = "/v1/suppliers";

// ============ Helper Functions ============

const getHeaders = () => ({
	"Content-Type": "application/json",
	Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function parseJson<T>(res: Response): Promise<T> {
	const contentType = res.headers.get("content-type") || "";
	if (!contentType.includes("application/json")) {
		const raw = await res.text();
		throw new Error(raw.slice(0, 120) || "Invalid response");
	}
	return (await res.json()) as T;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			...getHeaders(),
			...(options?.headers || {}),
		},
		cache: "no-store",
	});

	const body = await parseJson<{ data: T; message?: string; error?: string }>(res);
	if (!res.ok) {
		throw new Error(body.error || body.message || "Request failed");
	}

	return body.data;
}

// ============ Mapping Functions ============

/**
 * Map item from API response to option format
 */
function mapApiItemToOption(item: any): ItemOption {
	// Handle various possible API response structures for category and unit
	const categoryName =
		item.categories?.name ||
		item.category?.name ||
		item.categoryName ||
		item.category ||
		"";

	const unitName =
		item.unit?.name ||
		item.units?.name ||
		item.unitName ||
		item.unit ||
		"";

	return {
		id: String(item.id),
		name: item.name || "ไม่ระบุ",
		category: categoryName,
		unit: unitName,
	};
}

/**
 * Map item detail from API with warehouse info
 */
function mapApiItemDetail(item: any): any {
	// Handle various possible API response structures for category and unit
	const categoryName =
		item.categories?.name ||
		item.category?.name ||
		item.categoryName ||
		item.category ||
		"";

	const unitName =
		item.unit?.name ||
		item.units?.name ||
		item.unitName ||
		item.unit ||
		"";

	// Try to find warehouse from item_lots (get the one with highest quantity)
	let warehouseId = "";
	if (item.item_lots && Array.isArray(item.item_lots) && item.item_lots.length > 0) {
		// Find lot with highest quantity to determine default warehouse
		const lotWithMaxQty = item.item_lots.reduce(
			(max: any, lot: any) =>
				(lot.quantity || 0) > (max.quantity || 0) ? lot : max,
			item.item_lots[0]
		);
		warehouseId = lotWithMaxQty.warehouse_id || "";
	}

	return {
		id: String(item.id),
		name: item.name || "ไม่ระบุ",
		category: categoryName,
		unit: unitName,
		warehouseId: warehouseId,
	};
}

/**
 * Map option from API response
 */
function mapApiOption(option: any): Option {
	return {
		id: String(option.id),
		name: option.name || "ไม่ระบุ",
	};
}

/**
 * Transform lot records into stock in document format
 * Groups multiple lot records by supplier to create document-level summaries
 */
function transformLotsToStockInDocs(lots: any[]): any[] {
	const docMap = new Map<string, any>();

	lots.forEach((lot: any) => {
		const supplierId = lot.supplier?.id || "UNKNOWN";
		const createdDate = lot.created_at
			? new Date(lot.created_at).toISOString().split("T")[0]
			: "";
		const docKey = `${supplierId}-${createdDate}`;

		if (!docMap.has(docKey)) {
			docMap.set(docKey, {
				id: lot.id || "",
				date: createdDate,
				docNo: lot.po_number || lot.lot_code || "",
				supplier: lot.supplier?.name || "ไม่ระบุ",
				supplierId: supplierId,
				totalAmount: 0,
				status:
					lot.status === "deleted"
						? "CANCELLED"
						: lot.status || "PENDING",
				items: [],
			});
		}

		const doc = docMap.get(docKey)!;
		doc.totalAmount += (lot.cost_price || 0) * (lot.quantity_received || 0);
		doc.items.push(lot);
	});

	return Array.from(docMap.values());
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
	try {
		const response = await request<StockInRecord>(LOTS_BASE, {
			method: "POST",
			body: JSON.stringify(payload),
		});
		return response;
	} catch (error) {
		console.error("Error creating stock in:", error);
		throw error instanceof Error
			? error
			: new Error("Unknown error creating stock in");
	}
}

/**
 * Fetch all stock in options (items, categories, units, warehouses, suppliers)
 * @returns AllOptions containing all available options
 */
export async function getStockInOptions(): Promise<AllOptions> {
	try {
		// Fetch all items
		const itemsRes = await request<any[]>(ITEMS_BASE);
		console.log("Items response:", itemsRes);
		
		// Fetch items options (category, unit, warehouse)
		const itemOptionsRes = await request<any>(`${ITEMS_BASE}/option`);
		console.log("Items option response:", itemOptionsRes);
		
		// Fetch warehouses options
		const warehousesRes = await request<any[]>(`${WAREHOUSES_BASE}/option`);
		console.log("Warehouses response:", warehousesRes);
		
		// Fetch suppliers - fallback to empty array if not available
		let suppliersArray: any[] = [];
		try {
			suppliersArray = await request<any[]>(SUPPLIERS_BASE);
			console.log("Suppliers response:", suppliersArray);
		} catch (error) {
			console.debug("Suppliers endpoint not available, using empty array");
		}

		// Extract items
		const itemsArray = itemsRes || [];
		
		// Extract options from items/option
		const categoriesArray = itemOptionsRes?.category || [];
		const unitsArray = itemOptionsRes?.unit || [];
		
		// Warehouses from warehouses/option endpoint
		const warehousesArray = warehousesRes || [];

		// Map items and log for debugging
		const mappedItems = (itemsArray || []).map((item) => {
			const mapped = mapApiItemToOption(item);
			console.log("Mapping item:", item, "→", mapped);
			return mapped;
		});

		return {
			items: mappedItems,
			categories: (categoriesArray || []).map(mapApiOption),
			units: (unitsArray || []).map(mapApiOption),
			warehouses: (warehousesArray || []).map(mapApiOption),
			suppliers: (suppliersArray || []).map(mapApiOption),
		};
	} catch (error) {
		console.error("Error fetching stock in options:", error);
		return {
			items: [],
			categories: [],
			units: [],
			warehouses: [],
			suppliers: [],
		};
	}
}

/**
 * Fetch detailed item information
 * @param itemId - Item ID to fetch details for
 * @returns Item option with detailed information
 */
export async function getItemDetail(itemId: string): Promise<any | null> {
	try {
		const itemData = await request<any>(`${ITEMS_BASE}/${itemId}`);

		if (!itemData) {
			return null;
		}

		return mapApiItemDetail(itemData);
	} catch (error) {
		console.error("Error fetching item detail:", error);
		return null;
	}
}

/**
 * Fetch all stock in records/documents
 * @returns Array of stock in documents
 */
export async function getAllStockIn(): Promise<any[]> {
	try {
		const lotsData = await request<any[]>(`${LOTS_BASE}?limit=100`);

		// Transform lot records into stock in document format
		const stockInDocs = transformLotsToStockInDocs(lotsData || []);
		return stockInDocs;
	} catch (error) {
		console.error("Error fetching stock in records:", error);
		return [];
	}
}

/**
 * Fetch a specific stock in record by ID
 * @param id - Stock in record ID
 * @returns Stock in record or null if not found
 */
export async function getStockInById(id: string): Promise<StockInRecord | null> {
	try {
		const data = await request<StockInRecord>(`${LOTS_BASE}/${id}`);

		if (!data) {
			return null;
		}

		return data;
	} catch (error) {
		console.error("Error fetching stock in record:", error);
		return null;
	}
}

