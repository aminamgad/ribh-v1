import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/search - Advanced product search
async function searchProducts(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category'); // can be comma-separated IDs
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build search query
    let searchQuery: any = {
      isActive: true
    };
    
    // Role-based filtering
    if (user.role === 'supplier') {
      // CRITICAL: Ensure supplierId is set and matches user._id exactly
      // Use simple equality check - MongoDB will handle null/undefined automatically
      searchQuery.supplierId = user._id;
      // Suppliers can see their own products regardless of approval status
      logger.debug('Supplier search filter applied', { 
        userId: user._id.toString(), 
        userEmail: user.email,
        querySupplierId: user._id.toString()
      });
    } else if (user.role === 'marketer' || user.role === 'wholesaler') {
      // Marketers and wholesalers only see approved products
      searchQuery.isApproved = true;
      searchQuery.$or = [
        { isRejected: false },
        { isRejected: { $exists: false } }
      ];
      // Exclude locked products for marketers and wholesalers
      searchQuery.isLocked = { $ne: true };
    } else if (user.role === 'admin') {
      // Admins can see all products
      // No additional filters needed
    }
    
    // Text search
    let textSearchConditions = [];
    if (query) {
      textSearchConditions.push(
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } }
      );
    }
    
    // Combine text search with existing $or conditions
    if (textSearchConditions.length > 0) {
      if (searchQuery.$or) {
        // If there's already an $or condition (from role-based filtering), we need to use $and
        searchQuery.$and = [
          { $or: searchQuery.$or },
          { $or: textSearchConditions }
        ];
        delete searchQuery.$or;
      } else {
        searchQuery.$or = textSearchConditions;
      }
    }
    
    // Category filter (supports multi-select; includes subcategories for each selected category)
    if (categoryParam) {
      const selectedCategoryIds = categoryParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (selectedCategoryIds.length > 0) {
        const categories = await Category.find({ _id: { $in: selectedCategoryIds } }).select('_id');
        if (categories.length > 0) {
          const subcategories = await Category.find({
            $or: [
              { _id: { $in: selectedCategoryIds } },
              { parentId: { $in: selectedCategoryIds } }
            ]
          }).select('_id');
          const categoryIds = subcategories.map((c: any) => c._id);
          searchQuery.categoryId = { $in: categoryIds };
        }
      }
    }
    
    // Price range filter
    const priceField = user.role === 'wholesaler' ? 'wholesalePrice' : 'marketerPrice';
    if (minPrice || maxPrice) {
      searchQuery[priceField] = {};
      if (minPrice) searchQuery[priceField].$gte = parseFloat(minPrice);
      if (maxPrice) searchQuery[priceField].$lte = parseFloat(maxPrice);
    }
    
    // Sort options
    let sortOptions: any = {};
    switch (sortBy) {
      case 'price':
        sortOptions[priceField] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'name':
        sortOptions.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'stock':
        sortOptions.stockQuantity = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'createdAt':
      default:
        sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
    }
    
    const skip = (page - 1) * limit;
    
    logger.apiRequest('GET', '/api/search', { userId: user._id, role: user.role, userEmail: user.email });
    logger.debug('Search query', { query, category: categoryParam, hasPriceRange: !!(minPrice || maxPrice) });
    
    // Execute search
    const [products, total] = await Promise.all([
      Product.find(searchQuery)
        .populate('categoryId', 'name nameEn')
        .populate('supplierId', 'name companyName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(searchQuery)
    ]);
    
    // CRITICAL: Additional server-side validation for suppliers
    // Filter out any products that don't belong to the supplier (defensive check)
    let filteredProducts = products;
    if (user.role === 'supplier') {
      filteredProducts = products.filter((product: any) => {
        const productSupplierId = product.supplierId?._id?.toString() || product.supplierId?.toString() || product.supplierId;
        const userSupplierId = user._id.toString();
        const matches = productSupplierId === userSupplierId;
        if (!matches) {
          logger.warn('Product filtered out in search - supplier mismatch', {
            productId: product._id,
            productName: product.name,
            productSupplierId: productSupplierId,
            userSupplierId: userSupplierId,
            userEmail: user.email
          });
        }
        return matches;
      });
      
      // Log filtered results for debugging
      logger.debug('Supplier products filtered in search', {
        userId: user._id.toString(),
        userEmail: user.email,
        originalCount: products.length,
        filteredCount: filteredProducts.length,
        filteredProductIds: filteredProducts.map((p: any) => p._id)
      });
    }
    
    // Get aggregated data for filters
    const aggregations = await Product.aggregate([
      { $match: searchQuery },
      {
        $group: {
          _id: null,
          minPrice: { $min: `$${priceField}` },
          maxPrice: { $max: `$${priceField}` },
          categories: { $addToSet: '$categoryId' }
        }
      }
    ]);
    
    const filterData = aggregations[0] || {
      minPrice: 0,
      maxPrice: 0,
      categories: []
    };
    
    // Get category details
    const categoryDetails = await Category.find({
      _id: { $in: filterData.categories }
    }).select('name nameEn');
    
    return NextResponse.json({
      success: true,
      products: filteredProducts.map((product: any) => ({
        _id: product._id,
        name: product.name,
        description: product.description,
        images: product.images,
        marketerPrice: product.marketerPrice,
        wholesalePrice: product.wholesalePrice,
        stockQuantity: product.stockQuantity,
        categoryName: product.categoryId?.name,
        sku: product.sku,
        rating: product.rating,
        sales: product.sales
      })),
      pagination: {
        page,
        limit,
        total: user.role === 'supplier' ? filteredProducts.length : total,
        pages: Math.ceil((user.role === 'supplier' ? filteredProducts.length : total) / limit)
      },
      filters: {
        priceRange: {
          min: filterData.minPrice,
          max: filterData.maxPrice
        },
        categories: categoryDetails.map(cat => ({
          _id: cat._id,
          name: cat.name,
          nameEn: cat.nameEn
        }))
      }
    });
    
    logger.apiResponse('GET', '/api/search', 200);
  } catch (error) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    logger.error('Error searching products', error, { userId: user._id, query });
    return handleApiError(error, 'حدث خطأ أثناء البحث');
  }
}

export const GET = withAuth(searchProducts); 