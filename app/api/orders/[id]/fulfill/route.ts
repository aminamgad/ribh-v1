import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Wallet from '@/models/Wallet';
import ExternalCompany from '@/models/ExternalCompany';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { distributeOrderProfits, reverseOrderProfits } from '@/lib/wallet-helpers';

// POST /api/orders/[id]/fulfill - Fulfill order (for suppliers)
export const POST = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const body = await req.json();
    const { action, shippingCompany, notes } = body;
    
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }
    
    // Check if user is supplier and owns this order
    if (user.role !== 'supplier' || order.supplierId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتنفيذ هذا الطلب' },
        { status: 403 }
      );
    }

    // Validate action and current status
    const validActions: Record<string, string[]> = {
      'confirm': ['pending'],
      'process': ['confirmed'],
      'ship': ['processing'],
      'deliver': ['shipped'],
      'cancel': ['pending', 'confirmed', 'processing'],
      'return': ['shipped', 'delivered']
    };

    const currentStatus = order.status;
    if (!validActions[action]?.includes(currentStatus)) {
      return NextResponse.json(
        { error: `لا يمكن تنفيذ ${action} على الطلب في حالة ${currentStatus}` },
        { status: 400 }
      );
    }

    // Update order based on action
    let newStatus = '';
    let updateData: any = {};

    switch (action) {
      case 'confirm':
        newStatus = 'confirmed';
        updateData = {
          status: newStatus,
          confirmedAt: new Date(),
          confirmedBy: user._id,
          updatedAt: new Date()
        };
        break;

      case 'process':
        newStatus = 'processing';
        updateData = {
          status: newStatus,
          processingAt: new Date(),
          processedBy: user._id,
          updatedAt: new Date()
        };
        break;

      case 'ship':
        // IMPORTANT: Update shippingCompany in order object BEFORE creating package
        // This ensures createPackageFromOrder can find the correct shipping company
        if (shippingCompany) {
          order.shippingCompany = shippingCompany;
          // Save shippingCompany to database first
          await Order.findByIdAndUpdate(order._id, {
            shippingCompany: shippingCompany
          });
        }
        
        // Ensure package exists and is successfully sent to shipping company before marking as shipped
        let packageResult = null;
        if (!order.packageId) {
          try {
            const { createPackageFromOrder } = await import('@/lib/order-to-package');
            packageResult = await createPackageFromOrder(order._id.toString());
            
            if (packageResult && packageResult.packageId) {
              // Check if package was successfully sent to shipping company API
              if (!packageResult.apiSuccess) {
                // Package created but failed to send to shipping company
                logger.warn('⚠️ Cannot mark order as shipped - package failed to send to shipping company', {
                  orderId: order._id.toString(),
                  orderNumber: order.orderNumber,
                  packageId: packageResult.packageId,
                  error: packageResult.error
                });
                
                return NextResponse.json({
                  success: false,
                  error: packageResult.error || 'فشل إرسال الطرد إلى شركة الشحن. يرجى المحاولة مرة أخرى.',
                  packageId: packageResult.packageId,
                  apiSuccess: false
                }, { status: 400 });
              }
              
              // Package successfully sent to shipping company
              newStatus = 'shipped';
              updateData = {
                status: newStatus,
                shippedAt: new Date(),
                shippedBy: user._id,
                shippingCompany,
                packageId: packageResult.packageId,
                updatedAt: new Date()
              };
              
              logger.info('✅ Package created and sent successfully - marking order as shipped', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                packageId: packageResult.packageId
              });
            } else {
              // Failed to create package
              logger.error('❌ Cannot mark order as shipped - failed to create package', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber
              });
              
              return NextResponse.json({
                success: false,
                error: 'فشل إنشاء الطرد. يرجى التحقق من بيانات الطلب وإعادة المحاولة.'
              }, { status: 400 });
            }
          } catch (error) {
            logger.error('Error creating package before shipping order', error, {
              orderId: order._id.toString()
            });
            
            return NextResponse.json({
              success: false,
              error: 'حدث خطأ أثناء إنشاء الطرد. يرجى المحاولة مرة أخرى.'
            }, { status: 500 });
          }
        } else {
          // Package already exists - check if it was successfully sent to shipping company
          const Package = (await import('@/models/Package')).default;
          const existingPackage = await Package.findOne({ orderId: order._id }).lean() as any;
          
          // Get external company to check if API is configured
          let externalCompany = null;
          if (shippingCompany) {
            externalCompany = await ExternalCompany.findOne({ 
              companyName: shippingCompany,
              isActive: true 
            }).lean() as any;
          }
          
          if (existingPackage) {
            // Check package status - if it's 'confirmed', it was successfully sent to API
            // If it's 'pending', it means API call failed
            if (existingPackage.status === 'pending' && externalCompany?.apiEndpointUrl) {
              // Package exists but wasn't sent to shipping company
              logger.warn('⚠️ Cannot mark order as shipped - package exists but was not sent to shipping company', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                packageId: existingPackage.packageId,
                packageStatus: existingPackage.status
              });
              
              return NextResponse.json({
                success: false,
                error: 'الطرد موجود لكن لم يتم إرساله إلى شركة الشحن. يرجى استخدام زر "إعادة إرسال الطرد".',
                packageId: existingPackage.packageId,
                apiSuccess: false
              }, { status: 400 });
            }
            
            // Package was successfully sent (status is 'confirmed' or no API configured)
            newStatus = 'shipped';
            updateData = {
              status: newStatus,
              shippedAt: new Date(),
              shippedBy: user._id,
              shippingCompany,
              updatedAt: new Date()
            };
          } else {
            // Package ID exists but package document not found - this shouldn't happen
            logger.error('❌ Package ID exists but package document not found', {
              orderId: order._id.toString(),
              packageId: order.packageId
            });
            
            return NextResponse.json({
              success: false,
              error: 'خطأ في بيانات الطرد. يرجى المحاولة مرة أخرى.'
            }, { status: 500 });
          }
        }
        break;

      case 'deliver':
        newStatus = 'delivered';
        updateData = {
          status: newStatus,
          deliveredAt: new Date(),
          deliveredBy: user._id,
          actualDelivery: new Date(),
          updatedAt: new Date()
        };
        break;

      case 'cancel':
        newStatus = 'cancelled';
        updateData = {
          status: newStatus,
          cancelledAt: new Date(),
          cancelledBy: user._id,
          updatedAt: new Date()
        };
        // Reverse profits if order was already delivered and profits were distributed
        if (order.profitsDistributed && (currentStatus === 'delivered' || currentStatus === 'shipped')) {
          try {
            await reverseOrderProfits(order);
            logger.business('Profits reversed for cancelled delivered order', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber
            });
          } catch (error) {
            logger.error('Error reversing profits for cancelled order', error, {
              orderId: order._id.toString()
            });
            // Continue with cancellation even if profit reversal fails
          }
        }
        // Restore product stock if cancelling (only if order was confirmed or processing)
        if (currentStatus === 'confirmed' || currentStatus === 'processing') {
          for (const item of order.items) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            
            // If product has variants and variantOption is selected, restore variant stock
            if (product.hasVariants && item.variantOption?.variantId) {
              const variantOptionIndex = (product.variantOptions as any[] || []).findIndex(
                (opt: any) => opt.variantId === item.variantOption.variantId && 
                             opt.value === item.variantOption.value
              );
              
              if (variantOptionIndex !== -1) {
                const updatePath = `variantOptions.${variantOptionIndex}.stockQuantity`;
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { 
                    [updatePath]: item.quantity,
                    stockQuantity: item.quantity // Also restore main stock
                  }
                });
                logger.dbQuery('UPDATE', 'products', { 
                  productId: item.productId, 
                  variantStock: item.quantity,
                  variantId: item.variantOption.variantId,
                  action: 'restore_stock_cancel'
                });
              } else {
                // Fallback: restore main stock only
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { stockQuantity: item.quantity }
                });
                logger.warn('Variant option not found for stock restoration, restored main stock only', {
                  productId: item.productId,
                  variantId: item.variantOption.variantId
                });
              }
            } else {
              // Restore main product stock
              await Product.findByIdAndUpdate(item.productId, {
                $inc: { stockQuantity: item.quantity }
              });
              logger.dbQuery('UPDATE', 'products', { 
                productId: item.productId, 
                quantity: item.quantity,
                action: 'restore_stock_cancel'
              });
            }
          }
        }
        break;

      case 'return':
        newStatus = 'returned';
        updateData = {
          status: newStatus,
          returnedAt: new Date(),
          returnedBy: user._id,
          updatedAt: new Date()
        };
        // Reverse profits if order was delivered and profits were distributed
        if (order.profitsDistributed) {
          try {
            await reverseOrderProfits(order);
            logger.business('Profits reversed for returned order', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber
            });
          } catch (error) {
            logger.error('Error reversing profits for returned order', error, {
              orderId: order._id.toString()
            });
            // Continue with return even if profit reversal fails
          }
        }
        // Restore product stock for returns
        for (const item of order.items) {
          const product = await Product.findById(item.productId);
          if (!product) continue;
          
          // If product has variants and variantOption is selected, restore variant stock
          if (product.hasVariants && item.variantOption?.variantId) {
            const variantOptionIndex = (product.variantOptions as any[] || []).findIndex(
              (opt: any) => opt.variantId === item.variantOption.variantId && 
                           opt.value === item.variantOption.value
            );
            
            if (variantOptionIndex !== -1) {
              const updatePath = `variantOptions.${variantOptionIndex}.stockQuantity`;
              await Product.findByIdAndUpdate(item.productId, {
                $inc: { 
                  [updatePath]: item.quantity,
                  stockQuantity: item.quantity // Also restore main stock
                }
              });
              logger.dbQuery('UPDATE', 'products', { 
                productId: item.productId, 
                variantStock: item.quantity,
                variantId: item.variantOption.variantId,
                action: 'restore_stock_return'
              });
            } else {
              // Fallback: restore main stock only
              await Product.findByIdAndUpdate(item.productId, {
                $inc: { stockQuantity: item.quantity }
              });
              logger.warn('Variant option not found for stock restoration, restored main stock only', {
                productId: item.productId,
                variantId: item.variantOption.variantId
              });
            }
          } else {
            // Restore main product stock
            await Product.findByIdAndUpdate(item.productId, {
              $inc: { stockQuantity: item.quantity }
            });
            logger.dbQuery('UPDATE', 'products', { 
              productId: item.productId, 
              quantity: item.quantity,
              action: 'restore_stock_return'
            });
          }
        }
        break;
    }

    // Add notes if provided
    if (notes) {
      updateData.adminNotes = notes;
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      updateData,
      { new: true }
    );

    // Handle profit distribution when order is delivered
    if (action === 'deliver' && updatedOrder) {
      try {
        await distributeOrderProfits(updatedOrder);
        logger.business('Profits distributed successfully', {
          orderId: updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber
        });
      } catch (error) {
        logger.error('Error distributing profits', error, { orderId: updatedOrder._id });
        // Continue with order update even if profit distribution fails
      }
    }

    logger.business('Order fulfilled', {
      orderId: params.id,
      action,
      newStatus,
      userId: user._id.toString()
    });
    logger.apiResponse('POST', `/api/orders/${params.id}/fulfill`, 200);

    const actionMessages = {
      'confirm': 'تم تأكيد الطلب بنجاح',
      'process': 'تم بدء معالجة الطلب بنجاح',
      'ship': 'تم شحن الطلب بنجاح',
      'deliver': 'تم تسليم الطلب بنجاح',
      'cancel': 'تم إلغاء الطلب بنجاح',
      'return': 'تم إرجاع الطلب بنجاح'
    };

    return NextResponse.json({
      success: true,
      message: actionMessages[action as keyof typeof actionMessages] || 'تم تنفيذ الطلب بنجاح',
      order: {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
        shippingCompany: updatedOrder.shippingCompany,
        adminNotes: updatedOrder.adminNotes
      }
    });
  } catch (error) {
    logger.error('Error fulfilling order', error, { orderId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تنفيذ الطلب');
  }
}); 