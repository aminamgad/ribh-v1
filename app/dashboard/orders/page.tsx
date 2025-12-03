'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Search, Plus, Eye, CheckCircle, Truck, Package, Clock, DollarSign, Edit, X, RotateCcw, Download, Upload, Phone, Mail, MessageCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import React from 'react'; // Added for React.createElement
import { useRouter } from 'next/navigation';
import OrderExportModal from '@/components/ui/OrderExportModal';
import OrderImportModal from '@/components/ui/OrderImportModal';
import { OrderItem } from '@/types';

// Using the global OrderItem interface from types/index.ts

interface Order {
  _id: string;
  orderNumber: string;
  customerId: string | {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  customerName?: string; // For backward compatibility
  customerRole: string;
  supplierId: string | {
    _id: string;
    name: string;
    companyName?: string;
  };
  supplierName?: string; // For backward compatibility
  items: OrderItem[];
  subtotal: number;
  commission: number;
  total: number;
  marketerProfit?: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    email?: string;
    street?: string;
    city?: string;
    governorate?: string;
  };
  trackingNumber?: string;
  shippingCompany?: string;
}

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: X,
  returned: RotateCcw
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  confirmed: 'bg-[#4CAF50]/20 text-[#2E7D32] dark:bg-[#4CAF50]/30 dark:text-[#4CAF50]',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
};

