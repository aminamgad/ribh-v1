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
  images: {
    type: [String],
    default: []
  },
  icon: {
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
    sparse: true
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
  },
  level: {
    type: Number,
    default: 0
  },
  path: {
    type: [Schema.Types.ObjectId],
    default: []
  },
  seoKeywords: {
    type: [String],
    default: []
  },
  showInMenu: {
    type: Boolean,
    default: true
  },
  showInHome: {
    type: Boolean,
    default: false
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
categorySchema.index({ slug: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ showInMenu: 1, isActive: 1 });
categorySchema.index({ showInHome: 1, isActive: 1 });
categorySchema.index({ 'name': 'text', 'description': 'text' }); // Text search

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

// Pre-save middleware to generate slug and calculate level/path
categorySchema.pre('save', async function(next) {
  // Generate slug if not exists
  if (!(this as any).slug) {
    (this as any).slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Calculate level and path
  if (this.parentId) {
    const parent = await mongoose.model('Category').findById(this.parentId);
    if (parent) {
      (this as any).level = (parent as any).level + 1;
      (this as any).path = [...(parent as any).path || [], this.parentId];
    } else {
      (this as any).level = 1;
      (this as any).path = [this.parentId];
    }
  } else {
    (this as any).level = 0;
    (this as any).path = [];
  }
  
  next();
});

// Post-save middleware to update product count
categorySchema.post('save', async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ categoryId: this._id, isActive: true, isApproved: true });
  await mongoose.model('Category').updateOne({ _id: this._id }, { productCount: count });
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
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'categoryId',
        pipeline: [
          { $match: { isActive: true, isApproved: true } },
          { $count: 'count' }
        ],
        as: 'productStats'
      }
    },
    {
      $addFields: {
        productCount: { $ifNull: [{ $arrayElemAt: ['$productStats.count', 0] }, 0] }
      }
    },
    { $sort: { order: 1, name: 1 } }
  ]);
};

// Static method to get category breadcrumb
categorySchema.statics.getBreadcrumb = async function(categoryId: string) {
  const category = await this.findById(categoryId).populate('parentId');
  if (!category) return [];
  
  const breadcrumb: any[] = [category];
  let current = category;
  
  while (current.parentId) {
    current = await this.findById(current.parentId);
    if (current) {
      breadcrumb.unshift(current);
    } else {
      break;
    }
  }
  
  return breadcrumb;
};

// Static method to get category with all descendants
categorySchema.statics.getCategoryWithDescendants = async function(categoryId: string) {
  const category = await this.findById(categoryId);
  if (!category) return null;
  
  const descendants: any[] = [];
  const getDescendants = async (parentId: string) => {
    const children = await this.find({ parentId, isActive: true }).sort({ order: 1, name: 1 });
    for (const child of children) {
      descendants.push(child);
      await getDescendants(child._id);
    }
  };
  
  await getDescendants(categoryId);
  return { category, descendants };
};

export default mongoose.models.Category || mongoose.model<CategoryDocument>('Category', categorySchema); 