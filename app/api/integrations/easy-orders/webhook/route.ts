import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { settingsManager } from '@/lib/settings-manager';

/** دمج بنود الطلب دون تكرار: إذا وُجد نفس المنتج والمتغير يُضاف للكمية بدلاً من إنشاء بند جديد */
function mergeOrderItemsWithoutDuplicates(
  existingItems: any[],
  newItems: any[]
): any[] {
  const result = existingItems.map((i) => ({
    ...i,
    productId: i.productId?._id ?? i.productId,
    totalPrice: (i.unitPrice || 0) * (i.quantity || 1)
  }));

  for (const newItem of newItems) {
    const productId = (newItem.productId?._id ?? newItem.productId)?.toString?.() ?? '';
    const variantKey = newItem.variantOption?.variantId
      ? `${newItem.variantOption.variantId}:${newItem.variantOption.value || ''}`
      : '';

    const existing = result.find((r) => {
      const rPid = (r.productId?._id ?? r.productId)?.toString?.() ?? '';
      const rVariant = r.variantOption?.variantId
        ? `${r.variantOption.variantId}:${r.variantOption.value || ''}`
        : '';
      return rPid === productId && rVariant === variantKey;
    });

    if (existing) {
      const newQty = (existing.quantity || 0) + (newItem.quantity || 0);
      const newTotal = (existing.totalPrice || 0) + (newItem.totalPrice || 0);
      existing.quantity = newQty;
      existing.totalPrice = newTotal;
      existing.unitPrice = newQty > 0 ? newTotal / newQty : existing.unitPrice;
    } else {
      result.push({
        ...newItem,
        productId: newItem.productId?._id ?? newItem.productId
      });
    }
  }

  return result;
}

