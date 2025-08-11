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
  city: {
    type: String,
    required: [true, 'المدينة مطلوبة'],
    trim: true
  },
  governorate: {
    type: String,
    required: [true, 'المحافظة مطلوبة'],
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
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
};

const orderSchema = new Schema<OrderDocument>({
  orderNumber: {
    type: String,
    unique: true,
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
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
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
  trackingNumber: {
    type: String,
    trim: true
  },
  shippingCompany: {
    type: String,
    trim: true
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
  }
} as any, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ supplierId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'shippingAddress.city': 1 });
orderSchema.index({ 'shippingAddress.governorate': 1 });

// Virtual for order summary
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for profit calculation
orderSchema.virtual('supplierProfit').get(function() {
  return this.subtotal - this.commission;
});

// Keep pre-save as a safety net in case the document is constructed without defaults
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
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