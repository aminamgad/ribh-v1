import mongoose, { Schema, Document } from 'mongoose';
import Counter from './Counter';

export interface PackageDocument extends Document {
  packageId: number; // Auto-incremented ID for external reference
  externalCompanyId: mongoose.Types.ObjectId;
  toName: string;
  toPhone: string;
  alterPhone: string;
  description: string;
  packageType: string;
  villageId: number; // Reference to Village.villageId
  street: string;
  totalCost: number;
  note?: string;
  barcode: string; // Must be unique
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<PackageDocument>({
  packageId: {
    type: Number,
    unique: true,
    index: true
  },
  externalCompanyId: {
    type: Schema.Types.ObjectId,
    ref: 'ExternalCompany',
    required: [true, 'معرف الشركة الخارجية مطلوب'],
    index: true
  },
  toName: {
    type: String,
    required: [true, 'اسم المستلم مطلوب'],
    trim: true,
    maxlength: [200, 'اسم المستلم لا يمكن أن يتجاوز 200 حرف']
  },
  toPhone: {
    type: String,
    required: [true, 'رقم الهاتف الأساسي مطلوب'],
    trim: true,
    match: [/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'رقم الهاتف غير صحيح']
  },
  alterPhone: {
    type: String,
    required: [true, 'رقم الهاتف البديل مطلوب'],
    trim: true,
    match: [/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'رقم الهاتف البديل غير صحيح']
  },
  description: {
    type: String,
    required: [true, 'وصف الطرد مطلوب'],
    trim: true,
    maxlength: [1000, 'الوصف لا يمكن أن يتجاوز 1000 حرف']
  },
  packageType: {
    type: String,
    required: [true, 'نوع الطرد مطلوب'],
    trim: true
  },
  villageId: {
    type: Number,
    required: [true, 'معرف القرية مطلوب'],
    index: true
  },
  street: {
    type: String,
    required: [true, 'عنوان الشارع مطلوب'],
    trim: true,
    maxlength: [500, 'عنوان الشارع لا يمكن أن يتجاوز 500 حرف']
  },
  totalCost: {
    type: Number,
    required: [true, 'التكلفة الإجمالية مطلوبة'],
    min: [0, 'التكلفة الإجمالية يجب أن تكون أكبر من أو تساوي صفر']
  },
  note: {
    type: String,
    trim: true,
    maxlength: [1000, 'الملاحظات لا يمكن أن تتجاوز 1000 حرف']
  },
  barcode: {
    type: String,
    required: [true, 'الباركود مطلوب'],
    unique: true,
    trim: true,
    index: true,
    maxlength: [100, 'الباركود لا يمكن أن يتجاوز 100 حرف']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate auto-incremented packageId
packageSchema.pre('save', async function(next) {
  if (this.isNew && !this.packageId) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'packageId' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      this.packageId = counter.sequence;
      next();
    } catch (error: unknown) {
      next(error as Error);
    }
  } else {
    next();
  }
});

// Indexes
packageSchema.index({ packageId: 1 });
packageSchema.index({ barcode: 1 });
packageSchema.index({ externalCompanyId: 1, status: 1 });
packageSchema.index({ villageId: 1, status: 1 });
packageSchema.index({ createdAt: -1 });

const Package = mongoose.models.Package || mongoose.model<PackageDocument>('Package', packageSchema);

export default Package;

