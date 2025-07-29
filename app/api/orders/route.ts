import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import SystemSettings from '@/models/SystemSettings';
import Wallet from '@/models/Wallet';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'يجب اختيار منتج'),
  quantity: z.number().min(1, 'الكمية يجب أن تكون 1 على الأقل')
});

const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
  shippingAddress: z.object({
    fullName: z.string().min(2, 'الاسم الكامل مطلوب'),
    phone: z.string().min(10, 'رقم الهاتف مطلوب'),
    street: z.string().min(10, 'اسم الشارع مطلوب'),
    city: z.string().min(2, 'المدينة مطلوبة'),
    governorate: z.string().min(2, 'المحافظة مطلوبة'),
    postalCode: z.string().optional(),
    notes: z.string().optional()
  }),
  customerName: z.string().min(2, 'اسم العميل مطلوب'),
  customerPhone: z.string().min(10, 'رقم هاتف العميل مطلوب'),
  notes: z.string().optional()
});

// Helper function to calculate commission based on system settings
async function calculateCommission(subtotal: number): Promise<number> {
  try {
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    if (!settings || !settings.commissionRates || settings.commissionRates.length === 0) {
      return subtotal * 0.1; // Default 10% if no settings
    }
    
    // Find the appropriate commission rate based on order value
    const rate = settings.commissionRates.find((rate: any) => 
      subtotal >= rate.minPrice && subtotal <= rate.maxPrice
    );
    
    if (rate) {
      return subtotal * (rate.rate / 100);
    }
    
    // If no matching rate found, use the highest rate for orders above max
    const highestRate = settings.commissionRates.reduce((max: any, current: any) => 
      current.rate > max.rate ? current : max
    );
    
    return subtotal * (highestRate.rate / 100);
  } catch (error) {
    console.error('Error calculating commission:', error);
    return subtotal * 0.1; // Fallback to 10%
  }
}

// Helper function to add profit to marketer's wallet
async function addProfitToWallet(userId: string, profit: number, orderId: string) {
  try {
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({
        userId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0
      });
    }
    
    if (profit > 0) {
      await wallet.addTransaction(
        'credit',
        profit,
        `ربح من الطلب رقم ${orderId}`,
        `order_profit_${orderId}`,
        {
          orderId,
          type: 'marketer_profit',
          source: 'order_completion'
        }
      );
    }
    
    return wallet;
  } catch (error) {
    console.error('Error adding profit to wallet:', error);
    throw error;
  }
}

