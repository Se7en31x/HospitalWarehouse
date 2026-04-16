import { api } from "@/lib/apiClient";
import { isNearExpiryDate } from "@/utils/nearExpiryUtils";

// ─── Types ───────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalItems: number;
  totalItemLots: number;
  totalDepartments: number;
  totalSuppliers: number;
  totalUsers: number;
}

export interface ExpiringLot {
  id: string;
  lot_code: string;
  quantity: number;
  expired_at: string | null;
  item_name: string;
  item_code: string;
  warehouse_name: string;
}

export interface WeeklyRequisition {
  weekStart: string;
  withdraw: number;
  borrow: number;
  total: number;
}

export interface MonthlyRequisition {
  month: string;
  label: string;
  withdraw: number;
  borrow: number;
  total: number;
}

export interface LotStats {
  total: number;
  belowMinimum: number;
  nearExpiry: number;
}

export interface DashboardAnalytics {
  summary: {
    totalItems: number;
    totalLots: number;
    totalDepartments: number;
    totalSuppliers: number;
    totalUsers: number;
  };
  lotHealth: {
    totalLots: number;
    belowMinimumLots: number;
    nearExpiryLots: number;
    normalLots: number;
    thresholdDate: string;
  };
  expiringLotsTop: ExpiringLot[];
  weeklyRequisitions: WeeklyRequisition[];
  monthlyRequisitions: Array<Omit<MonthlyRequisition, "label">>;
  topItems: Array<{ item_code: string; item_name: string; quantity: number }>;
  expiry: {
    expiredLots: number;
    nearExpiryLots: number;
    monthlyExpiredTrend: Array<{ month: string; expiredLots: number }>;
  };
  lowStock: {
    lowStockItems: number;
    topLowStockItems: Array<{
      id: string;
      item_code: string;
      item_name: string;
      min_stock: number;
      current_stock: number;
      deficit: number;
     }>;
  };
  stockIn: {
    monthly: Array<{ month: string; total: number; byType: Record<string, number> }>;
    thisMonth: { month: string; total: number; byType: Record<string, number> };
  };
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function fetchCount(endpoint: string): Promise<number> {
  const res = await api.list<any>(endpoint, { page: 1, limit: 1 });
  return res.meta?.total ?? 0;
}

async function fetchOptionCount(endpoint: string): Promise<number> {
  const data = await api.get<any[]>(endpoint);
  return Array.isArray(data) ? data.length : 0;
}

// ─── Public API ──────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [totalItems, totalItemLots, totalDepartments, totalSuppliers] =
    await Promise.all([
      fetchCount("/v1/items"),
      fetchCount("/v1/lots"),
      fetchCount("/v1/departments"),
      fetchOptionCount("/v1/suppliers/option"),
    ]);

  return { 
    totalItems, 
    totalItemLots, 
    totalDepartments, 
    totalSuppliers, 
    totalUsers: 0 // ดึงข้อมูลไม่ได้จาก endpoint ปัจจุบัน
  };
}

export async function getDashboardAnalytics(params?: {
  expiryDays?: number;
  weeks?: number;
  months?: number;
  topItems?: number;
  expiringLimit?: number;
}): Promise<DashboardAnalytics> {
  return api.get<DashboardAnalytics>("/v1/analytics/dashboard", params as Record<string, unknown>);
}

async function getAllLotsRaw(): Promise<Array<Record<string, unknown>>> {
  const limit = 10;
  let page = 1;
  const allLots: Array<Record<string, unknown>> = [];

  while (true) {
    const res = await api.list<Record<string, unknown>>("/v1/lots", { page, limit });
    const batch = res.data || [];
    allLots.push(...batch);

    if (page >= (res.meta?.totalPages || 1) || batch.length < limit) break;
    page += 1;
  }

  return allLots;
}

export async function getExpiringLots(days = 90): Promise<ExpiringLot[]> {
  const rawLots = await getAllLotsRaw();
  const lots: ExpiringLot[] = [];

  for (const lot of rawLots) {
    const expiredAt = lot.expired_at ?? lot.expried_at;
    if (!expiredAt) continue;

    if (isNearExpiryDate(String(expiredAt), days)) {
      const items = lot.items as any;
      const warehouses = lot.warehouses as any;
      
      lots.push({
        id: String(lot.id),
        lot_code: String(lot.lot_code || ""),
        quantity: Number(lot.quantity || 0),
        expired_at: String(expiredAt),
        item_name: String(lot.item_name ?? items?.name ?? "-"),
        item_code: String(lot.item_code ?? items?.code ?? "-"),
        warehouse_name: String(lot.warehouse_name ?? warehouses?.name ?? "-"),
      });
    }
  }

  return lots.sort((a, b) => new Date(a.expired_at!).getTime() - new Date(b.expired_at!).getTime());
}

