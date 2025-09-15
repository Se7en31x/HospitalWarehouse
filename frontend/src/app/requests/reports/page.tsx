'use client';
import React from 'react';
import { FileBarChart, Archive, HandHelping, Undo2, User } from 'lucide-react';

const ReportsOverviewPage = () => {
  const reports = [
    {
      name: 'รายงานการเบิก',
      path: '/requests/reports/withdraw',
      icon: <Archive className="w-8 h-8 text-blue-600" />,
      desc: 'ติดตามว่าใครเบิกอะไร จำนวนเท่าไร และสถานะการเบิก',
      value: '28',
      unit: 'รายการ',
      bgColor: 'bg-blue-50',
      details: [
        'ใครเบิก (ชื่อ, แผนก)',
        'เบิกอะไร จำนวนเท่าไร หน่วยอะไร',
        'วันที่เบิก',
        'สถานะ (รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ)',
      ],
    },
    {
      name: 'รายงานการยืม',
      path: '/requests/reports/borrow',
      icon: <HandHelping className="w-8 h-8 text-green-600" />,
      desc: 'ตรวจสอบการยืม ว่าคืนครบหรือยัง และสถานะล่าสุด',
      value: '15',
      unit: 'รายการ',
      bgColor: 'bg-green-50',
      details: [
        'ใครยืม (ชื่อ, แผนก)',
        'ยืมอะไร จำนวนเท่าไร',
        'วันที่ยืม, วันที่กำหนดคืน',
        'สถานะ (ยืมอยู่, คืนครบ, คืนไม่ครบ, ชำรุด, สูญหาย)',
      ],
    },
    {
      name: 'รายงานการคืน',
      path: '/requests/reports/return',
      icon: <Undo2 className="w-8 h-8 text-indigo-600" />,
      desc: 'แสดงข้อมูลการคืนของ พร้อมจำนวนที่คืนครบ/ไม่ครบ',
      value: '12',
      unit: 'รายการ',
      bgColor: 'bg-indigo-50',
      details: [
        'รหัสคำขอยืมที่เกี่ยวข้อง',
        'คืนเมื่อไร',
        'จำนวนที่คืนครบ/ไม่ครบ',
        'หมายเหตุ (เช่น ชำรุด, สูญหาย)',
      ],
    },
    {
      name: 'รายงานสรุปส่วนตัว',
      path: '/requests/reports/personal',
      icon: <User className="w-8 h-8 text-purple-600" />,
      desc: 'สรุปพฤติกรรมการเบิก/ยืมย้อนหลังของผู้ใช้งาน',
      value: '43',
      unit: 'ครั้ง',
      bgColor: 'bg-purple-50',
      details: [
        'จำนวนครั้งที่เบิก/ยืมในแต่ละเดือน',
        'พัสดุที่เบิกบ่อย',
        'พัสดุที่ยืมบ่อย',
        'ประวัติการใช้งาน',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-3 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <FileBarChart className="w-10 h-10 text-indigo-600" />
          </div>
          รายงานการใช้งาน
        </h1>
        <p className="text-gray-600 text-lg ml-20">ติดตามและวิเคราะห์ข้อมูลการใช้งานระบบอย่างครอบคลุม</p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {reports.map((r, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden h-[420px] flex flex-col group hover:-translate-y-1"
          >
            {/* Card Header */}
            <div className="p-8 flex-shrink-0">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-5">
                  <div className={`p-4 ${r.bgColor} rounded-xl group-hover:scale-105 transition-transform duration-300`}>
                    {r.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-indigo-600 transition-colors">
                      {r.name}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                </div>
                
                {/* Value Display */}
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-800">
                      {r.value}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">{r.unit}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="px-8 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">รายละเอียดที่รวม</h4>
                <div className="space-y-3">
                  {r.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-gray-600 group-hover:text-gray-700 transition-colors">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm leading-relaxed">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="p-8 pt-6 flex-shrink-0">
              <div className="flex justify-end">
                <button className="bg-indigo-600 text-white text-sm py-3 px-6 rounded-xl font-medium hover:bg-indigo-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                  ดูรายงานแบบละเอียด
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 text-center">
        <p className="text-gray-500">
          อัพเดทล่าสุด: {new Date().toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
};

export default ReportsOverviewPage;