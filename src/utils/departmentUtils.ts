export const DEPT_TH: Record<string, string> = {
  "Surg-ER": "ศัลยกรรม (อุบัติเหตุและฉุกเฉิน)",
  "OR-Station": "ห้องผ่าตัด",
  "ICU": "หอผู้ป่วยวิกฤต (ICU)",
  "Medicine-Ward": "วอร์ดอายุรกรรม",
  "Pediatric-Ward": "วอร์ดกุมารเวชกรรม",
  "OPD": "ผู้ป่วยนอก (OPD)",
  "Lab": "เทคนิคการแพทย์ (LAB)",
  "Pharmacy": "เภสัชกรรม",
  "Radiology": "เอกซเรย์/รังสีวิทยา",
};

export const deptDisplayName = (name: string): string => {
  if (!name) return "-";
  return DEPT_TH[name] || name;
};
