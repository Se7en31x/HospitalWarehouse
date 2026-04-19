"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; 
import { User } from "@supabase/supabase-js";
import { getProfile, ProfileDepartment } from "@/services/profileService";

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

  // คืนค่าออกไปใช้งาน
  return { 
    user, 
    departments, 
    isLoading,
    // แกะ Role Name ออกมาตรงๆ (จากเดิมที่เป็น Object)
    roleName: user?.app_metadata?.role?.name || "guest",
    roleId: user?.app_metadata?.role?.id || null,
    allMetadata: user?.app_metadata // เผื่ออยากเอาไปแงะอย่างอื่นต่อเอง
  };
};