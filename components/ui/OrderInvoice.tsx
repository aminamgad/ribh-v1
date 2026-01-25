'use client';

// Traditional Invoice Format - Simple and Clean
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
  shippingCost?: number;
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
    manualVillageName?: string;
    villageName?: string;
  };
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  deliveryNotes?: string;
  createdAt: string;
  updatedAt: string;
  actualDelivery?: string;
  shippingCompany?: string;
  adminNotes?: string;
}

interface OrderInvoiceProps {
  order: Order;
  isVisible: boolean;
  onClose: () => void;
}

export default function OrderInvoice({ order, isVisible, onClose }: OrderInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !order || !printRef.current) {
      return;
    }

    // Wait for DOM to be ready
    const timeoutId = setTimeout(() => {
      // Find the invoice content element inside the modal
      const invoiceContentEl = printRef.current?.querySelector('.invoice-content');
      
      if (!invoiceContentEl) {
        return;
      }

      // Remove any existing print version
      const existingPrint = document.getElementById('invoice-print-version');
      if (existingPrint) existingPrint.remove();
      
      // Create print container
      const printContainer = document.createElement('div');
      printContainer.id = 'invoice-print-version';
      printContainer.className = 'invoice-content';
      
      // Clone the invoice content (deep clone to preserve structure)
      const clonedContent = invoiceContentEl.cloneNode(true) as HTMLElement;
      printContainer.appendChild(clonedContent);
      
      // Add to body (off-screen initially)
      printContainer.style.position = 'fixed';
      printContainer.style.top = '-9999px';
      printContainer.style.left = '-9999px';
      printContainer.style.width = '210mm'; // A4 width
      printContainer.style.background = 'white';
      document.body.appendChild(printContainer);
      
      // Remove any existing print styles
      const existingStyle = document.getElementById('invoice-print-styles');
      if (existingStyle) existingStyle.remove();
      
      // Add comprehensive print styles
      const printStyle = document.createElement('style');
      printStyle.id = 'invoice-print-styles';
      printStyle.innerHTML = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.8cm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          
          /* Hide everything except invoice print version */
          body > *:not(#invoice-print-version) {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Show invoice print version */
          #invoice-print-version {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            page-break-inside: avoid !important;
          }
          
          /* Ensure all invoice content is visible */
          #invoice-print-version,
          #invoice-print-version * {
            visibility: visible !important;
            display: revert !important;
            opacity: 1 !important;
            color: #000 !important;
            background: transparent !important;
          }
          
          #invoice-print-version table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
            margin: 5px 0 !important;
          }
          
          #invoice-print-version table,
          #invoice-print-version th,
          #invoice-print-version td {
            border: 1px solid #000 !important;
            padding: 4px !important;
          }
          
          #invoice-print-version th {
            background: #f5f5f5 !important;
            font-weight: bold !important;
          }
          
          /* Hide print-hidden elements */
          .print\\:hidden,
          [class*="print:hidden"] {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(printStyle);
      
      // Trigger print after a short delay to ensure styles are applied
      const printTimeoutId = setTimeout(() => {
        try {
          window.print();
        } catch (error) {
          // Silently handle print errors
        }
        
        // Cleanup function
        const cleanup = () => {
          const container = document.getElementById('invoice-print-version');
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }
          const style = document.getElementById('invoice-print-styles');
          if (style && style.parentNode) {
            style.parentNode.removeChild(style);
          }
        };
        
        // Handle both afterprint event and timeout
        const handleAfterPrint = () => {
          cleanup();
        };
        
        window.addEventListener('afterprint', handleAfterPrint, { once: true });
        // Fallback cleanup after 2 seconds
        setTimeout(cleanup, 2000);
      }, 300);

      // Store printTimeoutId for cleanup
      (printContainer as any)._printTimeoutId = printTimeoutId;
    }, 300);
    
    return () => {
      clearTimeout(timeoutId);
      // Cleanup any remaining print elements
      const container = document.getElementById('invoice-print-version');
      if (container && container.parentNode) {
        const printTimeoutId = (container as any)._printTimeoutId;
        if (printTimeoutId) {
          clearTimeout(printTimeoutId);
        }
        container.parentNode.removeChild(container);
      }
      const style = document.getElementById('invoice-print-styles');
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [isVisible, order]);

  if (!isVisible || !order) return null;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      // Try Arabic locale first, fallback to English if not available
      try {
        return new Intl.DateTimeFormat('ar-PS', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
      } catch {
        return new Intl.DateTimeFormat('ar', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
      }
    } catch (e) {
      // Final fallback to English
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return dateString;
      }
    }
  };

  const formatCurrency = (amount: number) => {
    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount)) {
        return '0.00';
      }
      // Try Arabic locale first, fallback to English if not available
      try {
        return new Intl.NumberFormat('ar-PS', {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numAmount);
      } catch {
        try {
          return new Intl.NumberFormat('ar', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(numAmount);
        } catch {
          // Final fallback to English
          return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(numAmount);
        }
      }
    } catch {
      return '0.00';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 print:hidden"
      onClick={onClose}
    >
      <div 
        ref={printRef}
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 print:hidden">
            <h2 className="text-2xl font-bold text-gray-900">فاتورة الطلب</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold print:hidden"
            >
              ×
            </button>
          </div>
          
          {/* Invoice content - This is what gets printed */}
          <div className="invoice-content">
            <div className="text-center mb-3 border-b-2 border-gray-800 pb-2">
              <h1 className="text-xl font-bold mb-1 text-gray-900">ربح</h1>
              <p className="text-xs text-gray-700">فاتورة رقم: #{order.orderNumber || 'N/A'} - {order.createdAt ? formatDate(order.createdAt) : ''}</p>
            </div>

            <div className="mb-3">
              <h3 className="font-bold text-sm mb-1 text-gray-900">بيانات العميل:</h3>
              <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-900">
                <div>
                  <span className="font-semibold">الاسم: </span>
                  <span>{order.shippingAddress?.fullName || order.customerName || 'غير متوفر'}</span>
                </div>
                <div>
                  <span className="font-semibold">الهاتف: </span>
                  <span>{order.shippingAddress?.phone || order.customerPhone || 'غير متوفر'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">العنوان: </span>
                  <span>
                    {(() => {
                      const address = order.shippingAddress || {};
                      const parts = [];
                      if (address.street) parts.push(address.street);
                      if (address.manualVillageName) parts.push(address.manualVillageName);
                      else if (address.villageName) parts.push(address.villageName);
                      else if (address.city) parts.push(address.city);
                      if (address.governorate) parts.push(address.governorate);
                      return parts.length > 0 ? parts.join('، ') : 'غير محدد';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-1 text-gray-900">المنتجات:</h3>
              <table className="w-full border-collapse border border-gray-800 text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-800 p-1 text-center font-bold w-8 text-gray-900">م</th>
                    <th className="border border-gray-800 p-1 text-right font-bold text-gray-900">اسم المنتج</th>
                    <th className="border border-gray-800 p-1 text-center font-bold w-16 text-gray-900">الكمية</th>
                    <th className="border border-gray-800 p-1 text-center font-bold w-20 text-gray-900">سعر الوحدة</th>
                    <th className="border border-gray-800 p-1 text-center font-bold w-24 text-gray-900">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="border border-gray-800 p-1 text-center text-gray-900">{index + 1}</td>
                        <td className="border border-gray-800 p-1 text-right text-gray-900">{item.productName || item.productId?.name || 'غير محدد'}</td>
                        <td className="border border-gray-800 p-1 text-center text-gray-900">{item.quantity || 0}</td>
                        <td className="border border-gray-800 p-1 text-center text-gray-900">{formatCurrency(item.unitPrice)} ₪</td>
                        <td className="border border-gray-800 p-1 text-center font-semibold text-gray-900">{formatCurrency(item.totalPrice)} ₪</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-gray-800 p-2 text-center text-gray-500">
                        لا توجد منتجات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Notes and Delivery Notes */}
            {(order.notes || order.deliveryNotes || order.shippingAddress?.notes) && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                {order.notes && (
                  <div className="mb-2 text-xs">
                    <span className="font-semibold text-gray-900">ملاحظات الطلب: </span>
                    <span className="text-gray-700">{order.notes}</span>
                  </div>
                )}
                {order.deliveryNotes && (
                  <div className="mb-2 text-xs">
                    <span className="font-semibold text-gray-900">ملاحظات التوصيل: </span>
                    <span className="text-gray-700">{order.deliveryNotes}</span>
                  </div>
                )}
                {order.shippingAddress?.notes && (
                  <div className="text-xs">
                    <span className="font-semibold text-gray-900">ملاحظات العنوان: </span>
                    <span className="text-gray-700">{order.shippingAddress.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
