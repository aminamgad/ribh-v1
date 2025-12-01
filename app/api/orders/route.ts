import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Village from '@/models/Village';
import { z } from 'zod';
import { settingsManager } from '@/lib/settings-manager';
import { logger, logOrderCreation } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { apiRateLimit } from '@/lib/rate-limiter';
import { statsCache } from '@/lib/cache';

// Validation schemas
const orderItemSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب'),
  quantity: z.number().min(1, 'الكمية يجب أن تكون 1 أو أكثر'),
  customPrice: z.number().optional(),
  marketerProfit: z.number().optional(),
  selectedVariants: z.record(z.string()).optional(),
  variantOption: z.any().optional()
});

const shippingAddressSchema = z.object({
  fullName: z.string().min(1, 'الاسم الكامل مطلوب'),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  street: z.string().min(1, 'عنوان الشارع مطلوب'),
  villageId: z.number().int().positive('معرف القرية مطلوب'),
  villageName: z.string().optional(),
  deliveryCost: z.number().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  // Legacy fields for backward compatibility
  city: z.string().optional(),
  governorate: z.string().optional()
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
async function createOrderHandler(req: NextRequest, user: any) {
  try {
    await connectDB();
    const body = await req.json();
    
    logger.apiRequest('POST', '/api/orders', { userId: user._id, itemsCount: body.items?.length });
    
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
      
      // Check and handle variant stock if product has variants
      if (product.hasVariants && item.variantOption?.variantId) {
        const variantOption = (product.variantOptions as any[] || []).find(
          (opt: any) => opt.variantId === item.variantOption.variantId && 
                       opt.value === item.variantOption.value
        );
        
        if (!variantOption) {
          return NextResponse.json(
            { success: false, message: `المتغير المحدد غير موجود للمنتج ${(product as any).name}` },
            { status: 400 }
          );
        }
        
        // Check variant stock
        if (variantOption.stockQuantity < item.quantity) {
          return NextResponse.json(
            { success: false, message: `المخزون غير كافي للمتغير المحدد. المتاح: ${variantOption.stockQuantity}` },
            { status: 400 }
          );
        }
        
        // Use variant price if available
        const variantPrice = variantOption.price || (product as any).marketerPrice || (product as any).wholesalerPrice || 0;
        const unitPrice = item.customPrice !== undefined ? item.customPrice : variantPrice;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        
        // marketer profit based on custom selling price minus base price (marketerPrice)
        const basePrice = variantPrice;
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
          priceType,
          selectedVariants: item.selectedVariants,
          variantOption: {
            ...item.variantOption,
            stockQuantity: variantOption.stockQuantity
          }
        });
      } else {
        // Regular product without variants
        // Check main product stock
        if ((product as any).stockQuantity < item.quantity) {
          return NextResponse.json(
            { success: false, message: `المخزون غير كافي للمنتج ${(product as any).name}. المتاح: ${(product as any).stockQuantity}` },
            { status: 400 }
          );
        }
        
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
          priceType,
          selectedVariants: item.selectedVariants,
          variantOption: item.variantOption
        });
      }
    }
    
    // Apply system settings validation
    const orderValidation = await settingsManager.validateOrder(subtotal);
    if (!orderValidation.valid) {
      return NextResponse.json(
        { success: false, message: orderValidation.message },
        { status: 400 }
      );
    }
    
    // Calculate shipping cost using village-based system
    let villageDeliveryCost = 0;
    let villageName = 'غير محدد';
    
    if (orderData.shippingAddress.villageId) {
      // Get village delivery cost from database
      const village = await Village.findOne({ 
        villageId: orderData.shippingAddress.villageId,
        isActive: true 
      }).lean();
      
      if (village) {
        villageDeliveryCost = (village as any).deliveryCost || 0;
        villageName = (village as any).villageName || '';
      } else {
        logger.warn('Village not found, using default shipping cost', {
          villageId: orderData.shippingAddress.villageId
        });
        villageDeliveryCost = orderData.shippingAddress.deliveryCost || systemSettings?.defaultShippingCost || 0;
        villageName = orderData.shippingAddress.villageName || 'غير محدد';
      }
    } else {
      // Fallback to legacy governorate-based system for backward compatibility
      if (orderData.shippingAddress.governorate) {
        if (!systemSettings?.governorates || systemSettings.governorates.length === 0) {
          villageDeliveryCost = systemSettings?.defaultShippingCost || 0;
        } else {
          const governorate = systemSettings.governorates.find((g: any) => g.name === orderData.shippingAddress.governorate && g.isActive);
          villageDeliveryCost = governorate ? governorate.shippingCost : (systemSettings.defaultShippingCost || 0);
        }
        villageName = orderData.shippingAddress.governorate;
      } else {
        villageDeliveryCost = systemSettings?.defaultShippingCost || 0;
      }
    }

    const finalShippingCost = subtotal >= (systemSettings?.defaultFreeShippingThreshold || 0) ? 0 : villageDeliveryCost;
    const finalShippingMethod = 'الشحن الأساسي';
    const finalShippingZone = villageName;
    
    const total = subtotal + finalShippingCost;
    
    // Calculate admin profit (commission) based on product prices, not order total
    const orderItemsForProfit = orderItems.map(item => ({
      unitPrice: item.unitPrice,
      quantity: item.quantity
    }));
    const commission = await settingsManager.calculateAdminProfitForOrder(orderItemsForProfit);
    
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
    
    // Update product stock quantities and variant stocks
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      
      // If product has variants and variantOption is selected, update variant stock
      if (product.hasVariants && item.variantOption?.variantId) {
        // Update variant stock quantity
        const variantOptionIndex = (product.variantOptions as any[] || []).findIndex(
          (opt: any) => opt.variantId === item.variantOption.variantId && 
                       opt.value === item.variantOption.value
        );
        
        if (variantOptionIndex !== -1) {
          const updatePath = `variantOptions.${variantOptionIndex}.stockQuantity`;
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { 
              [updatePath]: -item.quantity,
              stockQuantity: -item.quantity // Also update main stock if needed
            }
          });
          logger.dbQuery('UPDATE', 'products', { 
            productId: item.productId, 
            variantStock: -item.quantity,
            variantId: item.variantOption.variantId
          });
        } else {
          // Fallback: update main stock only
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stockQuantity: -item.quantity }
          });
          logger.warn('Variant option not found, updated main stock only', {
            productId: item.productId,
            variantId: item.variantOption.variantId
          });
        }
      } else {
        // Update main product stock
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stockQuantity: -item.quantity }
        });
        logger.dbQuery('UPDATE', 'products', { productId: item.productId, quantity: -item.quantity });
      }
    }
    
    logOrderCreation(order._id.toString(), user._id.toString(), total);
    
    // Invalidate stats cache for affected users (customer, supplier, admin)
    statsCache.clear(); // Clear all stats as order affects multiple users' stats
    logger.debug('Stats cache invalidated after order creation', { orderId: order._id.toString() });
    
    logger.apiResponse('POST', '/api/orders', 201);
    
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
      logger.warn('Order validation failed', { userId: user._id, errors: error.errors });
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error creating order', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في إنشاء الطلب');
  }
}

// GET /api/orders - Get user's orders
async function getOrdersHandler(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    logger.apiRequest('GET', '/api/orders', { userId: user._id, role: user.role });
    
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
      .populate('items.productId', 'name images marketerPrice wholesalerPrice')
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Order.countDocuments(query);
    
    logger.apiResponse('GET', '/api/orders', 200);
    
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
    logger.error('Error fetching orders', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ في جلب الطلبات');
  }
}

// Apply rate limiting and authentication to orders endpoints
export const POST = apiRateLimit(withRole(['marketer', 'supplier', 'admin'])(createOrderHandler));
export const GET = apiRateLimit(withRole(['marketer', 'supplier', 'admin'])(getOrdersHandler)); 