'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: {
    label: 'معلق',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    description: 'الطلب في انتظار التأكيد'
  },
  confirmed: {
    label: 'مؤكد',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    description: 'تم تأكيد الطلب'
  },
  processing: {
    label: 'قيد المعالجة',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    description: 'الطلب قيد التحضير'
  },
  ready_for_shipping: {
    label: 'جاهز للشحن',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
    description: 'الطلب جاهز للشحن'
  },
  shipped: {
    label: 'تم الشحن',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
    description: 'تم شحن الطلب'
  },
  out_for_delivery: {
    label: 'خارج للتوصيل',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    description: 'الطلب خارج للتوصيل'
  },
  delivered: {
    label: 'تم التسليم',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    description: 'تم تسليم الطلب بنجاح'
  },
  cancelled: {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    description: 'تم إلغاء الطلب'
  },
  returned: {
    label: 'مرتجع',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    description: 'تم إرجاع الطلب'
  },
  refunded: {
    label: 'مسترد',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    description: 'تم استرداد المبلغ'
  }
};

const availableStatuses = [
  'pending',
  'confirmed', 
  'processing',
  'ready_for_shipping',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded'
];

export default function TestOrderStatusPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        toast.error('فشل في جلب الطلبات');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ في جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !newStatus) {
      toast.error('يرجى اختيار طلب وحالة جديدة');
      return;
    }

    if (newStatus === selectedOrder.status) {
      toast.error('الحالة المحددة هي نفس الحالة الحالية');
      return;
    }

    // Validate tracking number for shipping statuses
    if ((newStatus === 'shipped' || newStatus === 'out_for_delivery') && !trackingNumber.trim()) {
      toast.error('رقم التتبع مطلوب عند تغيير الحالة إلى "تم الشحن" أو "خارج للتوصيل"');
      return;
    }

    try {
      setUpdating(true);
      
      const updateData: any = {
        status: newStatus
      };

      if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
        updateData.trackingNumber = trackingNumber.trim();
        updateData.shippingCompany = shippingCompany.trim() || 'غير محدد';
      }

      if (notes.trim()) {
        updateData.notes = notes.trim();
      }

      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم تحديث حالة الطلب بنجاح');
        setSelectedOrder(null);
        setNewStatus('');
        setTrackingNumber('');
        setShippingCompany('');
        setNotes('');
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        toast.error(error.error || 'حدث خطأ أثناء تحديث الطلب');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('حدث خطأ أثناء تحديث الطلب');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            اختبار تحديث حالة الطلبات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            اختبار وظيفة تحديث حالة الطلبات مع جميع الخيارات المتاحة
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Orders List */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              قائمة الطلبات
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">جاري تحميل الطلبات...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedOrder?._id === order._id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          #{order.orderNumber}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {order.customerName || order.customerId?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Update Form */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              تحديث حالة الطلب
            </h2>
            {selectedOrder ? (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">الطلب المحدد:</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">#{selectedOrder.orderNumber}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    الحالة الحالية: {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الحالة الجديدة
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">اختر الحالة</option>
                    {availableStatuses
                      .filter(status => status !== selectedOrder.status)
                      .map(status => (
                        <option key={status} value={status}>
                          {statusConfig[status as keyof typeof statusConfig]?.label || status} - {statusConfig[status as keyof typeof statusConfig]?.description || ''}
                        </option>
                      ))}
                  </select>
                </div>

                {(newStatus === 'shipped' || newStatus === 'out_for_delivery') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        رقم التتبع *
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="أدخل رقم التتبع"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        شركة الشحن
                      </label>
                      <input
                        type="text"
                        value={shippingCompany}
                        onChange={(e) => setShippingCompany(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="أدخل اسم شركة الشحن"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="أدخل ملاحظات إضافية"
                  />
                </div>

                <button
                  onClick={updateOrderStatus}
                  disabled={!newStatus || updating}
                  className="w-full px-4 py-2 bg-[#FF9800] text-white rounded-md hover:bg-[#F57C00] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'جاري التحديث...' : 'تحديث الحالة'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">اختر طلباً من القائمة لتحديث حالته</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Reference */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            مرجع حالات الطلبات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableStatuses.map((status) => (
              <div key={status} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${statusConfig[status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                  {statusConfig[status as keyof typeof statusConfig]?.label || status}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {statusConfig[status as keyof typeof statusConfig]?.description || 'لا يوجد وصف'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
