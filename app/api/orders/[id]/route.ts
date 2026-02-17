import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Product from '@/models/Product';
import Wallet from '@/models/Wallet';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { distributeOrderProfits, reverseOrderProfits } from '@/lib/wallet-helpers';

// PUT /api/orders/[id] - Update order status
export const PUT = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    logger.apiRequest('PUT', `/api/orders/${params.id}`, { userId: user._id, role: user.role });
    
    const body = await req.json();
    const { status, shippingCompany, shippingCity, notes, updateShippingOnly, villageId } = body;
    
    logger.debug('Updating order status', { orderId: params.id, status, userId: user._id });
    
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    // Fix invalid packageId if it's an ObjectId string instead of Number
    if (order.packageId && typeof order.packageId === 'string' && order.packageId.length === 24) {
      logger.warn('⚠️ Order has invalid packageId (ObjectId string), clearing it', {
        orderId: params.id,
        invalidPackageId: order.packageId
      });
      order.packageId = undefined;
      await Order.findByIdAndUpdate(params.id, { $unset: { packageId: 1 } });
    }

    logger.debug('Order details', {
      orderId: params.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      newStatus: status,
      customerRole: order.customerRole
    });

    // Check permissions - safely extract supplier ID
    let actualSupplierId: string | null = null;
    if (order.supplierId) {
      if (typeof order.supplierId === 'object' && order.supplierId !== null) {
        actualSupplierId = (order.supplierId as any)._id?.toString() || (order.supplierId as any).toString();
      } else {
        actualSupplierId = order.supplierId.toString();
      }
    }
    
    // Allow admin to update shipping only without changing status
    if (updateShippingOnly) {
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'غير مصرح لك بتحديث معلومات الشحن' },
          { status: 403 }
        );
      }
      // Update shipping info only
      if (shippingCompany !== undefined) order.shippingCompany = shippingCompany;
      if (shippingCity !== undefined) {
        if (!order.shippingAddress) {
          order.shippingAddress = {};
        }
        order.shippingAddress.city = shippingCity;
      }
      // Update villageId if provided (admin selecting actual village)
      if (body.villageId !== undefined && body.villageId) {
        if (!order.shippingAddress) {
          order.shippingAddress = {};
        }
        // Find village name from villageId
        const Village = (await import('@/models/Village')).default;
        const village = await Village.findOne({ villageId: body.villageId, isActive: true }).lean();
        if (village) {
          order.shippingAddress.villageId = body.villageId;
          order.shippingAddress.villageName = (village as any).villageName;
          // Also update city if not already set
          if (!order.shippingAddress.city || !shippingCity) {
            order.shippingAddress.city = shippingCity || (village as any).villageName;
          }
          logger.info('✅ Updated order shipping address with village', {
            orderId: order._id.toString(),
            villageId: body.villageId,
            villageName: (village as any).villageName,
            city: order.shippingAddress.city
          });
        } else {
          logger.warn('⚠️ Village not found when updating shipping address', {
            orderId: order._id.toString(),
            villageId: body.villageId
          });
        }
      }
      order.updatedAt = new Date();
      await order.save();
      
      // Log saved data for verification
      logger.info('💾 Saved shipping info to database', {
        orderId: order._id.toString(),
        shippingCompany: order.shippingCompany,
        villageId: order.shippingAddress?.villageId,
        villageName: order.shippingAddress?.villageName,
        city: order.shippingAddress?.city
      });
      
      logger.apiResponse('PUT', `/api/orders/${params.id}`, 200);
      return NextResponse.json({
        success: true,
        message: 'تم تحديث معلومات الشحن بنجاح',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          shippingCompany: order.shippingCompany,
          shippingAddress: order.shippingAddress
        }
      });
    }
    
    // Admin can update all orders
    if (user.role !== 'admin') {
      if (
        (user.role === 'supplier' && actualSupplierId && actualSupplierId !== user._id.toString())
        || (user.role === 'marketer' || user.role === 'wholesaler')
      ) {
        return NextResponse.json(
          { error: 'غير مصرح لك بتحديث هذا الطلب' },
          { status: 403 }
        );
      }
    }

    // Validate status transition (only for non-admin users)
    if (user.role !== 'admin') {
      const validTransitions: Record<string, string[]> = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'returned'],
        'delivered': ['returned'],
        'cancelled': [],
        'returned': []
      };

      const currentStatus = order.status;
      if (!validTransitions[currentStatus]?.includes(status)) {
        return NextResponse.json(
          { error: `لا يمكن تغيير حالة الطلب من ${currentStatus} إلى ${status}` },
          { status: 400 }
        );
      }
    } else {
      // For admins, validate that the status is one of the valid statuses
      const validStatuses = [
        'pending', 
        'confirmed', 
        'processing', 
        'ready_for_shipping',
        'shipped', 
        'out_for_delivery',
        'delivered', 
        'cancelled', 
        'returned',
        'refunded'
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `حالة غير صالحة: ${status}` },
          { status: 400 }
        );
      }
    }

    // Store previous status before updating
    const previousStatus = order.status;
    
    // Update order status and related fields
    order.status = status;
    order.updatedAt = new Date();

    // Add status-specific data
    switch (status) {
      case 'confirmed':
        order.confirmedAt = new Date();
        order.confirmedBy = user._id;
        break;
      case 'processing':
        order.processingAt = new Date();
        order.processedBy = user._id;
        break;
      case 'ready_for_shipping':
        order.readyForShippingAt = new Date();
        order.readyForShippingBy = user._id;
        // Automatically create package for shipping company
        try {
          const { createPackageFromOrder } = await import('@/lib/order-to-package');
          const packageResult = await createPackageFromOrder(order._id.toString());
          if (packageResult && packageResult.packageId) {
            order.packageId = packageResult.packageId;
            logger.business('✅ ORDER SENT TO SHIPPING COMPANY - Package created automatically when order status changed to ready_for_shipping', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              packageId: packageResult.packageId,
              apiSuccess: packageResult.apiSuccess,
              previousStatus: order.status,
              newStatus: 'ready_for_shipping',
              timestamp: new Date().toISOString()
            });
            
            logger.info('✅ Package created automatically and sent to shipping company', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              packageId: packageResult.packageId
            });
          } else {
            logger.warn('⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY - Failed to create package automatically for order', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              orderStatus: order.status,
              timestamp: new Date().toISOString(),
              reason: 'Check if external company exists and is active, or if order has valid shipping address with villageId'
            });
          }
        } catch (error) {
          logger.error('Error creating package automatically for order', error, {
            orderId: order._id.toString()
          });
          // Continue with order update even if package creation fails
        }
        break;
        case 'shipped':
          order.shippedAt = new Date();
          order.shippedBy = user._id;
          if (shippingCompany) order.shippingCompany = shippingCompany;
          if (shippingCity) {
            if (!order.shippingAddress) {
              order.shippingAddress = {};
            }
            order.shippingAddress.city = shippingCity;
          }
          
          // Update villageId if provided (admin selecting actual village)
          let villageData: any = {};
          if (body.villageId !== undefined && body.villageId) {
            if (!order.shippingAddress) {
              order.shippingAddress = {};
            }
            // Find village name from villageId
            const Village = (await import('@/models/Village')).default;
            const village = await Village.findOne({ villageId: body.villageId, isActive: true }).lean();
            if (village) {
              villageData.villageId = body.villageId;
              villageData.villageName = (village as any).villageName;
              order.shippingAddress.villageId = body.villageId;
              order.shippingAddress.villageName = (village as any).villageName;
              // Also update city if not already set
              if (!order.shippingAddress.city) {
                order.shippingAddress.city = (village as any).villageName;
              }
            }
          }
          
          // IMPORTANT: Save shippingCompany AND villageId to database FIRST before creating package
          // This ensures createPackageFromOrder can find the correct shipping company and village
          const shippingUpdateData: any = {};
          if (shippingCompany) {
            shippingUpdateData.shippingCompany = shippingCompany;
            // Update order object in memory so createPackageFromOrder can read it
            order.shippingCompany = shippingCompany;
          }
          if (villageData.villageId) {
            // Update shippingAddress with village data
            if (!order.shippingAddress) {
              order.shippingAddress = {};
            }
            const updatedShippingAddress = {
              ...order.shippingAddress.toObject ? order.shippingAddress.toObject() : order.shippingAddress,
              villageId: villageData.villageId,
              villageName: villageData.villageName
            };
            if (shippingCity || villageData.villageName) {
              updatedShippingAddress.city = shippingCity || villageData.villageName;
            }
            shippingUpdateData.shippingAddress = updatedShippingAddress;
            // Also update in memory
            order.shippingAddress.villageId = villageData.villageId;
            order.shippingAddress.villageName = villageData.villageName;
            if (shippingCity || villageData.villageName) {
              order.shippingAddress.city = shippingCity || villageData.villageName;
            }
          }
          
          if (Object.keys(shippingUpdateData).length > 0) {
            await Order.findByIdAndUpdate(order._id, { $set: shippingUpdateData });
            // Reload order from database to ensure we have the latest data
            const refreshedOrder = await Order.findById(order._id).lean() as any;
            if (refreshedOrder) {
              // Preserve order.status that we set above (don't overwrite with old status)
              const currentStatus = order.status;
              Object.assign(order, refreshedOrder);
              order.status = currentStatus; // Restore the new status
            }
          }
          
          // IMPORTANT: Reload order from database to ensure we have the latest data (including shippingCompany and villageId)
          // before creating package, since createPackageFromOrder uses .lean() to read from database
          const refreshedOrderForPackage = await Order.findById(order._id).lean() as any;
          if (refreshedOrderForPackage) {
            // Update order object in memory with refreshed data
            const currentStatus = order.status; // Preserve status
            if (refreshedOrderForPackage.shippingCompany) {
              order.shippingCompany = refreshedOrderForPackage.shippingCompany;
            }
            if (refreshedOrderForPackage.shippingAddress?.villageId) {
              if (!order.shippingAddress) order.shippingAddress = {};
              order.shippingAddress.villageId = refreshedOrderForPackage.shippingAddress.villageId;
              order.shippingAddress.villageName = refreshedOrderForPackage.shippingAddress.villageName;
            }
            order.status = currentStatus; // Restore the new status
          }
          
          // Ensure package exists before shipping - create if doesn't exist
          // Check if packageId is valid (must be Number, not ObjectId string)
          const currentPackageId = order.packageId;
          const hasValidPackageId = currentPackageId && typeof currentPackageId === 'number';
          
          if (!hasValidPackageId) {
            try {
              const { createPackageFromOrder } = await import('@/lib/order-to-package');
              // Pass the refreshed order data - createPackageFromOrder will reload from DB anyway, but this ensures we have the ID
              const packageResult = await createPackageFromOrder(order._id.toString());
              
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
                  
                  // Revert order status change
                  order.status = previousStatus;
                  
                  return NextResponse.json({
                    success: false,
                    error: packageResult.error || 'فشل إرسال الطرد إلى شركة الشحن. يرجى المحاولة مرة أخرى.',
                    packageId: packageResult.packageId,
                    apiSuccess: false
                  }, { status: 400 });
                }
                
                // Package successfully sent to shipping company
                order.packageId = packageResult.packageId;
                
                // IMPORTANT: Save packageId to database before continuing
                await Order.findByIdAndUpdate(order._id, {
                  packageId: packageResult.packageId
                });
                
                logger.business('✅ ORDER SENT TO SHIPPING COMPANY - Package created and sent successfully when order status changed to shipped', {
                  orderId: order._id.toString(),
                  orderNumber: order.orderNumber,
                  packageId: packageResult.packageId,
                  previousStatus: previousStatus,
                  newStatus: 'shipped',
                  timestamp: new Date().toISOString(),
                  note: 'Package was created and sent to shipping company when order was marked as shipped'
                });
                
                logger.info('✅ Package created automatically and sent to shipping company when order shipped', {
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
                
                // Revert order status change
                order.status = previousStatus;
                
                return NextResponse.json({
                  success: false,
                  error: 'فشل إنشاء الطرد. يرجى التحقق من بيانات الطلب وإعادة المحاولة.'
                }, { status: 400 });
              }
            } catch (error) {
              logger.error('Error creating package automatically when shipping order', error, {
                orderId: order._id.toString()
              });
              
              // Revert order status change
              order.status = previousStatus;
              
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
              const ExternalCompany = (await import('@/models/ExternalCompany')).default;
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
                
                // Revert order status change
                order.status = previousStatus;
                
                return NextResponse.json({
                  success: false,
                  error: 'الطرد موجود لكن لم يتم إرساله إلى شركة الشحن. يرجى استخدام زر "إعادة إرسال الطرد".',
                  packageId: existingPackage.packageId,
                  apiSuccess: false
                }, { status: 400 });
              }
              
              // Package was successfully sent (status is 'confirmed' or no API configured)
              logger.info('✅ Package already exists and was sent to shipping company', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                packageId: currentPackageId,
                packageStatus: existingPackage.status,
                note: 'Package was already created and sent to shipping company earlier'
              });
            } else if (currentPackageId && typeof currentPackageId === 'number') {
              // Package ID exists but package document not found - this shouldn't happen
              logger.warn('⚠️ Package ID exists but package document not found', {
                orderId: order._id.toString(),
                packageId: currentPackageId
              });
            } else {
              // packageId is invalid (ObjectId string or undefined) - try to fix it
              logger.warn('⚠️ Package exists but packageId is invalid, attempting to fix...', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                currentPackageId: currentPackageId,
                packageIdType: typeof currentPackageId
              });
              
              // Try to get correct packageId from Package document
              try {
                const Package = (await import('@/models/Package')).default;
                const existingPackage = await Package.findOne({ orderId: order._id }).lean() as any;
                if (existingPackage && existingPackage.packageId && typeof existingPackage.packageId === 'number') {
                  order.packageId = existingPackage.packageId;
                  await Order.findByIdAndUpdate(order._id, {
                    packageId: existingPackage.packageId
                  });
                  logger.info('✅ Fixed packageId from existing Package document', {
                    orderId: order._id.toString(),
                    packageId: existingPackage.packageId
                  });
                } else {
                  // Package exists but no valid packageId - recreate it
                  logger.warn('⚠️ Package exists without valid packageId, will recreate', {
                    orderId: order._id.toString()
                  });
                  // Continue to package creation logic above
                  const { createPackageFromOrder } = await import('@/lib/order-to-package');
                  const packageResult = await createPackageFromOrder(order._id.toString());
                  if (packageResult && packageResult.packageId && typeof packageResult.packageId === 'number') {
                    order.packageId = packageResult.packageId;
                    await Order.findByIdAndUpdate(order._id, { packageId: packageResult.packageId });
                  }
                }
              } catch (error) {
                logger.error('Error fixing invalid packageId', error, {
                  orderId: order._id.toString()
                });
              }
            }
          }
          break;
      case 'out_for_delivery':
        order.outForDeliveryAt = new Date();
        order.outForDeliveryBy = user._id;
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        order.deliveredBy = user._id;
        order.actualDelivery = new Date();
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        order.cancelledBy = user._id;
        // Reverse profits if order was already delivered and profits were distributed
        if (order.profitsDistributed && (order.status === 'delivered' || order.status === 'shipped')) {
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
        if (order.status === 'confirmed' || order.status === 'processing') {
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
      case 'returned':
        order.returnedAt = new Date();
        order.returnedBy = user._id;
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
      case 'refunded':
        order.refundedAt = new Date();
        order.refundedBy = user._id;
        break;
    }

    // Add notes if provided
    if (notes) {
      order.adminNotes = notes;
    }

    // Save order first to ensure status is updated
    await order.save();

    // Handle profit distribution when order is delivered
    if (status === 'delivered') {
      try {
        await distributeOrderProfits(order);
        logger.business('Profits distributed successfully', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        });
      } catch (error) {
        logger.error('Error distributing profits', error, {
          orderId: order._id,
          orderNumber: order.orderNumber
        });
        // Continue even if profit distribution fails - order is already saved
        // Log error but don't fail the request
      }
    }

    // Order already saved above if delivered, otherwise save here
    if (status !== 'delivered') {
      await order.save();
    }
    
    logger.business('Order status updated', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      userId: user._id
    });
    logger.apiResponse('PUT', `/api/orders/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt,
        shippingCompany: order.shippingCompany,
        adminNotes: order.adminNotes,
        packageId: order.packageId // Include packageId in response
      }
    });
  } catch (error) {
    logger.error('Error updating order', error, { orderId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث الطلب');
  }
});

// GET /api/orders/[id] - Get order details
export const GET = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    logger.apiRequest('GET', `/api/orders/${params.id}`, { userId: user._id, role: user.role });
    
    const order = await Order.findById(params.id)
      .populate('items.productId', 'name images marketerPrice wholesalerPrice')
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name email phone')
      .lean() as any;
    
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    // Check permissions - safely extract IDs
    let actualSupplierId: string | null = null;
    if (order.supplierId) {
      if (typeof order.supplierId === 'object' && order.supplierId !== null) {
        actualSupplierId = (order.supplierId as any)._id?.toString() || (order.supplierId as any).toString();
      } else {
        actualSupplierId = order.supplierId.toString();
      }
    }
    
    let actualCustomerId: string | null = null;
    if (order.customerId) {
      if (typeof order.customerId === 'object' && order.customerId !== null) {
        actualCustomerId = (order.customerId as any)._id?.toString() || (order.customerId as any).toString();
      } else {
        actualCustomerId = order.customerId.toString();
      }
    }
    
    logger.debug('Checking order access permissions', {
      userRole: user.role,
      userId: user._id.toString(),
      orderSupplierId: actualSupplierId || 'null',
      orderCustomerId: actualCustomerId || 'null'
    });
    
    // Admin can access all orders
    if (user.role !== 'admin') {
      let hasAccess = false;
      if (user.role === 'supplier') {
        hasAccess = !actualSupplierId || actualSupplierId === user._id.toString();
      } else if (user.role === 'marketer' || user.role === 'wholesaler') {
        const isCustomer = actualCustomerId && actualCustomerId === user._id.toString();
        let isEasyOrdersFromMyIntegration = false;
        if (order.metadata?.source === 'easy_orders') {
          if (order.metadata?.integrationId) {
            isEasyOrdersFromMyIntegration = !!(await StoreIntegration.findOne({
              _id: order.metadata.integrationId,
              userId: user._id,
              type: IntegrationType.EASY_ORDERS,
              isActive: true
            }));
          }
          if (!isEasyOrdersFromMyIntegration && order.metadata?.easyOrdersStoreId) {
            isEasyOrdersFromMyIntegration = !!(await StoreIntegration.findOne({
              storeId: order.metadata.easyOrdersStoreId,
              userId: user._id,
              type: IntegrationType.EASY_ORDERS,
              isActive: true
            }));
          }
        }
        hasAccess = !!isCustomer || !!isEasyOrdersFromMyIntegration;
      }
      if (!hasAccess) {
        logger.warn('Unauthorized order access attempt', {
          userId: user._id.toString(),
          userRole: user.role,
          orderId: params.id
        });
        return NextResponse.json(
          { error: 'غير مصرح لك بعرض هذا الطلب' },
          { status: 403 }
        );
      }
    }

    logger.apiResponse('GET', `/api/orders/${params.id}`, 200);
    
    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Error fetching order details', error, { orderId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب تفاصيل الطلب');
  }
});

// DELETE /api/orders/[id] - Delete order (admin only)
export const DELETE = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بحذف الطلبات. الأدمن فقط.' },
        { status: 403 }
      );
    }

    await connectDB();
    logger.apiRequest('DELETE', `/api/orders/${params.id}`, { userId: user._id, role: user.role });

    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    // Reverse profits if they were distributed (so wallet stays consistent)
    if ((order as any).profitsDistributed) {
      try {
        await reverseOrderProfits(order);
        logger.business('Profits reversed before order delete', {
          orderId: order._id.toString(),
          orderNumber: (order as any).orderNumber
        });
      } catch (err) {
        logger.error('Error reversing profits before order delete', err, { orderId: params.id });
        return NextResponse.json(
          { success: false, error: 'فشل عكس أرباح الطلب. تم إلغاء الحذف.' },
          { status: 500 }
        );
      }
    }

    // Restore product stock if order was in a state where stock was deducted
    const status = (order as any).status;
    if (status === 'confirmed' || status === 'processing' || status === 'shipped' || status === 'delivered') {
      for (const item of (order as any).items || []) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        if ((product as any).hasVariants && item.variantOption?.variantId) {
          const variantOptions = (product as any).variantOptions || [];
          const variantOptionIndex = variantOptions.findIndex(
            (opt: any) => opt.variantId === item.variantOption.variantId && opt.value === item.variantOption.value
          );
          if (variantOptionIndex !== -1) {
            const updatePath = `variantOptions.${variantOptionIndex}.stockQuantity`;
            await Product.findByIdAndUpdate(item.productId, {
              $inc: { [updatePath]: item.quantity, stockQuantity: item.quantity }
            });
          } else {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity } });
          }
        } else {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity } });
        }
      }
    }

    await Order.findByIdAndDelete(params.id);

    logger.business('Order deleted by admin', {
      orderId: params.id,
      orderNumber: (order as any).orderNumber,
      adminId: user._id.toString()
    });
    logger.apiResponse('DELETE', `/api/orders/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم حذف الطلب بنجاح'
    });
  } catch (error) {
    logger.error('Error deleting order', error, { orderId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء حذف الطلب');
  }
}); 