
export default function HomePage() {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="card max-w-3xl w-full text-center">
        {/* Title */}
        <h2 className="text-3xl font-extrabold text-hospital flex items-center justify-center gap-2">
          🏥 Hospital Inventory Dashboard
        </h2>
        <p className="mt-3 text-gray-600 text-lg">
          ยินดีต้อนรับเข้าสู่ระบบคลังพัสดุโรงพยาบาล  
          กรุณาเลือกโมดูลที่คุณต้องการใช้งาน
        </p>

        {/* Buttons */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/warehouse"
            className="btn btn-primary flex flex-col items-center py-6 shadow-md hover:shadow-lg transition rounded-xl"
          >
            <span className="text-3xl mb-2">📦</span>
            <span className="text-lg font-semibold">Warehouse</span>
          </a>


          <a
            href="/request"
            className="btn btn-outline flex flex-col items-center py-6 shadow-md hover:shadow-lg transition rounded-xl"
          >
            <span className="text-3xl mb-2">📝</span>
            <span className="text-lg font-semibold">Requests</span>
          </a>
        </div>
      </div>
    </div>
  );
}
