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
export async function callExternalShippingCompanyAPI(
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
    qr_code2?: string;
  }
): Promise<{ 
  success: boolean; 
  packageId?: number; 
  deliveryCost?: number;
  qrCode?: string;
  error?: string;
  errors?: any;
}> {
  try {
    // Handle token with or without "Bearer" prefix (same as test script)
    const token = apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`;
    
    // Log request details (for debugging - matches test script format)
    logger.info('📤 Sending request to shipping company API', {
      url: apiEndpointUrl,
      method: 'POST',
      tokenPrefix: token.substring(0, 20) + '...',
      packageData: packageData
    });
    
    const response = await fetch(apiEndpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(packageData)
    });

    // Get response text first to handle both JSON and HTML responses
    const responseText = await response.text();
    let responseData: any;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If response is not JSON (e.g., HTML error page like 503 Service Unavailable)
      logger.warn('⚠️ API returned non-JSON response (likely HTML error page)', {
        status: response.status,
        statusText: response.statusText,
        responsePreview: responseText.substring(0, 200),
        apiEndpoint: apiEndpointUrl,
        note: 'API server may be temporarily unavailable'
      });
      
      // Provide more user-friendly error messages based on status code
      let errorMessage = `API returned non-JSON response: ${response.status} ${response.statusText}`;
      
      if (response.status === 503) {
        errorMessage = 'خادم شركة الشحن غير متاح مؤقتاً (503 Service Unavailable). يرجى المحاولة مرة أخرى لاحقاً.';
      } else if (response.status === 502) {
        errorMessage = 'خطأ في بوابة شركة الشحن (502 Bad Gateway). يرجى المحاولة مرة أخرى لاحقاً.';
      } else if (response.status === 504) {
        errorMessage = 'انتهت مهلة الاتصال بشركة الشحن (504 Gateway Timeout). يرجى المحاولة مرة أخرى.';
      } else if (response.status >= 500) {
        errorMessage = `خطأ في خادم شركة الشحن (${response.status}). يرجى المحاولة مرة أخرى لاحقاً.`;
      }
      
          return {
            success: false,
            error: errorMessage
          };
    }
    
    // Log response details (for debugging - matches test script format)
    logger.info('📥 Response from shipping company API', {
      status: `${response.status} ${response.statusText}`,
      responseData: responseData
    });

    // Check both code and state (based on test results: API returns code 200 even for validation errors)
    if (response.ok && responseData.code === 200 && responseData.state === 'success') {
      // Success - extract all relevant data
      const packageId = responseData.data?.package_id;
      const deliveryCost = responseData.data?.delivery_cost;
      const qrCode = responseData.data?.qr_code;
      
      logger.info('✅ Package created successfully via external API', {
        packageId: packageId,
        deliveryCost: deliveryCost,
        qrCode: qrCode,
        apiEndpoint: apiEndpointUrl
      });
      
      return {
        success: true,
        packageId: packageId,
        deliveryCost: deliveryCost,
        qrCode: qrCode
      };
    } else {
      // Handle error response (code 302 for validation errors, or other error codes)
      const errors = responseData.errors || responseData.data || {};
      const errorMessages: string[] = [];
      
      // Extract error messages from errors object
      if (typeof errors === 'object' && !Array.isArray(errors)) {
        Object.entries(errors).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg: string) => errorMessages.push(`${field}: ${msg}`));
          } else if (typeof messages === 'string') {
            errorMessages.push(`${field}: ${messages}`);
          }
        });
      }
      
      const errorMessage = errorMessages.length > 0 
        ? errorMessages.join('; ')
        : responseData.message || 
          `API returned code ${responseData.code || response.status} with state ${responseData.state || 'unknown'}`;
      
      logger.warn('⚠️ External shipping company API returned error', {
        status: response.status,
        code: responseData.code,
        state: responseData.state,
        errors: errors,
        errorMessage: errorMessage,
        apiEndpoint: apiEndpointUrl
      });

      return {
        success: false,
        error: errorMessage,
        errors: errors
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
 * @returns Object with packageId and apiSuccess status, or null if failed
 */
export interface CreatePackageResult {
  packageId: number;
  apiSuccess: boolean; // true if successfully sent to shipping company API, false if API call failed
  error?: string;
}

export async function createPackageFromOrder(orderId: string): Promise<CreatePackageResult | null> {
  try {
    await connectDB();

    // Get order from database (using .lean() to get plain object)
    const order = await Order.findById(orderId).lean() as any;
    if (!order) {
      logger.warn('Order not found for package creation', { orderId });
      return null;
    }
    
    // Log order data for debugging
    logger.info('📦 Creating package from order', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      shippingCompany: order.shippingCompany || 'NOT SET',
      shippingAddress: {
        villageId: order.shippingAddress?.villageId || 'NOT SET',
        villageName: order.shippingAddress?.villageName || 'NOT SET',
        city: order.shippingAddress?.city || 'NOT SET',
        fullName: order.shippingAddress?.fullName || 'NOT SET',
        phone: order.shippingAddress?.phone || 'NOT SET',
        street: order.shippingAddress?.street || 'NOT SET'
      }
    });

    // Check if package already exists for this order
    const existingPackage = await Package.findOne({ orderId: order._id }).lean() as any;
    if (existingPackage) {
      // If package exists but packageId is not generated yet, reload it
      if (!existingPackage.packageId) {
        logger.warn('Package exists but packageId is not generated, reloading...', {
          packageId: existingPackage._id.toString(),
          orderId: order._id.toString()
        });
        const reloadedPackage = await Package.findById(existingPackage._id);
        if (reloadedPackage && reloadedPackage.packageId) {
          logger.info('Package reloaded, packageId found', {
            orderId: order._id.toString(),
            packageId: reloadedPackage.packageId
          });
          return reloadedPackage.packageId;
        }
      }
      
      logger.info('Package already exists for order', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        packageId: existingPackage.packageId
      });
      
      // Ensure packageId is a Number, not ObjectId string
      if (existingPackage.packageId && typeof existingPackage.packageId === 'number') {
        return existingPackage.packageId;
      }
      
      // If packageId is missing or invalid, delete the old package and create a new one
      logger.warn('Package exists but packageId is invalid or missing, will delete and recreate', {
        orderId: order._id.toString(),
        packageId: existingPackage.packageId,
        packageIdType: typeof existingPackage.packageId,
        packageMongoId: existingPackage._id.toString()
      });
      
      // Delete the invalid package
      await Package.findByIdAndDelete(existingPackage._id);
      logger.info('Deleted invalid package, will create new one', {
        orderId: order._id.toString(),
        deletedPackageId: existingPackage._id.toString()
      });
      
      // Continue to create new package below
    }

    // Get external company from order's shippingCompany if specified, otherwise use default
    let externalCompanyId = null;
    let externalCompany = null;

    // First, try to find company by order.shippingCompany (if specified)
    if (order.shippingCompany) {
      logger.info('🔍 Looking for shipping company by name', {
        orderShippingCompany: order.shippingCompany,
        orderId: order._id.toString()
      });
      
      externalCompany = await ExternalCompany.findOne({ 
        companyName: order.shippingCompany,
        isActive: true 
      }).lean() as any;
      
      if (externalCompany) {
        externalCompanyId = externalCompany._id;
        logger.info('✅ Found shipping company specified in order', {
          companyId: externalCompanyId.toString(),
          companyName: externalCompany.companyName,
          orderId: order._id.toString(),
          orderShippingCompany: order.shippingCompany,
          hasApiEndpoint: !!externalCompany.apiEndpointUrl,
          hasApiToken: !!externalCompany.apiToken,
          apiEndpoint: externalCompany.apiEndpointUrl || 'NOT SET'
        });
      } else {
        logger.warn('⚠️ Order specifies shipping company but it was not found or is inactive', {
          orderId: order._id.toString(),
          orderShippingCompany: order.shippingCompany,
          note: 'Falling back to default external company'
        });
      }
    } else {
      logger.warn('⚠️ Order does not have shippingCompany set', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        note: 'Will use default external company'
      });
    }

    // If no company found from order, use default from system settings
    if (!externalCompanyId) {
      const settings = await SystemSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
      
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
    }

    // Verify external company exists and is active (if not already loaded)
    if (!externalCompany) {
      externalCompany = await ExternalCompany.findById(externalCompanyId).lean() as any;
    }
    
    if (!externalCompany || !externalCompany.isActive) {
      logger.error('External company not found or inactive', {
        externalCompanyId: externalCompanyId?.toString(),
        orderId: order._id.toString()
      });
      return null;
    }

    // Verify external company has API integration configured
    if (!externalCompany.apiEndpointUrl || !externalCompany.apiToken) {
      logger.warn('External company does not have API integration configured', {
        companyId: externalCompanyId?.toString(),
        companyName: externalCompany.companyName,
        orderId: order._id.toString(),
        hasApiEndpoint: !!externalCompany.apiEndpointUrl,
        hasApiToken: !!externalCompany.apiToken,
        note: 'Package will be created in database only, not sent to external API'
      });
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
      logger.error('❌ Order missing villageId in shipping address', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        shippingAddress: {
          manualVillageName: shippingAddress.manualVillageName,
          villageId: shippingAddress.villageId,
          villageName: shippingAddress.villageName,
          city: shippingAddress.city
        },
        note: 'Marketer must select governorate and village when creating order'
      });
      return null;
    }
    
    logger.info('✅ Order has valid villageId', {
      orderId: order._id.toString(),
      villageId: shippingAddress.villageId,
      villageName: shippingAddress.villageName || 'NOT SET'
    });

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

    // Get order number
    const orderNumber = (order as any).orderNumber || `ORD-${order._id.toString().slice(-8)}`;
    
    // Barcode: رقم الطلب فقط لظهوره تحت الشريط في موقع شركة الشحن (كما في نموذجهم)
    const barcode = String(orderNumber);

    // Create package description from order items
    const items = order.items || [];
    const itemDescriptions = items.map((item: any) => 
      `${item.productName || 'منتج'} x${item.quantity || 1}`
    ).join(', ');
    const description = itemDescriptions || 'محتويات الطرد';

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

    // Reload package to get the generated packageId (from pre-save middleware)
    const savedPackage = await Package.findById(newPackage._id);
    if (!savedPackage || !savedPackage.packageId) {
      logger.error('Package created but packageId was not generated', {
        packageId: newPackage._id.toString(),
        orderId: order._id.toString()
      });
      return null;
    }

    const packageIdNumber = savedPackage.packageId; // This is a Number

    // Update order with packageId (must be Number, not ObjectId)
    await Order.findByIdAndUpdate(order._id, {
      packageId: packageIdNumber
    });

    // Track API success status
    let apiSuccess = false;
    let apiError: string | undefined = undefined;

    // Call external shipping company API if endpoint URL is configured
    // NOTE: apiEndpointUrl should match the test script URL: 'https://ultra-pal.com/api/external_company/create-package'
    if (externalCompany.apiEndpointUrl && externalCompany.apiToken) {
      try {
        // Log API endpoint being used (should match API documentation)
        // Note: The correct URL is https://ultra-pal.com (not .net)
        logger.info('🔗 Using shipping company API endpoint', {
          apiEndpoint: externalCompany.apiEndpointUrl,
          companyName: externalCompany.companyName,
          note: 'If getting 503 errors, verify the correct API endpoint URL with the shipping company'
        });
        
        // Prepare package data exactly as in test script
        const packageData = {
          to_name: shippingAddress.fullName || 'غير محدد',
          to_phone: shippingAddress.phone || '',
          alter_phone: shippingAddress.phone || '',
          description: description,
          package_type: packageType,
          village_id: shippingAddress.villageId.toString(), // Must be string
          street: shippingAddress.street || '',
          total_cost: (order.total || 0).toString(), // Must be string
          note: order.deliveryNotes || shippingAddress.notes || `طلب رقم ${orderNumber}`,
          barcode: barcode,
          qr_code2: orderNumber
        };
        
        // Log package data being sent (for debugging)
        logger.info('📤 Sending package to shipping company API', {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          apiEndpoint: externalCompany.apiEndpointUrl,
          packageData: packageData,
          companyName: externalCompany.companyName
        });
        
        // Retry mechanism: try up to 3 times with exponential backoff
        const maxRetries = 3;
        let apiResponse: any = null;
        let lastError: string | undefined = undefined;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            apiResponse = await callExternalShippingCompanyAPI(
              externalCompany.apiEndpointUrl,
              externalCompany.apiToken,
              packageData
            );
            
            // If successful, break out of retry loop
            if (apiResponse.success && apiResponse.packageId) {
              if (attempt > 1) {
                logger.info(`✅ Package sent successfully on retry attempt ${attempt}`, {
                  orderId: order._id.toString(),
                  orderNumber: orderNumber,
                  packageId: packageIdNumber,
                  attempt: attempt
                });
              }
              break;
            } else {
              lastError = apiResponse.error;
              
              // Check if error is retryable (server errors like 503, 502, 504)
              const isRetryable = apiResponse.error && (
                apiResponse.error.includes('503') ||
                apiResponse.error.includes('502') ||
                apiResponse.error.includes('504') ||
                apiResponse.error.includes('Service Unavailable') ||
                apiResponse.error.includes('Gateway') ||
                apiResponse.error.includes('Timeout')
              );
              
              if (!isRetryable || attempt === maxRetries) {
                // Non-retryable error or last attempt - break
                break;
              }
              
              // Wait before retry (exponential backoff: 1s, 2s, 4s)
              const delayMs = Math.pow(2, attempt - 1) * 1000;
              logger.warn(`⚠️ API call failed, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`, {
                orderId: order._id.toString(),
                orderNumber: orderNumber,
                attempt: attempt,
                maxRetries: maxRetries,
                error: apiResponse.error,
                delayMs: delayMs
              });
              
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
            
            // Check if error is retryable
            const isRetryable = lastError.includes('503') ||
              lastError.includes('502') ||
              lastError.includes('504') ||
              lastError.includes('ECONNREFUSED') ||
              lastError.includes('ETIMEDOUT');
            
            if (!isRetryable || attempt === maxRetries) {
              // Non-retryable error or last attempt
              throw error;
            }
            
            // Wait before retry (exponential backoff)
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            logger.warn(`⚠️ API call exception, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`, {
              orderId: order._id.toString(),
              orderNumber: orderNumber,
              attempt: attempt,
              maxRetries: maxRetries,
              error: lastError,
              delayMs: delayMs
            });
            
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
        
        // Use the last response (or null if all retries failed)
        if (!apiResponse) {
          apiResponse = {
            success: false,
            error: lastError || 'فشل إرسال الطرد بعد عدة محاولات'
          };
        }

        if (apiResponse.success && apiResponse.packageId) {
          // Update package status to 'confirmed' when successfully sent to API
          // Also update with delivery cost, QR code, and external package ID if provided by API
          const updateData: any = {
            status: 'confirmed'
          };
          
          // Store external package ID from API response (package_id from shipping company)
          if (apiResponse.packageId) {
            updateData.externalPackageId = apiResponse.packageId;
            logger.info('Storing externalPackageId from API response', {
              externalPackageId: apiResponse.packageId,
              packageId: packageIdNumber,
              orderId: order._id.toString()
            });
          }
          
          // Update delivery cost if API returned a different value
          if (apiResponse.deliveryCost !== undefined) {
            updateData.deliveryCost = apiResponse.deliveryCost;
            logger.info('Storing deliveryCost from API response', {
              deliveryCost: apiResponse.deliveryCost,
              packageId: packageIdNumber,
              orderId: order._id.toString()
            });
          }
          
          // Store QR code if provided
          if (apiResponse.qrCode) {
            updateData.qrCode = apiResponse.qrCode;
            logger.info('Storing qrCode from API response', {
              qrCode: apiResponse.qrCode,
              packageId: packageIdNumber,
              orderId: order._id.toString()
            });
          }
          
          logger.info('Updating package with API response data', {
            packageId: packageIdNumber,
            updateData: updateData,
            orderId: order._id.toString()
          });
          
          await Package.findByIdAndUpdate(savedPackage._id, updateData);
          
          // Verify the update
          const updatedPackage = await Package.findById(savedPackage._id).lean() as any;
          logger.info('Package updated - verification', {
            packageId: packageIdNumber,
            externalPackageId: updatedPackage?.externalPackageId,
            deliveryCost: updatedPackage?.deliveryCost,
            qrCode: updatedPackage?.qrCode,
            orderId: order._id.toString()
          });
          
          apiSuccess = true;
          
          logger.business('✅ ORDER SENT TO SHIPPING COMPANY API - Package sent successfully via external API', {
            orderId: order._id.toString(),
            orderNumber: orderNumber,
            packageId: packageIdNumber,
            externalPackageId: apiResponse.packageId,
            deliveryCost: apiResponse.deliveryCost,
            qrCode: apiResponse.qrCode,
            externalCompanyId: externalCompanyId.toString(),
            externalCompanyName: externalCompany.companyName,
            apiEndpoint: externalCompany.apiEndpointUrl,
            barcode: barcode,
            timestamp: new Date().toISOString()
          });
        } else {
          // Keep package status as 'pending' when API call fails (so we can retry later)
          // Package status remains 'pending' - indicating it hasn't been sent to shipping company yet
          apiSuccess = false;
          apiError = apiResponse.error || 'فشل إرسال الطرد إلى شركة الشحن';
          
          logger.warn('⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY API - API call failed', {
            orderId: order._id.toString(),
            orderNumber: orderNumber,
            packageId: packageIdNumber,
            externalCompanyName: externalCompany.companyName,
            apiEndpoint: externalCompany.apiEndpointUrl,
            error: apiResponse.error,
            errors: apiResponse.errors,
            timestamp: new Date().toISOString(),
            note: 'Package was created in database but API call to shipping company failed. Package status is "pending" - can be resent when API is available.'
          });
        }
      } catch (error) {
        apiSuccess = false;
        apiError = error instanceof Error ? error.message : 'خطأ غير معروف في إرسال الطرد';
        
        logger.error('Error calling external shipping company API', error, {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          packageId: packageIdNumber,
          externalCompanyName: externalCompany.companyName,
          apiEndpoint: externalCompany.apiEndpointUrl
        });
        // Continue even if API call fails - package is already created in database
      }
    } else {
      // No API endpoint configured - package created in database only
      // Consider this as success since there's no API to send to
      apiSuccess = true; // No API configured means no failure
      
      logger.business('✅ ORDER SENT TO SHIPPING COMPANY - Package created in database (no external API configured)', {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        packageId: packageIdNumber,
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

    logger.info('✅ Package created successfully', {
      orderId: order._id.toString(),
      orderNumber: orderNumber,
      packageId: packageIdNumber,
      companyName: externalCompany.companyName,
      barcode: barcode,
      apiSuccess: apiSuccess
    });

    return {
      packageId: packageIdNumber,
      apiSuccess: apiSuccess,
      error: apiError
    };
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

