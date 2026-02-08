import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { settingsManager } from '@/lib/settings-manager';

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
        const integrationByStoreId = await StoreIntegration.findOne({
          type: IntegrationType.EASY_ORDERS,
          storeId: body.store_id,
          isActive: true
        });

        if (integrationByStoreId) {
          logger.info('EasyOrders webhook: Found integration by storeId, saving webhookSecret', {
            requestId,
            integrationId: integrationByStoreId._id,
            storeId: body.store_id
          });
          
          // Save webhook secret to integration
          integrationByStoreId.webhookSecret = webhookSecret;
          await integrationByStoreId.save();
          
          // Use this integration
          finalIntegration = integrationByStoreId;
          
          logger.business('EasyOrders webhook: Integration found and webhookSecret saved', {
            requestId,
            integrationId: finalIntegration._id,
            storeId: body.store_id
          });
        } else {
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

    // Check if order already exists
    const existingOrder = await Order.findOne({
      'metadata.easyOrdersOrderId': easyOrdersOrderId,
      supplierId: finalIntegration.userId
    });

    if (existingOrder) {
      logger.info('EasyOrders webhook: Order already exists', {
        requestId,
        orderId: existingOrder._id,
        easyOrdersOrderId
      });
      return NextResponse.json({
        success: true,
        message: 'Order already exists',
        orderId: existingOrder._id
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, secret',
        }
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

    // Process cart items and find products
    const orderItems = [];
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
        // Find by taager_code (which should match our product SKU or external ID)
        product = await Product.findOne({
          $or: [
            { sku: productData.taager_code },
            { 'metadata.easyOrdersProductId': productId }
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
        logger.warn('EasyOrders webhook: Product not found', {
          productId,
          taagerCode: productData?.taager_code,
          sku: productData?.sku,
          productName: productData?.name
        });
        // Continue with basic product info
        // Use itemPrice as marketerPrice, estimate supplierPrice (70% of marketer price = 30% markup)
        product = {
          _id: null,
          name: productData?.name || 'منتج غير معروف',
          marketerPrice: itemPrice,
          supplierPrice: itemPrice * 0.7, // Estimate - 30% markup
          supplierId: null
        };
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

      // Calculate prices
      const unitPrice = product.marketerPrice || itemPrice;
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

    // Calculate totals
    const finalShippingCost = shippingCost || 0;
    const total = subtotal + finalShippingCost;
    
    // Calculate commission (admin profit) and marketer profit
    // Commission is calculated based on supplierPrice using adminProfitMargins from system settings
    // Marketer profit is the difference between marketerPrice and supplierPrice
    let totalCommission = 0;
    let marketerProfitTotal = 0;
    
    for (const item of orderItems) {
      const product = await Product.findById(item.productId).catch(() => null);
      
      if (product && product.supplierPrice) {
        // Calculate admin profit based on supplierPrice using system settings
        const itemAdminProfit = await settingsManager.calculateAdminProfitForProduct(
          product.supplierPrice,
          item.quantity
        );
        totalCommission += itemAdminProfit;
        
        // Calculate marketer profit (difference between marketerPrice and supplierPrice)
        if (product.marketerPrice && product.supplierPrice) {
          const itemMarketerProfit = (product.marketerPrice - product.supplierPrice) * item.quantity;
          marketerProfitTotal += itemMarketerProfit;
        }
      } else {
        // If product not found, calculate commission based on unitPrice (selling price)
        // Use adminProfitMargins on the selling price
        const itemAdminProfit = await settingsManager.calculateAdminProfitForProduct(
          item.unitPrice,
          item.quantity
        );
        totalCommission += itemAdminProfit;
        
        // Estimate marketer profit (10% of item total as fallback)
        marketerProfitTotal += item.totalPrice * 0.1;
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

    // Create order
    const order = await Order.create({
      customerId: marketerId, // The marketer is the customer in this case
      customerRole: 'marketer',
      supplierId: orderItems[0]?.productId ? 
        (await Product.findById(orderItems[0].productId))?.supplierId : 
        marketerId, // Fallback to marketer if no supplier found
      items: orderItems,
      subtotal: subtotal,
      shippingCost: finalShippingCost,
      shippingMethod: 'الشحن الأساسي',
      shippingZone: government || 'المملكة العربية السعودية',
      commission: commission,
      total: total,
      marketerProfit: marketerProfit,
      status: orderStatus,
      paymentMethod: paymentMethod === 'cod' ? 'cod' : 'cod',
      paymentStatus: easyOrdersStatus === 'paid' ? 'paid' : 'pending',
      shippingAddress: {
        fullName: fullName,
        phone: phone,
        street: address,
        governorate: government,
        city: government, // Use government as city
        villageName: government,
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
      total,
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

