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

const shippingAddressSchema = z.object({
  fullName: z.string().min(1, 'الاسم الكامل مطلوب'),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  street: z.string().min(1, 'عنوان الشارع مطلوب'),
  city: z.string().min(1, 'المدينة مطلوبة'),
  governorate: z.string().min(1, 'المحافظة مطلوبة'),
  postalCode: z.string().optional(),
  notes: z.string().optional()
});

const orderSchema = z.object({
  customerName: z.string().min(1, 'اسم العميل مطلوب'),
  customerPhone: z.string().min(1, 'رقم الهاتف مطلوب'),
  shippingAddress: shippingAddressSchema,
  items: z.array(orderItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
  notes: z.string().optional(),
  shippingCost: z.number().min(0, 'تكلفة الشحن يجب أن تكون أكبر من أو تساوي صفر'),
  shippingMethod: z.string().optional(),
  shippingZone: z.string().optional(),
  orderTotal: z.number().min(0, 'المجموع الكلي يجب أن يكون أكبر من أو يساوي صفر')
});

// POST /api/orders - Create new order
export const POST = withRole(['marketer', 'supplier', 'admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    const body = await req.json();
    
    console.log('🛒 إنشاء طلب جديد:', { userId: user._id, items: body.items?.length });
    
    // Validate order data
    const orderData = orderSchema.parse(body);
    
    // Get system settings for shipping calculation
    const systemSettings = await settingsManager.getSettings();
    
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
      
      const fallbackPrice = (product as any).marketerPrice ?? (product as any).wholesalerPrice ?? 0;
      const unitPrice = item.customPrice !== undefined ? item.customPrice : fallbackPrice;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      // marketer profit based on custom selling price minus base price (marketerPrice)
      const basePrice = (product as any).marketerPrice ?? 0;
      const itemMarketerProfit = Math.max(unitPrice - basePrice, 0) * item.quantity;
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
    
    // Calculate shipping cost using the simplified governorate-based system
    const getShippingCost = (governorateName: string) => {
      if (!systemSettings?.governorates || systemSettings.governorates.length === 0) {
        return systemSettings?.defaultShippingCost || 0;
      }
      const governorate = systemSettings.governorates.find((g: any) => g.name === governorateName && g.isActive);
      return governorate ? governorate.shippingCost : (systemSettings.defaultShippingCost || 0);
    };

    const shippingCost = getShippingCost(orderData.shippingAddress.governorate);
    const finalShippingCost = subtotal >= (systemSettings?.defaultFreeShippingThreshold || 0) ? 0 : shippingCost;
    const finalShippingMethod = 'الشحن الأساسي';
    const finalShippingZone = orderData.shippingAddress.governorate;
    
    const total = subtotal + finalShippingCost;
    
    // Calculate commission based on settings
    const commission = await settingsManager.calculateCommission(total);
    
    // Create order
    const order = await Order.create({
      customerId: user._id,
      customerRole: user.role,
      supplierId,
      items: orderItems,
      subtotal,
      shippingCost: finalShippingCost,
      shippingMethod: finalShippingMethod,
      shippingZone: finalShippingZone,
      commission,
      total,
      marketerProfit: marketerProfitTotal,
      shippingAddress: orderData.shippingAddress,
      deliveryNotes: orderData.notes
    });
    
    // Update product stock quantities
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: -item.quantity }
      });
    }
    
    console.log('✅ تم إنشاء الطلب بنجاح:', { orderId: order._id, total });
    
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('❌ خطأ في إنشاء الطلب:', error);
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