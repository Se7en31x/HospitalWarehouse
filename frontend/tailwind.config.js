/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          // สีพื้นหลังเบาๆ หรือสี Hover
          light: "#F0F7FF", 
          // สีหลัก (Primary Blue) ที่ใช้ใน Sidebar/Buttons
          DEFAULT: "#2563EB", 
          // สีน้ำเงินเข้ม (Deep Navy) สำหรับ Navbar/Text
          dark: "#1E3A8A", 
          // สีเขียวแบบการแพทย์ (สดใสแต่ดูสะอาด)
          green: "#10B981", 
          // เพิ่มสีเทา Slate สำหรับ UI Elements
          slate: {
            50: "#F8FAFC",
            100: "#F1F5F9",
            200: "#E2E8F0",
            600: "#475569",
            900: "#0F172A",
          }
        },
        // เพิ่มสีสถานะ (Status Colors) สำหรับระบบคลัง
        status: {
          success: "#10B981", // ของพอ/เบิกได้
          warning: "#F59E0B", // ใกล้หมด/รอตรวจสอบ
          danger: "#EF4444",  // ของขาด/หมดอายุ
          info: "#3B82F6",    // ทั่วไป
        }
      },
      fontFamily: {
        // แนะนำให้ใช้ 'Inter' หรือ 'Sarabun' สำหรับภาษาไทยเพื่อให้ดูเป็นทางการ
        sans: ["Inter", "Sarabun", "sans-serif"],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};