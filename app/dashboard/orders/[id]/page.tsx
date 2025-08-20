'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, DollarSign, User, MapPin, Phone, Calendar, CheckCircle2, Edit, X, RotateCcw } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
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
  trackingNumber?: string;
  shippingCompany?: string;
  adminNotes?: string;
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
    icon: X,
    description: 'تم إلغاء الطلب'
  },
  returned: {
    label: 'مرتجع',
    color: 'bg-orange-100 text-orange-800',
    icon: RotateCcw,
    description: 'تم إرجاع الطلب'
  }
};

export default function OrderDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [notes, setNotes] = useState('');

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

  const updateOrderStatus = async () => {
    if (!order || !newStatus) return;
    
    try {
      setUpdating(true);
      console.log('Updating order status:', order._id, 'to:', newStatus);
      
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          trackingNumber: trackingNumber || undefined,
          shippingCompany: shippingCompany || undefined,
          notes: notes || undefined
        }),
      });

      console.log('Update response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Update success:', data);
        toast.success(data.message || 'تم تحديث حالة الطلب بنجاح');
        setShowStatusModal(false);
        fetchOrder(order._id); // Refresh order data
      } else {
        const error = await response.json();
        console.error('Update error:', error);
        toast.error(error.error || 'حدث خطأ أثناء تحديث الطلب');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('حدث خطأ أثناء تحديث الطلب');
    } finally {
      setUpdating(false);
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

  const canUpdateOrder = () => {
    if (!order || !user) return false;
    
    // Admin can update any order
    if (user.role === 'admin') return true;
    
    // Supplier can only update their own orders
    const actualSupplierId = order.supplierId._id || order.supplierId;
    return user.role === 'supplier' && actualSupplierId.toString() === user._id.toString();
  };

  const getAvailableStatuses = () => {
    if (!order) return [];
    
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'returned'],
      'delivered': ['returned'],
      'cancelled': [],
      'returned': []
    };
    
    return validTransitions[order.status] || [];
  };

  const openStatusModal = (status: string) => {
    setNewStatus(status);
    setTrackingNumber(order?.trackingNumber || '');
    setShippingCompany(order?.shippingCompany || '');
    setNotes(order?.adminNotes || '');
    setShowStatusModal(true);
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
  const availableStatuses = getAvailableStatuses();

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
        
        {canUpdateOrder() && availableStatuses.length > 0 && (
          <button
            onClick={() => openStatusModal('')}
            className="btn-primary flex items-center"
          >
            <Edit className="w-4 h-4 ml-2" />
            تحديث الحالة
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

          {/* Admin Notes */}
          {order.adminNotes && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ملاحظات الإدارة</h3>
              <p className="text-gray-700 dark:text-gray-300">{order.adminNotes}</p>
            </div>
          )}

          {/* Tracking Info */}
          {order.trackingNumber && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">معلومات الشحن</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">رقم التتبع</p>
                  <p className="font-medium text-gray-900 dark:text-white">{order.trackingNumber}</p>
                </div>
                {order.shippingCompany && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">شركة الشحن</p>
                    <p className="font-medium text-gray-900 dark:text-white">{order.shippingCompany}</p>
                  </div>
                )}
              </div>
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

          {/* Marketer Profit Details - Only show for marketers */}
          {user?.role === 'marketer' && order.customerRole === 'marketer' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <DollarSign className="w-5 h-5 ml-2" />
                تفاصيل أرباحك
              </h3>
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">ربح المسوق</span>
                    <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {formatCurrency(order.marketerProfit || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    سيتم إضافة هذا الربح إلى محفظتك عند اكتمال الطلب
                  </p>
                </div>
                
                {order.status === 'delivered' && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-2" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        تم إضافة الربح إلى محفظتك
                      </span>
                    </div>
                  </div>
                )}
                
                {['pending', 'confirmed', 'processing', 'shipped'].includes(order.status) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        في انتظار اكتمال الطلب لإضافة الربح
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Profit Details - Only show for admins */}
          {user?.role === 'admin' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <DollarSign className="w-5 h-5 ml-2" />
                تفاصيل أرباح الإدارة
              </h3>
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">عمولة الإدارة</span>
                    <span className="text-lg font-bold text-green-800 dark:text-green-200">
                      {formatCurrency(order.commission || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-300">
                    سيتم إضافة هذه العمولة إلى محفظة الإدارة عند اكتمال الطلب
                  </p>
                </div>
                
                {order.status === 'delivered' && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-2" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        تم إضافة العمولة إلى محفظة الإدارة
                      </span>
                    </div>
                  </div>
                )}
                
                {['pending', 'confirmed', 'processing', 'shipped'].includes(order.status) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        في انتظار اكتمال الطلب لإضافة العمولة
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Package className="w-5 h-5 ml-2" />
              منتجات الطلب
            </h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <MediaThumbnail
                      media={item.productId?.images || []}
                      alt={item.productName}
                      className="w-full h-full"
                      showTypeBadge={false}
                      fallbackIcon={<Package className="w-8 h-8 text-gray-400" />}
                    />
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{item.productName}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      الكمية: {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                  
                  {/* Total Price */}
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
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

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              تحديث حالة الطلب
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحالة الجديدة
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full input-field"
                >
                  <option value="">اختر الحالة</option>
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>
                      {statusConfig[status as keyof typeof statusConfig]?.label || status}
                    </option>
                  ))}
                </select>
              </div>

              {newStatus === 'shipped' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رقم التتبع
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full input-field"
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
                      className="w-full input-field"
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
                  className="w-full input-field"
                  rows={3}
                  placeholder="أدخل ملاحظات إضافية"
                />
              </div>
            </div>

            <div className="flex space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="btn-secondary flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={updateOrderStatus}
                disabled={!newStatus || updating}
                className="btn-primary flex-1 flex items-center justify-center"
              >
                {updating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                ) : (
                  <CheckCircle className="w-4 h-4 ml-2" />
                )}
                {updating ? 'جاري التحديث...' : 'تحديث الحالة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 