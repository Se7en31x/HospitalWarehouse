import NotificationsClient, { Notification } from './NotificationsClient';

export const dynamic = 'force-dynamic';

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1,  title: 'สต็อกใกล้หมด',           message: 'ยาพาราเซตามอล 500mg เหลือ 12 หน่วย (ต่ำกว่าเกณฑ์ขั้นต่ำ 50)',     time: '10 นาทีที่แล้ว',   type: 'warning', category: 'สต็อก',    read: false },
  { id: 2,  title: 'รับพัสดุสำเร็จ',          message: 'ล็อต LOT-2026-0312 รับเข้าคลังเรียบร้อย จำนวน 200 รายการ',         time: '1 ชั่วโมงที่แล้ว', type: 'success', category: 'รับพัสดุ', read: false },
  { id: 3,  title: 'คำขอเบิกรอดำเนินการ',     message: 'แผนกอุบัติเหตุ-ฉุกเฉิน ส่งคำขอเบิกพัสดุ REQ-2026-0447',           time: '2 ชั่วโมงที่แล้ว', type: 'info',    category: 'คำขอ',     read: false },
  { id: 4,  title: 'พัสดุหมดอายุ',            message: 'ถุงมือยางปลอดเชื้อ รุ่น L จำนวน 5 กล่อง หมดอายุวันที่ 20 มี.ค. 69', time: '3 ชั่วโมงที่แล้ว', type: 'error',   category: 'สต็อก',    read: false },
  { id: 5,  title: 'รับคืนพัสดุ',             message: 'แผนกศัลยกรรมคืนพัสดุเลขที่ RET-2026-0089 เรียบร้อย',               time: '5 ชั่วโมงที่แล้ว', type: 'success', category: 'คืนพัสดุ', read: true  },
  { id: 6,  title: 'สต็อกใกล้หมด',           message: 'ถุงน้ำเกลือ NSS 0.9% 1000ml เหลือ 30 ถุง',                          time: '6 ชั่วโมงที่แล้ว', type: 'warning', category: 'สต็อก',    read: true  },
  { id: 7,  title: 'อนุมัติคำขอแล้ว',         message: 'คำขอ REQ-2026-0441 ของแผนก ICU ได้รับการอนุมัติแล้ว',               time: 'เมื่อวาน',          type: 'success', category: 'คำขอ',     read: true  },
  { id: 8,  title: 'ปฏิเสธคำขอ',             message: 'คำขอ REQ-2026-0438 ถูกปฏิเสธ เนื่องจากสต็อกไม่เพียงพอ',            time: 'เมื่อวาน',          type: 'error',   category: 'คำขอ',     read: true  },
  { id: 9,  title: 'ล็อตพัสดุใหม่',          message: 'บันทึกล็อต LOT-2026-0311 จากผู้จัดจำหน่าย บ.เมดิทอป จำกัด',         time: '2 วันที่แล้ว',     type: 'info',    category: 'รับพัสดุ', read: true  },
  { id: 10, title: 'ระบบตรวจสอบสต็อก',        message: 'ระบบตรวจสอบสต็อกประจำวันเสร็จสิ้น พบ 3 รายการที่ต้องดำเนินการ',  time: '2 วันที่แล้ว',     type: 'info',    category: 'ระบบ',     read: true  },
  { id: 11, title: 'สต็อกหมด',               message: 'ไซริงค์ 5ml หมดสต็อก กรุณาดำเนินการสั่งซื้อโดยด่วน',               time: '3 วันที่แล้ว',     type: 'error',   category: 'สต็อก',    read: true  },
  { id: 12, title: 'รับพัสดุสำเร็จ',          message: 'ล็อต LOT-2026-0308 รับเข้าคลังเรียบร้อย จำนวน 88 รายการ',          time: '3 วันที่แล้ว',     type: 'success', category: 'รับพัสดุ', read: true  },
];

export default function NotificationsPage() {
  return <NotificationsClient initialNotifications={MOCK_NOTIFICATIONS} />;
}