import mongoose, { Schema, Document } from 'mongoose';

export interface PackageTypeDocument extends Document {
  typeKey: string; // Unique key like 'normal', 'express', etc.
  name: string; // Display name in Arabic
  nameEn?: string; // Display name in English
  description?: string;
  baseCost?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const packageTypeSchema = new Schema<PackageTypeDocument>({
  typeKey: {
    type: String,
    required: [true, 'مفتاح نوع الطرد مطلوب'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'اسم نوع الطرد مطلوب'],
    trim: true,
    maxlength: [100, 'الاسم لا يمكن أن يتجاوز 100 حرف']
  },
  nameEn: {
    type: String,
    trim: true,
    maxlength: [100, 'الاسم بالإنجليزية لا يمكن أن يتجاوز 100 حرف']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'الوصف لا يمكن أن يتجاوز 500 حرف']
  },
  baseCost: {
    type: Number,
    min: [0, 'التكلفة الأساسية يجب أن تكون أكبر من أو تساوي صفر']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
packageTypeSchema.index({ typeKey: 1, isActive: 1 });
packageTypeSchema.index({ name: 1 });

const PackageType = mongoose.models.PackageType || mongoose.model<PackageTypeDocument>('PackageType', packageTypeSchema);

export default PackageType;

