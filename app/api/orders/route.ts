import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Village from '@/models/Village';
import { z } from 'zod';
import { settingsManager } from '@/lib/settings-manager';
import { calculateShippingCost } from '@/lib/settings';
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
  manualVillageName: z.string().optional(), // Manual village name entered by marketer (for admin review)
  villageId: z.number().int().positive().optional(), // Optional - set by admin after review
  villageName: z.string().optional(), // Optional - set by admin after review
  deliveryCost: z.number().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  shippingRegionCode: z.string().optional(), // New: Shipping region code from SystemSettings
  // Legacy fields for backward compatibility
  city: z.string().optional(),
  governorate: z.string().optional()
}).refine(
  (data) => data.manualVillageName || data.villageId || data.shippingRegionCode || data.governorate,
  {
    message: 'يجب تحديد منطقة التوصيل: إما اسم القرية اليدوي (manualVillageName) أو معرف القرية (villageId) أو رمز منطقة التوصيل (shippingRegionCode) أو المحافظة (governorate)',
    path: ['manualVillageName']
  }
);

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
        
        // marketer profit based on custom selling price minus base price (marketerPrice of variant or product)
        // Use variant's marketerPrice if available, otherwise use product's marketerPrice
        const variantMarketerPrice = variantOption.price || (product as any).marketerPrice || 0;
        const basePrice = variantMarketerPrice;
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
    
    // Calculate shipping cost using new shipping regions system (priority: shippingRegionCode > villageId > governorate)
    let villageName = 'غير محدد';
    let finalShippingCost = 0;
    
    // Validate shipping region or village is provided
    // Allow manualVillageName from marketer (will be reviewed by admin)
    if (!orderData.shippingAddress.manualVillageName && !orderData.shippingAddress.villageId && !orderData.shippingAddress.shippingRegionCode && !orderData.shippingAddress.governorate) {
      return NextResponse.json(
        { success: false, message: 'يجب تحديد منطقة التوصيل: إما اسم القرية اليدوي أو معرف القرية أو رمز منطقة التوصيل أو المحافظة' },
        { status: 400 }
      );
    }
    
    // If manualVillageName is provided (marketer entered manually), use it and set shipping cost to 0
    // Admin will review and set actual villageId later
    if (orderData.shippingAddress.manualVillageName && !orderData.shippingAddress.villageId) {
      finalShippingCost = 0; // Will be calculated by admin after selecting actual village
      villageName = orderData.shippingAddress.manualVillageName;
    }
    // Priority 1: Use shippingRegionCode if provided (new system) - only if not using manualVillageName
    else if (orderData.shippingAddress.shippingRegionCode) {
      finalShippingCost = await calculateShippingCost(
        subtotal,
        undefined, // villageId not needed when using region code
        orderData.shippingAddress.shippingRegionCode
      );
      
      // Get region name for display
      const region = systemSettings?.shippingRegions?.find(
        (r: any) => r.regionCode === orderData.shippingAddress.shippingRegionCode && r.isActive
      );
      villageName = region?.regionName || orderData.shippingAddress.shippingRegionCode;
    }
    // Priority 2: Use villageId (existing system)
    else if (orderData.shippingAddress.villageId) {
      const village = await Village.findOne({ 
        villageId: orderData.shippingAddress.villageId,
        isActive: true 
      }).lean();
      
      if (!village) {
        return NextResponse.json(
          { success: false, message: `القرية المحددة (ID: ${orderData.shippingAddress.villageId}) غير موجودة أو غير نشطة` },
          { status: 400 }
        );
      }
      
      finalShippingCost = await calculateShippingCost(
        subtotal,
        orderData.shippingAddress.villageId,
        undefined
      );
      villageName = (village as any).villageName || orderData.shippingAddress.villageName || 'غير محدد';
    }
    // Priority 3: Fallback to legacy governorate-based system
    else if (orderData.shippingAddress.governorate) {
      if (!systemSettings?.governorates || systemSettings.governorates.length === 0) {
        finalShippingCost = systemSettings?.defaultShippingCost || 0;
      } else {
        const governorate = systemSettings.governorates.find((g: any) => g.name === orderData.shippingAddress.governorate && g.isActive);
        if (!governorate) {
          return NextResponse.json(
            { success: false, message: `المحافظة المحددة (${orderData.shippingAddress.governorate}) غير موجودة أو غير نشطة` },
            { status: 400 }
          );
        }
        finalShippingCost = governorate.shippingCost;
      }
      villageName = orderData.shippingAddress.governorate;
    } else {
      // This should not happen due to validation, but keep as fallback
      finalShippingCost = systemSettings?.defaultShippingCost || 0;
    }

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
    
    // Automatically create package for shipping company if enabled
    // This sends the order to shipping company immediately upon creation
    if (systemSettings?.autoCreatePackages !== false) {
      try {
        const { createPackageFromOrder } = await import('@/lib/order-to-package');
        const packageId = await createPackageFromOrder(order._id.toString());
        if (packageId) {
          // Update order with packageId
          await Order.findByIdAndUpdate(order._id, { packageId: packageId });
          logger.business('✅ ORDER SENT TO SHIPPING COMPANY IMMEDIATELY - Package created automatically upon order creation', {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            packageId: packageId,
            orderStatus: order.status,
            timestamp: new Date().toISOString(),
            note: 'Order was sent to shipping company immediately upon creation'
          });
          
          logger.info('✅ Package created automatically and sent to shipping company upon order creation', {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            packageId: packageId
          });
        } else {
          logger.warn('⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY - Failed to create package automatically upon order creation', {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            timestamp: new Date().toISOString(),
            note: 'Package will be created when order status changes to ready_for_shipping',
            reason: 'Check if external company exists and is active, or if order has valid shipping address with villageId'
          });
        }
      } catch (error) {
        logger.error('Error creating package automatically upon order creation', error, {
          orderId: order._id.toString()
        });
        // Continue with order creation even if package creation fails
      }
    }
    
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
    const statusParam = searchParams.get('status');
    // Support multiple statuses (comma-separated) - e.g., "pending,confirmed,processing"
    const statusArray = statusParam && statusParam !== 'all' 
      ? statusParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const status = statusArray.length > 0 ? statusArray : (statusParam === 'all' ? null : statusParam);
    const search = searchParams.get('search'); // Legacy search (backward compatibility)
    
    // New separate search fields
    const customerSearch = searchParams.get('customerSearch');
    const orderNumberSearch = searchParams.get('orderNumberSearch');
    const productSearch = searchParams.get('productSearch');
    
    // Date range filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Country filter
    const country = searchParams.get('country');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased limit for better search
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
    // Status filter - support multiple statuses using $in operator
    if (Array.isArray(status) && status.length > 0) {
      query.status = { $in: status };
      logger.debug('Order status filter applied (multiple)', { 
        statusArray: status, 
        queryStatus: query.status 
      });
    } else if (status && typeof status === 'string' && status !== 'all') {
      // Backward compatibility: single status as string
      query.status = status;
      logger.debug('Order status filter applied (single)', { 
        status, 
        queryStatus: query.status 
      });
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // Country filter (using shippingZone or governorate)
    const countryConditions: any[] = [];
    if (country && country !== 'all') {
      countryConditions.push(
        { shippingZone: country },
        { 'shippingAddress.governorate': country }
      );
      if (countryConditions.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({ $or: countryConditions });
      }
    }
    
    // Build search conditions array
    const searchConditions: any[] = [];
    
    // Legacy search (backward compatibility)
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      searchConditions.push(
        { orderNumber: searchRegex },
        { 'shippingAddress.fullName': searchRegex },
        { 'shippingAddress.phone': searchRegex },
        { 'shippingAddress.email': searchRegex },
        { 'shippingAddress.street': searchRegex },
        { 'shippingAddress.city': searchRegex },
        { 'shippingAddress.governorate': searchRegex },
        { trackingNumber: searchRegex },
        { shippingCompany: searchRegex }
      );
      
      // If search is a number, also search by order number exactly
      if (!isNaN(Number(search.trim()))) {
        searchConditions.push({ orderNumber: search.trim() });
      }
    }
    
    // Customer search (name/phone)
    if (customerSearch && customerSearch.trim()) {
      const customerRegex = { $regex: customerSearch.trim(), $options: 'i' };
      searchConditions.push(
        { 'shippingAddress.fullName': customerRegex },
        { 'shippingAddress.phone': customerRegex }
      );
    }
    
    // Order number search
    if (orderNumberSearch && orderNumberSearch.trim()) {
      const orderRegex = { $regex: orderNumberSearch.trim(), $options: 'i' };
      searchConditions.push({ orderNumber: orderRegex });
      
      // If it's a number, also search exactly
      if (!isNaN(Number(orderNumberSearch.trim()))) {
        searchConditions.push({ orderNumber: orderNumberSearch.trim() });
      }
    }
    
    // Combine search conditions
    if (searchConditions.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({ $or: searchConditions });
    }
    
    // Get orders with pagination
    let ordersQuery = Order.find(query)
      .populate('items.productId', 'name images marketerPrice wholesalerPrice sku')
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });
    
    // If search is provided, we need to also search in populated fields
    // So we'll fetch all matching orders first, then filter by populated fields
    let orders = await ordersQuery.skip(skip).limit(limit).lean();
    
    // Filter by product search (productSearch)
    if (productSearch && productSearch.trim()) {
      const productSearchLower = productSearch.trim().toLowerCase();
      orders = orders.filter((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            // Check product name
            if (item.productName?.toLowerCase().includes(productSearchLower)) return true;
            // Check populated product name
            if (item.productId && typeof item.productId === 'object' && item.productId.name?.toLowerCase().includes(productSearchLower)) return true;
            // Check SKU
            if (item.productId && typeof item.productId === 'object' && item.productId.sku?.toLowerCase().includes(productSearchLower)) return true;
          }
        }
        return false;
      });
    }
    
    // Additional client-side filtering for populated fields if search is provided (legacy)
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      orders = orders.filter((order: any) => {
        // Check order number
        if (order.orderNumber?.toLowerCase().includes(searchLower)) return true;
        
        // Check customer name (from populated customerId)
        if (order.customerId && typeof order.customerId === 'object') {
          if (order.customerId.name?.toLowerCase().includes(searchLower)) return true;
          if (order.customerId.email?.toLowerCase().includes(searchLower)) return true;
          if (order.customerId.phone?.toLowerCase().includes(searchLower)) return true;
        }
        
        // Check supplier name (from populated supplierId)
        if (order.supplierId && typeof order.supplierId === 'object') {
          if (order.supplierId.name?.toLowerCase().includes(searchLower)) return true;
          if (order.supplierId.companyName?.toLowerCase().includes(searchLower)) return true;
        }
        
        // Check shipping address
        if (order.shippingAddress) {
          if (order.shippingAddress.fullName?.toLowerCase().includes(searchLower)) return true;
          if (order.shippingAddress.phone?.toLowerCase().includes(searchLower)) return true;
          if (order.shippingAddress.email?.toLowerCase().includes(searchLower)) return true;
          if (order.shippingAddress.street?.toLowerCase().includes(searchLower)) return true;
          if (order.shippingAddress.city?.toLowerCase().includes(searchLower)) return true;
          if (order.shippingAddress.governorate?.toLowerCase().includes(searchLower)) return true;
        }
        
        // Check product names in items
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            if (item.productName?.toLowerCase().includes(searchLower)) return true;
            if (item.productId && typeof item.productId === 'object' && item.productId.name?.toLowerCase().includes(searchLower)) return true;
          }
        }
        
        // Check tracking number
        if (order.trackingNumber?.toLowerCase().includes(searchLower)) return true;
        if (order.shippingCompany?.toLowerCase().includes(searchLower)) return true;
        
        return false;
      });
    }
    
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