'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, DollarSign, User, MapPin, Phone, Calendar, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface OrderItem {
  productId: {
    _id: string;
    name: string;
    images: string[];
  };
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  priceType: 'marketer' | 'wholesale';
}

interface Order {
  _id: string;
  orderNumber: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
  };
  customerRole: string;
  supplierId: {
    _id: string;
    name: string;
    companyName?: string;
  };
  items: OrderItem[];
  subtotal: number;
  commission: number;
  total: number;
  marketerProfit?: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    governorate: string;
    postalCode?: string;
    notes?: string;
  };
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  actualDelivery?: string;
}

const statusConfig = {
  pending: {
    label: 'معلق',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    description: 'الطلب في انتظار التأكيد'
  },
  confirmed: {
    label: 'مؤكد',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
    description: 'تم تأكيد الطلب'
  },
  processing: {
    label: 'قيد المعالجة',
    color: 'bg-purple-100 text-purple-800',
    icon: Package,
    description: 'الطلب قيد التحضير'
  },
  shipped: {
    label: 'تم الشحن',
    color: 'bg-indigo-100 text-indigo-800',
    icon: Truck,
    description: 'تم شحن الطلب'
  },
  delivered: {
    label: 'تم التسليم',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
    description: 'تم تسليم الطلب بنجاح'
  },
  cancelled: {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800',
    icon: Clock,
    description: 'تم إلغاء الطلب'
  },
  returned: {
    label: 'مرتجع',
    color: 'bg-orange-100 text-orange-800',
    icon: Clock,
    description: 'تم إرجاع الطلب'
  }
};

export default function OrderDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
    }
  }, [params.id]);

  const fetchOrder = async (orderId: string) => {
    try {
      console.log('Fetching order:', orderId);
      const response = await fetch(`/api/orders/${orderId}`);
      console.log('Order response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
              console.log('Order data:', data);
      console.log('Order supplier ID:', data.order?.supplierId);
      console.log('Order supplier ID type:', typeof data.order?.supplierId);
      console.log('Current user ID:', user?._id);
      console.log('User role:', user?.role);
      console.log('Permission check:', {
        userRole: user?.role,
        userId: user?._id,
        orderSupplierId: data.order?.supplierId,
        match: user?.role === 'supplier' ? data.order?.supplierId === user?._id : null
      });
      setOrder(data.order);
      } else {
        const errorData = await response.json();
        console.error('Order fetch error:', errorData);
        toast.error(errorData.error || 'الطلب غير موجود');
        router.push('/dashboard/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('حدث خطأ أثناء جلب تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  const fulfillOrder = async () => {
    if (!order) return;
    
    try {
      setFulfilling(true);
      console.log('Fulfilling order:', order._id);
      
      const response = await fetch(`/api/orders/${order._id}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Fulfill response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Fulfill success:', data);
        toast.success(data.message || 'تم تنفيذ الطلب بنجاح');
        fetchOrder(order._id); // Refresh order data
      } else {
        const error = await response.json();
        console.error('Fulfill error:', error);
        toast.error(error.message || 'حدث خطأ أثناء تنفيذ الطلب');
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      toast.error('حدث خطأ أثناء تنفيذ الطلب');
    } finally {
      setFulfilling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canFulfill = () => {
    if (!order || !user) return false;
    
    // Admin can fulfill any order
    if (user.role === 'admin') return true;
    
    // Supplier can only fulfill their own orders
    const actualSupplierId = order.supplierId._id || order.supplierId;
    const canFulfillResult = user.role === 'supplier' && actualSupplierId.toString() === user._id.toString();
    
    console.log('Can fulfill check:', {
      userRole: user.role,
      userId: user._id,
      orderSupplierId: actualSupplierId,
      canFulfill: canFulfillResult
    });
    
    return canFulfillResult;
  };

  const shouldShowFulfillButton = () => {
    return canFulfill() && ['confirmed', 'processing'].includes(order?.status || '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل تفاصيل الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">الطلب غير موجود</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">الطلب الذي تبحث عنه غير موجود أو تم حذفه</p>
          <Link href="/dashboard/orders" className="btn-primary">
            العودة للطلبات
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 space-x-reverse">
          <Link href="/dashboard/orders" className="btn-secondary">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للطلبات
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              الطلب #{order.orderNumber}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              تم إنشاؤه في {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        
        {shouldShowFulfillButton() && (
          <button
            onClick={fulfillOrder}
            disabled={fulfilling}
            className="btn-primary flex items-center"
          >
            {fulfilling ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
            ) : (
              <CheckCircle2 className="w-4 h-4 ml-2" />
            )}
            {fulfilling ? 'جاري التنفيذ...' : 'تنفيذ الطلب'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className={`p-2 rounded-lg ${status.color}`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {status.label}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{status.description}</p>
                </div>
              </div>
              {order.actualDelivery && (
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">تاريخ التسليم</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(order.actualDelivery)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">المنتجات</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {item.productId?.name || item.productName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      الكمية: {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      نوع السعر: {item.priceType === 'wholesale' ? 'جملة' : 'مسوق'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ملاحظات الطلب</h3>
              <p className="text-gray-700 dark:text-gray-300">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 ml-2" />
              معلومات العميل
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">الاسم</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.customerName || order.customerId?.name || 'غير محدد'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">رقم الهاتف</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center">
                  <Phone className="w-4 h-4 ml-1" />
                  {order.customerPhone || order.shippingAddress?.phone || 'غير محدد'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">نوع الحساب</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.customerRole === 'marketer' ? 'مسوق' : order.customerRole === 'wholesaler' ? 'تاجر جملة' : order.customerRole}
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <MapPin className="w-5 h-5 ml-2" />
              عنوان التوصيل
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">الاسم</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">رقم الهاتف</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">العنوان</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.street}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">المدينة</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.city}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">المحافظة</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.governorate}</p>
              </div>
              {order.shippingAddress.postalCode && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">الرمز البريدي</p>
                  <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.postalCode}</p>
                </div>
              )}
              {order.shippingAddress.notes && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">ملاحظات</p>
                  <p className="font-medium text-gray-900 dark:text-white">{order.shippingAddress.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <DollarSign className="w-5 h-5 ml-2" />
              ملخص مالي
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">المجموع الفرعي</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">العمولة</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(order.commission)}
                </span>
              </div>
              {order.marketerProfit && order.marketerProfit > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ربح المسوق</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(order.marketerProfit)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">الإجمالي</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Calendar className="w-5 h-5 ml-2" />
              معلومات الطلب
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">رقم الطلب</p>
                <p className="font-medium text-gray-900 dark:text-white">#{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">طريقة الدفع</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">حالة الدفع</p>
                <p className="font-medium text-gray-900 dark:text-white">{order.paymentStatus}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">تاريخ الإنشاء</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 