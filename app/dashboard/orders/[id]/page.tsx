'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ArrowLeft, Phone, Mail, MapPin, Package, Truck, CheckCircle, Clock, AlertCircle, MessageSquare, ExternalLink, MessageCircle, Edit, CheckCircle2, DollarSign, User, Calendar, Printer } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import OrderInvoice from '@/components/ui/OrderInvoice';
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
  confirmedAt?: string;
  processingAt?: string;
  readyForShippingAt?: string;
  shippedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  returnedAt?: string;
}

const statusConfig = {
  pending: {
    label: 'معلق',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    icon: Clock,
    description: 'الطلب في انتظار التأكيد'
  },
  confirmed: {
    label: 'مؤكد',
    color: 'bg-[#FF9800]/20 text-[#FF9800] dark:bg-[#FF9800]/30 dark:text-[#FF9800]',
    icon: CheckCircle,
    description: 'تم تأكيد الطلب'
  },
  processing: {
    label: 'قيد المعالجة',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    icon: Package,
    description: 'الطلب قيد التحضير'
  },
  ready_for_shipping: {
    label: 'جاهز للشحن',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
    icon: Package,
    description: 'الطلب جاهز للشحن'
  },
  shipped: {
    label: 'تم الشحن',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
    icon: Truck,
    description: 'تم شحن الطلب'
  },
  out_for_delivery: {
    label: 'خارج للتوصيل',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    icon: Truck,
    description: 'الطلب خارج للتوصيل'
  },
  delivered: {
    label: 'تم التسليم',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    icon: CheckCircle,
    description: 'تم تسليم الطلب بنجاح'
  },
  cancelled: {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    icon: AlertCircle,
    description: 'تم إلغاء الطلب'
  },
  returned: {
    label: 'مرتجع',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    icon: ExternalLink,
    description: 'تم إرجاع الطلب'
  },
  refunded: {
    label: 'مسترد',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: ExternalLink,
    description: 'تم استرداد المبلغ'
  }
};

