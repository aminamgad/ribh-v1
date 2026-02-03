import mongoose, { Schema, Document } from 'mongoose';
import { Product } from '@/types';

export interface ProductDocument extends Omit<Product, '_id'>, Document {}

const productSchema = new Schema<ProductDocument>({
  name: {
    type: String,
    required: [true, 'اسم المنتج مطلوب'],
    trim: true,
    maxlength: [200, 'اسم المنتج لا يمكن أن يتجاوز 200 حرف']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'وصف المنتج لا يمكن أن يتجاوز 2000 حرف']
  },
  marketingText: {
    type: String,
    trim: true,
    maxlength: [2000, 'النص التسويقي لا يمكن أن يتجاوز 2000 حرف']
  },
  images: [{
    type: String,
    required: [true, 'صورة واحدة على الأقل مطلوبة']
  }],
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'المورد مطلوب']
  },
  supplierPrice: {
    type: Number,
    required: [true, 'سعر المورد مطلوب'],
    min: [0, 'سعر المورد يجب أن يكون أكبر من صفر']
  },
  marketerPrice: {
    type: Number,
    required: [true, 'سعر المسوق مطلوب'],
    min: [0, 'سعر المسوق يجب أن يكون أكبر من صفر']
  },
  wholesalerPrice: {
    type: Number,
    required: false,
    min: [0, 'سعر الجملة يجب أن يكون أكبر من صفر']
  },
  minimumSellingPrice: {
    type: Number,
    min: [0, 'السعر الأدنى للبيع يجب أن يكون أكبر من صفر']
  },
  isMinimumPriceMandatory: {
    type: Boolean,
    default: false
  },
  stockQuantity: {
    type: Number,
    required: [true, 'الكمية المتوفرة مطلوبة'],
    min: [0, 'الكمية المتوفرة يجب أن تكون أكبر من أو تساوي صفر'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date
  },
  lockedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  lockReason: {
    type: String,
    trim: true,
    maxlength: [500, 'سبب القفل لا يمكن أن يتجاوز 500 حرف']
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isRejected: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'سبب الرفض لا يمكن أن يتجاوز 500 حرف']
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'ملاحظات الإدارة لا يمكن أن تتجاوز 1000 حرف']
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isFulfilled: {
    type: Boolean,
    default: false
  },
  isMarketerPriceManuallyAdjusted: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'العلامة لا يمكن أن تتجاوز 50 حرف']
  }],
  specifications: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  views: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,
  sku: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  // Product variants support
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: [{
    _id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    values: [{
      type: String,
      trim: true
    }],
    valueDetails: [{
      value: {
        type: String,
        required: true,
        trim: true
      },
      stockQuantity: {
        type: Number,
        min: 0
      },
      customPrice: {
        type: Number,
        min: 0
      }
    }],
    isRequired: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    },
    stockQuantity: {
      type: Number,
      min: 0
    },
    customPrice: {
      type: Number,
      min: 0
    }
  }],
  variantOptions: [{
    variantId: {
      type: String,
      required: true
    },
    variantName: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    sku: {
      type: String,
      trim: true
    },
    images: [{
      type: String
    }]
  }]
} as any, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add custom validation for images array
productSchema.path('images').validate(function(images: string[]) {
  return images && images.length >= 1 && images.length <= 10;
}, 'يجب أن يحتوي المنتج على صورة واحدة على الأقل ولا يزيد عن 10 صور');

// Indexes
// Single field indexes
productSchema.index({ name: 1 });
productSchema.index({ supplierId: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ supplierPrice: 1 });
productSchema.index({ marketerPrice: 1 });
productSchema.index({ wholesalerPrice: 1 });
productSchema.index({ stockQuantity: 1 });
productSchema.index({ sales: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ featured: 1 });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ isRejected: 1 });
productSchema.index({ isLocked: 1 });

// Compound indexes for common queries
productSchema.index({ isActive: 1, isApproved: 1, isRejected: 1, isLocked: 1 }); // For product listing
productSchema.index({ supplierId: 1, isActive: 1 }); // For supplier products
productSchema.index({ categoryId: 1, isActive: 1, isApproved: 1 }); // For category products
productSchema.index({ isApproved: 1, isRejected: 1, createdAt: -1 }); // For admin review
productSchema.index({ supplierId: 1, isApproved: 1, createdAt: -1 }); // For supplier approved products
productSchema.index({ name: 'text', description: 'text' }); // Text search index



// Virtual for in stock status
productSchema.virtual('inStock').get(function() {
  return this.stockQuantity > 0;
});

// SKU generation is now handled in API routes using lib/sku-generator.ts
// This ensures unique, sequential SKUs and proper variant SKU generation

// Static method to find approved products
productSchema.statics.findApproved = function() {
  return this.find({ isActive: true, isApproved: true });
};

// Static method to find products by category
productSchema.statics.findByCategory = function(categoryId: string) {
  return this.find({ categoryId, isActive: true, isApproved: true });
};

// Static method to find featured products
productSchema.statics.findFeatured = function() {
  return this.find({ 
    isActive: true, 
    isApproved: true, 
    featured: true,
    $or: [
      { featuredUntil: { $exists: false } },
      { featuredUntil: { $gt: new Date() } }
    ]
  });
};

// Static method to find best sellers
productSchema.statics.findBestSellers = function(limit = 10) {
  return this.find({ isActive: true, isApproved: true })
    .sort({ sales: -1 })
    .limit(limit);
};

// Static method to find new arrivals
productSchema.statics.findNewArrivals = function(limit = 10) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({ 
    isActive: true, 
    isApproved: true,
    createdAt: { $gte: thirtyDaysAgo }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export default mongoose.models.Product || mongoose.model<ProductDocument>('Product', productSchema); 