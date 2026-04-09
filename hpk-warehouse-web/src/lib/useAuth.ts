import { useEffect, useState } from "react";

// ✅ นิยาม Interface ให้ชัดเจน (No any)
export interface Department {
  id: number;
  name: string;
  description: string;
  code: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role?: string;
}

export const useAuth = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const mockDepartments: Department[] = [
      { id: 1, name: "แผนกฉุกเฉิน", description: "อุบัติเหตุและฉุกเฉิน", code: "ER" },
      { id: 2, name: "แผนกทันตกรรม", description: "บริการด้านทันตกรรม", code: "DENT" },
      { id: 3, name: "ศูนย์ชีวาภิบาล", description: "ดูแลผู้ป่วยระยะประคับประคอง", code: "PAL" },
      { id: 4, name: "แผนกผู้ป่วยนอก", description: "บริการผู้ป่วยนอก", code: "OPD" },
      { id: 5, name: "แผนกผู้ป่วยใน", description: "บริการผู้ป่วยใน", code: "IPD" },
      { id: 6, name: "แผนกเวชระเบียน", description: "จัดการประวัติผู้ป่วยและสถิติ", code: "MED" },
      { id: 7, name: "ห้องจ่ายยา", description: "แผนกเภสัชกรรมและการจ่ายยา", code: "PHAR" },
      { id: 8, name: "คลังหลัก", description: "คลังเวชภัณฑ์และพัสดุส่วนกลาง", code: "MAIN-WH" }
    ];

    setDepartments(mockDepartments);
    setUser({ name: "Tester Mode", email: "test@example.com" });
    setIsLoading(false);
  }, []);

  return { departments, user, isLoading };
};