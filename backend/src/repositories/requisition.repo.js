const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RequisitionRepository {
  /**
   * Helper สำหรับเลือกใช้ Transaction Client หรือ Global Prisma Client
   * @private
   */
  _client(tx) {
    return tx || prisma;
  }

  /**
   * สร้างเลขที่เอกสารอัตโนมัติ (เช่น REQ-6901-0001)
   */
  async generateDocNo(type, tx) {
    const prefix = type === 'WITHDRAW' ? 'REQ' : 'BOR';
    const date = new Date();
    const year = (date.getFullYear() + 543).toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const docPrefix = `${prefix}-${year}${month}-`;

    const lastDoc = await this._client(tx).requisition_header.findFirst({
      where: { doc_no: { startsWith: docPrefix } },
      orderBy: { doc_no: 'desc' },
      select: { doc_no: true } // ดึงมาแค่ฟิลด์ที่ใช้เพื่อลดภาระ DB
    });

    let runNo = 1;
    if (lastDoc?.doc_no) {
      const lastSequence = lastDoc.doc_no.split('-').pop();
      const parsedNo = parseInt(lastSequence, 10);
      runNo = isNaN(parsedNo) ? 1 : parsedNo + 1; // ป้องกันกรณี Parse ค่าไม่ได้
    }

    return `${docPrefix}${runNo.toString().padStart(4, '0')}`;
  }

  /**
   * บันทึกหัวข้อใบเบิก
   */
  async createHeader(data, tx) {
    return await this._client(tx).requisition_header.create({
      data: {
        doc_no: data.doc_no,
        type: data.type,
        status: 'PENDING',
        department_code: data.department_code,
        department_name: data.department_name,
        requester_id: data.requester_id,
        note: data.note,
        due_date: data.due_date ? new Date(data.due_date) : null,
      },
    });
  }

  /**
   * บันทึกรายการใบเบิก
   */
  async createItems(items, headerId, tx) {
    return await this._client(tx).requisition_item.createMany({
      data: items.map(item => {
        const qty = Number(item.qty) || 0; // ป้องกันค่า NaN
        return {
          header_id: headerId,
          item_id: item.item_id,
          req_qty: qty,
          approved_qty: qty,
          note: item.note,
        };
      }),
    });
  }

  /**
   * ดึงข้อมูลใบเบิกทั้งหมด
   */
  async getRequisitions(filters = {}) {
    return await prisma.requisition_header.findMany({
      where: {
        ...(filters.department_codes && { department_code: { in: filters.department_codes } }),
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type })
      },
      include: {
        requisition_item: {
          include: { items: { select: { name: true, code: true, current_stock: true } } }
        }
      },
      orderBy: { request_date: 'desc' }
    });
  }

  /**
   * ดึงข้อมูลใบเบิกตาม ID
   */
  async getRequisitionById(id) {
    return await prisma.requisition_header.findUnique({
      where: { id: Number(id) },
      include: { requisition_item: { include: { items: true } } }
    });
  }

  /**
   * อัปเดตรายการใบเบิก (สำหรับอนุมัติ)
   */
  async updateRequisitionItem(reqItemId, data, tx) {
    return await this._client(tx).requisition_item.update({
      where: { id: reqItemId },
      data
    });
  }

  /**
   * อัปเดตสถานะใบเบิก
   */
  async updateHeaderStatus(headerId, status, approverId, note, tx) {
    return await this._client(tx).requisition_header.update({
      where: { id: Number(headerId) },
      data: { 
        status, 
        approver_id: approverId,
        ...(note !== undefined && { note }) // เช็ค undefined เผื่อกรณีต้องการบันทึก string ว่าง
      }
    });
  }

  /**
   * ดึงข้อมูลล็อตสินค้า (FEFO)
   */
  async getItemLots(itemId, tx) {
    return await this._client(tx).item_lots.findMany({
      where: { 
        item_id: itemId, 
        quantity: { gt: 0 },
        status: 'ACTIVE' // เพิ่มเช็คสถานะล็อตด้วยเพื่อความปลอดภัย
      },
      orderBy: [
        { expired_at: 'asc' }, // แก้ Typo เป็น expired_at
        { created_at: 'asc' }  // เพิ่ม Secondary Sort (FIFO) เผื่อกรณีไม่มีวันหมดอายุ
      ]
    });
  }

  /**
   * ตัดสต็อกล็อตสินค้า
   * ข้อควรระวัง: ต้องใช้ id ของล็อตแทน lot_code เพราะ lot_code ไม่ใช่ Unique เดี่ยวๆ ใน Schema
   */
  async decrementLotStock(lotId, quantity, tx) {
    return await this._client(tx).item_lots.update({
      where: { id: lotId }, 
      data: { quantity: { decrement: quantity } }
    });
  }

  /**
   * บันทึกการจัดสรรสต็อก
   */
  async createAllocation(data, tx) {
    return await this._client(tx).item_allocation.create({ data });
  }

  /**
   * บันทึกการเคลื่อนไหวสต็อก (เราไม่จำเป็นต้องสร้างฟังก์ชันซ้ำซ้อนถ้ามีใน stockmovement.repo แล้ว แต่ใส่ไว้ในนี้ก็ได้ถ้าระบบต้องการ)
   */
  async createStockMovement(data, tx) {
    return await this._client(tx).stocks_movement.create({ data });
  }

  /**
   * บันทึก Log Transaction
   */
  async createTransactionLog(data, tx) {
    return await this._client(tx).logs_transaction.create({ data });
  }

  async withTransaction(callback) {
    // ให้ Repo เป็นคนเรียก Prisma คุยกับ DB
    return await prisma.$transaction(callback, {
      maxWait: 5000,
      timeout: 15000
    });
  }
}

module.exports = new RequisitionRepository();