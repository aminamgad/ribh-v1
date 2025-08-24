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
  customerId: string;
  customerName: string;
  customerRole: string;
  supplierId: string;
  supplierName?: string;
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
  };
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
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-orange-100 text-orange-800'
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
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      } else {
        toast.error('حدث خطأ أثناء جلب الطلبات');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ أثناء جلب الطلبات');
    } finally {
      setLoading(false);
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
        return 'إدارة الطلبات الواردة لمنتجاتك';
      case 'admin':
        return 'إدارة جميع الطلبات في المنصة';
      case 'marketer':
      case 'wholesaler':
        return 'إدارة طلباتك وطلبات عملائك';
      default:
        return '';
    }
  };

  const canUpdateOrder = (order: Order) => {
    if (!user) return false;
    
    // Admin can update any order
    if (user.role === 'admin') return true;
    
    // Supplier can only update their own orders
    if (user.role === 'supplier') {
      const actualSupplierId =
        typeof order.supplierId === 'object' && order.supplierId !== null && '_id' in order.supplierId
          ? (order.supplierId as { _id: string })._id
          : order.supplierId;
      return actualSupplierId.toString() === user._id.toString();
    }
    
    return false;
  };

  const getAvailableStatuses = (currentStatus: string) => {
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'returned'],
      'delivered': ['returned'],
      'cancelled': [],
      'returned': []
    };
    
    return validTransitions[currentStatus] || [];
  };

  const getStatusButton = (order: Order) => {
    if (!canUpdateOrder(order)) return null;
    
    const availableStatuses = getAvailableStatuses(order.status);
    if (availableStatuses.length === 0) return null;

    const nextStatus = availableStatuses[0]; // Get the first available status
    const isUpdating = updatingOrder === order._id;
    
    let buttonText = '';
    let buttonClass = '';
    let icon = CheckCircle;

    switch (nextStatus) {
      case 'confirmed':
        buttonText = 'تأكيد الطلب';
        buttonClass = 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300';
        icon = CheckCircle;
        break;
      case 'processing':
        buttonText = 'بدء المعالجة';
        buttonClass = 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300';
        icon = Package;
        break;
      case 'shipped':
        buttonText = 'شحن الطلب';
        buttonClass = 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300';
        icon = Truck;
        break;
      case 'delivered':
        buttonText = 'تسليم الطلب';
        buttonClass = 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300';
        icon = CheckCircle;
        break;
      case 'cancelled':
        buttonText = 'إلغاء الطلب';
        buttonClass = 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300';
        icon = X;
        break;
      case 'returned':
        buttonText = 'إرجاع الطلب';
        buttonClass = 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300';
        icon = RotateCcw;
        break;
    }

    return (
      <button
        onClick={() => updateOrderStatus(order._id, nextStatus)}
        disabled={isUpdating}
        className={`text-sm font-medium flex items-center ${buttonClass}`}
      >
        {isUpdating ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-1"></div>
        ) : (
          React.createElement(icon, { className: "w-4 h-4 ml-1" })
        )}
        {isUpdating ? 'جاري التحديث...' : buttonText}
      </button>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{getRoleTitle()}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">{getRoleDescription()}</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          {/* Export/Import buttons for admin and supplier */}
          {(user?.role === 'admin' || user?.role === 'supplier') && (
            <>
              <button
                onClick={() => setShowExportModal(true)}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير الطلبات
              </button>
            </>
          )}
          
          {/* Import button for marketers */}
          {user?.role === 'marketer' && (
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center"
            >
              <Upload className="w-4 h-4 ml-2" />
              استيراد الطلبات
            </button>
          )}
          
          {/* New order button for marketers and wholesalers */}
          {user?.role === 'marketer' || user?.role === 'wholesaler' ? (
            <Link href="/dashboard/products" className="btn-primary flex items-center">
              <Plus className="w-4 h-4 ml-2" />
              طلب جديد
            </Link>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="البحث في الطلبات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد طلبات</h3>
          <p className="text-gray-600 dark:text-slate-400">لم يتم العثور على طلبات تطابق معايير البحث</p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="table-header">رقم الطلب</th>
                  <th className="table-header">العميل</th>
                  {user?.role === 'admin' && <th className="table-header">المورد</th>}
                  <th className="table-header">المنتجات</th>
                  <th className="table-header">المجموع</th>
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
                      className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => router.push(`/dashboard/orders/${order._id}`)}
                    >
                      <td className="table-cell">
                        <span className="font-medium text-primary-600 dark:text-primary-400">#{order.orderNumber}</span>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{order.customerName}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">{order.customerRole}</p>
                        </div>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="table-cell">
                          <span className="text-gray-600 dark:text-slate-400">{order.supplierName || '-'}</span>
                        </td>
                      )}
                      <td className="table-cell">
                        <div className="text-sm">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between mb-2 last:mb-0">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded border flex items-center justify-center overflow-hidden">
                                  {typeof item.productId === 'object' && item.productId?.images && item.productId.images.length > 0 ? (
                                    <img 
                                      src={item.productId.images[0]} 
                                      alt={item.productId.name || item.productName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback to placeholder if image fails to load
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded ${typeof item.productId === 'object' && item.productId?.images && item.productId.images.length > 0 ? 'hidden' : ''}`}></div>
                                </div>
                                <span className="text-gray-900 dark:text-slate-100">{item.productName}</span>
                              </div>
                              <span className="text-gray-500 dark:text-slate-400">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {new Intl.NumberFormat('ar-IL', {
                            style: 'currency',
                            currency: 'ILS'
                          }).format(order.total)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                            <Eye className="w-4 h-4 ml-1" />
                            عرض التفاصيل
                          </div>
                          
                          {/* Print Invoice */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintInvoice(order);
                            }}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1"
                            title="طباعة الفاتورة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          
                          {/* WhatsApp Contact */}
                          {order.shippingAddress?.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsAppContact(order);
                              }}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                              title="تواصل عبر واتساب"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Phone Contact */}
                          {order.shippingAddress?.phone && (
                            <a
                              href={`tel:${order.shippingAddress.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                              title="اتصال مباشر"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          
                          <div onClick={(e) => e.stopPropagation()}>
                            {getStatusButton(order)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <OrderExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        userRole={user?.role || ''}
      />

      {/* Import Modal */}
      <OrderImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={fetchOrders}
      />
    </div>
  );
} 