'use client';
import React, { useState } from 'react';
import { Search, Package, Plus, Minus, ShoppingCart, Clock, X, ChevronLeft, ChevronRight, PackagePlus } from 'lucide-react';

const HospitalWithdrawSystem = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCartModal, setShowCartModal] = useState(false);
  const [quantities, setQuantities] = useState({});
  const itemsPerPage = 10;

  const items = [
    {
      id: 'ITM001',
      name: 'ชุดตรวจ ATK',
      category: 'อุปกรณ์ทางการแพทย์',
      unit: 'ชิ้น',
      stock: 150,
      minStock: 20,
      location: 'คลังกลาง A1',
      price: 85.0,
      status: 'ปกติ',
      imageUrl: 'https://via.placeholder.com/60?text=ATK',
      description: 'ชุดตรวจ COVID-19 แอนติเจน'
    },
    {
      id: 'ITM002',
      name: 'ถุงมือยาง',
      category: 'วัสดุสิ้นเปลือง',
      unit: 'กล่อง',
      stock: 25,
      minStock: 15,
      location: 'คลังกลาง B2',
      price: 120.0,
      status: 'ต่ำ',
      imageUrl: 'https://via.placeholder.com/60?text=Gloves',
      description: 'ถุงมือยางไนไตรล์ ขนาด M'
    },
    {
      id: 'ITM003',
      name: 'ผ้าก๊อซปลอดเชื้อ',
      category: 'อุปกรณ์ทางการแพทย์',
      unit: 'กล่อง',
      stock: 0,
      minStock: 10,
      location: 'คลังกลาง C1',
      price: 50.0,
      status: 'หมด',
      imageUrl: '',
      description: 'ผ้าก๊อซปลอดเชื้อ 4x4 นิ้ว'
    },
    {
      id: 'ITM004',
      name: 'แอลกอฮอล์ 70%',
      category: 'วัสดุสิ้นเปลือง',
      unit: 'ขวด',
      stock: 80,
      minStock: 20,
      location: 'คลังกลาง D5',
      price: 45.5,
      status: 'ปกติ',
      imageUrl: 'https://via.placeholder.com/60?text=Alcohol',
      description: 'แอลกอฮอล์เช็ดแผล 70% ขนาด 500ml'
    },
    {
      id: 'ITM005',
      name: 'เข็มฉีดยา',
      category: 'อุปกรณ์ทางการแพทย์',
      unit: 'กล่อง',
      stock: 3,
      minStock: 8,
      location: 'คลังกลาง A3',
      price: 95.0,
      status: 'ต่ำ',
      imageUrl: 'https://via.placeholder.com/60?text=Syringe',
      description: 'เข็มฉีดยา 5ml แบบใช้ครั้งเดียว'
    },
    {
      id: 'ITM006',
      name: 'หน้ากากอนามัย N95',
      category: 'อุปกรณ์ป้องกัน',
      unit: 'ชิ้น',
      stock: 40,
      minStock: 25,
      location: 'คลังกลาง E2',
      price: 15.0,
      status: 'ปกติ',
      imageUrl: '',
      description: 'หน้ากากอนามัย N95 มาตรฐาน'
    },
    {
      id: 'ITM007',
      name: 'ยาพาราเซตามอล',
      category: 'ยา',
      unit: 'เม็ด',
      stock: 2500,
      minStock: 500,
      location: 'คลังยา F1',
      price: 2.0,
      status: 'ปกติ',
      imageUrl: 'https://via.placeholder.com/60?text=Paracetamol',
      description: 'พาราเซตามอล 500mg'
    },
    {
      id: 'ITM008',
      name: 'เครื่องวัดความดัน',
      category: 'เครื่องมือแพทย์',
      unit: 'เครื่อง',
      stock: 10,
      minStock: 3,
      location: 'คลังกลาง M4',
      price: 1500.0,
      status: 'ปกติ',
      imageUrl: 'https://via.placeholder.com/60?text=BP',
      description: 'เครื่องวัดความดันโลหิตดิจิตอล'
    },
    {
      id: 'ITM009',
      name: 'สารละลายเกลือ',
      category: 'วัสดุสิ้นเปลือง',
      unit: 'ขวด',
      stock: 5,
      minStock: 15,
      location: 'คลังกลาง B4',
      price: 35.0,
      status: 'ต่ำ',
      imageUrl: '',
      description: 'สารละลายเกลือ 0.9% ขนาด 500ml'
    },
    {
      id: 'ITM010',
      name: 'สำลี',
      category: 'วัสดุสิ้นเปลือง',
      unit: 'ห่อ',
      stock: 0,
      minStock: 10,
      location: 'คลังกลาง B6',
      price: 25.0,
      status: 'หมด',
      imageUrl: '',
      description: 'สำลีก้อนสีขาว ขนาด 500g'
    },
    {
      id: 'ITM011',
      name: 'ผ้าพันแผล',
      category: 'อุปกรณ์ทางการแพทย์',
      unit: 'ม้วน',
      stock: 8,
      minStock: 20,
      location: 'คลังกลาง A5',
      price: 75.0,
      status: 'ต่ำ',
      imageUrl: 'https://via.placeholder.com/60?text=Bandage',
      description: 'ผ้าพันแผลแบบยืดหยุ่น กว้าง 5cm'
    },
    {
      id: 'ITM012',
      name: 'เทอร์โมมิเตอร์',
      category: 'เครื่องมือแพทย์',
      unit: 'เครื่อง',
      stock: 3,
      minStock: 5,
      location: 'คลังกลาง M1',
      price: 200.0,
      status: 'ต่ำ',
      imageUrl: 'https://via.placeholder.com/60?text=Thermo',
      description: 'เทอร์โมมิเตอร์ดิจิตอล แบบวางใต้ลิ้น'
    }
  ];

  const categories = ['ทั้งหมด', ...new Set(items.map(item => item.category))];
  const statuses = ['ทั้งหมด', 'ปกติ', 'ต่ำ', 'หมด'];

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ทั้งหมด' || item.status === selectedStatus;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ปกติ':
        return 'bg-green-100 text-green-800';
      case 'ต่ำ':
        return 'bg-yellow-100 text-yellow-800';
      case 'หมด':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const Badge = ({ status }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}>
      {status}
    </span>
  );

  const addToCart = (item) => {
    const quantity = quantities[item.id] || 1;
    if (quantity <= 0 || quantity > item.stock) return;

    setSelectedItems(prev => {
      const existingItem = prev.find(selected => selected.id === item.id);
      if (existingItem) {
        return prev.map(selected =>
          selected.id === item.id 
            ? { ...selected, quantity: Math.min(selected.quantity + quantity, item.stock) }
            : selected
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.stock) }];
    });

    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const removeFromCart = (itemId) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId, newQuantity) => {
    const item = items.find(i => i.id === itemId);
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setSelectedItems(prev =>
      prev.map(selected =>
        selected.id === itemId 
          ? { ...selected, quantity: Math.min(newQuantity, item.stock) }
          : selected
      )
    );
  };

  const updateFormQuantity = (itemId, newQuantity) => {
    const item = items.find(i => i.id === itemId);
    const validQuantity = Math.max(1, Math.min(newQuantity, item.stock));
    setQuantities(prev => ({ ...prev, [itemId]: validQuantity }));
  };

  const submitWithdrawRequest = () => {
    if (selectedItems.length === 0) return;
    
    alert(`ส่งคำขอเบิก ${selectedItems.length} รายการเรียบร้อย\n\nรายการ:\n${selectedItems.map(item => `- ${item.name} จำนวน ${item.quantity} ${item.unit}`).join('\n')}\n\nรอการอนุมัติจากคลัง...`);
    setSelectedItems([]);
    setQuantities({});
    setShowCartModal(false);
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ช่องค้นหาและกรอง */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <PackagePlus className="w-5 h-5 mr-2 text-indigo-600" />
            รายการวัสดุคงคลัง
          </h2>
          <button
            onClick={() => setShowCartModal(true)}
            className="relative bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>รายการที่เลือก</span>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหารหัส, ชื่อ หรือหมวดหมู่..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ตาราง */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider">#</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider">รูปภาพ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider">รหัส</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider">ชื่อพัสดุ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider">หมวดหมู่</th>
                <th className="h-12 px-6 text-center font-semibold text-slate-700 uppercase tracking-wider">คงเหลือ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider">ตำแหน่งเก็บ</th>
                <th className="h-12 px-6 text-left font-semibold text-slate-700 uppercase tracking-wider">สถานะ</th>
                <th className="h-12 px-6 text-center font-semibold text-slate-700 uppercase tracking-wider">จำนวนเบิก</th>
                <th className="h-12 px-6 text-center font-semibold text-slate-700 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="py-4 px-6 text-slate-700">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="py-4 px-6">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900">{item.id}</td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.description}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500">{item.category}</td>
                    <td className="py-4 px-6 text-center text-slate-700 font-semibold">
                      {item.stock} {item.unit}
                    </td>
                    <td className="py-4 px-6 text-slate-700">{item.location}</td>
                    <td className="py-4 px-6">
                      <Badge status={item.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={quantities[item.id] || 1}
                          onChange={(e) => updateFormQuantity(item.id, parseInt(e.target.value) || 1)}
                          disabled={item.stock === 0}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-center focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        />
                        <span className="text-xs text-gray-500 w-16 text-left">{item.unit}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => addToCart(item)}
                        disabled={item.stock === 0}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-1 text-sm transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>เพิ่ม</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Package className="w-16 h-16 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-600">ไม่พบรายการวัสดุ</h3>
                      <p className="text-gray-500">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center py-4 px-6 border-t">
          <span className="text-sm text-slate-600">
            แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-700 px-3">
              หน้า {currentPage} จาก {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col transform transition-all duration-300 scale-100 opacity-100">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-3 text-blue-600" />
                รายการที่เลือกเบิก ({selectedItems.length} รายการ)
              </h2>
              <button
                onClick={() => setShowCartModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedItems.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-600">ยังไม่มีรายการที่เลือก</p>
                  <p className="text-gray-500 mt-2">กรุณาเลือกวัสดุที่ต้องการเบิกจากตาราง</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedItems.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4 flex items-center space-x-4 hover:bg-gray-100 transition-colors duration-200">
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.id} • {item.location}</p>
                        <p className="text-sm text-blue-600 font-medium">คงเหลือ: {item.stock} {item.unit}</p>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors duration-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-lg w-12 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-600 w-16 text-left">{item.unit}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-semibold text-gray-900">
                  รวมจำนวนทั้งหมด: <span className="text-blue-600">{totalItems} รายการ</span>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCartModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-colors duration-200"
                >
                  ปิด
                </button>
                <button
                  onClick={submitWithdrawRequest}
                  disabled={selectedItems.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Clock className="w-5 h-5" />
                  <span>ส่งคำขอเบิก</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                📋 คำขอจะส่งไปยังเจ้าหน้าที่คลังเพื่อตรวจสอบและอนุมัติ
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalWithdrawSystem;