import mongoose, { Schema, Document } from 'mongoose';
import { Product } from '@/types';

export interface ProductDocument extends Product, Document {}

const productSchema = new Schema<ProductDocument>({
  name: {
    type: String,
    required: [true, 'اسم المنتج مطلوب'],
    trim: true,
    maxlength: [200, 'اسم المنتج لا يمكن أن يتجاوز 200 حرف']
  },
  nameEn: {
    type: String,
    trim: true,
    maxlength: [200, 'اسم المنتج بالإنجليزية لا يمكن أن يتجاوز 200 حرف']
  },
  description: {
    type: String,
    required: [true, 'وصف المنتج مطلوب'],
    trim: true,
    maxlength: [2000, 'وصف المنتج لا يمكن أن يتجاوز 2000 حرف']
  },
  images: [{
    type: String,
    required: [true, 'صورة واحدة على الأقل مطلوبة']
  }],
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'فئة المنتج مطلوبة']
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'المورد مطلوب']
  },
  marketerPrice: {
    type: Number,
    required: [true, 'سعر المسوق مطلوب'],
    min: [0, 'سعر المسوق يجب أن يكون أكبر من صفر']
  },
  wholesalePrice: {
    type: Number,
    required: [true, 'سعر الجملة مطلوب'],
    min: [0, 'سعر الجملة يجب أن يكون أكبر من صفر']
  },
  costPrice: {
    type: Number,
    required: [true, 'سعر التكلفة مطلوب'],
    min: [0, 'سعر التكلفة يجب أن يكون أكبر من صفر']
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
    unique: true,
    sparse: true,
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add custom validation for images array
productSchema.path('images').validate(function(images: string[]) {
  return images && images.length >= 1 && images.length <= 10;
}, 'يجب أن يحتوي المنتج على صورة واحدة على الأقل ولا يزيد عن 10 صور');

// Indexes
productSchema.index({ name: 1 });
productSchema.index({ supplierId: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ isActive: 1, isApproved: 1 });
productSchema.index({ marketerPrice: 1 });
productSchema.index({ wholesalePrice: 1 });
productSchema.index({ stockQuantity: 1 });
productSchema.index({ sales: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ featured: 1 });

// Virtual for profit margin
productSchema.virtual('marketerProfitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.marketerPrice - this.costPrice) / this.costPrice) * 100;
});

productSchema.virtual('wholesaleProfitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.wholesalePrice - this.costPrice) / this.costPrice) * 100;
});

// Virtual for in stock status
productSchema.virtual('inStock').get(function() {
  return this.stockQuantity > 0;
});

// Pre-save middleware to generate SKU
productSchema.pre('save', function(next) {
  if (!this.sku) {
    this.sku = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

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