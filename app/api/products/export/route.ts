import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import * as XLSX from 'xlsx';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/products/export - Export products to Excel
async function exportProducts(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    // Check permissions - only admin can export products
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتصدير المنتجات' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const stockStatus = searchParams.get('stockStatus');
    const suppliers = searchParams.get('suppliers');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const manuallyModified = searchParams.get('manuallyModified');
    
    // Build query (same logic as GET /api/products)
    let query: any = {};
    
    // Stock Status filter
    if (stockStatus) {
      const stockStatuses = stockStatus.split(',');
      const stockConditions: any[] = [];
      
      if (stockStatuses.includes('in_stock')) {
        stockConditions.push({ stockQuantity: { $gt: 10 } });
      }
      if (stockStatuses.includes('low_stock')) {
        stockConditions.push({ stockQuantity: { $gte: 1, $lte: 10 } });
      }
      if (stockStatuses.includes('out_of_stock')) {
        stockConditions.push({ stockQuantity: { $eq: 0 } });
      }
      
      if (stockConditions.length > 0) {
        if (stockConditions.length === 1) {
          query.stockQuantity = stockConditions[0].stockQuantity;
        } else {
          query.$or = stockConditions;
        }
      }
    }
    
    // Suppliers filter
    if (suppliers) {
      const supplierIds = suppliers.split(',');
      query.supplierId = { $in: supplierIds };
    }
    
    // Date Range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // المنتجات المعدلة يدوياً (سعر المسوق)
    if (manuallyModified === 'true') {
      query.isMarketerPriceManuallyAdjusted = true;
    }
    
    // Fetch products with populated data
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('supplierId', 'name companyName')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    if (products.length === 0) {
      return NextResponse.json(
        { success: false, message: 'لا توجد منتجات للتصدير' },
        { status: 404 }
      );
    }
    
    // Transform data for Excel
    const excelData = products.map((product: any) => ({
      'اسم المنتج': product.name || '',
      'الوصف': product.description || '',
      'رمز المنتج': product.sku || '',
      'الفئة': product.categoryId?.name || '',
      'المورد': product.supplierId?.companyName || product.supplierId?.name || '',
      'سعر المسوق': product.marketerPrice || 0,
      'سعر الجملة': product.wholesalerPrice || 0,
      'الحد الأدنى للسعر': product.minimumSellingPrice || '',
      'المخزون': product.stockQuantity || 0,
      'حالة المخزون': 
        product.stockQuantity > 10 ? 'متوفر' :
        product.stockQuantity > 0 ? 'منخفض' : 'نفد',
      'نشط': product.isActive ? 'نعم' : 'لا',
      'معتمد': product.isApproved ? 'نعم' : 'لا',
      'مرفوض': product.isRejected ? 'نعم' : 'لا',
      'سبب الرفض': product.rejectionReason || '',
      'ملاحظات الإدارة': product.adminNotes || '',
      'معتمد من': product.approvedBy?.name || '',
      'معتمد في': product.approvedAt ? new Date(product.approvedAt).toLocaleDateString('en-US') : '',
      'مرفوض من': product.rejectedBy?.name || '',
      'مرفوض في': product.rejectedAt ? new Date(product.rejectedAt).toLocaleDateString('en-US') : '',
      'مقفل': product.isLocked ? 'نعم' : 'لا',
      'مقفل من': product.lockedBy || '',
      'مقفل في': product.lockedAt ? new Date(product.lockedAt).toLocaleDateString('en-US') : '',
      'سبب القفل': product.lockReason || '',
      'تاريخ الإضافة': product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-US') : '',
      'تاريخ التحديث': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('en-US') : '',
    }));
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Add products sheet
    const productsSheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'المنتجات');
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `products_export_${timestamp}.xlsx`;
    
    // Convert to buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });
    
    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    logger.error('Error exporting products', error, { userId: user?._id, role: user?.role });
    return handleApiError(error, 'حدث خطأ أثناء تصدير المنتجات');
  }
}

export const GET = withAuth(exportProducts);

