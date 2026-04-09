// Types for History
export interface Item {
  itemId: string;
  itemName: string;
  qty: number;
  unit: string;
  category: string;
}

export interface Request {
  requestId: string;
  type: string;
  date: string;
  time: string;
  status: string;
  location?: string;
  items: Item[];
  returnDate?: string;
  returnTime?: string;
  returnedQuantity?: number;
  reason?: string;
}

// Sample history data
export const HISTORY_DATA: Request[] = [
  {
    requestId: 'REQ-001',
    type: 'เบิก',
    date: '2025-09-10',
    time: '14:30',
    status: 'อนุมัติ',
    location: 'คลังกลาง A1',
    items: [
      { itemId: 'ITM001', itemName: 'ชุดตรวจ ATK', qty: 50, unit: 'ชิ้น', category: 'อุปกรณ์ทางการแพทย์' },
      { itemId: 'ITM002', itemName: 'ถุงมือยาง', qty: 10, unit: 'กล่อง', category: 'วัสดุสิ้นเปลือง' },
    ],
  },
  {
    requestId: 'REQ-002',
    type: 'เบิก',
    date: '2025-09-12',
    time: '09:15',
    status: 'รออนุมัติ',
    location: 'คลังกลาง B2',
    items: [
      { itemId: 'ITM003', itemName: 'ผ้าก๊อซปลอดเชื้อ', qty: 20, unit: 'กล่อง', category: 'อุปกรณ์ทางการแพทย์' },
    ],
  },
  {
    requestId: 'REQ-003',
    type: 'ยืม',
    date: '2025-09-11',
    time: '16:45',
    status: 'ยืมอยู่',
    returnDate: '2025-09-20',
    returnTime: '16:45',
    location: 'คลังกลาง M1',
    items: [
      { itemId: 'EQP001', itemName: 'เครื่องวัดความดัน', qty: 2, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
      { itemId: 'EQP003', itemName: 'รถเข็นวีลแชร์', qty: 1, unit: 'คัน', category: 'อุปกรณ์ช่วยเหลือ' },
    ],
  },
  {
    requestId: 'REQ-004',
    type: 'ยืม',
    date: '2025-09-08',
    time: '10:00',
    status: 'คืนครบ',
    returnDate: '2025-09-15',
    returnTime: '10:00',
    location: 'คลังกลาง M2',
    items: [
      { itemId: 'EQP004', itemName: 'เครื่องพ่นยา', qty: 1, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
    ],
  },
  {
    requestId: 'REQ-005',
    type: 'ยืม',
    date: '2025-09-07',
    time: '13:20',
    status: 'ชำรุด',
    returnDate: '2025-09-14',
    returnTime: '13:20',
    reason: 'เครื่องเสียหายจากน้ำท่วม',
    returnedQuantity: 2,
    location: 'คลังกลาง M3',
    items: [
      { itemId: 'EQP005', itemName: 'เครื่องวัดออกซิเจน', qty: 3, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
    ],
  },
  {
    requestId: 'RET-001',
    type: 'คืน',
    date: '2025-09-16',
    time: '11:00',
    status: 'คืนครบ',
    location: 'คลังกลาง M4',
    items: [
      { itemId: 'EQP002', itemName: 'เครื่องกำหนดสัญญาณชีพ', qty: 1, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
    ],
  },
  {
    requestId: 'RET-002',
    type: 'คืน',
    date: '2025-09-18',
    time: '15:30',
    status: 'คืนไม่ครบ',
    location: 'คลังกลาง M5',
    reason: 'คืนได้เพียง 2 จาก 3 เครื่อง',
    returnedQuantity: 2,
    items: [
      { itemId: 'EQP006', itemName: 'เครื่องดูดเสมหะไฟฟ้า', qty: 3, unit: 'เครื่อง', category: 'เครื่องมือแพทย์' },
    ],
  },
];
