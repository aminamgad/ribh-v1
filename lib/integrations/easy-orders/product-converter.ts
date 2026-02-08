import Product from '@/models/Product';
import Category from '@/models/Category';
import { Product as ProductType } from '@/types';
import { easyOrdersCache, generateCacheKey } from '@/lib/cache';

const EASY_ORDERS_API_BASE = 'https://api.easy-orders.net/api/v1/external-apps';

/**
 * Convert product name to URL-friendly slug (English)
 */
function generateSlug(name: string): string {
  // Remove Arabic characters and convert to English-friendly slug
  // For now, use a simple transliteration or hash-based approach
  // In production, you might want to use a proper transliteration library
  
  // Simple approach: use product ID or SKU as base, or transliterate
  // For MVP, we'll create a basic slug
  const transliterated = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  // If transliteration fails, use a hash-based approach
  if (!transliterated || transliterated.length < 3) {
    // Use a hash of the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `product-${Math.abs(hash).toString(36)}`;
  }
  
  return transliterated;
}

/**
 * Convert Ribh product variant to EasyOrders variation type
 */
function getVariationType(variantName: string): 'dropdown' | 'buttons' | 'color' {
  const name = variantName.toLowerCase();
  
  // Check if it's a color variant
  if (name.includes('لون') || name.includes('color') || name.includes('colour')) {
    return 'color';
  }
  
  // Default to dropdown for most cases
  // Can be changed to 'buttons' if needed
  return 'dropdown';
}

/**
 * Convert Ribh product to EasyOrders format
 */
export async function convertProductToEasyOrders(
  product: any,
  integration: any,
  options: {
    includeVariations?: boolean;
    categoryMapping?: Map<string, string>; // Map Ribh category IDs to EasyOrders category IDs
  } = {}
): Promise<any> {
  const {
    includeVariations = true,
    categoryMapping = new Map()
  } = options;

  // Generate slug
  const slug = generateSlug(product.name);

  // Get category IDs
  const categories: { id: string }[] = [];
  if (product.categoryId) {
    const easyOrdersCategoryId = categoryMapping.get(product.categoryId.toString());
    if (easyOrdersCategoryId) {
      categories.push({ id: easyOrdersCategoryId });
    }
  }

  // Calculate prices
  // EasyOrders requires supplierPrice, so use it if available, otherwise use marketerPrice
  // But we should validate supplierPrice before calling this function
  const price = product.supplierPrice || product.marketerPrice || 0;
  const salePrice = 0; // Can be calculated based on business logic

  // Build description (combine description and marketingText)
  const description = [
    product.description || '',
    product.marketingText || ''
  ].filter(Boolean).join('<br><br>');

  // Prepare images
  // EasyOrders requires at least one image
  const images = Array.isArray(product.images) ? product.images : [];
  if (images.length === 0) {
    throw new Error('يجب أن يحتوي المنتج على صورة واحدة على الأقل');
  }
  if (images.length > 10) {
    throw new Error('يجب ألا يزيد عدد الصور عن 10 صور');
  }
  const thumb = images[0] || '';

  // Build EasyOrders product payload
  const easyOrdersProduct: any = {
    name: product.name,
    price: price,
    sale_price: salePrice,
    description: description || `<p>${product.name}</p>`,
    slug: slug,
    sku: product.sku || `RIBH-${product._id}`,
    thumb: thumb,
    images: images,
    categories: categories,
    quantity: product.stockQuantity || 0,
    track_stock: true,
    disable_orders_for_no_stock: product.stockQuantity === 0,
    buy_now_text: 'اضغط هنا للشراء',
    is_reviews_enabled: true,
    fake_visitors_min: 20,
    fake_visitors_max: 70,
    fake_timer_hours: 1,
    is_quantity_hidden: false,
    is_header_hidden: false,
    is_free_shipping: false,
    taager_code: product.sku || `RIBH-${product._id}`,
    drop_shipping_provider: 'ribh'
  };

  // Handle variations and variants if product has them
  if (includeVariations && product.hasVariants && product.variants && product.variants.length > 0) {
    const variations: any[] = [];
    const variants: any[] = [];

    // Convert Ribh variants to EasyOrders variations
    for (const variant of product.variants) {
      const variationType = getVariationType(variant.name);
      
      const props = (variant.values || []).map((value: string, index: number) => {
        const valueDetail = variant.valueDetails?.[index] || {};
        return {
          id: `${variant._id}-${index}`, // Generate unique ID
          name: value,
          variation_id: variant._id,
          value: value
        };
      });

      variations.push({
        id: variant._id,
        name: variant.name,
        product_id: product._id.toString(),
        type: variationType,
        props: props
      });
    }

    // Generate all variant combinations
    if (product.variantOptions && product.variantOptions.length > 0) {
      // Group variant options by their variant combinations
      const variantGroups = new Map<string, any[]>();
      
      for (const option of product.variantOptions) {
        const key = `${option.variantId}-${option.value}`;
        if (!variantGroups.has(key)) {
          variantGroups.set(key, []);
        }
        variantGroups.get(key)!.push(option);
      }

      // Create variants for each combination
      // For simplicity, create one variant per variantOption
      for (const option of product.variantOptions) {
        // Find the variation name for this variantId
        const variation = product.variants.find((v: any) => v._id === option.variantId);
        if (!variation) continue;

        // Build variation_props
        const variationProps = [{
          variation: variation.name,
          variation_prop: option.value
        }];

        // If there are multiple variants, we need to create combinations
        // For now, create one variant per option
        variants.push({
          id: option.variantId || `${product._id}-${option.value}`,
          price: option.price || price,
          sale_price: 0,
          quantity: option.stockQuantity || 0,
          taager_code: option.sku || `${product.sku || `RIBH-${product._id}`}-${option.value}`,
          variation_props: variationProps
        });
      }

      // If no variantOptions but has variants, create default variants
      if (variants.length === 0 && variations.length > 0) {
        // Create a simple variant for each variation value
        for (const variation of variations) {
          for (const prop of variation.props) {
            variants.push({
              id: `${variation.id}-${prop.value}`,
              price: price,
              sale_price: 0,
              quantity: product.stockQuantity || 0,
              taager_code: `${product.sku || `RIBH-${product._id}`}-${prop.value}`,
              variation_props: [{
                variation: variation.name,
                variation_prop: prop.value
              }]
            });
          }
        }
      }
    }

    if (variations.length > 0) {
      easyOrdersProduct.variations = variations;
    }
    
    if (variants.length > 0) {
      easyOrdersProduct.variants = variants;
    }
  }

  return easyOrdersProduct;
}