// Available status options for order updates
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
  const [showInvoice, setShowInvoice] = useState(false);

  // Check for print parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get('print');
    if (shouldPrint === 'true' && order) {
      setShowInvoice(true);
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [order]);

  // WhatsApp communication functions
  const openWhatsApp = (phone: string, message: string) => {
    const formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '970'); // Convert to international format
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateOrderConfirmationMessage = () => {
    if (!order) return '';
    
    const customerName = order.shippingAddress?.fullName || 'العميل';
    const orderNumber = order.orderNumber;
    const totalAmount = order.total;
    const productNames = order.items.map(item => item.productName).join('، ');
    
    return `مرحباً ${customerName} 👋

تم تأكيد طلبك بنجاح! ✅

📋 رقم الطلب: ${orderNumber}
🛍️ المنتجات: ${productNames}
💰 المبلغ الإجمالي: ${totalAmount} ₪

سيتم التواصل معك قريباً لتأكيد التفاصيل النهائية.

شكراً لثقتك بنا 🙏`;
  };

  const generateOrderUpdateMessage = (newStatus: string) => {
    if (!order) return '';
    
    const customerName = order.shippingAddress?.fullName || 'العميل';
    const orderNumber = order.orderNumber;
    const statusLabel = statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus;
    
    return `مرحباً ${customerName} 👋

تم تحديث حالة طلبك 📦

📋 رقم الطلب: ${orderNumber}
🔄 الحالة الجديدة: ${statusLabel}

سنواصل إعلامك بأي تحديثات جديدة.

شكراً لصبرك 🙏`;
  };

  const handleWhatsAppConfirmation = () => {
    const message = generateOrderConfirmationMessage();
    const phone = order?.shippingAddress?.phone || '';
    if (phone) {
      openWhatsApp(phone, message);
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

  const handleWhatsAppUpdate = (newStatus: string) => {
    const message = generateOrderUpdateMessage(newStatus);
    const phone = order?.shippingAddress?.phone || '';
    if (phone) {
      openWhatsApp(phone, message);
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

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
    if (!order || !newStatus) {
      toast.error('يرجى اختيار حالة جديدة');
      return;
    }
    
    // Don't allow updating to the same status
    if (newStatus === order.status) {
      toast.error('الحالة المحددة هي نفس الحالة الحالية');
      return;
    }
    
    try {
      setUpdating(true);
      console.log('Updating order status:', order._id, 'from:', order.status, 'to:', newStatus);
      
      const updateData: any = {
        status: newStatus
      };
      
             // Add tracking info for shipped status (optional)
       if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
         if (trackingNumber.trim()) {
           updateData.trackingNumber = trackingNumber.trim();
         }
         if (shippingCompany.trim()) {
           updateData.shippingCompany = shippingCompany.trim();
         }
       }
      
      // Add notes if provided
      if (notes.trim()) {
        updateData.notes = notes.trim();
      }
      
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('Update response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Update success:', data);
        toast.success(data.message || 'تم تحديث حالة الطلب بنجاح');
        setShowStatusModal(false);
        setNewStatus('');
        setTrackingNumber('');
        setShippingCompany('');
        setNotes('');
        fetchOrder(order._id); // Refresh order data

        // Send WhatsApp notification if phone number is available
        if (order.shippingAddress?.phone) {
          // Small delay to ensure the order is updated first
          setTimeout(() => {
            handleWhatsAppUpdate(newStatus);
          }, 1000);
        }
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
      'processing': ['ready_for_shipping', 'cancelled'],
      'ready_for_shipping': ['shipped', 'cancelled'],
      'shipped': ['out_for_delivery', 'returned'],
      'out_for_delivery': ['delivered', 'returned'],
      'delivered': ['returned'],
      'cancelled': [],
      'returned': [],
      'refunded': []
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

  const getProcessingSteps = () => {
    const steps = [
      {
        id: 'pending',
        title: 'الطلب معلق',
        description: 'الطلب في انتظار التأكيد من الإدارة',
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        actions: ['confirmed', 'cancelled']
      },
      {
        id: 'confirmed',
        title: 'تم تأكيد الطلب',
        description: 'تم تأكيد الطلب وبدء المعالجة',
        icon: CheckCircle,
            color: 'text-[#FF9800]',
    bgColor: 'bg-[#FF9800]/10',
        actions: ['processing', 'cancelled']
      },
      {
        id: 'processing',
        title: 'قيد المعالجة',
        description: 'الطلب قيد التحضير والتجهيز',
        icon: Package,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        actions: ['ready_for_shipping', 'cancelled']
      },
      {
        id: 'ready_for_shipping',
        title: 'جاهز للشحن',
        description: 'الطلب جاهز للشحن والتوصيل',
        icon: Package,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        actions: ['shipped', 'cancelled']
      },
      {
        id: 'shipped',
        title: 'تم الشحن',
        description: 'تم شحن الطلب وتم إرساله',
        icon: Truck,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        actions: ['out_for_delivery', 'returned']
      },
      {
        id: 'out_for_delivery',
        title: 'خارج للتوصيل',
        description: 'الطلب خارج للتوصيل للعميل',
        icon: Truck,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        actions: ['delivered', 'returned']
      },
      {
        id: 'delivered',
        title: 'تم التسليم',
        description: 'تم تسليم الطلب بنجاح للعميل',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        actions: ['returned']
      }
    ];

    return steps.map(step => ({
      ...step,
      isCompleted: getStepCompletionStatus(step.id),
      isCurrent: order?.status === step.id,
      isUpcoming: getStepUpcomingStatus(step.id)
    }));
  };

  const getStepCompletionStatus = (stepId: string) => {
    const stepOrder = ['pending', 'confirmed', 'processing', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered'];
    const currentStepIndex = stepOrder.indexOf(order?.status || 'pending');
    const stepIndex = stepOrder.indexOf(stepId);
    return stepIndex < currentStepIndex;
  };

  const getStepUpcomingStatus = (stepId: string) => {
    const stepOrder = ['pending', 'confirmed', 'processing', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered'];
    const currentStepIndex = stepOrder.indexOf(order?.status || 'pending');
    const stepIndex = stepOrder.indexOf(stepId);
    return stepIndex > currentStepIndex;
  };

  const getProcessingTimeline = () => {
    const timeline = [];
    
    if (order?.confirmedAt) {
      timeline.push({
        date: order.confirmedAt,
        title: 'تم تأكيد الطلب',
        description: 'تم تأكيد الطلب من قبل الإدارة',
        icon: CheckCircle,
        color: 'text-green-600'
      });
    }
    
    if (order?.processingAt) {
      timeline.push({
        date: order.processingAt,
        title: 'بدء المعالجة',
        description: 'تم بدء معالجة وتجهيز الطلب',
        icon: Package,
        color: 'text-purple-600'
      });
    }
    
    if (order?.readyForShippingAt) {
      timeline.push({
        date: order.readyForShippingAt,
        title: 'جاهز للشحن',
        description: 'تم تجهيز الطلب للشحن',
        icon: Package,
        color: 'text-cyan-600'
      });
    }
    
    if (order?.shippedAt) {
      timeline.push({
        date: order.shippedAt,
        title: 'تم الشحن',
        description: `تم شحن الطلب عبر ${order.shippingCompany || 'شركة الشحن'}`,
        icon: Truck,
        color: 'text-indigo-600'
      });
    }
    
    if (order?.outForDeliveryAt) {
      timeline.push({
        date: order.outForDeliveryAt,
        title: 'خارج للتوصيل',
        description: 'الطلب خارج للتوصيل للعميل',
        icon: Truck,
        color: 'text-orange-600'
      });
    }
    
    if (order?.deliveredAt) {
      timeline.push({
        date: order.deliveredAt,
        title: 'تم التسليم',
        description: 'تم تسليم الطلب بنجاح للعميل',
        icon: CheckCircle,
        color: 'text-green-600'
      });
    }
    
    if (order?.cancelledAt) {
      timeline.push({
        date: order.cancelledAt,
        title: 'تم الإلغاء',
        description: 'تم إلغاء الطلب',
        icon: AlertCircle,
        color: 'text-red-600'
      });
    }
    
    if (order?.returnedAt) {
      timeline.push({
        date: order.returnedAt,
        title: 'تم الإرجاع',
        description: 'تم إرجاع الطلب',
        icon: ExternalLink,
        color: 'text-orange-600'
      });
    }
    
    return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9800] mx-auto mb-4"></div>
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
        
        <div className="flex items-center space-x-3 space-x-reverse">
          {/* Print Invoice Button */}
          <button
            onClick={() => setShowInvoice(true)}
            className="btn-secondary-solid flex items-center font-medium px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            title="طباعة الفاتورة"
          >
            <Printer className="w-4 h-4 ml-2" />
            طباعة الفاتورة
          </button>
          
          {/* Update Status Button */}
          {canUpdateOrder() && availableStatuses.length > 0 && (
            <button
              onClick={() => openStatusModal('')}
              className="btn-primary flex items-center font-medium px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Edit className="w-4 h-4 ml-2" />
              تحديث الحالة
            </button>
          )}
        </div>
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

          {/* Processing Workflow */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Package className="w-5 h-5 ml-2" />
              مراحل معالجة الطلب
            </h3>
            
            {/* Processing Steps */}
            <div className="space-y-4 mb-8">
              {getProcessingSteps().map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.id} className="flex items-start space-x-4 space-x-reverse">
                    {/* Step Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      step.isCompleted 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-200' 
                        : step.isCurrent 
                        ? 'bg-[#FF9800]/20 text-[#FF9800] dark:bg-[#FF9800]/30 dark:text-[#FF9800]' 
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}>
                      {step.isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    
                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`p-4 rounded-lg border ${
                        step.isCompleted 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                          : step.isCurrent 
                          ? 'bg-[#FF9800]/10 border-[#FF9800]/20 dark:bg-[#FF9800]/20 dark:border-[#FF9800]/30' 
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-medium ${
                            step.isCompleted 
                              ? 'text-green-800 dark:text-green-200' 
                              : step.isCurrent 
                              ? 'text-[#F57C00] dark:text-[#F57C00]' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {step.title}
                          </h4>
                          {step.isCurrent && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#FF9800]/20 text-[#FF9800] dark:bg-[#FF9800]/30 dark:text-[#FF9800]">
                              الحالية
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${
                          step.isCompleted 
                            ? 'text-green-700 dark:text-green-300' 
                            : step.isCurrent 
                            ? 'text-[#F57C00] dark:text-[#F57C00]' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {step.description}
                        </p>
                        
                        {/* Available Actions */}
                        {step.isCurrent && canUpdateOrder() && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">الإجراءات المتاحة:</p>
                            <div className="flex flex-wrap gap-2">
                              {step.actions.map(action => (
                                <button
                                  key={action}
                                  onClick={() => openStatusModal(action)}
                                  className="px-3 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium"
                                >
                                  {statusConfig[action as keyof typeof statusConfig]?.label || action}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Processing Timeline */}
            {getProcessingTimeline().length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  سجل المعالجة
                </h4>
                <div className="space-y-3">
                  {getProcessingTimeline().map((event, index) => {
                    const EventIcon = event.icon;
                    return (
                      <div key={index} className="flex items-start space-x-3 space-x-reverse">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${event.color} bg-opacity-10 dark:bg-opacity-20`}>
                          <EventIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                              {event.title}
                            </h5>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(event.date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">المنتجات</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                    {item.productId?.images && item.productId.images.length > 0 ? (
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
                    <Package className={`w-8 h-8 text-gray-400 ${item.productId?.images && item.productId.images.length > 0 ? 'hidden' : ''}`} />
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

          {/* Shipping Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Truck className="w-5 h-5 ml-2" />
              معلومات الشحن والتوصيل
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Status */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">حالة الشحن</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">الحالة الحالية</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  {order.trackingNumber && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">رقم التتبع</span>
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {order.trackingNumber}
                      </span>
                    </div>
                  )}
                  
                  {order.shippingCompany && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">شركة الشحن</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.shippingCompany}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Information */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">معلومات التوصيل</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ الطلب</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  
                  {order.shippedAt && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ الشحن</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(order.shippedAt)}
                      </span>
                    </div>
                  )}
                  
                  {order.deliveredAt && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm text-green-600 dark:text-green-400">تاريخ التسليم</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatDate(order.deliveredAt)}
                      </span>
                    </div>
                  )}
                  
                  {order.actualDelivery && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm text-green-600 dark:text-green-400">التسليم الفعلي</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatDate(order.actualDelivery)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Timeline */}
            {['shipped', 'out_for_delivery', 'delivered'].includes(order.status) && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">جدول الشحن</h4>
                <div className="space-y-3">
                  {order.shippedAt && (
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                        <Truck className="w-3 h-3 text-indigo-600 dark:text-indigo-200" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">تم الشحن</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(order.shippedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.outForDeliveryAt && (
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                        <Truck className="w-3 h-3 text-orange-600 dark:text-orange-200" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">خارج للتوصيل</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(order.outForDeliveryAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.deliveredAt && (
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-200" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">تم التسليم</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(order.deliveredAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
                     {/* Customer Information */}
           <div className="card">
             <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
               <User className="w-5 h-5 ml-2 text-[#FF9800] dark:text-[#FF9800]" />
               معلومات العميل
             </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   اسم العميل
                 </label>
                 <p className="text-gray-900 dark:text-white">
                   {order.shippingAddress?.fullName || 'غير محدد'}
                 </p>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                   رقم الهاتف
                 </label>
                                   <div className="flex items-center space-x-2 space-x-reverse">
                     <p className="text-gray-900 dark:text-white">
                       {order.shippingAddress?.phone || 'غير محدد'}
                     </p>
                  {order.shippingAddress?.phone && (
                    <div className="flex space-x-2 space-x-reverse">
                      <a
                        href={`tel:${order.shippingAddress.phone}`}
                        className="p-1 text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] transition-colors"
                        title="اتصال"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        onClick={handleWhatsAppConfirmation}
                        className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                        title="واتساب - تأكيد الطلب"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
                         <div className="mb-4">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 العنوان
               </label>
               <div className="flex items-start space-x-2 space-x-reverse">
                 <MapPin className="w-4 h-4 text-[#4CAF50] dark:text-[#4CAF50] mt-0.5 flex-shrink-0" />
                 <p className="text-gray-900 dark:text-white">
                   {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.governorate}
                   {order.shippingAddress?.postalCode && ` - ${order.shippingAddress.postalCode}`}
                 </p>
               </div>
             </div>
            
                         {/* WhatsApp Communication Buttons */}
             {order.shippingAddress?.phone && (
               <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                 <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                   التواصل مع العميل
                 </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleWhatsAppConfirmation}
                    className="btn-secondary-solid flex items-center"
                  >
                    <MessageCircle className="w-4 h-4 ml-2" />
                    تأكيد الطلب عبر واتساب
                  </button>
                  
                  <a
                    href={`tel:${order.shippingAddress.phone}`}
                    className="btn-primary flex items-center"
                  >
                    <Phone className="w-4 h-4 ml-2" />
                    اتصال مباشر
                  </a>
                  

                </div>
              </div>
            )}
          </div>

                     {/* Shipping Address */}
           <div className="card">
             <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
               <MapPin className="w-5 h-5 ml-2 text-[#4CAF50] dark:text-[#4CAF50]" />
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
               <DollarSign className="w-5 h-5 ml-2 text-[#FF9800] dark:text-[#FF9800]" />
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
                 <span className="font-medium text-[#4CAF50] dark:text-[#4CAF50]">
                   {formatCurrency(order.commission)}
                 </span>
               </div>
              {order.marketerProfit && order.marketerProfit > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ربح المسوق</span>
                  <span className="font-medium text-[#FF9800] dark:text-[#FF9800]">
                    {formatCurrency(order.marketerProfit)}
                  </span>
                </div>
              )}
                             <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                 <div className="flex justify-between">
                   <span className="font-semibold text-gray-900 dark:text-white">الإجمالي</span>
                   <span className="font-bold text-lg text-[#FF9800] dark:text-[#FF9800]">
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
                 <DollarSign className="w-5 h-5 ml-2 text-[#FF9800] dark:text-[#FF9800]" />
                 تفاصيل أرباحك
               </h3>
              <div className="space-y-3">
                              <div className="bg-[#FF9800]/10 dark:bg-[#FF9800]/20 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#F57C00] dark:text-[#F57C00]">ربح المسوق</span>
                  <span className="text-lg font-bold text-[#F57C00] dark:text-[#F57C00]">
                      {formatCurrency(order.marketerProfit || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-[#FF9800] dark:text-[#FF9800]">
                    سيتم إضافة هذا الربح إلى محفظتك عند اكتمال الطلب
                  </p>
                </div>
                
                                 {order.status === 'delivered' && (
                   <div className="bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20 p-4 rounded-lg border border-[#4CAF50]/20 dark:border-[#4CAF50]/30">
                     <div className="flex items-center">
                       <CheckCircle className="w-5 h-5 text-[#4CAF50] dark:text-[#4CAF50] ml-2" />
                       <span className="text-sm font-medium text-[#2E7D32] dark:text-[#4CAF50]">
                         تم إضافة الربح إلى محفظتك
                       </span>
                     </div>
                   </div>
                 )}
                
                                 {['pending', 'confirmed', 'processing', 'shipped'].includes(order.status) && (
                   <div className="bg-[#FF9800]/10 dark:bg-[#FF9800]/20 p-4 rounded-lg border border-[#FF9800]/20 dark:border-[#FF9800]/30">
                     <div className="flex items-center">
                       <Clock className="w-5 h-5 text-[#FF9800] dark:text-[#FF9800] ml-2" />
                       <span className="text-sm font-medium text-[#E65100] dark:text-[#FF9800]">
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
                 <DollarSign className="w-5 h-5 ml-2 text-[#4CAF50] dark:text-[#4CAF50]" />
                 تفاصيل أرباح الإدارة
               </h3>
              <div className="space-y-3">
                                 <div className="bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20 p-4 rounded-lg border border-[#4CAF50]/20 dark:border-[#4CAF50]/30">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-sm font-medium text-[#2E7D32] dark:text-[#4CAF50]">عمولة الإدارة</span>
                     <span className="text-lg font-bold text-[#2E7D32] dark:text-[#4CAF50]">
                       {formatCurrency(order.commission || 0)}
                     </span>
                   </div>
                   <p className="text-xs text-[#2E7D32] dark:text-[#4CAF50]">
                     سيتم إضافة هذه العمولة إلى محفظة الإدارة عند اكتمال الطلب
                   </p>
                 </div>
                
                                 {order.status === 'delivered' && (
                   <div className="bg-[#4CAF50]/10 dark:bg-[#4CAF50]/20 p-4 rounded-lg border border-[#4CAF50]/20 dark:border-[#4CAF50]/30">
                     <div className="flex items-center">
                       <CheckCircle className="w-5 h-5 text-[#4CAF50] dark:text-[#4CAF50] ml-2" />
                       <span className="text-sm font-medium text-[#2E7D32] dark:text-[#4CAF50]">
                         تم إضافة العمولة إلى محفظة الإدارة
                       </span>
                     </div>
                   </div>
                 )}
                
                                 {['pending', 'confirmed', 'processing', 'shipped'].includes(order.status) && (
                   <div className="bg-[#FF9800]/10 dark:bg-[#FF9800]/20 p-4 rounded-lg border border-[#FF9800]/20 dark:border-[#FF9800]/30">
                     <div className="flex items-center">
                       <Clock className="w-5 h-5 text-[#FF9800] dark:text-[#FF9800] ml-2" />
                       <span className="text-sm font-medium text-[#E65100] dark:text-[#FF9800]">
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
               <Package className="w-5 h-5 ml-2 text-[#4CAF50] dark:text-[#4CAF50]" />
               منتجات الطلب
             </h3>
            <div className="space-y-4">
                             {order.items.map((item, index) => (
                 <div key={index} className="flex items-center space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                   {/* Product Image */}
                   <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                     <MediaThumbnail
                       media={item.productId?.images || []}
                       alt={item.productName}
                       className="w-full h-full"
                       showTypeBadge={false}
                       fallbackIcon={<Package className="w-8 h-8 text-[#4CAF50] dark:text-[#4CAF50]" />}
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
               <Calendar className="w-5 h-5 ml-2 text-[#FF9800] dark:text-[#FF9800]" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                تحديث حالة الطلب
              </h3>
              
                             <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                   الحالة الجديدة
                 </label>
                 <select
                   value={newStatus}
                   onChange={(e) => setNewStatus(e.target.value)}
                   className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent"
                 >
                   <option value="">اختر الحالة</option>
                   {availableStatuses.map((status) => (
                     <option key={status} value={status}>
                       {statusConfig[status as keyof typeof statusConfig]?.label || status}
                     </option>
                   ))}
                 </select>
               </div>

               {/* Tracking Information - Required for shipped and out_for_delivery statuses */}
               {(newStatus === 'shipped' || newStatus === 'out_for_delivery') && (
                 <div className="space-y-4 mb-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                       رقم التتبع (اختياري)
                     </label>
                     <input
                       type="text"
                       value={trackingNumber}
                       onChange={(e) => setTrackingNumber(e.target.value)}
                       placeholder="أدخل رقم التتبع (اختياري)"
                       className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                       شركة الشحن
                     </label>
                     <input
                       type="text"
                       value={shippingCompany}
                       onChange={(e) => setShippingCompany(e.target.value)}
                       placeholder="أدخل اسم شركة الشحن"
                       className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent"
                     />
                   </div>
                 </div>
               )}

               {/* Notes Field */}
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                   ملاحظات إضافية
                 </label>
                 <textarea
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder="أدخل أي ملاحظات إضافية (اختياري)"
                   rows={3}
                   className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#FF9800] focus:border-transparent resize-none"
                 />
               </div>
              
              {/* WhatsApp Notification Option */}
              {newStatus && order?.shippingAddress?.phone && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center mb-2">
                    <MessageCircle className="w-5 h-5 text-green-600 ml-2" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      إشعار العميل عبر واتساب
                    </span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    سيتم إرسال رسالة تلقائية للعميل عبر واتساب لإعلامه بتحديث حالة الطلب
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="btn-secondary-solid"
                >
                  إلغاء
                </button>
                <button
                  onClick={updateOrderStatus}
                  disabled={!newStatus || updating}
                  className="btn-primary flex items-center"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      تحديث الحالة
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Invoice Modal */}
      {order && (
        <OrderInvoice
          order={order}
          isVisible={showInvoice}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
} 