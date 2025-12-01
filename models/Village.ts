import mongoose, { Schema, Document } from 'mongoose';

export interface VillageDocument extends Document {
  villageId: number; // External ID from data document (original id field)
  villageName: string; // village_name from JSON
  deliveryCost: number; // delivery_cost from JSON
  areaId: number; // area_id from JSON
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const villageSchema = new Schema<VillageDocument>({
  villageId: {
    type: Number,
    required: [true, 'معرف القرية مطلوب'],
    unique: true,
    index: true
  },
  villageName: {
    type: String,
    required: [true, 'اسم القرية مطلوب'],
    trim: true,
    maxlength: [200, 'اسم القرية لا يمكن أن يتجاوز 200 حرف'],
    index: true
  },
  deliveryCost: {
    type: Number,
    required: [true, 'تكلفة التوصيل مطلوبة'],
    min: [0, 'تكلفة التوصيل يجب أن تكون أكبر من أو تساوي صفر']
  },
  areaId: {
    type: Number,
    required: [true, 'معرف المنطقة مطلوب'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
villageSchema.index({ villageId: 1, isActive: 1 });
villageSchema.index({ areaId: 1, isActive: 1 });
villageSchema.index({ villageName: 'text' });

const Village = mongoose.models.Village || mongoose.model<VillageDocument>('Village', villageSchema);

export default Village;
