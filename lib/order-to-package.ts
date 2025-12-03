import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Package from '@/models/Package';
import ExternalCompany from '@/models/ExternalCompany';
import SystemSettings from '@/models/SystemSettings';
import { logger } from './logger';

/**
 * Call external shipping company API to create package
 * @param apiEndpointUrl - The API endpoint URL of the external shipping company
 * @param apiToken - Bearer token for authentication
 * @param packageData - Package data to send
 * @returns Object with success status and packageId or error message
 */
async function callExternalShippingCompanyAPI(
  apiEndpointUrl: string,
  apiToken: string,
  packageData: {
    to_name: string;
    to_phone: string;
    alter_phone: string;
    description: string;
    package_type: string;
    village_id: string;
    street: string;
    total_cost: string;
    note?: string;
    barcode: string;
  }
): Promise<{ success: boolean; packageId?: number; error?: string }> {
  try {
    // Handle token with or without "Bearer" prefix
    const token = apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`;
    
    const response = await fetch(apiEndpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(packageData)
    });

    const responseData = await response.json();

    if (response.ok && responseData.code === 200 && responseData.state === 'success') {
      return {
        success: true,
        packageId: responseData.data?.package_id
      };
    } else {
      // Handle error response
      const errorMessage = responseData.message || 
                          responseData.errors ? JSON.stringify(responseData.errors) : 
                          `API returned status ${response.status}`;
      
      logger.warn('External shipping company API returned error', {
        status: response.status,
        response: responseData,
        apiEndpoint: apiEndpointUrl
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error calling external shipping company API', error, {
      apiEndpoint: apiEndpointUrl
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Convert an Order to a Package for shipping company
 * This function is called automatically when order status changes to ready_for_shipping
 * @param orderId - The Order ID to convert
 * @returns Package ID if successful, null if failed
 */
export async function createPackageFromOrder(orderId: string): Promise<number | null> {
  try {
    await connectDB();

    // Get order
    const order = await Order.findById(orderId).lean() as any;
    if (!order) {
      logger.warn('Order not found for package creation', { orderId });
      return null;
    }

    // Check if package already exists for this order
    const existingPackage = await Package.findOne({ orderId: order._id }).lean() as any;
    if (existingPackage) {
      logger.info('Package already exists for order', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        packageId: existingPackage.packageId
      });
      return existingPackage.packageId;
    }

    // Get default external company from system settings
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
    let externalCompanyId = null;

    if (settings && settings.defaultExternalCompanyId) {
      externalCompanyId = settings.defaultExternalCompanyId;
      logger.debug('Using default external company from settings', {
        companyId: externalCompanyId.toString(),
        orderId: order._id.toString()
      });
    } else {
      // Get first active external company as fallback
      const firstCompany = await ExternalCompany.findOne({ isActive: true }).lean() as any;
      if (firstCompany) {
        externalCompanyId = firstCompany._id;
        logger.info('Using first active external company as default', {
          companyId: externalCompanyId.toString(),
          companyName: firstCompany.companyName,
          orderId: order._id.toString()
        });
      } else {
        logger.error('No external company found. Please create an external company first.', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          note: 'Run: node scripts/create-external-company.js "Company Name"'
        });
        return null;
      }
    }

    // Verify external company exists and is active
    const externalCompany = await ExternalCompany.findById(externalCompanyId).lean() as any;
    if (!externalCompany || !externalCompany.isActive) {
      logger.error('External company not found or inactive', {
        externalCompanyId: externalCompanyId?.toString(),
        orderId: order._id.toString()
      });
      return null;
    }

    // Validate order has required shipping address data
    const shippingAddress = order.shippingAddress;
    if (!shippingAddress) {
      logger.error('Order missing shipping address', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber
      });
      return null;
    }

    if (!shippingAddress.villageId) {
      logger.error('Order missing villageId in shipping address', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber
      });
      return null;
    }

    // Verify village exists and is active
    const Village = (await import('@/models/Village')).default;
    const village = await Village.findOne({
      villageId: shippingAddress.villageId,
      isActive: true
    }).lean();

    if (!village) {
      logger.error('Village not found or inactive for shipping address', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        villageId: shippingAddress.villageId
      });
      return null;
    }

    // Use order number as barcode
    const orderNumber = order.orderNumber || `ORD-${order._id.toString().slice(-8)}`;
    const barcode = orderNumber; // Use order number directly as barcode

    // Create package description from order items
    const items = order.items || [];
    const itemDescriptions = items.map((item: any) => 
      `${item.productName || 'منتج'} x${item.quantity || 1}`
    ).join(', ');
    const description = `طلب رقم ${orderNumber}: ${itemDescriptions}`;

    // Get package type (default to 'normal')
    const packageType = 'normal'; // Can be enhanced to determine based on order items

    // Create package
    const newPackage = new Package({
      externalCompanyId: externalCompanyId,
      orderId: order._id,
      toName: shippingAddress.fullName || 'غير محدد',
      toPhone: shippingAddress.phone || '',
      alterPhone: shippingAddress.phone || '', // Use same phone as alternate if not provided
      description: description,
      packageType: packageType,
      villageId: shippingAddress.villageId,
      street: shippingAddress.street || '',
      totalCost: order.total || 0,
      note: order.deliveryNotes || shippingAddress.notes || `طلب رقم ${orderNumber}`,
      barcode: barcode,
      status: 'pending'
    });

    await newPackage.save();

    // Update order with packageId
    await Order.findByIdAndUpdate(order._id, {
      packageId: newPackage.packageId
    });

    // Call external shipping company API if endpoint URL is configured
    if (externalCompany.apiEndpointUrl && externalCompany.apiToken) {
      try {
        const apiResponse = await callExternalShippingCompanyAPI(
          externalCompany.apiEndpointUrl,
          externalCompany.apiToken,
          {
            to_name: shippingAddress.fullName || 'غير محدد',
            to_phone: shippingAddress.phone || '',
            alter_phone: shippingAddress.phone || '',
            description: description,
            package_type: packageType,
            village_id: shippingAddress.villageId.toString(),
            street: shippingAddress.street || '',
            total_cost: (order.total || 0).toString(),
            note: order.deliveryNotes || shippingAddress.notes || `طلب رقم ${orderNumber}`,
            barcode: barcode
          }
        );

        if (apiResponse.success) {
          logger.business('✅ ORDER SENT TO SHIPPING COMPANY API - Package sent successfully via external API', {
            orderId: order._id.toString(),
            orderNumber: orderNumber,
            packageId: newPackage.packageId,
            externalPackageId: apiResponse.packageId,
            externalCompanyId: externalCompanyId.toString(),
        externalCompanyName: externalCompany.companyName,
        apiEndpoint: externalCompany.apiEndpointUrl,
        barcode: barcode,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.warn('⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY API - API call failed', {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        packageId: newPackage.packageId,
        externalCompanyName: externalCompany.companyName,
        apiEndpoint: externalCompany.apiEndpointUrl,
            error: apiResponse.error,
            timestamp: new Date().toISOString(),
            note: 'Package was created in database but API call to shipping company failed'
          });
        }
      } catch (error) {
        logger.error('Error calling external shipping company API', error, {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          packageId: newPackage.packageId,
          externalCompanyName: externalCompany.companyName,
          apiEndpoint: externalCompany.apiEndpointUrl
        });
        // Continue even if API call fails - package is already created in database
      }
    } else {
      // No API endpoint configured - just log package creation in database
      logger.business('✅ ORDER SENT TO SHIPPING COMPANY - Package created in database (no external API configured)', {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        packageId: newPackage.packageId,
        externalCompanyId: externalCompanyId.toString(),
        externalCompanyName: externalCompany.companyName,
        barcode: barcode,
        villageId: shippingAddress.villageId,
        villageName: (village as any).villageName || 'غير محدد',
        toName: shippingAddress.fullName,
        toPhone: shippingAddress.phone,
        totalCost: order.total || 0,
        status: 'pending',
        timestamp: new Date().toISOString(),
        note: 'Package created in database. To send to external API, configure apiEndpointUrl and apiToken in ExternalCompany.'
      });
    }

    logger.info('✅ Package created successfully and sent to shipping company', {
      orderId: order._id.toString(),
      orderNumber: orderNumber,
      packageId: newPackage.packageId,
      companyName: externalCompany.companyName,
      barcode: barcode
    });

    return newPackage.packageId;
  } catch (error) {
    logger.error('Error creating package from order', error, {
      orderId: orderId
    });
    return null;
  }
}

/**
 * Check if order should automatically create a package
 * Returns true if:
 * - Order status is ready_for_shipping OR
 * - System setting createPackageOnOrderCreate is true (for immediate creation)
 * - Order has valid shipping address with villageId
 * - No package exists yet for this order
 */
export async function shouldCreatePackageForOrder(orderId: string, checkImmediate: boolean = false): Promise<boolean> {
  try {
    await connectDB();

    const order = await Order.findById(orderId).lean() as any;
    if (!order) return false;

    // Check if package already exists
    const existingPackage = await Package.findOne({ orderId: order._id }).lean() as any;
    if (existingPackage) {
      return false;
    }

    // Check if order has valid shipping address
    const shippingAddress = order.shippingAddress;
    if (!shippingAddress || !shippingAddress.villageId) {
      return false;
    }

    // If checking for immediate creation (on order create)
    if (checkImmediate) {
      const settings = await SystemSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
      const autoCreate = settings?.autoCreatePackages !== false || 
                        settings?.createPackageOnOrderCreate !== false;
      if (!autoCreate) {
        return false;
      }
    } else {
      // Check if order is ready for shipping (for status change)
      if (order.status !== 'ready_for_shipping') {
        return false;
      }
    }

    // Check if external company is configured
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
    if (settings && settings.defaultExternalCompanyId) {
      return true;
    }

    // Check if any external company exists
    const ExternalCompany = (await import('@/models/ExternalCompany')).default;
    const companyExists = await ExternalCompany.findOne({ isActive: true }).lean() as any;
    return !!companyExists;
  } catch (error) {
    logger.error('Error checking if should create package for order', error, {
      orderId: orderId
    });
    return false;
  }
}

