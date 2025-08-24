'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Clock, CheckCircle, Package, Truck, CheckCircle2, X, RotateCcw, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: {
    label: 'معلق',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
    description: 'الطلب في انتظار التأكيد'
  },
  confirmed: {
    label: 'مؤكد',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: CheckCircle,
    description: 'تم تأكيد الطلب'
  },
  processing: {
    label: 'قيد المعالجة',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: Package,
    description: 'الطلب قيد التحضير'
  },
  ready_for_shipping: {
    label: 'جاهز للشحن',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    icon: Package,
    description: 'الطلب جاهز للشحن'
  },
  shipped: {
    label: 'تم الشحن',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    icon: Truck,
    description: 'تم شحن الطلب'
  },
  out_for_delivery: {
    label: 'خارج للتوصيل',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: Truck,
    description: 'الطلب خارج للتوصيل'
  },
  delivered: {
    label: 'تم التسليم',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
    description: 'تم تسليم الطلب بنجاح'
  },
  cancelled: {
    label: 'ملغي',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: X,
    description: 'تم إلغاء الطلب'
  },
  returned: {
    label: 'مرتجع',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: RotateCcw,
    description: 'تم إرجاع الطلب'
  },
  refunded: {
    label: 'مسترد',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: RotateCcw,
    description: 'تم استرداد المبلغ'
  }
};

const processingSteps = [
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
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
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
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    actions: ['returned']
  }
];

export default function TestProcessingWorkflowPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const updateOrderStatus = async (orderId: string, newStatus: string, trackingNumber?: string, shippingCompany?: string) => {
    try {
      setUpdating(true);
      
      const updateData: any = { status: newStatus };
      
      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }
      
      if (shippingCompany) {
        updateData.shippingCompany = shippingCompany;
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم تحديث حالة الطلب بنجاح');
        fetchOrders(); // Refresh orders
        setSelectedOrder(null);
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

  const getStepCompletionStatus = (stepId: string, orderStatus: string) => {
    const stepOrder = ['pending', 'confirmed', 'processing', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered'];
    const currentStepIndex = stepOrder.indexOf(orderStatus);
    const stepIndex = stepOrder.indexOf(stepId);
    return stepIndex < currentStepIndex;
  };

  const getStepCurrentStatus = (stepId: string, orderStatus: string) => {
    return orderStatus === stepId;
  };

  const getStepUpcomingStatus = (stepId: string, orderStatus: string) => {
    const stepOrder = ['pending', 'confirmed', 'processing', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered'];
    const currentStepIndex = stepOrder.indexOf(orderStatus);
    const stepIndex = stepOrder.indexOf(stepId);
    return stepIndex > currentStepIndex;
  };

  const getProcessingTimeline = (order: any) => {
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
        icon: CheckCircle2,
        color: 'text-green-600'
      });
    }
    
    return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            اختبار مراحل معالجة الطلبات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            اختبار شامل لمراحل معالجة الطلبات من البداية إلى النهاية
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-1">
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status as keyof typeof statusConfig]?.bgColor} ${statusConfig[order.status as keyof typeof statusConfig]?.color}`}>
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
          </div>

          {/* Processing Workflow */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="space-y-6">
                {/* Order Header */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        الطلب #{selectedOrder.orderNumber}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        العميل: {selectedOrder.customerName || selectedOrder.customerId?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.bgColor} ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color}`}>
                        {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Processing Steps */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                    <Package className="w-5 h-5 ml-2" />
                    مراحل معالجة الطلب
                  </h3>
                  
                  <div className="space-y-4">
                    {processingSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isCompleted = getStepCompletionStatus(step.id, selectedOrder.status);
                      const isCurrent = getStepCurrentStatus(step.id, selectedOrder.status);
                      const isUpcoming = getStepUpcomingStatus(step.id, selectedOrder.status);
                      
                      return (
                        <div key={step.id} className="flex items-start space-x-4 space-x-reverse">
                          {/* Step Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            isCompleted 
                              ? 'bg-green-100 text-green-600' 
                              : isCurrent 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                          
                          {/* Step Content */}
                          <div className="flex-1 min-w-0">
                            <div className={`p-4 rounded-lg border ${
                              isCompleted 
                                ? 'bg-green-50 border-green-200' 
                                : isCurrent 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className={`font-medium ${
                                  isCompleted 
                                    ? 'text-green-800' 
                                    : isCurrent 
                                    ? 'text-blue-800' 
                                    : 'text-gray-600'
                                }`}>
                                  {step.title}
                                </h4>
                                {isCurrent && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    الحالية
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${
                                isCompleted 
                                  ? 'text-green-700' 
                                  : isCurrent 
                                  ? 'text-blue-700' 
                                  : 'text-gray-500'
                              }`}>
                                {step.description}
                              </p>
                              
                              {/* Available Actions */}
                              {isCurrent && user?.role === 'admin' && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-600 mb-2">الإجراءات المتاحة:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {step.actions.map(action => (
                                      <button
                                        key={action}
                                        onClick={() => {
                                          if (action === 'shipped' || action === 'out_for_delivery') {
                                            const trackingNumber = prompt('أدخل رقم التتبع:');
                                            const shippingCompany = prompt('أدخل اسم شركة الشحن:');
                                            if (trackingNumber) {
                                              updateOrderStatus(selectedOrder._id, action, trackingNumber, shippingCompany || undefined);
                                            }
                                          } else {
                                            updateOrderStatus(selectedOrder._id, action);
                                          }
                                        }}
                                        disabled={updating}
                                        className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                </div>

                {/* Processing Timeline */}
                {getProcessingTimeline(selectedOrder).length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      سجل المعالجة
                    </h3>
                    <div className="space-y-3">
                      {getProcessingTimeline(selectedOrder).map((event, index) => {
                        const EventIcon = event.icon;
                        return (
                          <div key={index} className="flex items-start space-x-3 space-x-reverse">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${event.color} bg-opacity-10`}>
                              <EventIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {event.title}
                                </h5>
                                <span className="text-xs text-gray-500">
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

                {/* Shipping Information */}
                {selectedOrder.trackingNumber && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Truck className="w-5 h-5 ml-2" />
                      معلومات الشحن
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">رقم التتبع</p>
                        <p className="font-mono text-lg font-medium text-gray-900 dark:text-white">
                          {selectedOrder.trackingNumber}
                        </p>
                      </div>
                      {selectedOrder.shippingCompany && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">شركة الشحن</p>
                          <p className="text-lg font-medium text-gray-900 dark:text-white">
                            {selectedOrder.shippingCompany}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">اختر طلباً من القائمة لعرض مراحل المعالجة</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