/**
 * Send product to EasyOrders API with retry and error handling
 */
export async function sendProductToEasyOrders(
  productData: any,
  apiKey: string,
  productId?: string, // For updates
  retries: number = 3,
  useCache: boolean = false // For GET requests only
): Promise<{ success: boolean; productId?: string; error?: string; statusCode?: number }> {
  // For GET requests, check cache first
  if (useCache && productId) {
    const cacheKey = generateCacheKey('easyorders', 'product', productId);
    const cached = easyOrdersCache.get<any>(cacheKey);
    if (cached) {
      return {
        success: true,
        productId: cached.id || productId,
        statusCode: 200
      };
    }
  }

  let lastError: any = null;
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = productId 
        ? `${EASY_ORDERS_API_BASE}/products/${productId}`
        : `${EASY_ORDERS_API_BASE}/products`;
      
      const method = productId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      lastStatusCode = response.status;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '';
        
        // Handle specific error cases
        if (response.status === 429) {
          // Rate limit exceeded
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 2000;
          
          if (attempt < retries - 1) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          }
          
          errorMessage = 'تم تجاوز الحد الأقصى للطلبات (40 طلب/دقيقة). يرجى المحاولة بعد قليل.';
        } else if (response.status === 401) {
          errorMessage = 'مفتاح API غير صالح أو منتهي الصلاحية';
        } else if (response.status === 403) {
          errorMessage = 'ليس لديك صلاحية لتنفيذ هذه العملية';
        } else if (response.status === 404 && productId) {
          errorMessage = 'المنتج غير موجود في EasyOrders';
        } else if (response.status === 400) {
          // Try to parse validation errors
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || 'بيانات غير صالحة';
          } catch {
            errorMessage = `بيانات غير صالحة: ${errorText.substring(0, 200)}`;
          }
        } else {
          errorMessage = `فشل في ${productId ? 'تحديث' : 'إنشاء'} المنتج: ${response.status}`;
          if (errorText) {
            errorMessage += ` - ${errorText.substring(0, 200)}`;
          }
        }

        lastError = { message: errorMessage, status: response.status };
        
        // Don't retry for client errors (4xx) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
        
        // Retry for server errors (5xx) or rate limit
        if (attempt < retries - 1 && (response.status >= 500 || response.status === 429)) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        return {
          success: false,
          error: errorMessage,
          statusCode: response.status
        };
      }

      const result = await response.json();
      
      // Cache successful GET responses
      if (useCache && productId && response.status === 200) {
        const cacheKey = generateCacheKey('easyorders', 'product', productId);
        easyOrdersCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes
      }
      
      return {
        success: true,
        productId: result.id || productId,
        statusCode: response.status
      };
      
    } catch (error: any) {
      lastError = error;
      
      // Retry on network errors
      if (attempt < retries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'حدث خطأ في الاتصال بـ EasyOrders',
    statusCode: lastStatusCode
  };
}

