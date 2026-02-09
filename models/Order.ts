import mongoose, { Schema, Document } from 'mongoose';
import { Order, OrderStatus } from '@/types';

export interface OrderDocument extends Omit<Order, '_id'>, Document {}

const orderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'الكمية يجب أن تكون 1 على الأقل']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'سعر الوحدة يجب أن يكون أكبر من أو يساوي صفر']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'السعر الإجمالي يجب أن يكون أكبر من أو يساوي صفر']
  },
  priceType: {
    type: String,
    enum: ['marketer', 'wholesale'],
    required: true
  },
  // Product variants
  selectedVariants: {
    type: Map,
    of: String,
    default: {}
  },
  variantOption: {
    variantId: String,
    variantName: String,
    value: String,
    price: Number,
    stockQuantity: Number,
    sku: String,
    images: [String]
  }
});

const addressSchema = new Schema({
  fullName: {
    type: String,
    required: [true, 'الاسم الكامل مطلوب'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'رقم الهاتف مطلوب'],
    trim: true
  },
  street: {
    type: String,
    required: [true, 'اسم الشارع مطلوب'],
    trim: true
  },
  // Village-based system (new)
  governorate: {
    type: String,
    trim: true
  },
  villageId: {
    type: Number
  },
  villageName: {
    type: String,
    trim: true
  },
  deliveryCost: {
    type: Number,
    min: [0, 'تكلفة التوصيل يجب أن تكون أكبر من أو تساوي صفر']
  },
  // Legacy fields for backward compatibility
  city: {
    type: String,
    trim: true
  },
  manualVillageName: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'ملاحظات التوصيل لا يمكن أن تتجاوز 500 حرف']
  }
});

const generateOrderNumber = () => {
  // This will be handled in the pre-save middleware
  return 'PENDING';
};

const orderSchema = new Schema<OrderDocument>({
  orderNumber: {
    type: String,
    default: generateOrderNumber
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerRole: {
    type: String,
    enum: ['marketer', 'wholesaler'],
    required: true
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'المجموع الفرعي يجب أن يكون أكبر من أو يساوي صفر']
  },
  shippingCost: {
    type: Number,
    required: true,
    min: [0, 'تكلفة الشحن يجب أن تكون أكبر من أو تساوي صفر'],
    default: 0
  },
  shippingMethod: {
    type: String,
    default: 'الشحن الأساسي'
  },
  shippingZone: {
    type: String,
    default: 'المملكة العربية السعودية'
  },
  commission: {
    type: Number,
    required: true,
    min: [0, 'العمولة يجب أن تكون أكبر من أو تساوي صفر']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'المجموع الكلي يجب أن يكون أكبر من أو يساوي صفر']
  },
  marketerProfit: {
    type: Number,
    default: 0,
    min: [0, 'ربح المسوق يجب أن يكون أكبر من أو يساوي صفر']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'ready_for_shipping', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  shippingAddress: addressSchema,
  deliveryNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'ملاحظات التوصيل لا يمكن أن تتجاوز 1000 حرف']
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  shippingCompany: {
    type: String,
    trim: true
  },
  packageId: {
    type: Number
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'سبب الإلغاء لا يمكن أن يتجاوز 500 حرف']
  },
  returnReason: {
    type: String,
    trim: true,
    maxlength: [500, 'سبب الإرجاع لا يمكن أن يتجاوز 500 حرف']
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'ملاحظات الإدارة لا يمكن أن تتجاوز 1000 حرف']
  },
  // Processing timestamps
  confirmedAt: Date,
  confirmedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  processingAt: Date,
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  readyForShippingAt: Date,
  readyForShippingBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  shippedAt: Date,
  shippedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  outForDeliveryAt: Date,
  outForDeliveryBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveredAt: Date,
  deliveredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  returnedAt: Date,
  returnedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  refundedAt: Date,
  refundedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // Link to fulfillment request
  fulfillmentRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'FulfillmentRequest',
    default: null
  },
  // Profit distribution tracking
  profitsDistributed: {
    type: Boolean,
    default: false
  },
  profitsDistributedAt: {
    type: Date
  },
  // Easy Orders / external integrations (source, integrationId, easyOrdersOrderId, etc.)
  metadata: {
    type: Schema.Types.Mixed,
    default: undefined
  }
} as any, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Single field indexes
orderSchema.index({ customerId: 1 });
orderSchema.index({ supplierId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ 'shippingAddress.villageId': 1 });
orderSchema.index({ 'shippingAddress.city': 1 });
orderSchema.index({ 'shippingAddress.governorate': 1 });
orderSchema.index({ customerRole: 1 });

// Compound indexes for common queries
orderSchema.index({ customerId: 1, status: 1, createdAt: -1 }); // For customer orders by status
orderSchema.index({ supplierId: 1, status: 1, createdAt: -1 }); // For supplier orders by status
orderSchema.index({ status: 1, paymentStatus: 1, createdAt: -1 }); // For order management
orderSchema.index({ customerRole: 1, status: 1 }); // For role-based order filtering
orderSchema.index({ 'items.productId': 1 }); // For product order history
orderSchema.index({ fulfillmentRequestId: 1 }); // For orders by fulfillment request
orderSchema.index({ status: 1, profitsDistributed: 1 }); // For profit distribution queries
orderSchema.index({ profitsDistributed: 1, deliveredAt: -1 }); // For pending profits queries
orderSchema.index({ 'metadata.source': 1, 'metadata.integrationId': 1 }); // Easy Orders verification
orderSchema.index({ 'metadata.easyOrdersOrderId': 1, 'metadata.easyOrdersStoreId': 1 }); // منع تكرار الطلبات من الويب هوك

// Virtual for order summary
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for profit calculation (supplier profit = subtotal - commission - marketerProfit)
orderSchema.virtual('supplierProfit').get(function() {
  return this.subtotal - this.commission - (this.marketerProfit || 0);
});

// Pre-save middleware to generate sequential order numbers
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber || this.orderNumber === 'PENDING') {
    try {
      // Try to get the Counter model, create it if it doesn't exist
      let CounterModel: any;
      try {
        CounterModel = mongoose.model('Counter');
      } catch {
        // If Counter model doesn't exist, create it
        const counterSchema = new mongoose.Schema({
          _id: String,
          sequence_value: { type: Number, default: 100000 }
        });
        CounterModel = mongoose.model('Counter', counterSchema);
      }
      
      const counter = await CounterModel.findByIdAndUpdate(
        'orderNumber',
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      this.orderNumber = counter.sequence_value.toString();
    } catch (error) {
      // Log error but don't break order creation - use fallback
      if (process.env.NODE_ENV === 'development') {
        const logger = require('@/lib/logger').logger;
        logger.error('Error generating order number', error);
      }
      // Fallback to timestamp-based number if counter fails
      this.orderNumber = Date.now().toString();
    }
  }
  next();
});

// Static method to find orders by customer
orderSchema.statics.findByCustomer = function(customerId: string) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

// Static method to find orders by supplier
orderSchema.statics.findBySupplier = function(supplierId: string) {
  return this.find({ supplierId }).sort({ createdAt: -1 });
};

// Static method to find orders by status
orderSchema.statics.findByStatus = function(status: OrderStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find pending orders
orderSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

// Static method to get order statistics
orderSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$total' }
      }
    }
  ]);
};

export default mongoose.models.Order || mongoose.model<OrderDocument>('Order', orderSchema); 