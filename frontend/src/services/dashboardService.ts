import Cookies from "js-cookie";
import { isNearExpiryDate } from "@/utils/nearExpiryUtils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

async function fetchJson<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  const res = await fetch(`${API_URL}${path}`, {
    headers: getHeaders(),
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
  return body;
}

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

// ─── Helpers: fetch count via meta from list endpoints ───────────

async function fetchCount(endpoint: string): Promise<number> {
  const body = await fetchJson<{ meta?: { total?: number }; data?: unknown[] }>(
    `${endpoint}?page=1&limit=1&keyword=`
  );
  return body.meta?.total ?? (Array.isArray(body.data) ? body.data.length : 0);
}

async function fetchOptionCount(endpoint: string): Promise<number> {
  const body = await fetchJson<{ data?: unknown[] }>(endpoint);
  return Array.isArray(body.data) ? body.data.length : 0;
}

// ─── Public API ──────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [totalItems, totalItemLots, totalDepartments, totalSuppliers, totalUsers] =
    await Promise.all([
      fetchCount("/v1/items"),
      fetchCount("/v1/lots"),
      fetchCount("/v1/departments"),
      fetchOptionCount("/v1/suppliers/option"),
      fetchCount("/v1/departments").then(() => 0), // users count not available via existing endpoint
    ]);

  return { totalItems, totalItemLots, totalDepartments, totalSuppliers, totalUsers };
}

export async function getDashboardAnalytics(params?: {
  expiryDays?: number;
  weeks?: number;
  months?: number;
  topItems?: number;
  expiringLimit?: number;
}): Promise<DashboardAnalytics> {
  const query = new URLSearchParams();
  if (params?.expiryDays != null) query.set("expiryDays", String(params.expiryDays));
  if (params?.weeks != null) query.set("weeks", String(params.weeks));
  if (params?.months != null) query.set("months", String(params.months));
  if (params?.topItems != null) query.set("topItems", String(params.topItems));
  if (params?.expiringLimit != null) query.set("expiringLimit", String(params.expiringLimit));

  const qs = query.toString();
  const body = await fetchJson<{ status: string; message?: string; data: DashboardAnalytics }>(
    `/v1/analytics/dashboard${qs ? `?${qs}` : ""}`
  );
  return body.data;
}

async function getAllLotsRaw(): Promise<Array<Record<string, unknown>>> {
  const limit = 100;
  let page = 1;
  const allLots: Array<Record<string, unknown>> = [];

  while (true) {
    const body = await fetchJson<{
      data?: Array<Record<string, unknown>>;
      meta?: { totalPages?: number; page?: number; limit?: number };
    }>(`/v1/lots?page=${page}&limit=${limit}`);

    const batch = body.data || [];
    allLots.push(...batch);

    const totalPages = Math.max(1, body.meta?.totalPages || 1);
    if (page >= totalPages || batch.length < limit) {
      break;
    }

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
      const items = lot.items as Record<string, unknown> | undefined;
      const warehouses = lot.warehouses as Record<string, unknown> | undefined;
      const itemName = lot.item_name ?? items?.name;
      const itemCode = lot.item_code ?? items?.code;
      const warehouseName = lot.warehouse_name ?? warehouses?.name;

      lots.push({
        id: String(lot.id),
        lot_code: String(lot.lot_code || ""),
        quantity: Number(lot.quantity || 0),
        expired_at: String(expiredAt),
        item_name: String(itemName || "-"),
        item_code: String(itemCode || "-"),
        warehouse_name: String(warehouseName || "-"),
      });
    }
  }

  return lots.sort(
    (a, b) => new Date(a.expired_at!).getTime() - new Date(b.expired_at!).getTime()
  );
}

export async function getExpiredLots(): Promise<ExpiringLot[]> {
  const rawLots = await getAllLotsRaw();
  const lots: ExpiringLot[] = [];

  for (const lot of rawLots) {
    const expiredAt = lot.expired_at ?? lot.expried_at;
    if (!expiredAt) continue;

    const expiryDate = new Date(String(expiredAt));
    if (expiryDate >= new Date()) continue;

    const items = lot.items as Record<string, unknown> | undefined;
    const warehouses = lot.warehouses as Record<string, unknown> | undefined;
    const itemName = lot.item_name ?? items?.name;
    const itemCode = lot.item_code ?? items?.code;
    const warehouseName = lot.warehouse_name ?? warehouses?.name;

    lots.push({
      id: String(lot.id),
      lot_code: String(lot.lot_code || ""),
      quantity: Number(lot.quantity || 0),
      expired_at: String(expiredAt),
      item_name: String(itemName || "-"),
      item_code: String(itemCode || "-"),
      warehouse_name: String(warehouseName || "-"),
    });
  }

  return lots.sort(
    (a, b) => new Date(b.expired_at!).getTime() - new Date(a.expired_at!).getTime()
  );
}

export async function getWeeklyRequisitions(): Promise<WeeklyRequisition[]> {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const dateFrom = fourWeeksAgo.toISOString().split("T")[0];
  const dateTo = now.toISOString().split("T")[0];

  const body = await fetchJson<{ data?: Array<Record<string, unknown>> }>(
    `/v1/requisition?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );

  const weeks: Record<string, WeeklyRequisition> = {};
  for (const req of body.data || []) {
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
    const type = String(req.type || "").toUpperCase();
    if (type === "BORROW") {
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
  const dateFrom = startDate.toISOString().split("T")[0];
  const dateTo = now.toISOString().split("T")[0];

  const body = await fetchJson<{ data?: Array<Record<string, unknown>> }>(
    `/v1/requisition?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );

  const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const buckets: Record<string, MonthlyRequisition> = {};

  // Pre-fill all months
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const thaiYear = (d.getFullYear() + 543).toString().slice(-2);
    buckets[key] = { month: key, label: `${monthNames[d.getMonth()]} ${thaiYear}`, withdraw: 0, borrow: 0, total: 0 };
  }

  for (const req of body.data || []) {
    const dateStr = (req.request_date || req.created_at) as string;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) continue;

    const type = String(req.type || "").toUpperCase();
    if (type === "BORROW") {
      buckets[key].borrow += 1;
    } else {
      buckets[key].withdraw += 1;
    }
    buckets[key].total += 1;
  }

  return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getLotStats(expiryDays = 90): Promise<LotStats> {
  const [lotsBody, itemsBody] = await Promise.all([
    fetchJson<{ meta?: { total?: number }; data?: Array<Record<string, unknown>> }>(
      `/v1/lots?page=1&limit=1000`
    ),
    fetchJson<{ data?: Array<Record<string, unknown>> }>(
      `/v1/items?page=1&limit=1000`
    ),
  ]);

  const lots = lotsBody.data || [];
  const items = itemsBody.data || [];
  const total = lotsBody.meta?.total ?? lots.length;

  // Build map: item id → min_stock
  const minStockMap = new Map<string, number>();
  for (const item of items) {
    minStockMap.set(String(item.id), Number(item.min_stock) || 0);
  }
  let belowMinimum = 0;
  let nearExpiry = 0;

  for (const lot of lots) {
    const itemId = String(lot.item_id ?? (lot.items as Record<string, unknown>)?.id ?? "");
    const minStock = minStockMap.get(itemId) || 0;
    const quantity = Number(lot.quantity || 0);
    const expiredAt = (lot.expired_at ?? lot.expried_at) as string | null;

    if (minStock > 0 && quantity < minStock) belowMinimum++;
    if (expiredAt && isNearExpiryDate(expiredAt, expiryDays)) nearExpiry++;
  }

  return { total, belowMinimum, nearExpiry };
}