const statusLabels = {
  pending: 'معلق',
  confirmed: 'مؤكد',
  processing: 'قيد المعالجة',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  returned: 'مرتجع'
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false); // Loading state for search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // Debounced search term
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const router = useRouter();

  // Export/Import modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // WhatsApp communication functions
  const openWhatsApp = (phone: string, message: string) => {
    const formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '970'); // Convert to international format
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateOrderMessage = (order: any) => {
    const customerName = order.shippingAddress?.fullName || 'العميل';
    const orderNumber = order.orderNumber;
    const totalAmount = order.total;
    const productNames = order.items.map((item: any) => item.productName).join('، ');
    const statusLabel = getStatusLabel(order.status);
    
    return `مرحباً ${customerName} 👋

معلومات طلبك 📦

📋 رقم الطلب: ${orderNumber}
🛍️ المنتجات: ${productNames}
💰 المبلغ الإجمالي: ${totalAmount} ₪
🔄 الحالة الحالية: ${statusLabel}

هل لديك أي استفسارات حول طلبك؟

شكراً لثقتك بنا 🙏`;
  };

  const getStatusLabel = (status: string) => {
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  const handleWhatsAppContact = (order: any) => {
    const message = generateOrderMessage(order);
    const phone = order.shippingAddress?.phone || '';
    if (phone) {
      openWhatsApp(phone, message);
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

  const handlePrintInvoice = (order: any) => {
    // Navigate to order details page with print parameter
    router.push(`/dashboard/orders/${order._id}?print=true`);
  };

  // Debounce search term - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch orders when debounced search term or filter status changes
  useEffect(() => {
    fetchOrders();
  }, [filterStatus, debouncedSearchTerm]);

  const fetchOrders = async () => {
    try {
      // Show initial loading only on first load
      if (orders.length === 0) {
        setLoading(true);
      } else {
        // Show searching indicator when filtering/searching
        setSearching(true);
      }
      
      // Build query params
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      
      const response = await fetch(`/api/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        toast.error('حدث خطأ أثناء جلب الطلبات');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ أثناء جلب الطلبات');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingOrder(orderId);
      console.log('Updating order:', orderId, 'to:', newStatus);
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Update success:', data);
        toast.success(data.message || 'تم تحديث حالة الطلب بنجاح');
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        console.error('Update error:', error);
        toast.error(error.error || 'حدث خطأ أثناء تحديث الطلب');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('حدث خطأ أثناء تحديث الطلب');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'supplier':
        return 'طلباتي';
      case 'admin':
        return 'إدارة الطلبات';
      case 'marketer':
      case 'wholesaler':
        return 'طلباتي';
      default:
        return 'الطلبات';
    }
  };

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'supplier':
        return 'إدارة طلبات العملاء لمنتجاتك';
      case 'admin':
        return 'إدارة جميع الطلبات في المنصة';
      case 'marketer':
      case 'wholesaler':
        return 'متابعة طلباتك وحالتها';
      default:
        return 'إدارة الطلبات';
    }
  };

  // Filter orders locally (additional filtering if needed)
  // Main filtering is done on the server side
  const filteredOrders = orders.filter(order => {
    // Status filter (if not already filtered on server)
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {getRoleTitle()}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            {getRoleDescription()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Export Button */}
          {(user?.role === 'admin' || user?.role === 'supplier') && (
            <button
              onClick={() => setShowExportModal(true)}
              className="btn-secondary flex items-center justify-center"
            >
              <Download className="w-4 h-4 ml-2" />
              <span className="hidden sm:inline">تصدير الطلبات</span>
              <span className="sm:hidden">تصدير</span>
            </button>
          )}
          
          {/* Import Button - Only for Marketer */}
          {user?.role === 'marketer' && (
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center justify-center"
            >
              <Upload className="w-4 h-4 ml-2" />
              <span className="hidden sm:inline">استيراد الطلبات</span>
              <span className="sm:hidden">استيراد</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mobile-filters">
        <div className="mobile-filter-group">
          <div className="mobile-search relative">
            <Search className="mobile-search-icon" />
            <input
              type="text"
              placeholder="البحث في الطلبات (رقم الطلب، اسم العميل، رقم الهاتف...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-search-input"
              disabled={loading}
            />
            {searching && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#FF9800] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        <div className="mobile-filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">معلق</option>
            <option value="confirmed">مؤكد</option>
            <option value="processing">قيد المعالجة</option>
            <option value="shipped">تم الشحن</option>
            <option value="delivered">تم التسليم</option>
            <option value="cancelled">ملغي</option>
            <option value="returned">مرتجع</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="mobile-loading">
          <div className="mobile-loading-spinner"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">جاري تحميل الطلبات...</p>
        </div>
      ) : searching ? (
        <div className="mobile-loading">
          <div className="mobile-loading-spinner"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">جاري البحث...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mobile-empty">
          <Package className="mobile-empty-icon" />
          <h3 className="mobile-empty-title">لا توجد طلبات</h3>
          <p className="mobile-empty-description">
            {debouncedSearchTerm || filterStatus !== 'all' 
              ? 'لا توجد طلبات تطابق معايير البحث المحددة'
              : 'لم يتم العثور على أي طلبات بعد'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg">
              <thead>
                <tr>
                  <th className="table-header">رقم الطلب</th>
                  <th className="table-header">العميل</th>
                  <th className="table-header">المنتجات</th>
                  <th className="table-header">المبلغ</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">التاريخ</th>
                  <th className="table-header">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;
                  return (
                    <tr 
                      key={order._id} 
                      className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/orders/${order._id}`)}
                    >
                      <td className="table-cell font-medium">{order.orderNumber}</td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {order.shippingAddress?.fullName || 
                             (typeof order.customerId === 'object' ? order.customerId.name : order.customerName) || 
                             'غير محدد'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {order.shippingAddress?.phone || 
                             (typeof order.customerId === 'object' ? order.customerId.phone : '')}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded border flex items-center justify-center overflow-hidden">
                            {typeof order.items[0]?.productId === 'object' && order.items[0]?.productId?.images && order.items[0].productId.images.length > 0 ? (
                              <img
                                src={order.items[0].productId.images[0]}
                                alt={order.items[0].productName}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                            <div className={`w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded ${typeof order.items[0]?.productId === 'object' && order.items[0]?.productId?.images && order.items[0].productId.images.length > 0 ? 'hidden' : ''}`}></div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {order.items[0]?.productName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {order.items.length > 1 ? `+${order.items.length - 1} منتجات أخرى` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {order.total} ₪
                        </div>
                        {user?.role === 'marketer' && order.marketerProfit && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            ربح: {order.marketerProfit} ₪
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div
                            className="p-2 text-[#FF9800] dark:text-[#FF9800] hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppContact(order);
                            }}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="تواصل عبر واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintInvoice(order);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="طباعة الفاتورة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredOrders.map((order) => {
              const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;
              return (
                <div 
                  key={order._id} 
                  className="mobile-table-card cursor-pointer"
                  onClick={() => router.push(`/dashboard/orders/${order._id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                      <StatusIcon className="w-3 h-3 ml-1" />
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Customer Info */}
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-10 h-10 bg-[#FF9800]/20 dark:bg-[#FF9800]/30 rounded-full flex items-center justify-center">
                        <span className="text-[#FF9800] dark:text-[#FF9800] font-semibold text-sm">
                          {(order.shippingAddress?.fullName || 
                            (typeof order.customerId === 'object' ? order.customerId.name : order.customerName) || 
                            'غير محدد').charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {order.shippingAddress?.fullName || 
                           (typeof order.customerId === 'object' ? order.customerId.name : order.customerName) || 
                           'غير محدد'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {order.shippingAddress?.phone || 
                           (typeof order.customerId === 'object' ? order.customerId.phone : '')}
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg border flex items-center justify-center overflow-hidden">
                        {typeof order.items[0]?.productId === 'object' && order.items[0]?.productId?.images && order.items[0].productId.images.length > 0 ? (
                          <img
                            src={order.items[0].productId.images[0]}
                            alt={order.items[0].productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {order.items[0]?.productName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {order.items.length > 1 ? `+${order.items.length - 1} منتجات أخرى` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.total} ₪
                        </div>
                        {user?.role === 'marketer' && order.marketerProfit && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            ربح: {order.marketerProfit} ₪
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mobile-actions">
                      <div
                        className="btn-primary flex-1 flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        عرض التفاصيل
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppContact(order);
                        }}
                        className="btn-success flex items-center justify-center px-3 py-2"
                        title="تواصل عبر واتساب"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintInvoice(order);
                        }}
                        className="btn-secondary flex items-center justify-center px-3 py-2"
                        title="طباعة الفاتورة"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showExportModal && (
        <OrderExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          userRole={user?.role || 'marketer'}
        />
      )}

      {showImportModal && (
        <OrderImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            setShowImportModal(false);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
} 