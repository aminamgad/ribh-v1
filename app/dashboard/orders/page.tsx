'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { Search, Plus, Eye, CheckCircle, Truck, Package, Clock, DollarSign, Edit, X, RotateCcw, Download, Upload, Phone, Mail, MessageCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import React from 'react'; // Added for React.createElement
import { useRouter, useSearchParams } from 'next/navigation';
import OrderExportModal from '@/components/ui/OrderExportModal';
import OrderImportModal from '@/components/ui/OrderImportModal';
import OrdersFilters from '@/components/orders/OrdersFilters';
import BulkOrdersActions, { OrderCheckbox, SelectAllCheckbox } from '@/components/orders/BulkOrdersActions';
import { OrderItem } from '@/types';
import MediaThumbnail from '@/components/ui/MediaThumbnail';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Generate cache key based on query string
  // Convert searchParams to string once and memoize it
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);
  const cacheKey = useMemo(() => {
    return `orders_${queryString || 'default'}`;
  }, [queryString]);
  
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // Export/Import modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Bulk operations state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

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

  const handleBulkPrint = (orderIds: string[]) => {
    // Navigate to bulk print page with all order IDs
    const idsParam = orderIds.join(',');
    window.open(`/dashboard/orders/bulk-print?ids=${idsParam}`, '_blank');
    toast.success(`تم فتح ${orderIds.length} فاتورة للطباعة`);
  };

  const handleBulkUpdate = async (action: string, data: any) => {
    try {
      const response = await fetch('/api/admin/orders/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          action
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'تم تحديث الطلبات بنجاح');
        fetchOrders(); // Refresh orders list
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء تحديث الطلبات');
        throw new Error(error.message || 'Failed to update orders');
      }
    } catch (error: any) {
      console.error('Error updating orders:', error);
      throw error;
    }
  };

  // Use cache hook for orders
  const { data: ordersData, loading, refresh } = useDataCache<{ orders: Order[] }>({
    key: cacheKey,
    fetchFn: async () => {
      const queryString = searchParams.toString();
      const response = await fetch(`/api/orders?${queryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!user,
    forceRefresh: false
  });

  const orders = ordersData?.orders || [];
  const searching = loading && orders.length > 0;

  // Listen for refresh events from header button
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-orders', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-orders', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchOrders for backward compatibility
  const fetchOrders = async () => {
    refresh();
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

  // Orders are already filtered on the server side
  const filteredOrders = orders;

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
      <OrdersFilters onFiltersChange={fetchOrders} />

      {/* Bulk Actions - Only for Admin */}
      {user?.role === 'admin' && (
        <BulkOrdersActions
          orders={orders}
          selectedOrderIds={selectedOrderIds}
          onSelectionChange={setSelectedOrderIds}
          onBulkUpdate={handleBulkUpdate}
          onBulkPrint={handleBulkPrint}
          isLoading={loading || searching}
          user={user}
        />
      )}

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
            {searchParams.toString()
              ? 'لا توجد طلبات تطابق معايير البحث المحددة'
              : 'لم يتم العثور على أي طلبات بعد'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden lg:block w-full">
            <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <table className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden" style={{ minWidth: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                {user?.role === 'admin' && <col style={{ width: '50px' }} />}
                <col style={{ width: '130px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '280px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '180px' }} />
              </colgroup>
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
                  {user?.role === 'admin' && (
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700 sticky right-0 z-10 border-r-2 border-gray-300 dark:border-slate-600 shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                      <SelectAllCheckbox
                        allSelected={selectedOrderIds.length === orders.length && orders.length > 0}
                        onToggle={() => {
                          if (selectedOrderIds.length === orders.length) {
                            setSelectedOrderIds([]);
                          } else {
                            setSelectedOrderIds(orders.map(o => o._id));
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">رقم الطلب</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">العميل</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">المنتجات</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">المبلغ</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">الحالة</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 pr-4">التاريخ</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-200 bg-gradient-to-l from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700 sticky left-0 z-20 border-l-2 border-gray-400 dark:border-slate-500 shadow-[-3px_0_6px_rgba(0,0,0,0.12)]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;
                  const isSelected = selectedOrderIds.includes(order._id);
                  return (
                    <tr 
                      key={order._id} 
                      className={`group transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-r-4 border-blue-500 dark:border-blue-400' 
                          : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                      }`}
                      onClick={() => router.push(`/dashboard/orders/${order._id}`)}
                    >
                      {user?.role === 'admin' && (
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 sticky right-0 z-10 border-r-2 border-gray-300 dark:border-slate-600 shadow-[2px_0_4px_rgba(0,0,0,0.08)] ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800'
                        }`}
                            onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <OrderCheckbox
                              orderId={order._id}
                              isSelected={isSelected}
                              onToggle={() => {
                                if (isSelected) {
                                  setSelectedOrderIds(selectedOrderIds.filter(id => id !== order._id));
                                } else {
                                  setSelectedOrderIds([...selectedOrderIds, order._id]);
                                }
                              }}
                            />
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {order.shippingAddress?.fullName || 
                             (typeof order.customerId === 'object' ? order.customerId.name : order.customerName) || 
                             'غير محدد'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {order.shippingAddress?.phone || 
                             (typeof order.customerId === 'object' ? order.customerId.phone : '')}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                            {typeof order.items[0]?.productId === 'object' && order.items[0]?.productId?.images && order.items[0].productId.images.length > 0 ? (
                              <MediaThumbnail
                                media={order.items[0].productId.images}
                                alt={order.items[0].productName}
                                className="w-full h-full"
                                showTypeBadge={false}
                                width={40}
                                height={40}
                              />
                            ) : (
                              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-500 rounded"></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                              {order.items[0]?.productName}
                            </div>
                            {order.items.length > 1 && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                +{order.items.length - 1} منتجات أخرى
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {order.total} ₪
                        </div>
                        {user?.role === 'marketer' && order.marketerProfit && (
                          <div className="text-xs text-green-600 dark:text-green-400 font-semibold mt-0.5">
                            ربح: {order.marketerProfit} ₪
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[order.status as keyof typeof statusColors]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 text-right pr-4 relative z-0 font-medium">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 sticky left-0 z-20 border-l-2 border-gray-400 dark:border-slate-500 shadow-[-3px_0_6px_rgba(0,0,0,0.12)] ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800'
                      }`}>
                        <div className="flex items-center justify-start gap-2 flex-nowrap">
                          <div
                            className="p-2 text-[#FF9800] dark:text-[#FF9800] hover:bg-[#FF9800]/15 dark:hover:bg-[#FF9800]/25 rounded-lg transition-all duration-200 cursor-pointer flex-shrink-0 hover:scale-110 active:scale-95"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppContact(order);
                            }}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200 flex-shrink-0 hover:scale-110 active:scale-95"
                            title="تواصل عبر واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintInvoice(order);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex-shrink-0 hover:scale-110 active:scale-95"
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
                        {new Date(order.createdAt).toLocaleDateString('en-US')}
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
                          <MediaThumbnail
                            media={order.items[0].productId.images}
                            alt={order.items[0].productName}
                            className="w-full h-full"
                            showTypeBadge={false}
                            width={48}
                            height={48}
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