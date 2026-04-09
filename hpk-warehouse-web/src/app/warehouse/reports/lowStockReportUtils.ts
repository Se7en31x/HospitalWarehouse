import type { UiItem } from "@/services/itemsService";

export const isBelowMinStock = (item: UiItem) => {
	return item.minStock > 0 && item.stock < item.minStock;
};

export const getLowStockShortfall = (item: UiItem) => {
	if (!isBelowMinStock(item)) {
		return 0;
	}

	return item.minStock - item.stock;
};

export const getLowStockSeverity = (item: UiItem) => {
	if (!isBelowMinStock(item)) {
		return 0;
	}

	const minStock = item.minStock || 1;
	return getLowStockShortfall(item) / minStock;
};

export const getLowStockStatusLabel = (item: UiItem) => {
	return isBelowMinStock(item) ? "ต่ำกว่า Min Stock" : "ปกติ";
};
