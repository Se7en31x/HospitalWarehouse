# 🏥 HPK Warehouse Management — Frontend

> ระบบบริหารจัดการคลังเวชภัณฑ์โรงพยาบาล (Hospital Warehouse Management System)  
> Full-featured web application built with **Next.js 16**, **React 19**, and **TypeScript**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3FCF8E?logo=supabase)](https://supabase.com/)

---

## 📖 Overview

HPK Warehouse Web เป็น Frontend ของระบบบริหารจัดการคลังเวชภัณฑ์สำหรับโรงพยาบาล ออกแบบมาเพื่อรองรับ Workflow การทำงานจริง ตั้งแต่การรับเข้า สต็อก เบิกจ่าย ยืม-คืน ไปจนถึงรายงานและ Dashboard วิเคราะห์ข้อมูล

ระบบนี้เป็นส่วนหนึ่งของ **HPK Hospital Management System (HMS)** — ระบบ Multi-App ที่ใช้ Supabase เป็นศูนย์กลาง Authentication แบบ SSO (Single Sign-On) ร่วมกับ Portal หลัก

### 🎯 Key Highlights

- **Production-Ready** — Deploy บน Azure / Vercel ใช้งานจริงในโรงพยาบาล
- **Role-Based Access Control** — ระบบแบ่ง Role (Admin, Warehouse Manager, Staff, Department User) ด้วย Middleware ทั้ง Client & Server side
- **Real-time Notifications** — ใช้ Socket.IO สำหรับแจ้งเตือนแบบ Real-time
- **Comprehensive Reports** — รายงาน PDF / Excel พร้อม Charts & Analytics Dashboard
- **Responsive Design** — รองรับทุกขนาดหน้าจอ ตั้งแต่ Mobile ถึง Desktop

---

## ✨ Features

### 📦 Warehouse Management (สำหรับเจ้าหน้าที่คลัง)
| Feature | Description |
|---|---|
| **Dashboard** | แดชบอร์ดภาพรวมคลัง พร้อม Charts (Recharts / Chart.js) |
| **Items Management** | จัดการรายการเวชภัณฑ์ พร้อม Barcode/QR Code |
| **Lot Management** | จัดการ Lot เวชภัณฑ์ ติดตาม Lot Code, วันหมดอายุ, ราคาทุน |
| **Stock-In (Receive)** | บันทึกรับเข้าเวชภัณฑ์ รองรับรับจาก Supplier / โอนย้าย |
| **Requisition Processing** | อนุมัติ / จัดสรร / จ่ายเวชภัณฑ์ตามใบเบิก |
| **Borrow & Return** | จัดการกระบวนการยืม-คืนเวชภัณฑ์ระหว่างแผนก |
| **Reusable Items** | ติดตามครุภัณฑ์ (Medical Assets) ด้วย Unit-level tracking |
| **Return Requests** | จัดการคำขอคืนครุภัณฑ์จากแผนกต่าง ๆ |
| **Reports** | รายงานสต็อก, การเคลื่อนไหว, Lot ใกล้หมดอายุ — Export PDF/Excel |
| **Stock Movement** | ประวัติการเคลื่อนไหวสต็อกทั้งหมด |
| **Settings** | ตั้งค่าระบบ (Categories, Units, Warehouses, Suppliers) |
| **Notifications** | ศูนย์แจ้งเตือน Real-time (สต็อกต่ำ, ใบเบิกใหม่, ฯลฯ) |

### 📋 Request Portal (สำหรับผู้ใช้ทั่วไป / แผนก)
| Feature | Description |
|---|---|
| **Withdraw Request** | สร้างใบเบิกเวชภัณฑ์ (สิ้นเปลือง) |
| **Borrow Request** | สร้างใบยืมเวชภัณฑ์ (ยืม-คืน) |
| **Return Item** | คืนเวชภัณฑ์ที่ยืม พร้อมแนบรูปภาพ |
| **Return Request** | ส่งคำขอคืนครุภัณฑ์ให้คลังมารับ |
| **History** | ประวัติการเบิก-ยืมทั้งหมด |
| **Profile** | โปรไฟล์ผู้ใช้ |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 3 |
| **Animation** | Framer Motion, Lottie |
| **Charts** | Recharts, Chart.js + react-chartjs-2 |
| **Icons** | Lucide React |
| **Authentication** | Supabase Auth (SSR via `@supabase/ssr`) |
| **File Upload** | React Dropzone |
| **Export** | jsPDF + jspdf-autotable, ExcelJS |
| **Barcode/QR** | react-barcode, react-qr-code |
| **Real-time** | Socket.IO Client |
| **Notifications** | React Hot Toast, SweetAlert2 |
| **State** | React Context API + Custom Hooks |

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing Page (เลือก Portal)
│   ├── layout.tsx                # Root Layout
│   ├── loading.tsx               # Global Loading UI
│   ├── globals.css               # Global Styles
│   ├── api/                      # API Routes (Next.js)
│   ├── warehouse/                # 🏢 Warehouse Module
│   │   ├── page.tsx              #   Dashboard
│   │   ├── layout.tsx            #   Sidebar Layout
│   │   ├── items/                #   จัดการรายการเวชภัณฑ์
│   │   ├── lots/                 #   จัดการ Lot
│   │   ├── receives/             #   รับเข้า (Stock-In)
│   │   ├── requests/             #   จัดการใบเบิก
│   │   ├── returns/              #   จัดการยืม-คืน
│   │   ├── returns-department/   #   จัดการคำขอคืนครุภัณฑ์
│   │   ├── assets/               #   จัดการครุภัณฑ์
│   │   ├── reports/              #   รายงาน
│   │   ├── stock-movement/       #   ประวัติเคลื่อนไหวสต็อก
│   │   ├── notifications/        #   แจ้งเตือน
│   │   ├── settings/             #   ตั้งค่าระบบ
│   │   └── profile/              #   โปรไฟล์
│   └── request/                  # 📋 Request Module (ผู้ใช้ทั่วไป)
│       ├── page.tsx              #   หน้าหลัก
│       ├── layout.tsx            #   Sidebar Layout
│       ├── withdraw/             #   เบิกเวชภัณฑ์
│       ├── borrow/               #   ยืมเวชภัณฑ์
│       ├── returnitem/           #   คืนเวชภัณฑ์
│       ├── return-requests/      #   คำขอคืนครุภัณฑ์
│       ├── history/              #   ประวัติ
│       ├── notifications/        #   แจ้งเตือน
│       └── profile/              #   โปรไฟล์
├── components/                   # Shared Components
│   ├── ui/                       #   UI Primitives (Buttons, Modals, etc.)
│   ├── layouts/                  #   Layout Components (Sidebar, Navbar)
│   ├── shared/                   #   Shared Components
│   ├── skeletons/                #   Loading Skeletons
│   ├── notifications/            #   Notification Components
│   ├── returns/                  #   Return-specific Components
│   └── feedback/                 #   Feedback/Empty State Components
├── services/                     # API Service Layer (18 services)
├── hooks/                        # Custom React Hooks (useAuth, useNavProfile)
├── context/                      # React Context Providers
├── types/                        # TypeScript Type Definitions
├── lib/                          # Utility Libraries
├── constants/                    # Application Constants
├── utils/                        # Utility Functions
└── middleware.ts                  # Next.js Middleware (Auth + RBAC)
```

---

## 🔐 Authentication & Authorization

ระบบใช้ **Supabase Auth** เป็น Identity Provider โดยทำงานแบบ SSO ร่วมกับ Portal กลาง (`hpk-hms.site`)

### Middleware Flow
1. ตรวจสอบ Session ผ่าน Supabase SSR — ถ้าไม่มี redirect ไป Portal
2. แกะ Role จาก `app_metadata.role.name` (admin, warehouse_manager, warehouse_staff, etc.)
3. แกะ Systems จาก `app_metadata.systems` (Warehouse, Borrow-Return)
4. Route Guard ตาม Path:
   - `/warehouse/*` → ต้องเป็น warehouse_manager / warehouse_staff หรือมี system "Warehouse"
   - `/request/*` → ต้องมี system "Borrow-Return"
   - `/request/borrow, /request/returnitem` → ต้องเป็น warehouse staff หรือ department ที่อนุญาต
   - Admin → ผ่านได้ทุกหน้า

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm / yarn / pnpm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd hpk-warehouse-web

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anonymous key
NEXT_PUBLIC_API_URL=              # Backend API URL (e.g. http://localhost:4000)
```

### Development

```bash
npm run dev        # Start dev server on port 3001
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

---

## 🔗 Related Repositories

| Repository | Description |
|---|---|
| **hpk-warehouse-api** | Backend REST API (Express.js + Prisma + PostgreSQL) |
| HPK HMS Portal | Portal หลัก — จัดการ SSO, Role, Systems |

---

## 📄 License

This project is developed as part of a final project for educational and professional portfolio purposes.
