"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; 
import { User } from "@supabase/supabase-js";
import { getProfile, ProfileDepartment } from "@/services/profileService";
import { userMayOperateWarehouseBorrowFlows } from "@/lib/departmentAccess";

// กำหนดโครงสร้างรอไว้เลยครับ
interface SystemOption {
  id: number;
  name: string;
  code: string; // ไว้สำหรับ Dropdown บางตัวที่ต้องการ field 'code'
}

export const useAuth = () => {
  const [departments, setDepartments] = useState<SystemOption[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUser(user);

          // ดึง departments จาก Profile API (ฐานข้อมูลจริง)
          const profile = await getProfile();
          const depts: ProfileDepartment[] = profile.departments || [];
          setDepartments(depts.map((d) => ({
            id: d.id,
            name: d.name,
            code: d.code,
          })));
        }
      } catch (error) {
        console.error("Error fetching auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuth();
  }, []);

  const roleName = user?.app_metadata?.role?.name || "guest";
  const meta = user?.app_metadata as Record<string, unknown> | undefined;
  const allowedSystemsFromUser: string[] = (
    (user?.app_metadata?.systems as unknown[]) || []
  ).map((s: unknown) => (typeof s === "string" ? s : String((s as { name?: string })?.name ?? "")));
  const isWarehouseStaffRole =
    ["warehouse_manager", "warehouse_staff"].includes(roleName) &&
    allowedSystemsFromUser.includes("Warehouse");
  const canAccessWarehouseBorrowFlows =
    roleName === "admin" ||
    userMayOperateWarehouseBorrowFlows(meta) ||
    isWarehouseStaffRole;
  return { 
    user, 
    departments, 
    isLoading,
    // แกะ Role Name ออกมาตรงๆ (จากเดิมที่เป็น Object)
    roleName,
    roleId: user?.app_metadata?.role?.id || null,
    /** ให้ตรงกับ middleware: admin, แผนกคลังหลักใน JWT, หรือพนักงานคลัง */
    canAccessWarehouseBorrowFlows,
    allMetadata: user?.app_metadata // เผื่ออยากเอาไปแงะอย่างอื่นต่อเอง
  };
};