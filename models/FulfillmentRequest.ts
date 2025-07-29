import mongoose, { Schema, Document } from 'mongoose';
import { FulfillmentRequest } from '@/types';

export interface FulfillmentRequestDocument extends FulfillmentRequest, Document {}

const fulfillmentProductSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'الكمية يجب أن تكون 1 على الأقل']
  },
  currentStock: {
    type: Number,
    required: true,
    min: [0, 'المخزون الحالي لا يمكن أن يكون سالب']
  }
});

const fulfillmentRequestSchema = new Schema<FulfillmentRequestDocument>({
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [fulfillmentProductSchema],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'ملاحظات المورد لا يمكن أن تتجاوز 1000 حرف']
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'ملاحظات الإدارة لا يمكن أن تتجاوز 1000 حرف']
  },
  approvedAt: Date,
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'سبب الرفض لا يمكن أن يتجاوز 500 حرف']
  },
  totalValue: {
    type: Number,
    default: 0
  },
  warehouseLocation: {
    type: String,
    trim: true
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
fulfillmentRequestSchema.index({ supplierId: 1 });
fulfillmentRequestSchema.index({ status: 1 });
fulfillmentRequestSchema.index({ createdAt: -1 });
fulfillmentRequestSchema.index({ approvedAt: 1 });
fulfillmentRequestSchema.index({ expectedDeliveryDate: 1 });

// Virtual for total items
fulfillmentRequestSchema.virtual('totalItems').get(function() {
  return this.products.reduce((total, product) => total + product.quantity, 0);
});

// Virtual for is overdue
fulfillmentRequestSchema.virtual('isOverdue').get(function() {
  if (!this.expectedDeliveryDate) return false;
  return new Date() > this.expectedDeliveryDate && this.status === 'approved';
});

// Pre-save middleware to calculate total value
fulfillmentRequestSchema.pre('save', async function(next) {
  if (this.products.length > 0) {
    const Product = mongoose.model('Product');
    let totalValue = 0;
    
    for (const product of this.products) {
      const productDoc = await Product.findById(product.productId);
      if (productDoc) {
        totalValue += productDoc.costPrice * product.quantity;
      }
    }
    
    this.totalValue = totalValue;
  }
  next();
});

// Static method to find by supplier
fulfillmentRequestSchema.statics.findBySupplier = function(supplierId: string) {
  return this.find({ supplierId })
    .populate('products.productId', 'name costPrice')
    .populate('approvedBy', 'name')
    .populate('rejectedBy', 'name')
    .sort({ createdAt: -1 });
};

// Static method to find pending requests
fulfillmentRequestSchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .populate('supplierId', 'name companyName')
    .populate('products.productId', 'name costPrice')
    .sort({ createdAt: -1 });
};

// Static method to find approved requests
fulfillmentRequestSchema.statics.findApproved = function() {
  return this.find({ status: 'approved' })
    .populate('supplierId', 'name companyName')
    .populate('products.productId', 'name costPrice')
    .sort({ approvedAt: -1 });
};

// Static method to get statistics
fulfillmentRequestSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalValue' }
      }
    }
  ]);
};

export default mongoose.models.FulfillmentRequest || mongoose.model<FulfillmentRequestDocument>('FulfillmentRequest', fulfillmentRequestSchema); 