// GET /api/orders - Get orders based on user role
async function getOrders(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query: any = {};
    
    // Role-based filtering
    if (user.role === 'supplier') {
      query.supplierId = user._id;
    } else if (user.role === 'marketer' || user.role === 'wholesaler') {
      query.customerId = user._id;
    }
    
    console.log('Orders Query:', {
      userRole: user.role,
      userId: user._id,
      query,
      status,
      search
    });
    
    // Debug: Check if user._id is ObjectId
    console.log('User ID type:', typeof user._id, 'Value:', user._id);
    
    // Additional filters
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const orders = await Order.find(query)
      .populate('items.productId', 'name images marketerPrice wholesalePrice')
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Order.countDocuments(query);
    
    console.log('Orders Found:', {
      count: orders.length,
      total,
      orders: orders.map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        supplierId: o.supplierId,
        customerId: o.customerId,
        status: o.status,
        supplierIdType: typeof o.supplierId,
        customerIdType: typeof o.customerId
      }))
    });
    
    // Transform orders for frontend
    const transformedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerRole: order.customerRole,
      supplierId: order.supplierId._id || order.supplierId,
      customerId: order.customerId._id || order.customerId,
      supplierName: order.supplierId?.name || order.supplierId?.companyName,
      items: order.items.map((item: any) => ({
        productName: item.productId?.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: order.subtotal,
      commission: order.commission,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
    
    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب الطلبات' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
async function createOrder(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Validate input
    const validatedData = orderSchema.parse(body);
    
    // Get system settings for order validation
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    const minOrderValue = settings?.minOrderValue || 0;
    const maxOrderValue = settings?.maxOrderValue || 50000;
    const autoApproveOrders = settings?.autoApproveOrders || false;
    const requireAdminApproval = settings?.requireAdminApproval !== false; // Default true
    
    // Check if products exist and are available
    const productIds = validatedData.items.map(item => item.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isApproved: true,
      isActive: true
    }).populate('supplierId', 'name companyName');
    
    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, message: 'بعض المنتجات غير متاحة' },
        { status: 400 }
      );
    }
    
    // Check stock availability
    for (const item of validatedData.items) {
      const product = products.find(p => p._id.toString() === item.productId);
      if (!product || product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { success: false, message: `المنتج ${product?.name} غير متوفر بالكمية المطلوبة` },
          { status: 400 }
        );
      }
    }
    
    // Calculate prices and commission
    let subtotal = 0;
    let marketerProfit = 0;
    const orderItems = [];
    
    for (const item of validatedData.items) {
      const product = products.find(p => p._id.toString() === item.productId);
      if (!product) continue;
      
      const price = user.role === 'wholesaler' ? product.wholesalePrice : product.marketerPrice;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      
      // Calculate marketer profit - using cost price
      if (user.role === 'marketer') {
        const profitPerUnit = product.marketerPrice - product.costPrice;
        marketerProfit += profitPerUnit * item.quantity;
        
        console.log('API - Product:', product.name, {
          costPrice: product.costPrice,
          marketerPrice: product.marketerPrice,
          profitPerUnit,
          quantity: item.quantity,
          totalProfit: profitPerUnit * item.quantity
        });
      }
      
      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: itemTotal,
        priceType: user.role === 'wholesaler' ? 'wholesale' : 'marketer'
      });
    }
    
    // Validate order value against system settings
    if (subtotal < minOrderValue) {
      return NextResponse.json(
        { success: false, message: `الحد الأدنى لقيمة الطلب هو ${minOrderValue} ₪` },
        { status: 400 }
      );
    }
    
    if (subtotal > maxOrderValue) {
      return NextResponse.json(
        { success: false, message: `الحد الأقصى لقيمة الطلب هو ${maxOrderValue} ₪` },
        { status: 400 }
      );
    }
    
    // Calculate commission using system settings
    const commission = await calculateCommission(subtotal);
    const total = subtotal + commission;
    
    // Determine order status based on system settings
    let orderStatus = 'pending';
    if (autoApproveOrders && !requireAdminApproval) {
      orderStatus = 'confirmed';
    }
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Ensure all products have the same supplier
    const supplierId = products[0].supplierId;
    if (!supplierId) {
      return NextResponse.json(
        { success: false, message: 'خطأ في بيانات المورد' },
        { status: 400 }
      );
    }
    
    // Check if all products have the same supplier
    const allSameSupplier = products.every(product => product.supplierId.toString() === supplierId.toString());
    if (!allSameSupplier) {
      return NextResponse.json(
        { success: false, message: 'جميع المنتجات يجب أن تكون من نفس المورد' },
        { status: 400 }
      );
    }
    
    console.log('Creating order with supplier:', {
      supplierId: supplierId,
      supplierIdType: typeof supplierId,
      products: products.map(p => ({ id: p._id, supplierId: p.supplierId }))
    });
    
    // Create order
    const order = await Order.create({
      orderNumber,
      customerId: user._id,
      customerRole: user.role,
      supplierId: supplierId,
      items: orderItems,
      subtotal,
      commission,
      total,
      marketerProfit, // Add marketer profit
      status: orderStatus,
      paymentMethod: 'cod',
      shippingAddress: {
        fullName: validatedData.shippingAddress.fullName,
        phone: validatedData.shippingAddress.phone,
        street: validatedData.shippingAddress.street,
        city: validatedData.shippingAddress.city,
        governorate: validatedData.shippingAddress.governorate,
        postalCode: validatedData.shippingAddress.postalCode || '',
        notes: validatedData.notes || ''
      },
      customerName: validatedData.customerName,
      customerPhone: validatedData.customerPhone,
      notes: validatedData.notes
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        marketerProfit: order.marketerProfit
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إنشاء الطلب' },
      { status: 500 }
    );
  }
}

// Export handlers with role-based access
export const GET = withAuth(getOrders);
export const POST = withRole(['marketer', 'wholesaler'])(createOrder); 