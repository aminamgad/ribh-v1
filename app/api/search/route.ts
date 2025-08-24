import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import Category from '@/models/Category';

// GET /api/search - Advanced product search
async function searchProducts(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock') === 'true';
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
      searchQuery.supplierId = user._id;
      // Suppliers can see their own products regardless of approval status
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
    
    // Category filter
    if (categoryId) {
      // Include subcategories
      const category = await Category.findById(categoryId);
      if (category) {
        const subcategories = await Category.find({
          $or: [
            { _id: categoryId },
            { parentId: categoryId }
          ]
        });
        const categoryIds = subcategories.map(c => c._id);
        searchQuery.categoryId = { $in: categoryIds };
      }
    }
    
    // Price range filter
    const priceField = user.role === 'wholesaler' ? 'wholesalePrice' : 'marketerPrice';
    if (minPrice || maxPrice) {
      searchQuery[priceField] = {};
      if (minPrice) searchQuery[priceField].$gte = parseFloat(minPrice);
      if (maxPrice) searchQuery[priceField].$lte = parseFloat(maxPrice);
    }
    
    // Stock filter
    if (inStock) {
      searchQuery.stockQuantity = { $gt: 0 };
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
    
    console.log('🔍 Search API - Final query:', JSON.stringify(searchQuery, null, 2));
    console.log('👤 Search API - User role:', user.role);
    console.log('👤 Search API - User ID:', user._id);
    
    // Execute search
    const [products, total] = await Promise.all([
      Product.find(searchQuery)
        .populate('categoryId', 'name nameEn')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(searchQuery)
    ]);
    
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
      products: products.map(product => ({
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
        total,
        pages: Math.ceil(total / limit)
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
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء البحث' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(searchProducts); 