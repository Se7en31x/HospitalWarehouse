import { useEffect, useState } from "react";

export interface Department {
  code: string;
  name: string;
}

export const useAuth = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 🚧 จำลองข้อมูลแผนก (Mock Data) เพื่อให้เทส UI ได้ทันที
    const mockDepartments: Department[] = [
      { code: "ER", name: "แผนกฉุกเฉิน" },
      { code: "DENT", name: "แผนกทันตกรรม" },
      { code: "PAL", name: "ศูนย์ชีวาภิบาล" },
      { code: "OPD", name: "แผนกผู้ป่วยนอก" },
      { code: "IPD", name: "แผนกผู้ป่วยใน" },
      { code: "MED", name: "แผนกเวชระเบียน" },
      { code: "PHAR", name: "ห้องจ่ายยา" },
      { code: "MAIN-WH", name: "คลังหลัก" }
    ];

    setDepartments(mockDepartments);
    setUser({ name: "Tester Mode", email: "test@example.com" }); // จำลอง user
    setIsLoading(false);
  }, []);

  return { departments, user, isLoading };
};