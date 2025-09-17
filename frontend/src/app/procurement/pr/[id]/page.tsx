'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Loader2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Mock Data Generation
const generateMockData = () => {
  const departments = ['คลังสินค้า', 'IT', 'บัญชี', 'การเงิน', 'HR', 'การตลาด', 'ฝ่ายขาย'];
  const requestors = ['สมชาย อินทร์ดี', 'สุดา เทคโน', 'มาลี คิดเลข', 'วิชัย ร่ำรวย', 'นารี ฝึกงาน', 'ชูชัย ขายเก่ง', 'พิมพิศ โฆษณา'];
  const statuses = ['pending', 'sourcing', 'completed'];
  const itemTypes = [
    { name: 'เครื่องพิมพ์เลเซอร์', category: 'อุปกรณ์สำนักงาน', unit: 'เครื่อง' },
    { name: 'คอมพิวเตอร์ตั้งโต๊ะ', category: 'อุปกรณ์คอมพิวเตอร์', unit: 'เครื่อง' },
    { name: 'โปรแกรมบัญชี', category: 'ซอฟต์แวร์', unit: 'ลิขสิทธิ์' },
    { name: 'โต๊ะทำงาน', category: 'เฟอร์นิเจอร์', unit: 'ตัว' },
    { name: 'เก้าอี้สำนักงาน', category: 'เฟอร์นิเจอร์', unit: 'ตัว' },
    { name: 'กระดาษ A4', category: 'เครื่องเขียน', unit: 'รีม' },
    { name: 'เครื่องเย็บกระดาษ', category: 'อุปกรณ์สำนักงาน', unit: 'อัน' },
    { name: 'หมึกพิมพ์', category: 'วัสดุสิ้นเปลือง', unit: 'ตลับ' },
    { name: 'โน้ตบุ๊ก', category: 'อุปกรณ์คอมพิวเตอร์', unit: 'เครื่อง' },
    { name: 'จอแสดงผล 24 นิ้ว', category: 'อุปกรณ์คอมพิวเตอร์', unit: 'เครื่อง' },
    { name: 'เมาส์ไร้สาย', category: 'อุปกรณ์คอมพิวเตอร์', unit: 'อัน' },
    { name: 'คีย์บอร์ด', category: 'อุปกรณ์คอมพิวเตอร์', unit: 'อัน' },
    { name: 'ปากกาเจลสีดำ', category: 'เครื่องเขียน', unit: 'แท่ง' },
    { name: 'แฟ้มเอกสาร', category: 'อุปกรณ์สำนักงาน', unit: 'อัน' },
    { name: 'กระดานไวท์บอร์ด', category: 'อุปกรณ์สำนักงาน', unit: 'แผ่น' },
  ];

  const generateRandomPR = (index) => {
    const prId = `PR-2025-${String(index + 1).padStart(3, '0')}`;
    const requestDate = `2025-09-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
    const department = departments[Math.floor(Math.random() * departments.length)];
    const requestor = requestors[Math.floor(Math.random() * requestors.length)];
    const numberOfItems = Math.floor(Math.random() * 5) + 1;
    const items = Array.from({ length: numberOfItems }, (v, i) => {
      const item = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      return {
        ...item,
        id: `item-${index}-${i}`,
        quantity: Math.floor(Math.random() * 50) + 1,
        rfq_sent_to: [],
      };
    });

    const totalEstimate = items.reduce((sum) => sum + (Math.floor(Math.random() * 50000) + 1000), 0);
    const note = Math.random() > 0.6 ? `เร่งด่วนสำหรับแผนก ${department}` : undefined;

    const history = [{ status: 'pending', date: `${requestDate} 09:00` }];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    if (status !== 'pending') {
      history.push({ status: 'sourcing', date: `${requestDate} 12:00` });
    }
    if (status === 'completed') {
      history.push({ status: 'completed', date: `${requestDate} 16:00` });
    }

    return {
      id: prId,
      requestDate,
      department,
      requestor,
      status,
      items,
      note,
      totalEstimate,
      history,
    };
  };

  const initialData = Array.from({ length: 30 }, (_, i) => generateRandomPR(i));
  return initialData;
};

const PRDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const prId = params.id;

  const [prDetails, setPrDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [supplierNames, setSupplierNames] = useState('');

  useEffect(() => {
    if (prId) {
      setIsLoading(true);
      setTimeout(() => {
        const mockData = generateMockData();
        const foundPR = mockData.find(pr => pr.id === prId);
        if (foundPR) {
          setPrDetails(foundPR);
        } else {
          setIsNotFound(true);
        }
        setIsLoading(false);
      }, 500);
    }
  }, [prId]);

  const statusConfig = {
    pending: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    sourcing: { label: 'กำลังจัดหา', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
    completed: { label: 'ปิดงาน', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  };

  const itemStatusConfig = {
    pending: { label: 'รอดำเนินการ', color: 'bg-gray-100 text-gray-800' },
    sourcing: { label: 'สร้าง RFQ แล้ว', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'สั่งซื้อแล้ว', color: 'bg-green-100 text-green-800' },
  };

  const openRFQModal = () => {
    setIsRFQModalOpen(true);
    setSelectedItems(prDetails.items.filter(item => item.rfq_sent_to.length === 0));
    setSupplierNames('');
  };

  const closeRFQModal = () => {
    setIsRFQModalOpen(false);
    setSelectedItems([]);
    setSupplierNames('');
  };

  const createRFQ = () => {
    const suppliers = supplierNames.split(',').map(s => s.trim()).filter(s => s);
    if (selectedItems.length === 0) {
      toast.error('กรุณาเลือกรายการสินค้าที่ต้องการสร้าง RFQ');
      return;
    }
    if (suppliers.length === 0) {
      toast.error('กรุณาระบุชื่อผู้ขายอย่างน้อย 1 ราย');
      return;
    }

    // Update local state (for demonstration)
    const updatedPrDetails = {
      ...prDetails,
      status: prDetails.status === 'pending' ? 'sourcing' : prDetails.status,
      history: prDetails.status === 'pending' ? [...prDetails.history, { status: 'sourcing', date: new Date().toLocaleString('th-TH') }] : prDetails.history,
      items: prDetails.items.map(item => ({
        ...item,
        rfq_sent_to: selectedItems.some(si => si.id === item.id) ? [...item.rfq_sent_to, ...suppliers] : item.rfq_sent_to,
      })),
    };
    setPrDetails(updatedPrDetails);

    closeRFQModal();
    toast.success(`สร้าง RFQ สำหรับ ${selectedItems.length} รายการ และส่งให้ ${suppliers.join(', ')} แล้ว`, {
      style: { borderRadius: '8px', background: '#1f2937', color: '#fff' },
    });
  };

  const handleItemToggle = (item) => {
    setSelectedItems((prev) =>
      prev.some(i => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin mr-2 text-indigo-600" size={24} /> กำลังโหลดข้อมูล...
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-500">
        <div className="text-4xl font-bold text-gray-800 mb-4">404</div>
        <div className="text-xl mb-8">ไม่พบคำขอจัดซื้อ (PR) ที่ระบุ</div>
        <a href="/procurement/pr" className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> กลับไปยังรายการคำขอจัดซื้อ
        </a>
      </div>
    );
  }
  
  const StatusIcon = statusConfig[prDetails.status].icon;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toaster />
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft size={20} className="mr-2" /> กลับไปยังรายการทั้งหมด
        </button>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">รายละเอียดคำขอจัดซื้อ (PR)</h1>
          <span className={`inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full ${statusConfig[prDetails.status].color}`}>
            <StatusIcon size={16} className="mr-2" />
            {statusConfig[prDetails.status].label}
          </span>
        </div>

        {/* PR Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8 text-base text-gray-700 bg-gray-50 p-6 rounded-lg">
          <div>
            <div className="font-semibold text-gray-500">เลขที่ PR</div>
            <div className="font-bold text-gray-900 text-lg">{prDetails.id}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-500">ผู้ขอ</div>
            <div>{prDetails.requestor}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-500">แผนก</div>
            <div>{prDetails.department}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-500">วันที่ขอ</div>
            <div>{new Date(prDetails.requestDate).toLocaleDateString('th-TH')}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-500">ประมาณการรวม</div>
            <div className="font-bold text-gray-900">฿{prDetails.totalEstimate.toLocaleString()}</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">รายการสินค้า</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-100 text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">ชื่อสินค้า</th>
                  <th className="px-6 py-3 font-medium">หมวดหมู่</th>
                  <th className="px-6 py-3 font-medium text-right">จำนวน</th>
                  <th className="px-6 py-3 font-medium text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {prDetails.items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4">{item.category}</td>
                    <td className="px-6 py-4 text-right">{item.quantity} {item.unit}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${item.rfq_sent_to.length > 0 ? itemStatusConfig.sourcing.color : itemStatusConfig.pending.color}`}>
                        {item.rfq_sent_to.length > 0 ? (
                          <>
                            <span className="mr-1">ส่ง RFQ แล้ว</span>
                            {/* <span className="text-gray-500">({item.rfq_sent_to.join(', ')})</span> */}
                          </>
                        ) : (
                          itemStatusConfig.pending.label
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes Section */}
        {prDetails.note && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">หมายเหตุ</h3>
            <p className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700">{prDetails.note}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            className="px-6 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
            onClick={openRFQModal}
            disabled={prDetails.status === 'completed'}
          >
            ดำเนินการจัดซื้อ
          </button>
        </div>
      </div>
      
      {/* RFQ Modal (Hidden by default) */}
      {isRFQModalOpen && prDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative transform transition-all scale-100 opacity-100">
            {/* Close Button */}
            <button
              onClick={closeRFQModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="ปิด"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">สร้าง RFQ สำหรับ PR: {prDetails.id}</h2>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">ชื่อผู้ขาย (คั่นด้วย ,):</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="เช่น ผู้ขาย A, ผู้ขาย B"
                value={supplierNames}
                onChange={(e) => setSupplierNames(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">เลือกรายการสินค้า</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {prDetails.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.some(i => i.id === item.id)}
                      onChange={() => handleItemToggle(item)}
                      className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label className="text-sm text-gray-700">
                      {item.name} <span className="text-gray-500 text-xs">({item.quantity} {item.unit})</span>
                      {item.rfq_sent_to && item.rfq_sent_to.length > 0 && (
                          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            ส่ง RFQ แล้ว: {item.rfq_sent_to.join(', ')}
                          </span>
                        )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={closeRFQModal}
                className="px-4 py-2 rounded-lg text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={createRFQ}
                className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                disabled={selectedItems.length === 0 || !supplierNames.trim()}
              >
                ยืนยันการสร้าง RFQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PRDetailsPage;