// Handle CORS preflight requests
export const OPTIONS = async (req: NextRequest) => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, secret',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// POST /api/integrations/easy-orders/webhook - Receive orders and status updates from EasyOrders.
// We only receive data from EasyOrders; we never PATCH or update order status on Easy Orders from Ribh.
export const POST = async (req: NextRequest) => {
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    // Log incoming request details
    logger.info('EasyOrders webhook request received', {
      requestId,
      url: req.url,
      method: req.method,
      headers: {
        origin: req.headers.get('origin'),
        userAgent: req.headers.get('user-agent'),
        contentType: req.headers.get('content-type'),
        hasSecret: !!req.headers.get('secret')
      }
    });

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.error('EasyOrders webhook: Failed to parse JSON body', parseError, { requestId });
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, secret',
          }
        }
      );
    }
    
    // Log incoming webhook payload for debugging
    logger.info('EasyOrders webhook payload received', {
      requestId,
      hasBody: !!body,
      eventType: body.event_type,
      hasOrderId: !!body.id,
      hasOrderIdField: !!body.order_id,
      hasStoreId: !!body.store_id,
      bodyKeys: Object.keys(body || {})
    });
    
    // Get webhook secret from headers
    const webhookSecret = req.headers.get('secret');
    
    logger.info('EasyOrders webhook: Checking secret', {
      requestId,
      hasSecret: !!webhookSecret,
      secretLength: webhookSecret?.length || 0,
      secretPrefix: webhookSecret ? webhookSecret.substring(0, 10) + '...' : 'none'
    });
    
    if (!webhookSecret) {
      logger.warn('EasyOrders webhook missing secret header', { requestId });
      return NextResponse.json(
        { error: 'Missing webhook secret' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, secret',
          }
        }
      );
    }

    await connectDB();

    // Find integration by webhook secret
    logger.info('EasyOrders webhook: Searching for integration', {
      requestId,
      secretPrefix: webhookSecret.substring(0, 10) + '...'
    });

    const integration = await StoreIntegration.findOne({
      type: IntegrationType.EASY_ORDERS,
      webhookSecret: webhookSecret,
      isActive: true
    });

    let finalIntegration = integration;
    
    if (!finalIntegration) {
      // Try to find integration without webhookSecret (might not be saved yet)
      logger.warn('EasyOrders webhook: Integration not found for secret, trying to find by storeId', {
        requestId,
        secretPrefix: webhookSecret.substring(0, 10) + '...',
        storeId: body.store_id
      });

      // If we have store_id, try to find integration by storeId
      if (body.store_id) {
        const integrationsByStoreId = await StoreIntegration.find({
          type: IntegrationType.EASY_ORDERS,
          storeId: body.store_id,
          isActive: true
        }).populate('userId', 'role').lean();

        // تفضيل تكامل المسوق/تاجر الجملة عند وجود عدة تكاملات لنفس المتجر
        let integrationByStoreId = integrationsByStoreId[0];
        if (integrationsByStoreId.length > 1) {
          const marketerIntegration = integrationsByStoreId.find(
            (i: any) => i.userId && ['marketer', 'wholesaler'].includes((i.userId as any).role)
          );
          if (marketerIntegration) {
            integrationByStoreId = marketerIntegration;
            logger.info('EasyOrders webhook: Preferring marketer/wholesaler integration', {
              requestId,
              storeId: body.store_id,
              chosenUserId: (integrationByStoreId as any).userId?._id
            });
          }
        }

        if (integrationByStoreId) {
          const integrationDoc = await StoreIntegration.findById((integrationByStoreId as any)._id);
          if (integrationDoc) {
            logger.info('EasyOrders webhook: Found integration by storeId, saving webhookSecret', {
              requestId,
              integrationId: integrationDoc._id,
              storeId: body.store_id
            });
            integrationDoc.webhookSecret = webhookSecret;
            await integrationDoc.save();
            finalIntegration = integrationDoc;
            logger.business('EasyOrders webhook: Integration found and webhookSecret saved', {
              requestId,
              integrationId: finalIntegration._id,
              storeId: body.store_id
            });
          }
        }
        if (!finalIntegration) {
          logger.error('EasyOrders webhook: Integration not found by storeId either', {
            requestId,
            storeId: body.store_id
          });
          return NextResponse.json(
            { error: 'Invalid webhook secret - Integration not found' },
            { 
              status: 401,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, secret',
              }
            }
          );
        }
      } else {
        logger.error('EasyOrders webhook: Integration not found and no storeId provided', {
          requestId,
          secretPrefix: webhookSecret.substring(0, 10) + '...'
        });
        return NextResponse.json(
          { error: 'Invalid webhook secret' },
          { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, secret',
            }
          }
        );
      }
    }
    
    logger.info('EasyOrders webhook: Integration found', {
      requestId,
      integrationId: finalIntegration._id,
      storeId: finalIntegration.storeId,
      userId: finalIntegration.userId
    });

    // Check if this is an Order Status Update event
    if (body.event_type === 'order-status-update') {
      return await handleOrderStatusUpdate(body, finalIntegration, requestId);
    }

    // Otherwise, treat as Order Created event
    // Extract order data from EasyOrders payload
    const {
      id: easyOrdersOrderId,
      store_id: storeId,
      cost,
      shipping_cost: shippingCost,
      total_cost: totalCost,
      status: easyOrdersStatus,
      full_name: fullName,
      phone,
      government,
      address,
      payment_method: paymentMethod,
      cart_items: cartItems,
      created_at: createdAt,
      updated_at: updatedAt
    } = body;

    // Verify store_id matches
    if (finalIntegration.storeId && finalIntegration.storeId !== storeId) {
      logger.warn('EasyOrders webhook: Store ID mismatch', {
        requestId,
        integrationStoreId: finalIntegration.storeId,
        webhookStoreId: storeId
      });
      return NextResponse.json(
        { error: 'Store ID mismatch' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, secret',
          }
        }
      );
    }
    
    // If webhook secret doesn't exist in integration, save it
    // This happens when webhook is created via Authorized App Link
    if (!finalIntegration.webhookSecret && webhookSecret) {
      finalIntegration.webhookSecret = webhookSecret;
      await finalIntegration.save();
      logger.info('Webhook secret saved to integration', {
        requestId,
        integrationId: finalIntegration._id,
        storeId
      });
    }

    logger.info('EasyOrders webhook: Processing order created event', {
      requestId,
      easyOrdersOrderId,
      storeId,
      cartItemsCount: cartItems?.length || 0
    });

    // منع التكرار: طلب بنفس easyOrdersOrderId، أو مدمج مسبقاً (يحصل عند وجود 2 webhooks)
    const existingByOrderId = await Order.findOne({
      'metadata.easyOrdersOrderId': easyOrdersOrderId,
      'metadata.easyOrdersStoreId': storeId
    }).lean();
    const existingMerged = existingByOrderId
      ? null
      : await Order.findOne({
          'metadata.easyOrdersStoreId': storeId,
          'metadata.mergedEasyOrdersOrderIds': easyOrdersOrderId
        }).lean();

    const existingOrder = existingByOrderId || existingMerged;
    const incomingCartCount = cartItems?.length || 0;
    const existingItemsCount = (existingOrder?.items as any[])?.length || 0;

    // تخطي التكرار إلا إذا كان الطلب محدّثاً بمنتجات إضافية (cross-sell)
    const isCrossSellUpdate = !!existingByOrderId && incomingCartCount > existingItemsCount;

    if (existingOrder && !isCrossSellUpdate) {
      logger.info('EasyOrders webhook: Order already exists or was merged, skipping duplicate', {
        requestId,
        orderId: existingOrder._id,
        orderNumber: (existingOrder as any).orderNumber,
        easyOrdersOrderId,
        storeId,
        wasMerged: !!existingMerged
      });
      return NextResponse.json({
        success: true,
        message: 'Order already exists',
        orderId: existingOrder._id,
        orderNumber: (existingOrder as any).orderNumber
      }, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, secret',
        }
      });
    }

    if (isCrossSellUpdate) {
      logger.info('EasyOrders webhook: Same order with more items (cross-sell update), will merge', {
        requestId,
        easyOrdersOrderId,
        existingItemsCount,
        incomingCartCount
      });
    }

    // Get marketer (user who owns the integration)
    const marketerId = finalIntegration.userId;
    
    logger.info('EasyOrders webhook: Creating new order', {
      requestId,
      easyOrdersOrderId,
      marketerId: marketerId.toString(),
      cartItemsCount: cartItems?.length || 0
    });

    // Process cart items and find products (جميع البنود بما فيها المنتجات المقترحة / cross-sell)
    const orderItems = [];
    const estimatedItemData = new Map<number, { supplierPrice: number }>(); // للمنتجات غير الموجودة في ربح
    let subtotal = 0;

    for (const cartItem of cartItems || []) {
      const {
        product_id: productId,
        variant_id: variantId,
        price: itemPrice,
        quantity: itemQuantity,
        product: productData,
        variant: variantData
      } = cartItem;

      // Try to find product by EasyOrders product ID or SKU
      let product = null;
      
      if (productData?.taager_code) {
        // Find by taager_code, easyOrdersProductId, or easyOrdersExports (دعم المنتجات المُصدَّرة والمقترحة)
        product = await Product.findOne({
          $or: [
            { sku: productData.taager_code },
            { 'metadata.easyOrdersProductId': productId },
            { 'metadata.easyOrdersExports.easyOrdersProductId': productId }
          ],
          supplierId: { $exists: true } // Make sure it's a supplier product
        });
      }

      if (!product && productData?.sku) {
        // Try finding by SKU
        product = await Product.findOne({
          sku: productData.sku,
          supplierId: { $exists: true }
        });
      }

      if (!product) {
        logger.info('EasyOrders webhook: Product not found (cross-sell or external) - will estimate profit', {
          productId,
          taagerCode: productData?.taager_code,
          sku: productData?.sku,
          productName: productData?.name
        });
        // منتج مقترح أو مضاف مباشرة على EO: تقدير سعر المورد (30% هامش = 70% من سعر البيع)
        const estimatedSupplierPrice = itemPrice * 0.7;
        product = {
          _id: null,
          name: productData?.name || 'منتج غير معروف',
          marketerPrice: itemPrice,
          supplierPrice: estimatedSupplierPrice,
          supplierId: null
        };
        // حفظ التقدير لاستخدامه في حساب الربح لاحقاً (orderItems يستخدم productId عشوائي)
        estimatedItemData.set(orderItems.length, { supplierPrice: estimatedSupplierPrice });
      } else {
        // Log successful product match for debugging
        logger.info('EasyOrders webhook: Product found', {
          productId: product._id,
          productName: product.name,
          easyOrdersProductId: productId,
          matchMethod: productData?.taager_code ? 'taager_code' : 'sku',
          hasSupplierPrice: !!product.supplierPrice,
          hasMarketerPrice: !!product.marketerPrice
        });
      }

      // Calculate prices: استخدام سعر البند من EO (ما دفعه العميل فعلياً) لضمان تطابق الإجمالي والربح
      const unitPrice = itemPrice; // سعر البيع الفعلي من Easy Orders
      const itemTotal = unitPrice * itemQuantity;
      subtotal += itemTotal;

      // Build variant option if variant exists
      let variantOption = null;
      if (variantData && variantData.variation_props) {
        const variantProps = variantData.variation_props.map((prop: any) => ({
          name: prop.variation,
          value: prop.variation_prop
        }));
        
        variantOption = {
          variantId: variantId || '',
          variantName: variantProps.map((p: any) => `${p.name}: ${p.value}`).join(', '),
          value: variantProps.map((p: any) => p.value).join(', '),
          price: variantData.price || unitPrice,
          stockQuantity: variantData.quantity || 0,
          sku: variantData.taager_code || '',
          images: []
        };
      }

      orderItems.push({
        productId: product._id || new mongoose.Types.ObjectId(),
        productName: product.name || productData?.name || 'منتج غير معروف',
        quantity: itemQuantity,
        unitPrice: unitPrice,
        totalPrice: itemTotal,
        priceType: 'marketer',
        variantOption: variantOption,
        selectedVariants: variantOption ? {
          [variantOption.variantId]: variantOption.value
        } : {}
      });
    }

    // Calculate totals: استخدام total_cost و cost من Easy Orders لضمان تطابق إجمالي الطلب مع ما دفعه العميل
    const finalShippingCost = shippingCost || 0;
    const calculatedTotal = subtotal + finalShippingCost;
    // استخدام القيم من EO عند توفرها (cost = مجموع المنتجات، total_cost = cost + shipping_cost)
    const orderSubtotal = (typeof cost === 'number' ? cost : null) ?? subtotal;
    const orderTotal = (typeof totalCost === 'number' ? totalCost : null) ?? calculatedTotal;
    
    // Calculate commission (admin profit) and marketer profit
    // يشمل المنتجات الرئيسية والمنتجات المقترحة (cross-sell)
    let totalCommission = 0;
    let marketerProfitTotal = 0;
    
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const product = await Product.findById(item.productId).catch(() => null);
      const estimated = estimatedItemData.get(i);
      
      if (product && product.supplierPrice) {
        // منتج موجود في ربح: حساب دقيق
        const itemAdminProfit = await settingsManager.calculateAdminProfitForProduct(
          product.supplierPrice,
          item.quantity
        );
        totalCommission += itemAdminProfit;
        
        const itemMarketerProfit = (item.unitPrice - product.supplierPrice) * item.quantity;
        marketerProfitTotal += itemMarketerProfit;
      } else if (estimated) {
        // منتج مقترح أو خارجي: استخدام التقدير المحفوظ
        const itemAdminProfit = await settingsManager.calculateAdminProfitForProduct(
          estimated.supplierPrice,
          item.quantity
        );
        totalCommission += itemAdminProfit;
        
        const itemMarketerProfit = (item.unitPrice - estimated.supplierPrice) * item.quantity;
        marketerProfitTotal += Math.max(0, itemMarketerProfit);
      } else {
        // fallback: تقدير عام
        const itemAdminProfit = await settingsManager.calculateAdminProfitForProduct(
          item.unitPrice,
          item.quantity
        );
        totalCommission += itemAdminProfit;
        marketerProfitTotal += Math.max(0, item.totalPrice * 0.1);
      }
    }
    
    // If no commission calculated, use system settings to calculate from order items
    const commission = totalCommission > 0 
      ? totalCommission 
      : await settingsManager.calculateAdminProfitForOrder(
          orderItems.map(item => ({ unitPrice: item.unitPrice, quantity: item.quantity }))
        );
    
    // Marketer profit is the difference between what marketer sells and supplier price
    // If we couldn't calculate it, use commission as fallback
    const marketerProfit = marketerProfitTotal > 0 ? marketerProfitTotal : commission;

    // Map EasyOrders status to our order status
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'pending_payment': 'pending',
      'paid': 'confirmed',
      'paid_failed': 'pending',
      'processing': 'processing',
      'waiting_for_pickup': 'ready_for_shipping',
      'in_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'canceled': 'cancelled',
      'returning_from_delivery': 'returned',
      'request_refund': 'pending',
      'refund_in_progress': 'pending',
      'refunded': 'refunded'
    };

    const orderStatus = statusMap[easyOrdersStatus] || 'pending';

    // طلب cross-sell: إذا كانت بيانات العميل ناقصة، استخدم بيانات آخر طلب من نفس المتجر
    let finalFullName = fullName?.trim?.() || '';
    let finalPhone = phone?.trim?.() || '';
    let finalAddress = address?.trim?.() || '';
    let finalGovernment = government?.trim?.() || 'المملكة العربية السعودية';

    const needsFallback = !finalFullName || !finalPhone;
    if (needsFallback) {
      // لا نشترط customerId — الطلب السابق قد يكون سُجّل بتكامل مختلف
      const recentOrder = await Order.findOne({
        'metadata.easyOrdersStoreId': storeId,
        'metadata.source': 'easy_orders'
      })
        .sort({ createdAt: -1 })
        .lean() as any;

      if (recentOrder?.shippingAddress) {
        const sa = recentOrder.shippingAddress;
        if (!finalFullName && sa?.fullName) finalFullName = String(sa.fullName);
        if (!finalPhone && sa?.phone) finalPhone = String(sa.phone);
        if (!finalAddress && sa?.street) finalAddress = String(sa.street);
        if (!finalGovernment && sa?.governorate) finalGovernment = String(sa.governorate);
        logger.info('EasyOrders webhook: Using customer data from previous order (cross-sell fallback)', {
          requestId,
          easyOrdersOrderId,
          previousOrderId: recentOrder._id,
          previousOrderNumber: recentOrder.orderNumber
        });
      }
    }

    // دمج طلب cross-sell في الطلب الأول: منع ظهور طلبين منفصلين لنفس العميل
    const mergeWindowMinutes = 30;
    const mergeCutoff = new Date(Date.now() - mergeWindowMinutes * 60 * 1000);
    const customerPhone = (finalPhone || phone?.trim?.() || '').replace(/\s+/g, '');
    const phoneDigits = customerPhone?.replace(/\D/g, '') || '';
    const phoneLast9 = phoneDigits.slice(-9);
    const phoneLast10 = phoneDigits.slice(-10);

    const mergeQuery: Record<string, unknown> = {
      'metadata.easyOrdersStoreId': storeId,
      'metadata.source': 'easy_orders',
      createdAt: { $gte: mergeCutoff }
    };
    // مطابقة مرنة للهاتف: آخر 9 أو 10 أرقام (للتعامل مع 0599 أو 599)
    if (phoneLast9.length >= 5) {
      (mergeQuery as any).$or = [
        { 'shippingAddress.phone': { $regex: phoneLast9 } },
        ...(phoneLast10.length >= 9 ? [{ 'shippingAddress.phone': { $regex: phoneLast10 } }] : [])
      ];
    }

    let existingOrderToMerge = phoneLast9.length >= 5
      ? (await Order.findOne(mergeQuery).sort({ createdAt: 1 }).limit(1).lean()) as any
      : null;
    // Fallback: مطابقة بالاسم إن لم يكن الهاتف كافياً
    if (!existingOrderToMerge && finalFullName && finalFullName.length >= 2) {
      const nameRegex = finalFullName.slice(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      existingOrderToMerge = (await Order.findOne({
        'metadata.easyOrdersStoreId': storeId,
        'metadata.source': 'easy_orders',
        createdAt: { $gte: mergeCutoff },
        'shippingAddress.fullName': { $regex: nameRegex, $options: 'i' }
      }).sort({ createdAt: 1 }).limit(1).lean()) as any;
    }

    const shouldMerge = existingOrderToMerge &&
      !existingOrderToMerge?.metadata?.mergedEasyOrdersOrderIds?.includes(easyOrdersOrderId);

    if (shouldMerge && existingOrderToMerge) {
      const existingOrder = await Order.findById(existingOrderToMerge._id);
      if (!existingOrder) throw new Error('Order not found for merge');

      const existingItems = (existingOrder as any).items || [];
      // الطلب الجديد أكثر = استبدال بالمحتوى الكامل. الطلب الحالي أكثر = إبقاءه (الويب هوك المتأخر قد يكون مكرراً). وإلا دمج
      const newHasMoreItems = orderItems.length > existingItems.length;
      const existingHasMoreItems = existingItems.length > orderItems.length;
      let mergedItems: any[];
      if (newHasMoreItems) {
        mergedItems = orderItems.map((i: any) => ({ ...i, productId: i.productId?._id ?? i.productId }));
      } else if (existingHasMoreItems) {
        mergedItems = existingItems;
      } else {
        mergedItems = mergeOrderItemsWithoutDuplicates(existingItems, orderItems);
      }
      const mergedSubtotal = mergedItems.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0);
      const existingShipping = (existingOrder as any).shippingCost || 0;
      const mergedTotal = mergedSubtotal + existingShipping;

      let mergedCommission = 0;
      let mergedMarketerProfit = 0;
      for (const item of mergedItems) {
        const product = await Product.findById(item.productId).catch(() => null);
        const supplierPrice = product?.supplierPrice ?? (item.unitPrice * 0.7);
        mergedCommission += await settingsManager.calculateAdminProfitForProduct(supplierPrice, item.quantity);
        mergedMarketerProfit += Math.max(0, (item.unitPrice - supplierPrice) * item.quantity);
      }

      const mergedIds = Array.isArray((existingOrder as any).metadata?.mergedEasyOrdersOrderIds)
        ? [...(existingOrder as any).metadata.mergedEasyOrdersOrderIds, easyOrdersOrderId]
        : [easyOrdersOrderId];

      (existingOrder as any).items = mergedItems;
      (existingOrder as any).subtotal = mergedSubtotal;
      (existingOrder as any).total = mergedTotal;
      (existingOrder as any).commission = mergedCommission;
      (existingOrder as any).marketerProfit = mergedMarketerProfit;
      (existingOrder as any).customerId = marketerId; // ضمان ظهور الطلب للمسوق صاحب التكامل
      (existingOrder as any).metadata = {
        ...(existingOrder as any).metadata,
        mergedEasyOrdersOrderIds: mergedIds,
        integrationId: String(finalIntegration._id) // لحالة كانت الطلبات قديمة بدون integrationId
      };
      (existingOrder as any).updatedAt = new Date();
      await existingOrder.save();

      logger.business('EasyOrders cross-sell order merged into existing order', {
        requestId,
        existingOrderId: existingOrder._id,
        orderNumber: (existingOrder as any).orderNumber,
        easyOrdersCrossSellOrderId: easyOrdersOrderId,
        mergedItemsCount: orderItems.length,
        newTotal: mergedTotal
      });

      return NextResponse.json({
        success: true,
        message: 'Cross-sell order merged successfully',
        orderId: existingOrder._id,
        orderNumber: (existingOrder as any).orderNumber,
        merged: true
      }, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, secret',
        }
      });
    }

    // Create order
    const order = await Order.create({
      customerId: marketerId, // The marketer is the customer in this case
      customerRole: 'marketer',
      supplierId: orderItems[0]?.productId ? 
        (await Product.findById(orderItems[0].productId))?.supplierId : 
        marketerId, // Fallback to marketer if no supplier found
      items: orderItems,
      subtotal: orderSubtotal,
      shippingCost: finalShippingCost,
      shippingMethod: 'الشحن الأساسي',
      shippingZone: government || 'المملكة العربية السعودية',
      commission: commission,
      total: orderTotal,
      marketerProfit: marketerProfit,
      status: orderStatus,
      paymentMethod: paymentMethod === 'cod' ? 'cod' : 'cod',
      paymentStatus: easyOrdersStatus === 'paid' ? 'paid' : 'pending',
      shippingAddress: {
        fullName: finalFullName || fullName || 'عميل Easy Orders',
        phone: finalPhone || phone || '',
        street: finalAddress || address || '',
        governorate: finalGovernment || government || 'المملكة العربية السعودية',
        city: finalGovernment || government || 'المملكة العربية السعودية',
        villageName: finalGovernment || government || 'المملكة العربية السعودية',
        deliveryCost: finalShippingCost
      },
      // Store EasyOrders metadata
      metadata: {
        easyOrdersOrderId: easyOrdersOrderId,
        easyOrdersStoreId: storeId,
        easyOrdersStatus: easyOrdersStatus,
        integrationId: String(finalIntegration._id),
        source: 'easy_orders'
      },
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: updatedAt ? new Date(updatedAt) : new Date()
    });

    logger.business('EasyOrders order created from webhook', {
      requestId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      easyOrdersOrderId,
      marketerId: marketerId.toString(),
      total: orderTotal,
      itemCount: orderItems.length
    });

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      orderId: order._id,
      orderNumber: order.orderNumber
    }, { 
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, secret',
      }
    });

  } catch (error: any) {
    logger.error('Error processing EasyOrders webhook', error, { 
      requestId,
      errorMessage: error?.message,
      errorStack: error?.stack?.substring(0, 500)
    });
    
    // Return detailed error for debugging
    const errorMessage = error?.message || 'حدث خطأ في معالجة الطلب';
    const errorDetails = {
      error: errorMessage,
      requestId,
      timestamp: new Date().toISOString()
    };

    const errorResponse = NextResponse.json(
      errorDetails,
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, secret',
        }
      }
    );
    
    return errorResponse;
  }
};

