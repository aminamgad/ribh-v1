import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { z } from 'zod';
import { settingsManager } from '@/lib/settings-manager';

// Validation schemas
const orderItemSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب'),
  quantity: z.number().min(1, 'الكمية يجب أن تكون 1 أو أكثر'),
  customPrice: z.number().optional(),
  marketerProfit: z.number().optional()
});

const orderSchema = z.object({
  customerName: z.string().min(1, 'اسم العميل مطلوب'),
  customerPhone: z.string().min(1, 'رقم الهاتف مطلوب'),
  customerAddress: z.string().min(10, 'العنوان يجب أن يكون 10 أحرف على الأقل'),
  items: z.array(orderItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
  notes: z.string().optional(),
  marketerProfit: z.number().optional()
});

// POST /api/orders - Create new order
export const POST = withRole(['marketer', 'supplier', 'admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    const body = await req.json();
    
    console.log('🛒 إنشاء طلب جديد:', { userId: user._id, items: body.items?.length });
    
    // Validate order data
    const orderData = orderSchema.parse(body);
    
    // Calculate order total
    let subtotal = 0;
    const orderItems: any[] = [];
    let supplierId: any = null;
    let marketerProfitTotal = 0;
    
    for (const item of orderData.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, message: `المنتج ${item.productId} غير موجود` },
          { status: 404 }
        );
      }
      if (!supplierId) supplierId = product.supplierId;
      
      const fallbackPrice = (product as any).marketerPrice ?? (product as any).wholesalePrice ?? (product as any).costPrice ?? 0;
      const unitPrice = item.customPrice !== undefined ? item.customPrice : fallbackPrice;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      // marketer profit based on custom selling price minus product cost
      const costPrice = (product as any).costPrice ?? 0;
      const itemMarketerProfit = Math.max(unitPrice - costPrice, 0) * item.quantity;
      marketerProfitTotal += itemMarketerProfit;

      // decide price type
      const priceType = unitPrice === (product as any).wholesalePrice ? 'wholesale' : 'marketer';
      
      orderItems.push({
        productId: item.productId,
        productName: (product as any).name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        priceType
      });
    }
    
    // Apply system settings validation
    const orderValidation = await settingsManager.validateOrder(subtotal);
    if (!orderValidation.valid) {
      return NextResponse.json(
        { success: false, message: orderValidation.message },
        { status: 400 }
      );
    }
    
    // Calculate shipping cost based on settings
    const shippingCost = await settingsManager.calculateShipping(subtotal);
    const total = subtotal + shippingCost;
    
    // Calculate commission based on settings
    const commission = await settingsManager.calculateCommission(total);
    
    // Create order
    const order = await Order.create({
      customerId: user._id,
      customerRole: user.role,
      supplierId,
      items: orderItems,
      subtotal,
      commission,
      total,
      marketerProfit: user.role === 'marketer' ? marketerProfitTotal : 0,
      status: 'pending',
      shippingAddress: {
        fullName: orderData.customerName,
        phone: orderData.customerPhone,
        street: orderData.customerAddress,
        city: 'غير محدد',
        governorate: 'غير محدد'
      },
      deliveryNotes: orderData.notes
    });
    
    console.log('✅ تم إنشاء الطلب بنجاح:', { 
      orderId: order._id, 
      total: total,
      shipping: shippingCost, 
      commission: commission 
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      order: order
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as any;
      const messages = zodError.errors.map((err: any) => err.message);
      return NextResponse.json(
        { success: false, message: 'بيانات الطلب غير صحيحة', errors: messages },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في إنشاء الطلب' },
      { status: 500 }
    );
  }
});

// GET /api/orders - Get user's orders
export const GET = withRole(['marketer', 'supplier', 'admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Build query based on role
    const query: any = {};
    if (user.role === 'admin') {
      // admin sees all, optionally by status
    } else if (user.role === 'supplier') {
      query.supplierId = user._id;
    } else {
      // marketer or wholesaler
      query.customerId = user._id;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get orders with pagination
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Order.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      orders: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في جلب الطلبات' },
      { status: 500 }
    );
  }
}); 