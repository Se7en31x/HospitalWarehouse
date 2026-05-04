/**
 * คลังหลักโรงพยาบาล — ใช้ร่วม middleware (JWT/app_metadata), client navigation และฟอร์มยืม
 */

export type DepartmentLike = {
  id?: number | string | null;
  name?: string | null;
  code?: string | null;
};

/** จากรายการแผนกที่โปรไฟล์ส่งมา — เลือกแถวที่ตรง “คลังหลัก” */
export function isMainWarehouseDepartment(dept: DepartmentLike): boolean {
  const name = String(dept.name ?? "").trim();
  const code = String(dept.code ?? "").trim();
  if (/^warehouse$/i.test(code)) return true;
  if (/^warehouse$/i.test(name)) return true;
  if (name === "คลังหลัก") return true;
  if (name.includes("คลังหลัก")) return true;
  return false;
}

export function pickMainWarehouseDepartment<
  T extends { id?: number | string | null; name?: string | null; code?: string | null },
>(depts: T[]): T | undefined {
  return depts.find((d) =>
    isMainWarehouseDepartment({
      id: d.id ?? undefined,
      name: d.name,
      code: d.code ?? undefined,
    })
  );
}

type JwtDeptEntry =
  | string
  | { id?: number; name?: string; code?: string };

/** จาก app_metadata.departments ใน JWT (ตรวจใน middleware หลัง decode session cookie) */
export function jwtDepartmentsIncludesWarehouse(metadata: Record<string, unknown> | undefined | null): boolean {
  const raw = metadata?.departments as JwtDeptEntry[] | undefined;
  if (!Array.isArray(raw)) return false;
  return raw.some((entry) =>
    typeof entry === "string"
      ? /^warehouse$/i.test(entry.trim()) || entry.trim() === "คลังหลัก"
      : isMainWarehouseDepartment({ name: entry?.name ?? "", code: entry?.code })
  );
}

/** ใช้ id จาก JWT เมื่อรายการแผนกในโปรไฟล์ DB ไม่มีแถวคลังหลัก */
export function pickWarehouseJwtDepartmentId(
  metadata: Record<string, unknown> | undefined | null
): number | null {
  const raw = metadata?.departments;
  if (!Array.isArray(raw)) return null;
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const o = entry as { id?: unknown; name?: unknown; code?: unknown };
    if (
      !isMainWarehouseDepartment({
        name: o.name != null ? String(o.name) : "",
        code: o.code != null ? String(o.code) : "",
      })
    ) {
      continue;
    }
    const idNum = typeof o.id === "number" ? o.id : Number(o.id);
    if (Number.isFinite(idNum) && idNum > 0) return idNum;
  }
  return null;
}

/** บางผู้ใช้มีฟิลด์ department เดียว (string) ใน JWT */
export function jwtSingleDepartmentIsWarehouse(metadata: Record<string, unknown> | undefined | null): boolean {
  const raw = metadata?.department;
  if (typeof raw !== "string") return false;
  const s = raw.trim();
  if (!s) return false;
  if (/^warehouse$/i.test(s)) return true;
  if (s === "คลังหลัก") return true;
  return false;
}

/** เข้าได้หน้ายืม/คืนในสาย /request (เมื่อไม่ใช่ admin) — ต้องมีแผนกคลังหลักใน JWT */
export function userMayOperateWarehouseBorrowFlows(metadata: Record<string, unknown> | undefined | null): boolean {
  if (!metadata) return false;
  if (jwtDepartmentsIncludesWarehouse(metadata)) return true;
  if (jwtSingleDepartmentIsWarehouse(metadata)) return true;
  return false;
}
