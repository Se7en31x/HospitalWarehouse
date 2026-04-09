// src/app/warehouse/items/loading.tsx
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full space-y-4 animate-in fade-in duration-500">
      {/* Container ของตัวหมุน */}
      <div className="relative">
        {/* วงแหวนพื้นหลัง (จางๆ) */}
        <div className="w-12 h-12 border-4 border-blue-100 rounded-full"></div>
        
        {/* ตัวหมุนหลักสีฟ้า */}
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      {/* ข้อความประกอบ (Optional) */}
      <div className="flex flex-col items-center">
        <p className="text-sm font-bold text-slate-600 tracking-wide">
        </p>
        <p className="text-xs text-slate-400 animate-pulse mt-1">
          กรุณารอสักครู่...
        </p>
      </div>
    </div>
  );
}