// Handle Order Status Update event
async function handleOrderStatusUpdate(body: any, integration: any, requestId?: string) {
  try {
    logger.info('EasyOrders webhook: Processing status update', {
      requestId,
      orderId: body.order_id,
      newStatus: body.new_status
    });
    const {
      order_id: easyOrdersOrderId,
      old_status: oldStatus,
      new_status: newStatus,
      payment_ref_id: paymentRefId
    } = body;

    if (!easyOrdersOrderId || !newStatus) {
      logger.warn('EasyOrders status update missing required fields', { body });
      return NextResponse.json(
        { error: 'Missing required fields: order_id and new_status' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, secret',
          }
        }
      );
    }

    await connectDB();

    // Find order by EasyOrders order ID
    const order = await Order.findOne({
      'metadata.easyOrdersOrderId': easyOrdersOrderId,
      supplierId: integration.userId
    });

    if (!order) {
      logger.warn('EasyOrders status update: Order not found', {
        requestId,
        easyOrdersOrderId,
        integrationId: integration._id
      });
      return NextResponse.json(
        { error: 'Order not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, secret',
          }
        }
      );
    }

    // Map EasyOrders status to our order status
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'pending_payment': 'pending',
      'paid': 'confirmed',
      'paid_failed': 'pending',
      'processing': 'processing',
      'waiting_for_pickup': 'ready_for_shipping',
      'in_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'canceled': 'cancelled',
      'returning_from_delivery': 'returned',
      'request_refund': 'pending',
      'refund_in_progress': 'pending',
      'refunded': 'refunded'
    };

    const newOrderStatus = statusMap[newStatus] || order.status;

    // Update order status
    order.status = newOrderStatus;
    
    // Update payment status if order is paid
    if (newStatus === 'paid') {
      order.paymentStatus = 'paid';
    } else if (newStatus === 'paid_failed') {
      order.paymentStatus = 'failed';
    }

    // Update metadata
    if (!order.metadata) {
      order.metadata = {};
    }
    order.metadata.easyOrdersStatus = newStatus;
    if (paymentRefId) {
      order.metadata.paymentRefId = paymentRefId;
    }

    order.updatedAt = new Date();
    await order.save();

    logger.business('EasyOrders order status updated', {
      orderId: order._id,
      easyOrdersOrderId,
      oldStatus,
      newStatus,
      newOrderStatus
    });

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      orderId: order._id,
      orderNumber: order.orderNumber,
      oldStatus: order.status,
      newStatus: newOrderStatus
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, secret',
      }
    });

  } catch (error) {
    logger.error('Error handling EasyOrders status update', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث حالة الطلب' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, secret',
        }
      }
    );
  }
}

