import { 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  CalendarDays,
  ArrowRight,
  PieChart
} from "lucide-react";

export default function RequestsDashboard() {
  const topItems = [
    { name: "พาราเซตามอล 500mg", amount: "1,200 แผง", trend: "+12%" },
    { name: "Syringe 5ml", amount: "850 ชิ้น", trend: "+5%" },
    { name: "น้ำเกลือ NSS 0.9%", amount: "420 ขวด", trend: "-2%" },
    { name: "ถุงมือยาง (M)", amount: "300 กล่อง", trend: "+8%" },
    { name: "Surgical Mask", amount: "250 กล่อง", trend: "0%" },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ภาพรวมการเบิก-ยืมพัสดุ</h2>
          <p className="text-sm text-slate-500 mt-1">สรุปข้อมูลสถิติประจำเดือน มีนาคม 2026</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">รอบบิลปัจจุบัน: 1 - 31 มี.ค.</span>
        </div>
      </div>

      {/* 2. Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: คำขอทั้งหมด */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">คำขอทั้งหมด (เดือนนี้)</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">128</p>
              </div>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package className="w-5 h-5" /></div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span>เพิ่มขึ้น 14% จากเดือนที่แล้ว</span>
            </div>
          </div>
        </div>

        {/* Card 2: รออนุมัติ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">รอตรวจสอบจากคลัง</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">12</p>
              </div>
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Clock className="w-5 h-5" /></div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span>อัปเดตล่าสุดเมื่อ 5 นาทีที่แล้ว</span>
            </div>
          </div>
        </div>

        {/* Card 3: อนุมัติแล้ว */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">อนุมัติแล้ว (เตรียมรับของ)</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">105</p>
              </div>
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle className="w-5 h-5" /></div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <span>อัตราการอนุมัติ 90%</span>
            </div>
          </div>
        </div>

        {/* Card 4: มีปัญหา/ยกเลิก */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">ถูกปฏิเสธ / ของหมด</p>
                <p className="text-3xl font-bold text-red-600 mt-1">11</p>
              </div>
              <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span>โปรดตรวจสอบเหตุผลในรายการ</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Charts & Lists Section */}
      {/* เพิ่ม items-start เพื่อป้องกันไม่ให้กราฟซ้ายยืดตามความสูงของฝั่งขวา */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ---------------- ฝั่งซ้าย (พื้นที่ 2 ส่วน): กราฟแท่งแนวโน้ม ---------------- */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              สถิติการเบิกพัสดุรายสัปดาห์
            </h3>
            <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500">
              <option>มีนาคม 2026</option>
              <option>กุมภาพันธ์ 2026</option>
            </select>
          </div>
          
          {/* กำหนดความสูงกราฟแบบ Fixed (h-[280px]) จะได้ไม่ยืดทะลุขอบ */}
          <div className="h-[280px] flex items-end justify-between gap-2 border-b border-slate-100 pb-2 px-2 mt-6">
            {[40, 70, 45, 90, 65, 30, 85].map((height, idx) => (
              <div key={idx} className="w-full flex flex-col items-center gap-2 group h-full justify-end">
                <div 
                  className="w-full max-w-[3rem] bg-blue-50 group-hover:bg-blue-100 rounded-t-md relative transition-colors"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {height}
                  </div>
                  {/* เปลี่ยนสีแท่งกราฟเป็นสีน้ำเงิน */}
                  <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all shadow-[inset_0_-4px_0_rgba(0,0,0,0.1)]" style={{ height: `${height * 0.6}%` }}></div>
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap mt-1">สัปดาห์ {idx + 1}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-6 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> เบิกใช้ (Withdraw)</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-100 rounded-sm"></div> ยืม (Borrow)</div>
          </div>
        </div>

        {/* ---------------- ฝั่งขวา (พื้นที่ 1 ส่วน): Donut Chart + ลิสต์พัสดุ ---------------- */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* กราฟวงกลม (Donut Chart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                ประเภทการทำรายการ
              </h3>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              {/* SVG Donut Chart */}
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-sm">
                  {/* พื้นหลังวงแหวน */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                  
                  {/* สีน้ำเงิน: เบิกขาด (Withdraw) 65% */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4" 
                    strokeDasharray="65 35" strokeDashoffset="0" className="transition-all duration-1000 ease-out"></circle>
                    
                  {/* สีเขียว: ยืม (Borrow) 25% */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4" 
                    strokeDasharray="25 75" strokeDashoffset="-65" className="transition-all duration-1000 ease-out"></circle>

                  {/* สีส้ม: คืน (Return) 10% */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4" 
                    strokeDasharray="10 90" strokeDashoffset="-90" className="transition-all duration-1000 ease-out"></circle>
                </svg>
                {/* ข้อความตรงกลางวงแหวน */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800">128</span>
                  <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">รายการ</span>
                </div>
              </div>

              {/* Legend (คำอธิบายสี) */}
              <div className="w-full mt-6 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div><span className="text-slate-600 font-medium">เบิกขาด</span></div>
                  <span className="font-bold text-slate-800">65%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div><span className="text-slate-600 font-medium">ยืมพัสดุ</span></div>
                  <span className="font-bold text-slate-800">25%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></div><span className="text-slate-600 font-medium">คืนพัสดุ</span></div>
                  <span className="font-bold text-slate-800">10%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ลิสต์ Top 5 พัสดุเบิกบ่อย */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Top 5 เบิกบ่อยสุด</h3>
            </div>
            
            <div className="space-y-3">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.amount}</p>
                    </div>
                  </div>
                  <div className={`text-xs font-bold ${item.trend.startsWith('+') ? 'text-emerald-500' : item.trend.startsWith('-') ? 'text-red-500' : 'text-slate-400'}`}>
                    {item.trend}
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-5 py-2.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
              ดูรายงานทั้งหมด
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}