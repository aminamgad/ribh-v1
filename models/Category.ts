import mongoose, { Schema, Document } from 'mongoose';
import { Category } from '@/types';

export interface CategoryDocument extends Omit<Category, '_id'>, Document {}

const categorySchema = new Schema<CategoryDocument>({
  name: {
    type: String,
    required: [true, 'اسم الفئة مطلوب'],
    trim: true,
    maxlength: [100, 'اسم الفئة لا يمكن أن يتجاوز 100 حرف']
  },
  nameEn: {
    type: String,
    trim: true,
    maxlength: [100, 'اسم الفئة بالإنجليزية لا يمكن أن يتجاوز 100 حرف']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'وصف الفئة لا يمكن أن يتجاوز 500 حرف']
  },
  image: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    required: true
  } as any,
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'عنوان الميتا لا يمكن أن يتجاوز 60 حرف']
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'وصف الميتا لا يمكن أن يتجاوز 160 حرف']
  },
  featured: {
    type: Boolean,
    default: false
  },
  productCount: {
    type: Number,
    default: 0
  }
} as any, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ name: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ featured: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Virtual for full path
categorySchema.virtual('fullPath').get(function() {
  if (this.parentId) {
    return `${(this.parentId as any).name} > ${this.name}`;
  }
  return this.name;
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (!(this as any).slug) {
    (this as any).slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Static method to find active categories
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ order: 1, name: 1 });
};

// Static method to find parent categories
categorySchema.statics.findParents = function() {
  return this.find({ parentId: null, isActive: true }).sort({ order: 1, name: 1 });
};

// Static method to find subcategories
categorySchema.statics.findSubcategories = function(parentId: string) {
  return this.find({ parentId, isActive: true }).sort({ order: 1, name: 1 });
};

// Static method to find featured categories
categorySchema.statics.findFeatured = function() {
  return this.find({ featured: true, isActive: true }).sort({ order: 1, name: 1 });
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: 'parentId',
        as: 'subcategories'
      }
    },
    { $sort: { order: 1, name: 1 } }
  ]);
};

export default mongoose.models.Category || mongoose.model<CategoryDocument>('Category', categorySchema); 