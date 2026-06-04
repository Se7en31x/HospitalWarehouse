/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ปรับแต่งสีข้อความตัวรอง (Slate) ให้เข้มขึ้นอย่างมากเพื่อไม่ให้จางเลย (Accessibility / Contrast)
        slate: {
          400: "#334155", // เข้มขึ้นอีกอย่างมาก (เทียบเท่า slate-700 เดิม)
          500: "#1e293b", // เข้มขึ้นอีกอย่างมาก (เทียบเท่า slate-800 เดิม)
          600: "#0f172a", // เข้มขึ้นอีกอย่างมาก (เทียบเท่า slate-900 เดิม)
        },
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
        sans: ["Prompt", "sans-serif"],
        prompt: ["var(--font-prompt)", "sans-serif"],
      },
      fontSize: {
        // ขยายขนาดฟอนต์ขึ้นอีก ~1px ในแต่ละระดับ
        'xs': ['0.875rem', { lineHeight: '1.25rem' }],      // ~14px (เดิม 13px)
        'sm': ['1.0rem', { lineHeight: '1.45rem' }],        // ~16px (เดิม 15px)
        'base': ['1.125rem', { lineHeight: '1.7rem' }],     // ~18px (เดิม 17px)
        'lg': ['1.25rem', { lineHeight: '1.85rem' }],       // ~20px (เดิม 19px)
        'xl': ['1.375rem', { lineHeight: '2.0rem' }],       // ~22px (เดิม 21px)
        '2xl': ['1.6875rem', { lineHeight: '2.375rem' }],   // ~27px (เดิม 26px)
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      }
    },
  },
  plugins: [],
};