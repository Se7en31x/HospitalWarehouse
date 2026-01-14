// // src/app/page.tsx
// import { redirect } from 'next/navigation'
// import { cookies } from 'next/headers'
// import { decodeJwt } from 'jose'

// export default function Home() {
//   // 1. ดึง Token ออกมาจากกระเป๋า (Cookie)
//   const cookieStore = cookies()
//   const token = cookieStore.get('accessToken')?.value

//   // 2. ถ้าไม่มี Token เลย -> ไล่ไป Login
//   if (!token) {
//     redirect('https://admin-system.com/login')
//   }

//   try {
//     // 3. แกะ Token ดูว่าเป็นใคร (Role อะไร)
//     const decoded = decodeJwt(token)
//     const role = decoded.role as string // (เช็คชื่อ field กับเพื่อนดีๆ นะครับ)

//     // 4. "ดีด" ไปตามแผนก (Traffic Controller)
//     switch (role) {
//       case 'inventory_staff':
//         redirect('/inventory') // ไปหน้าคลัง
//         break
//       case 'purchasing_staff':
//         redirect('/purchasing') // ไปหน้าจัดซื้อ
//         break
//       default:
//         redirect('/request')   // คนทั่วไป ไปหน้าเบิกของ
//         break
//     }
    
//   } catch (error) {
//     // ถ้า Token มีปัญหา ไล่ไป Login ใหม่
//     redirect('https://admin-system.com/login')
//   }

//   // ในทางทฤษฎี Code จะไม่เคยรันมาถึงตรงนี้ เพราะโดน redirect ไปก่อนหมดแล้ว
//   return null 
// }

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
            href="/procurement"
            className="btn btn-outline flex flex-col items-center py-6 shadow-md hover:shadow-lg transition rounded-xl"
          >
            <span className="text-3xl mb-2">💰</span>
            <span className="text-lg font-semibold">Procurement</span>
          </a>

          <a
            href="/requests"
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