export async function getExpiredLots(): Promise<ExpiringLot[]> {
  const rawLots = await getAllLotsRaw();
  const lots: ExpiringLot[] = [];
  const now = new Date();

  for (const lot of rawLots) {
    const expiredAt = lot.expired_at ?? lot.expried_at;
    if (!expiredAt || new Date(String(expiredAt)) >= now) continue;

    const items = lot.items as any;
    const warehouses = lot.warehouses as any;

    lots.push({
      id: String(lot.id),
      lot_code: String(lot.lot_code || ""),
      quantity: Number(lot.quantity || 0),
      expired_at: String(expiredAt),
      item_name: String(lot.item_name ?? items?.name ?? "-"),
      item_code: String(lot.item_code ?? items?.code ?? "-"),
      warehouse_name: String(lot.warehouse_name ?? warehouses?.name ?? "-"),
    });
  }

  return lots.sort((a, b) => new Date(b.expired_at!).getTime() - new Date(a.expired_at!).getTime());
}

export async function getWeeklyRequisitions(): Promise<WeeklyRequisition[]> {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  
  const data = await api.get<any[]>("/v1/requisition", {
    dateFrom: fourWeeksAgo.toISOString().split("T")[0],
    dateTo: now.toISOString().split("T")[0]
  });

  const weeks: Record<string, WeeklyRequisition> = {};
  for (const req of data || []) {
    const dateStr = (req.request_date || req.created_at) as string;
    if (!dateStr) continue;
    
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    const key = weekStart.toISOString().split("T")[0];

    if (!weeks[key]) {
      weeks[key] = { weekStart: key, withdraw: 0, borrow: 0, total: 0 };
    }
    
    if (String(req.type || "").toUpperCase() === "BORROW") {
      weeks[key].borrow += 1;
    } else {
      weeks[key].withdraw += 1;
    }
    weeks[key].total += 1;
  }

  return Object.values(weeks).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export async function getMonthlyRequisitions(months = 6): Promise<MonthlyRequisition[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  
  const data = await api.get<any[]>("/v1/requisition", {
    dateFrom: startDate.toISOString().split("T")[0],
    dateTo: now.toISOString().split("T")[0]
  });

  const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const buckets: Record<string, MonthlyRequisition> = {};

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const thaiYear = (d.getFullYear() + 543).toString().slice(-2);
    buckets[key] = { month: key, label: `${monthNames[d.getMonth()]} ${thaiYear}`, withdraw: 0, borrow: 0, total: 0 };
  }

  for (const req of data || []) {
    const dateStr = (req.request_date || req.created_at) as string;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) continue;

    if (String(req.type || "").toUpperCase() === "BORROW") {
      buckets[key].borrow += 1;
    } else {
      buckets[key].withdraw += 1;
    }
    buckets[key].total += 1;
  }

  return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getLotStats(expiryDays = 90): Promise<LotStats> {
  const [lotsRes, itemsRes] = await Promise.all([
    api.list<any>("/v1/lots", { page: 1, limit: 10 }),
    api.list<any>("/v1/items", { page: 1, limit: 10 })
  ]);

  const lots = lotsRes.data || [];
  const items = itemsRes.data || [];
  
  const minStockMap = new Map<string, number>();
  for (const item of items) {
    minStockMap.set(String(item.id), Number(item.min_stock) || 0);
  }

  let belowMinimum = 0;
  let nearExpiry = 0;

  for (const lot of lots) {
    const itemId = String(lot.item_id ?? lot.items?.id ?? "");
    const minStock = minStockMap.get(itemId) || 0;
    const quantity = Number(lot.quantity || 0);
    const expiredAt = (lot.expired_at ?? lot.expried_at) as string | null;

    if (minStock > 0 && quantity < minStock) belowMinimum++;
    if (expiredAt && isNearExpiryDate(expiredAt, expiryDays)) nearExpiry++;
  }

  return { total: lotsRes.meta?.total ?? lots.length, belowMinimum, nearExpiry };
}