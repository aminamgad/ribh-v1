import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import * as XLSX from 'xlsx';
import { z } from 'zod';

// POST /api/orders/import - Import orders from Excel
async function importOrders(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    // Check permissions - only marketers can import orders
    if (user.role !== 'marketer') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك باستيراد الطلبات' },
        { status: 403 }
      );
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'يرجى اختيار ملف Excel' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'يرجى اختيار ملف Excel صحيح (.xlsx, .xls, .csv)' },
        { status: 400 }
      );
    }
    
    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      return NextResponse.json(
        { success: false, message: 'الملف فارغ أو لا يحتوي على بيانات صحيحة' },
        { status: 400 }
      );
    }
    
    // Check if this is an export file (contains order data) instead of import template
    const firstRow = jsonData[0] as any;
    const isExportFile = firstRow && (
      firstRow['رقم الطلب'] || 
      firstRow['تاريخ الطلب'] || 
      firstRow['حالة الطلب'] ||
      firstRow['orderNumber'] ||
      firstRow['orderDate'] ||
      firstRow['status']
    );
    
    if (isExportFile) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'هذا الملف يحتوي على بيانات الطلبات المصدرة. يرجى استخدام قالب الاستيراد الصحيح الذي يحتوي على أعمدة: اسم العميل، بريد العميل، هاتف العميل، رمز المنتج، اسم المنتج، الكمية، العنوان، المدينة، المحافظة، الرمز البريدي، طريقة الدفع، ملاحظات' 
        },
        { status: 400 }
      );
    }
    
    // Validate and process orders
    const processedOrders = [];
    const errors = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any;
      const rowNumber = i + 2; // Excel rows start from 2 (1 is header)
      
      try {
        // Validate required fields
        let orderData;
        try {
          orderData = validateOrderRow(row, rowNumber);
        } catch (validationError: any) {
          if (validationError.errors) {
            const errorMessages = validationError.errors.map((err: any) => err.message).join(', ');
            errors.push(`الصف ${rowNumber}: ${errorMessages}`);
          } else {
            errors.push(`الصف ${rowNumber}: خطأ في التحقق من البيانات - ${validationError.message}`);
          }
          continue;
        }
        
        // Check if product exists and is available
        const product = await Product.findOne({
          $or: [
            { sku: orderData.productSku },
            { name: orderData.productName }
          ],
          isApproved: true,
          isActive: true,
          isLocked: { $ne: true }
        });
        
        if (!product) {
          errors.push(`الصف ${rowNumber}: المنتج "${orderData.productName}" غير موجود أو غير متاح`);
          continue;
        }
        
        // Check stock availability
        if (product.stockQuantity < orderData.quantity) {
          errors.push(`الصف ${rowNumber}: الكمية المطلوبة (${orderData.quantity}) غير متوفرة في المخزون (المتوفر: ${product.stockQuantity})`);
          continue;
        }
        
        // Check if customer exists or create new one
        let customer = await User.findOne({ email: orderData.customerEmail });
        
        if (!customer) {
          // Create new customer
          customer = new User({
            name: orderData.customerName,
            email: orderData.customerEmail,
            phone: orderData.customerPhone,
            role: 'customer',
            isActive: true
          });
          await customer.save();
        }
        
        // Calculate prices
        const unitPrice = product.marketerPrice;
        const totalPrice = unitPrice * orderData.quantity;
        
        // Create order
        const order = new Order({
          customerId: customer._id,
          customerRole: 'marketer', // Since this is imported by a marketer
          supplierId: product.supplierId,
          items: [{
            productId: product._id,
            productName: product.name,
            quantity: orderData.quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            priceType: 'marketer'
          }],
          subtotal: totalPrice,
          shippingCost: 0,
          commission: 0,
          total: totalPrice,
          status: 'pending',
          paymentMethod: orderData.paymentMethod || 'cod',
          paymentStatus: 'pending',
          shippingAddress: {
            fullName: orderData.customerName,
            phone: orderData.customerPhone,
            street: orderData.address,
            city: orderData.city,
            governorate: orderData.governorate,
            postalCode: orderData.postalCode,
            notes: orderData.notes || ''
          },
          deliveryNotes: orderData.notes || ''
        });
        
        await order.save();
        
        // Update product stock
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stockQuantity: -orderData.quantity }
        });
        
        processedOrders.push({
          orderNumber: order.orderNumber,
          customerName: orderData.customerName,
          productName: product.name,
          quantity: orderData.quantity,
          totalAmount: totalPrice
        });
        
      } catch (error: any) {
        errors.push(`الصف ${rowNumber}: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `تم استيراد ${processedOrders.length} طلب بنجاح`,
      processedOrders,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: processedOrders.length,
      totalErrors: errors.length
    });
    
  } catch (error) {
    console.error('Error importing orders:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء استيراد الطلبات' },
      { status: 500 }
    );
  }
}

// Validate order row data
function validateOrderRow(row: any, rowNumber: number) {
  // Convert row data to proper types with better field mapping
  const data = {
    customerName: String(row['اسم العميل'] || row['customerName'] || row['Customer Name'] || ''),
    customerEmail: String(row['بريد العميل'] || row['customerEmail'] || row['Customer Email'] || ''),
    customerPhone: String(row['هاتف العميل'] || row['customerPhone'] || row['Customer Phone'] || ''),
    productSku: row['رمز المنتج'] || row['productSku'] || row['Product SKU'] || '',
    productName: String(row['اسم المنتج'] || row['productName'] || row['Product Name'] || ''),
    quantity: Number(row['الكمية'] || row['quantity'] || row['Quantity'] || 0),
    address: String(row['العنوان'] || row['address'] || row['Address'] || ''),
    city: String(row['المدينة'] || row['city'] || row['City'] || ''),
    governorate: String(row['المحافظة'] || row['governorate'] || row['Governorate'] || ''),
    postalCode: row['الرمز البريدي'] || row['postalCode'] || row['Postal Code'] || '',
    paymentMethod: row['طريقة الدفع'] || row['paymentMethod'] || row['Payment Method'] || 'cod',
    notes: row['ملاحظات'] || row['notes'] || row['Notes'] || ''
  };
  
  const schema = z.object({
    customerName: z.string().min(1, 'اسم العميل مطلوب'),
    customerEmail: z.string().email('بريد العميل غير صحيح'),
    customerPhone: z.string().min(1, 'هاتف العميل مطلوب'),
    productSku: z.string().optional(),
    productName: z.string().min(1, 'اسم المنتج مطلوب'),
    quantity: z.number().min(1, 'الكمية يجب أن تكون أكبر من صفر'),
    address: z.string().min(1, 'العنوان مطلوب'),
    city: z.string().min(1, 'المدينة مطلوبة'),
    governorate: z.string().min(1, 'المحافظة مطلوبة'),
    postalCode: z.string().optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional()
  });
  
  return schema.parse(data);
}

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
}

export const POST = withAuth(importOrders);
