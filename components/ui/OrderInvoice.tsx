'use client';

import { useEffect, useRef } from 'react';

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

interface OrderInvoiceProps {
  order: Order;
  isVisible: boolean;
  onClose: () => void;
}

export default function OrderInvoice({ order, isVisible, onClose }: OrderInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      const timeoutId = setTimeout(() => {
        if (printRef.current) {
          window.print();
          onClose();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">فاتورة الطلب</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div ref={printRef} className="print:block">
            {/* Print Styles */}
            <style jsx>{`
              @media print {
                body { margin: 0; }
                .print-hidden { display: none !important; }
                .print-break { page-break-before: always; }
                .invoice-container { 
                  max-width: none !important;
                  margin: 0 !important;
                  padding: 20px !important;
                }
              }
            `}</style>

            <div className="invoice-container bg-white p-8 max-w-4xl mx-auto">
              {/* Header */}
              <div className="border-b-2 border-gray-300 pb-6 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">ريبح</h1>
                    <p className="text-gray-600 text-lg">منصة التجارة الإلكترونية</p>
                    <p className="text-gray-500">فلسطين</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">فاتورة</h2>
                    <p className="text-gray-600">رقم الطلب: #{order.orderNumber}</p>
                    <p className="text-gray-500">التاريخ: {formatDate(order.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Customer & Supplier Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    معلومات العميل
                  </h3>
                  <div className="space-y-2">
                    <p><strong>الاسم:</strong> {order.shippingAddress.fullName}</p>
                    <p><strong>الهاتف:</strong> {order.shippingAddress.phone}</p>
                    <p><strong>البريد الإلكتروني:</strong> {order.customerId.email}</p>
                    <p><strong>الدور:</strong> {order.customerRole}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    معلومات المورد
                  </h3>
                  <div className="space-y-2">
                    <p><strong>الاسم:</strong> {order.supplierId.name}</p>
                    {order.supplierId.companyName && (
                      <p><strong>اسم الشركة:</strong> {order.supplierId.companyName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                  عنوان الشحن
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.governorate}</p>
                  {order.shippingAddress.postalCode && (
                    <p>الرمز البريدي: {order.shippingAddress.postalCode}</p>
                  )}
                  {order.shippingAddress.notes && (
                    <p className="mt-2 text-gray-600">ملاحظات: {order.shippingAddress.notes}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                  المنتجات المطلوبة
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-right font-bold">المنتج</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">الكمية</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">سعر الوحدة</th>
                        <th className="border border-gray-300 p-3 text-center font-bold">المجموع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 p-3 text-right">
                            <div className="flex items-center space-x-3 space-x-reverse">
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                {item.productId?.images && item.productId.images.length > 0 ? (
                                  <img 
                                    src={item.productId.images[0]} 
                                    alt={item.productId.name || item.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-gray-300 rounded"></div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-gray-500">نوع السعر: {item.priceType === 'marketer' ? 'تسويق' : 'جملة'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                          <td className="border border-gray-300 p-3 text-center">{formatCurrency(item.unitPrice)}</td>
                          <td className="border border-gray-300 p-3 text-center font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">ملخص الطلب</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>العمولة:</span>
                      <span>{formatCurrency(order.commission)}</span>
                    </div>
                    {order.marketerProfit && (
                      <div className="flex justify-between">
                        <span>ربح المسوق:</span>
                        <span>{formatCurrency(order.marketerProfit)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-300 pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>المجموع الإجمالي:</span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment & Shipping Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    معلومات الدفع
                  </h3>
                  <div className="space-y-2">
                    <p><strong>طريقة الدفع:</strong> {order.paymentMethod}</p>
                    <p><strong>حالة الدفع:</strong> {order.paymentStatus}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    معلومات الشحن
                  </h3>
                  <div className="space-y-2">
                    <p><strong>حالة الطلب:</strong> {order.status}</p>
                    {order.trackingNumber && (
                      <p><strong>رقم التتبع:</strong> {order.trackingNumber}</p>
                    )}
                    {order.shippingCompany && (
                      <p><strong>شركة الشحن:</strong> {order.shippingCompany}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {(order.notes || order.adminNotes) && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                    ملاحظات
                  </h3>
                  <div className="space-y-3">
                    {order.notes && (
                      <div>
                        <p className="font-medium">ملاحظات العميل:</p>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded">{order.notes}</p>
                      </div>
                    )}
                    {order.adminNotes && (
                      <div>
                        <p className="font-medium">ملاحظات الإدارة:</p>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded">{order.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t-2 border-gray-300 pt-6 mt-8">
                <div className="text-center">
                  <p className="text-gray-600 mb-2">شكراً لثقتك بنا</p>
                  <p className="text-sm text-gray-500">ريبح - منصة التجارة الإلكترونية</p>
                  <p className="text-xs text-gray-400 mt-2">تم إنشاء هذه الفاتورة في {formatDate(order.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
