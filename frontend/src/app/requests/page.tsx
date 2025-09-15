'use client';
import React from 'react';
import { 
  Package, 
  HandHelping, 
  Undo2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Calendar,
  User
} from 'lucide-react';

const UserDashboard = () => {
  const quickActions = [
    {
      name: 'เบิกพัสดุ',
      icon: <Package className="w-6 h-6 text-blue-600" />,
      desc: 'ขอเบิกพัสดุสำนักงาน',
      bgColor: 'bg-blue-50',
      path: '/requests/withdraw/new'
    },
    {
      name: 'ยืมพัสดุ',
      icon: <HandHelping className="w-6 h-6 text-green-600" />,
      desc: 'ขอยืมอุปกรณ์',
      bgColor: 'bg-green-50',
      path: '/requests/borrow/new'
    },
    {
      name: 'คืนพัสดุ',
      icon: <Undo2 className="w-6 h-6 text-indigo-600" />,
      desc: 'แจ้งคืนพัสดุที่ยืม',
      bgColor: 'bg-indigo-50',
      path: '/requests/return/new'
    }
  ];

  const myStats = [
    { label: 'รอดำเนินการ', value: '3', icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'อนุมัติแล้ว', value: '12', icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'ไม่อนุมัติ', value: '1', icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'ยืมอยู่', value: '5', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-50' }
  ];

  const recentRequests = [
    {
      id: 'REQ-001',
      type: 'เบิก',
      item: 'กระดาษ A4',
      quantity: '5 รีม',
      date: '15 ก.ย. 67',
      status: 'รออนุมัติ',
      statusColor: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'REQ-002',
      type: 'ยืม',
      item: 'โปรเจคเตอร์',
      quantity: '1 เครื่อง',
      date: '14 ก.ย. 67',
      status: 'อนุมัติแล้ว',
      statusColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'REQ-003',
      type: 'เบิก',
      item: 'ปากกา',
      quantity: '10 ด้าม',
      date: '13 ก.ย. 67',
      status: 'อนุมัติแล้ว',
      statusColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'REQ-004',
      type: 'ยืม',
      item: 'แล็ปท็อป',
      quantity: '1 เครื่อง',
      date: '12 ก.ย. 67',
      status: 'ยืมอยู่',
      statusColor: 'bg-blue-100 text-blue-800'
    }
  ];

  const borrowedItems = [
    {
      id: 'BOR-001',
      item: 'โปรเจคเตอร์ Epson',
      borrowDate: '14 ก.ย. 67',
      returnDate: '21 ก.ย. 67',
      daysLeft: 5,
      status: 'ปกติ'
    },
    {
      id: 'BOR-002',
      item: 'แล็ปท็อป Dell',
      borrowDate: '12 ก.ย. 67',
      returnDate: '19 ก.ย. 67',
      daysLeft: 3,
      status: 'ใกล้หมดกำหนด'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
              ภาพรวมการใช้งาน
            </h1>
            <p className="text-gray-600 ml-14">จัดการคำขอเบิก ยืม คืน ของคุณได้ที่นี่</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">วันนี้</p>
            <p className="text-lg font-semibold text-gray-800">{new Date().toLocaleDateString('th-TH')}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">การดำเนินการ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <button key={i} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 cursor-pointer text-left group hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-3">
                <div className={`p-3 ${action.bgColor} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                  {action.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-600">{action.desc}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">สถิติของฉัน</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {myStats.map((stat, i) => (
            <div key={i} className={`${stat.bg} border border-gray-300 p-4 rounded-2xl`}>
              <div className="flex items-center gap-3">
                <div className={stat.color}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Requests */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">คำขอล่าสุด</h3>
          <div className="space-y-3">
            {recentRequests.map((req, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">{req.id}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{req.type}</span>
                      <span className="font-medium text-gray-800">{req.item}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{req.quantity}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-sm text-gray-500">{req.date}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${req.statusColor}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700">
              ดูทั้งหมด
            </button>
          </div>
        </div>

        {/* Borrowed Items */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">รายการที่ยืมอยู่</h3>
          <div className="space-y-4">
            {borrowedItems.map((item, i) => (
              <div key={i} className="p-4 border-2 border-gray-300 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-800">{item.item}</h4>
                    <p className="text-sm text-gray-600">รหัส: {item.id}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>ยืม: {item.borrowDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>คืน: {item.returnDate}</span>
                    <span className={`font-medium ${
                      item.daysLeft <= 3 ? 'text-red-600' : 'text-gray-800'
                    }`}>
                      (อีก {item.daysLeft} วัน)
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button className="bg-indigo-600 text-white text-xs py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                    แจ้งคืน
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;