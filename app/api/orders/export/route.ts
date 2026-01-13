import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import * as XLSX from 'xlsx';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/orders/export - Export orders to Excel
async function exportOrders(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const format = searchParams.get('format') || 'xlsx'; // xlsx or csv
    
    // Check permissions - only admin and supplier can export orders
    if (user.role !== 'admin' && user.role !== 'supplier') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتصدير الطلبات' },
        { status: 403 }
      );
    }
    
    // Build query
    let query: any = {};
    
    // Date range filter (optional)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Role-based filtering
    if (user.role === 'supplier') {
      // Suppliers can only export orders for their products
      query.supplierId = user._id;
    }
    // Admins can export all orders (no additional filter needed)
    
    // Fetch orders with populated data
    const orders = await Order.find(query)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name sku marketerPrice wholesalerPrice')
      .populate('supplierId', 'name companyName')
      .sort({ createdAt: -1 })
      .lean();
    
    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, message: 'لا توجد طلبات للتصدير' },
        { status: 404 }
      );
    }
    
    // Transform data for Excel
    const excelData = orders.map((order: any) => ({
      'رقم الطلب': order.orderNumber || order._id,
      'تاريخ الطلب': new Date(order.createdAt).toLocaleDateString('en-US'),
      'وقت الطلب': new Date(order.createdAt).toLocaleTimeString('en-US'),
      'حالة الطلب': getStatusInArabic(order.status),
      'اسم العميل': order.customerId?.name || 'غير محدد',
      'بريد العميل': order.customerId?.email || 'غير محدد',
      'هاتف العميل': order.customerId?.phone || 'غير محدد',
      'العنوان': order.shippingAddress?.street || 'غير محدد',
      'المدينة': order.shippingAddress?.city || 'غير محدد',
      'المحافظة': order.shippingAddress?.governorate || 'غير محدد',
      'الرمز البريدي': order.shippingAddress?.postalCode || 'غير محدد',
      'إجمالي الطلب': order.subtotal || 0,
      'رسوم الشحن': order.shippingCost || 0,
      'العمولة': order.commission || 0,
      'المبلغ النهائي': order.total || 0,
      'طريقة الدفع': order.paymentMethod || 'غير محدد',
      'حالة الدفع': order.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع',
      'ملاحظات الطلب': order.deliveryNotes || '',
      'ملاحظات الإدارة': order.adminNotes || '',
      'تاريخ التأكيد': order.confirmedAt ? new Date(order.confirmedAt).toLocaleDateString('en-US') : '',
      'تاريخ المعالجة': order.processingAt ? new Date(order.processingAt).toLocaleDateString('en-US') : '',
      'تاريخ الشحن': order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('en-US') : '',
      'تاريخ التسليم': order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-US') : '',
      'تاريخ الإلغاء': order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString('en-US') : '',
      'تاريخ الإرجاع': order.returnedAt ? new Date(order.returnedAt).toLocaleDateString('en-US') : '',
      'تاريخ الاسترداد': order.refundedAt ? new Date(order.refundedAt).toLocaleDateString('en-US') : '',
    }));
    
    // Add items details
    const itemsData: any[] = [];
    orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        itemsData.push({
          'رقم الطلب': order.orderNumber || order._id,
          'اسم المنتج': item.productId?.name || 'غير محدد',
          'رمز المنتج': item.productId?.sku || 'غير محدد',
          'الكمية': item.quantity,
          'سعر الوحدة': item.unitPrice,
          'إجمالي السعر': item.totalPrice,
          'اسم المورد': order.supplierId?.name || order.supplierId?.companyName || 'غير محدد',
          'حالة المنتج': getStatusInArabic(item.status || order.status),
        });
      });
    });
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Add orders sheet
    const ordersSheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'الطلبات');
    
    // Add items sheet
    const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'تفاصيل المنتجات');
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `orders_export_${timestamp}.${format}`;
    
    // Convert to buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: format === 'csv' ? 'csv' : 'xlsx' 
    });
    
    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    logger.error('Error exporting orders', error, { userId: user?._id, role: user?.role });
    return handleApiError(error, 'حدث خطأ أثناء تصدير الطلبات');
  }
}

// Helper function to get Arabic status
function getStatusInArabic(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'قيد الانتظار',
    'confirmed': 'مؤكد',
    'processing': 'قيد المعالجة',
    'ready_for_shipping': 'جاهز للشحن',
    'shipped': 'تم الشحن',
    'out_for_delivery': 'خارج للتوصيل',
    'delivered': 'تم التسليم',
    'cancelled': 'ملغي',
    'returned': 'مرتجع',
    'refunded': 'مسترد'
  };
  return statusMap[status] || status;
}

export const GET = withAuth(exportOrders);
