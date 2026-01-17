'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
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
  createdAt: string;
  notes?: string;
  deliveryNotes?: string;
}

export default function BulkPrintPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Add print styles dynamically - MUST be before any conditional returns
  useEffect(() => {
    // Remove any existing bulk print styles first
    const existingStyle = document.getElementById('bulk-print-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'bulk-print-styles';
    // Use highest priority by adding at the end of head
    style.setAttribute('data-priority', '9999');
    style.textContent = `
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
        
        /* CRITICAL: Hide everything except bulk-print-version (same as invoice-print-version approach) */
        body > *:not(#bulk-print-version):not(script):not(style):not(#bulk-print-styles):not(#invoice-print-version) {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Show bulk-print-version (same approach as invoice-print-version) */
        #bulk-print-version {
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
        }
        
        /* Also support #bulk-print-page for compatibility */
        #bulk-print-page,
        body #bulk-print-page,
        html body #bulk-print-page,
        body > * #bulk-print-page,
        #bulk-print-version #bulk-print-page {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          position: relative !important;
        }
        
        /* CRITICAL: Override globals.css rules that hide elements with specific classes */
        /* globals.css has: [class*="fixed"], [class*="inset-0"], [class*="bg-black"], [class*="bg-opacity"] */
        /* We must override these BEFORE they hide #bulk-print-page */
        [class*="fixed"]:is(#bulk-print-page, #bulk-print-page *),
        [class*="inset-0"]:is(#bulk-print-page, #bulk-print-page *),
        [class*="bg-black"]:is(#bulk-print-page, #bulk-print-page *),
        [class*="bg-opacity"]:is(#bulk-print-page, #bulk-print-page *) {
          display: revert !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Hide everything else outside bulk-print-page */
        body > [class*="fixed"]:not(#bulk-print-page):not(#bulk-print-page *),
        body > [class*="inset-0"]:not(#bulk-print-page):not(#bulk-print-page *),
        body > [class*="bg-black"]:not(#bulk-print-page):not(#bulk-print-page *),
        body > [class*="bg-opacity"]:not(#bulk-print-page):not(#bulk-print-page *) {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Show bulk print page container - MUST BE VISIBLE */
        /* Override any conflicting styles from globals.css - including class-based rules */
        #bulk-print-page {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 10px !important;
          background: white !important;
          position: relative !important;
          overflow: visible !important;
        }
        
        /* Override globals.css class-based hiding rules for bulk-print-page and its children */
        #bulk-print-page[class*="fixed"],
        #bulk-print-page[class*="inset-0"],
        #bulk-print-page[class*="bg-black"],
        #bulk-print-page[class*="bg-opacity"],
        #bulk-print-page *[class*="fixed"],
        #bulk-print-page *[class*="inset-0"],
        #bulk-print-page *[class*="bg-black"],
        #bulk-print-page *[class*="bg-opacity"] {
          display: revert !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Make ALL children visible - CRITICAL */
        /* Override any display: none from globals.css */
        #bulk-print-page,
        #bulk-print-page *,
        #bulk-print-page *::before,
        #bulk-print-page *::after {
          visibility: visible !important;
          opacity: 1 !important;
          display: revert !important;
        }
        
        /* Ensure specific elements are not hidden - use specific display types */
        #bulk-print-page div {
          display: block !important;
        }
        #bulk-print-page span {
          display: inline !important;
        }
        #bulk-print-page p {
          display: block !important;
        }
        #bulk-print-page h1,
        #bulk-print-page h2,
        #bulk-print-page h3,
        #bulk-print-page h4 {
          display: block !important;
        }
        #bulk-print-page table {
          display: table !important;
        }
        #bulk-print-page tr {
          display: table-row !important;
        }
        #bulk-print-page td,
        #bulk-print-page th {
          display: table-cell !important;
        }
        #bulk-print-page tbody {
          display: table-row-group !important;
        }
        #bulk-print-page thead {
          display: table-header-group !important;
        }
        
        /* Override any inline styles or classes that might hide content */
        #bulk-print-page [style*="display: none"],
        #bulk-print-page [style*="visibility: hidden"] {
          display: block !important;
          visibility: visible !important;
        }
        
        /* Ensure the invoices container is visible */
        #bulk-print-page .space-y-8,
        #bulk-print-page > div {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Hide print controls only */
        #bulk-print-page .print\\:hidden {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        /* Show invoice content and all its children - CRITICAL */
        #bulk-print-page .invoice-content {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-bottom: 20px !important;
          background: white !important;
          position: relative !important;
          width: 100% !important;
          max-width: 100% !important;
          padding: 20px !important;
          border: 1px solid #e5e7eb !important;
        }
        
        /* Force page break after each invoice except the last one */
        #bulk-print-page .invoice-content:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
        }
        
        /* No page break after last invoice */
        #bulk-print-page .invoice-content:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
        
        /* Make ALL content inside invoice visible */
        #bulk-print-page .invoice-content * {
          visibility: visible !important;
          opacity: 1 !important;
          color: #000 !important;
          background: transparent !important;
        }
        
        /* Prevent breaking inside invoice sections */
        #bulk-print-page .invoice-content > div {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* Invoice table styling - CRITICAL for product details */
        #bulk-print-page .invoice-content table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 10px 0 !important;
          font-size: 12px !important;
          display: table !important;
          visibility: visible !important;
          opacity: 1 !important;
          border: 1px solid #000 !important;
          background: white !important;
        }
        
        #bulk-print-page .invoice-content table thead {
          display: table-header-group !important;
          visibility: visible !important;
          opacity: 1 !important;
          background: #f5f5f5 !important;
        }
        
        #bulk-print-page .invoice-content table tbody {
          display: table-row-group !important;
          visibility: visible !important;
          opacity: 1 !important;
          background: white !important;
        }
        
        #bulk-print-page .invoice-content table tr {
          display: table-row !important;
          visibility: visible !important;
          opacity: 1 !important;
          background: white !important;
          page-break-inside: avoid !important;
        }
        
        #bulk-print-page .invoice-content table th,
        #bulk-print-page .invoice-content table td {
          border: 1px solid #000 !important;
          padding: 6px !important;
          display: table-cell !important;
          visibility: visible !important;
          opacity: 1 !important;
          color: #000000 !important;
          background: #ffffff !important;
          font-size: 12px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        #bulk-print-page .invoice-content table th {
          background: #f5f5f5 !important;
          font-weight: bold !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        #bulk-print-page .invoice-content table tbody td {
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Force all text inside table cells to be black */
        #bulk-print-page .invoice-content table td *,
        #bulk-print-page .invoice-content table th * {
          color: #000000 !important;
          background: transparent !important;
        }
        
        /* Ensure all text is visible */
        #bulk-print-page .invoice-content h1,
        #bulk-print-page .invoice-content h2,
        #bulk-print-page .invoice-content h3,
        #bulk-print-page .invoice-content h4,
        #bulk-print-page .invoice-content p,
        #bulk-print-page .invoice-content span,
        #bulk-print-page .invoice-content div,
        #bulk-print-page .invoice-content label {
          visibility: visible !important;
          opacity: 1 !important;
          color: #000 !important;
          background: transparent !important;
        }
        
        #bulk-print-page .invoice-content h1,
        #bulk-print-page .invoice-content h2,
        #bulk-print-page .invoice-content h3 {
          display: block !important;
        }
        
        /* Ensure grid and flex layouts work in print */
        #bulk-print-page .grid {
          display: grid !important;
        }
        
        #bulk-print-page .flex {
          display: flex !important;
        }
      }
      `;
    // Append to end of head to ensure highest priority after globals.css
    document.head.appendChild(style);
    
    // Force style recalculation by accessing computed styles
    const bulkPage = document.getElementById('bulk-print-page');
    if (bulkPage) {
      window.getComputedStyle(bulkPage);
    }
    
    return () => {
      const existingStyle = document.getElementById('bulk-print-styles');
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, []);

  useEffect(() => {
    const orderIds = searchParams.get('ids');
    if (!orderIds) {
      router.push('/dashboard/orders');
      return;
    }

    const idsArray = orderIds.split(',').filter(id => id.trim());
    if (idsArray.length === 0) {
      router.push('/dashboard/orders');
      return;
    }

    fetchOrders(idsArray);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  // Auto-trigger print AFTER orders are rendered in DOM
  // CRITICAL: Use the same approach as OrderInvoice - create a print container directly in body
  useEffect(() => {
    if (orders.length === 0 || loading) {
      return;
    }

    // Flag to prevent multiple print calls
    let printTriggered = false;
    let printTimeoutId: NodeJS.Timeout | null = null;

    // Wait for React to render orders in DOM
    const prepareAndPrint = () => {
      // Prevent multiple print triggers
      if (printTriggered) {
        return true;
      }

      const bulkPage = document.getElementById('bulk-print-page');
      const contentDiv = printRef.current;
      
      if (!bulkPage || !contentDiv) {
        console.warn('Bulk print elements not ready yet');
        return false;
      }

      // Check if all invoices are rendered
      const invoiceContents = contentDiv.querySelectorAll('.invoice-content');
      const renderedCount = invoiceContents.length;
      
      console.log('Auto-print check:', {
        ordersCount: orders.length,
        renderedCount: renderedCount,
        match: renderedCount === orders.length
      });

      if (renderedCount === orders.length && renderedCount > 0) {
        // Verify first invoice has actual content (not just empty div)
        const firstInvoice = invoiceContents[0] as HTMLElement;
        if (firstInvoice) {
          const hasTextContent = firstInvoice.textContent && firstInvoice.textContent.trim().length > 0;
          
          if (hasTextContent) {
            console.log('All invoices rendered, preparing print container...');
            
            // Mark as triggered to prevent multiple calls
            printTriggered = true;
            
            // CRITICAL: Create print container directly in body (same as OrderInvoice)
            // Remove any existing print version
            const existingPrint = document.getElementById('bulk-print-version');
            if (existingPrint) existingPrint.remove();
            
            // Create print container
            const printContainer = document.createElement('div');
            printContainer.id = 'bulk-print-version';
            
            // Clone the entire bulk-print-page content (but exclude print controls)
            const clonedContent = bulkPage.cloneNode(true) as HTMLElement;
            // Remove print controls from clone
            const printControls = clonedContent.querySelector('.print\\:hidden');
            if (printControls && printControls.parentNode) {
              printControls.parentNode.removeChild(printControls);
            }
            
            printContainer.appendChild(clonedContent);
            
            // Add to body (off-screen initially) - SAME AS OrderInvoice
            printContainer.style.position = 'fixed';
            printContainer.style.top = '-9999px';
            printContainer.style.left = '-9999px';
            printContainer.style.width = '210mm'; // A4 width
            printContainer.style.background = 'white';
            document.body.appendChild(printContainer);
            
            // Trigger print after a short delay (only once)
            printTimeoutId = setTimeout(() => {
              try {
                window.print();
                
                // Cleanup after print
                const cleanup = () => {
                  const container = document.getElementById('bulk-print-version');
                  if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                  }
                };
                
                window.addEventListener('afterprint', cleanup, { once: true });
                // Fallback cleanup after 2 seconds
                setTimeout(cleanup, 2000);
              } catch (error) {
                console.error('Error triggering print:', error);
              }
            }, 300);
            
            return true;
          } else {
            console.warn('First invoice is empty');
          }
        }
      }
      
      return false;
    };

    // Try multiple times with delays to ensure DOM is ready
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryPrint = () => {
      // Don't retry if print was already triggered
      if (printTriggered) {
        return;
      }

      attempts++;
      
      const success = prepareAndPrint();
      
      if (!success && attempts < maxAttempts) {
        // Retry after delay - React needs time to render
        setTimeout(tryPrint, 300 * attempts); // Exponential backoff
      } else if (!success && attempts >= maxAttempts) {
        console.error('Failed to auto-print after', maxAttempts, 'attempts');
      }
    };

    // Start checking after initial render delay
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(tryPrint);
      });
    }, 500);

    // Cleanup on unmount
    return () => {
      if (printTimeoutId) {
        clearTimeout(printTimeoutId);
      }
      printTriggered = false;
    };
  }, [orders, loading]);

  // Add keyboard shortcut for print (Ctrl/Cmd + P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (orders.length > 0 && printRef.current) {
          const bulkPage = document.getElementById('bulk-print-page');
          if (bulkPage) {
            // Use same approach as button click: create print container
            const existingPrint = document.getElementById('bulk-print-version');
            if (existingPrint) existingPrint.remove();
            
            const printContainer = document.createElement('div');
            printContainer.id = 'bulk-print-version';
            
            const clonedContent = bulkPage.cloneNode(true) as HTMLElement;
            const printControls = clonedContent.querySelector('.print\\:hidden');
            if (printControls && printControls.parentNode) {
              printControls.parentNode.removeChild(printControls);
            }
            
            printContainer.appendChild(clonedContent);
            printContainer.style.position = 'fixed';
            printContainer.style.top = '-9999px';
            printContainer.style.left = '-9999px';
            printContainer.style.width = '210mm';
            printContainer.style.background = 'white';
            document.body.appendChild(printContainer);
            
            setTimeout(() => {
              try {
                window.print();
                const cleanup = () => {
                  const container = document.getElementById('bulk-print-version');
                  if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                  }
                };
                window.addEventListener('afterprint', cleanup, { once: true });
                setTimeout(cleanup, 2000);
              } catch (error) {
                console.error('Error triggering print from keyboard shortcut:', error);
              }
            }, 300);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [orders.length]);

  const fetchOrders = async (orderIds: string[]) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/bulk?ids=${orderIds.join(',')}`);
      
      if (!response.ok) {
        let errorMessage = 'فشل في جلب بيانات الطلبات';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.status === 403 
            ? 'غير مصرح لك بعرض هذه الطلبات'
            : response.status === 404
            ? 'الطلبات المطلوبة غير موجودة'
            : `خطأ في الخادم (${response.status})`;
        }
        toast.error(errorMessage);
        setOrders([]);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success || !data.orders) {
        const errorMessage = data.error || 'فشل في جلب بيانات الطلبات';
        toast.error(errorMessage);
        setOrders([]);
        return;
      }
      
      if (data.orders.length === 0) {
        toast.error('لم يتم العثور على أي طلبات');
        setOrders([]);
        return;
      }
      
      // Ensure items are properly formatted
      const formattedOrders = data.orders.map((order: any) => {
        // Debug: Log order items
        if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
          console.warn(`Order ${order.orderNumber} has no items:`, order.items);
        } else {
          console.log(`Order ${order.orderNumber} has ${order.items.length} items:`, order.items);
        }
        
        // Ensure items array is properly formatted and validated
        const formattedItems = Array.isArray(order.items) 
          ? order.items
              .filter((item: any) => item !== null && item !== undefined) // Filter out null/undefined items
              .map((item: any) => {
          // Ensure productName exists
          let productName = item.productName;
          if (!productName || productName.trim() === '') {
            if (item.productId && typeof item.productId === 'object' && item.productId.name) {
              productName = item.productId.name;
            } else {
              productName = 'غير محدد';
            }
          }
          
          return {
            ...item,
            productName: productName || 'غير محدد',
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: Number(item.totalPrice) || 0
          };
        })
        // Only filter out items with no name AND no quantity - keep items with at least one
        .filter((item: any) => {
          const hasName = item.productName && item.productName.trim() !== '';
          const hasQuantity = item.quantity > 0;
          return hasName || hasQuantity; // Keep if has name OR quantity
        })
          : [];
        
        return {
          ...order,
          items: formattedItems,
          shippingAddress: order.shippingAddress || {
            fullName: '',
            phone: '',
            street: '',
            city: '',
            governorate: '',
            postalCode: '',
            notes: ''
          }
        };
      });
      
      console.log('Formatted orders for display:', formattedOrders);
      setOrders(formattedOrders);
      
      // Note: Auto-print will be handled by useEffect that watches orders state
      
    } catch (error: any) {
      const errorMessage = error?.message || 'حدث خطأ غير متوقع أثناء جلب بيانات الطلبات';
      toast.error(errorMessage);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    // Ensure amount is a valid number
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return '₪ 0.00';
    }
    
    // Format with Arabic locale and ILS currency, with fallbacks
    try {
      return new Intl.NumberFormat('ar-PS', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numAmount);
    } catch {
      try {
        return new Intl.NumberFormat('ar', {
          style: 'currency',
          currency: 'ILS',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numAmount);
      } catch {
        // Final fallback to decimal format
        return `₪ ${new Intl.NumberFormat('en-US', {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numAmount)}`;
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'تاريخ غير صحيح';
      }
      // Try Arabic locale first, with fallbacks
      try {
        return new Intl.DateTimeFormat('ar-PS', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
      } catch {
        try {
          return new Intl.DateTimeFormat('ar', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(date);
        } catch {
          // Final fallback to English
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(date);
        }
      }
    } catch {
      return 'تاريخ غير صحيح';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الفواتير...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">لم يتم العثور على طلبات</p>
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="btn-primary"
          >
            العودة إلى الطلبات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="bulk-print-page" className="min-h-screen bg-white p-4">
        {/* Print Controls - Hidden when printing */}
        <div className="print:hidden mb-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="btn-secondary flex items-center"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة
          </button>
          <span className="text-gray-600 dark:text-gray-400">
            عدد الفواتير: {orders.length}
          </span>
        </div>
        <button
          onClick={() => {
            try {
              const bulkPage = document.getElementById('bulk-print-page');
              
              if (!bulkPage || !printRef.current) {
                toast.error('عنصر الطباعة غير موجود');
                return;
              }
              
              // Use same approach as auto-print: create print container directly in body
              // Remove any existing print version
              const existingPrint = document.getElementById('bulk-print-version');
              if (existingPrint) existingPrint.remove();
              
              // Create print container
              const printContainer = document.createElement('div');
              printContainer.id = 'bulk-print-version';
              
              // Clone the entire bulk-print-page content (but exclude print controls)
              const clonedContent = bulkPage.cloneNode(true) as HTMLElement;
              // Remove print controls from clone
              const printControls = clonedContent.querySelector('.print\\:hidden');
              if (printControls && printControls.parentNode) {
                printControls.parentNode.removeChild(printControls);
              }
              
              printContainer.appendChild(clonedContent);
              
              // Add to body (off-screen initially)
              printContainer.style.position = 'fixed';
              printContainer.style.top = '-9999px';
              printContainer.style.left = '-9999px';
              printContainer.style.width = '210mm'; // A4 width
              printContainer.style.background = 'white';
              document.body.appendChild(printContainer);
              
              // Trigger print after a short delay
              setTimeout(() => {
                try {
                  window.print();
                  
                  // Cleanup after print
                  const cleanup = () => {
                    const container = document.getElementById('bulk-print-version');
                    if (container && container.parentNode) {
                      container.parentNode.removeChild(container);
                    }
                  };
                  
                  window.addEventListener('afterprint', cleanup, { once: true });
                  // Fallback cleanup after 2 seconds
                  setTimeout(cleanup, 2000);
                } catch (error) {
                  console.error('Error triggering print:', error);
                  toast.error('حدث خطأ أثناء محاولة الطباعة');
                }
              }, 300);
            } catch (error) {
              console.error('Error preparing print:', error);
              toast.error('حدث خطأ أثناء محاولة الطباعة');
            }
          }}
          className="btn-primary flex items-center"
        >
          <Printer className="w-4 h-4 ml-2" />
          طباعة
        </button>
      </div>

      {/* Invoices Container */}
      <div ref={printRef} className="space-y-8">
        {orders.map((order, index) => (
          <div
            key={order._id}
            className="invoice-content bg-white p-6 border border-gray-200 rounded-lg"
          >
            {/* Invoice Header */}
            <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">ربح</h1>
              <h2 className="text-xl font-semibold text-gray-700">
                فاتورة رقم: {order.orderNumber}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(order.createdAt)}
              </p>
            </div>

            {/* Client Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
                بيانات العميل
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">الاسم:</span>
                  <span className="mr-2 text-gray-900">
                    {order.shippingAddress?.fullName || 'غير محدد'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">الهاتف:</span>
                  <span className="mr-2 text-gray-900">
                    {order.shippingAddress?.phone || 'غير محدد'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">العنوان:</span>
                  <span className="mr-2 text-gray-900">
                    {(() => {
                      const address = order.shippingAddress || {};
                      const parts = [];
                      
                      if (address.street) parts.push(address.street);
                      if (address.manualVillageName) parts.push(address.manualVillageName);
                      else if (address.villageName) parts.push(address.villageName);
                      else if (address.city) parts.push(address.city);
                      if (address.governorate) parts.push(address.governorate);
                      if (address.postalCode) parts.push(address.postalCode);
                      
                      return parts.length > 0 ? parts.join(' - ') : 'غير محدد';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
                المنتجات
              </h3>
              <table className="w-full border-collapse border border-gray-800">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-800 p-2 text-right text-sm font-semibold text-gray-900">م</th>
                    <th className="border border-gray-800 p-2 text-right text-sm font-semibold text-gray-900">اسم المنتج</th>
                    <th className="border border-gray-800 p-2 text-right text-sm font-semibold text-gray-900">الكمية</th>
                    <th className="border border-gray-800 p-2 text-right text-sm font-semibold text-gray-900">سعر الوحدة</th>
                    <th className="border border-gray-800 p-2 text-right text-sm font-semibold text-gray-900">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {!order.items || !Array.isArray(order.items) || order.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-gray-800 p-2 text-center text-sm text-gray-500">
                        {!order.items 
                          ? 'خطأ: لا توجد بيانات المنتجات' 
                          : !Array.isArray(order.items)
                          ? 'خطأ: بيانات المنتجات غير صحيحة'
                          : 'لا توجد منتجات في هذا الطلب'}
                      </td>
                    </tr>
                  ) : (
                    order.items.map((item: any, itemIndex: number) => {
                      // Get product name from multiple sources with priority:
                      // 1. item.productName (saved in order - most reliable)
                      // 2. item.productId.name (from populated product)
                      // 3. Fallback to 'غير محدد'
                      let productName = item.productName;
                      
                      if (!productName || productName.trim() === '') {
                        if (item.productId) {
                          if (typeof item.productId === 'object' && item.productId !== null && item.productId.name) {
                            productName = item.productId.name;
                          }
                        }
                      }
                      
                      // Final fallback
                      if (!productName || productName.trim() === '') {
                        productName = 'غير محدد';
                      }
                      
                      // Ensure numeric values are properly formatted
                      const quantity = Number(item.quantity) || 0;
                      const unitPrice = Number(item.unitPrice) || 0;
                      const totalPrice = Number(item.totalPrice) || 0;
                      
                      // Skip items with no product name (but allow items with quantity 0 in case they need to be shown)
                      if (!productName || productName.trim() === '') {
                        return null;
                      }
                      
                      return (
                        <tr key={`${order._id}-${itemIndex}`} className="hover:bg-gray-50">
                          <td className="border border-gray-800 p-2 text-center text-sm text-gray-900">{itemIndex + 1}</td>
                          <td className="border border-gray-800 p-2 text-right text-sm font-medium text-gray-900">{productName.trim()}</td>
                          <td className="border border-gray-800 p-2 text-center text-sm text-gray-900">{quantity}</td>
                          <td className="border border-gray-800 p-2 text-left text-sm text-gray-900">{formatCurrency(unitPrice)}</td>
                          <td className="border border-gray-800 p-2 text-left text-sm font-semibold text-gray-900">{formatCurrency(totalPrice)}</td>
                        </tr>
                      );
                    }).filter(Boolean) // Remove null entries
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mb-6">
              <div className="flex justify-end">
                <div className="w-64">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="p-2 text-right text-sm font-medium text-gray-700 border-b border-gray-300">المجموع الفرعي:</td>
                        <td className="p-2 text-left text-sm text-gray-900 border-b border-gray-300">{formatCurrency(order.subtotal)}</td>
                      </tr>
                      {order.shippingCost && order.shippingCost > 0 && (
                        <tr>
                          <td className="p-2 text-right text-sm font-medium text-gray-700 border-b border-gray-300">تكلفة الشحن:</td>
                          <td className="p-2 text-left text-sm text-gray-900 border-b border-gray-300">{formatCurrency(order.shippingCost)}</td>
                        </tr>
                      )}
                      {order.commission && order.commission > 0 && (
                        <tr>
                          <td className="p-2 text-right text-sm font-medium text-gray-700 border-b border-gray-300">العمولة:</td>
                          <td className="p-2 text-left text-sm text-gray-900 border-b border-gray-300">{formatCurrency(order.commission)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-2 text-right text-sm font-bold text-gray-900">الإجمالي:</td>
                        <td className="p-2 text-left text-sm font-bold text-gray-900">{formatCurrency(order.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Notes */}
            {(order.notes || order.deliveryNotes || order.shippingAddress?.notes) && (
              <div className="mb-4 pt-4 border-t border-gray-300">
                {order.notes && (
                  <div className="mb-2">
                    <span className="font-medium text-gray-700 text-sm">ملاحظات الطلب:</span>
                    <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
                  </div>
                )}
                {order.deliveryNotes && (
                  <div className="mb-2">
                    <span className="font-medium text-gray-700 text-sm">ملاحظات التوصيل:</span>
                    <p className="text-sm text-gray-600 mt-1">{order.deliveryNotes}</p>
                  </div>
                )}
                {order.shippingAddress?.notes && (
                  <div>
                    <span className="font-medium text-gray-700 text-sm">ملاحظات العنوان:</span>
                    <p className="text-sm text-gray-600 mt-1">{order.shippingAddress.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>شكراً لتعاملكم معنا</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

