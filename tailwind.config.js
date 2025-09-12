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
          light: "#E0F7FA", // ฟ้าอ่อน
          DEFAULT: "#00ACC1", // ฟ้าโทนหลัก
          dark: "#006064", // ฟ้าเข้ม
          green: "#4CAF50", // เขียวโรงพยาบาล
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
