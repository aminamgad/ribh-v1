import mongoose, { Schema, Document } from 'mongoose';

export interface WithdrawalRequest {
  _id?: string;
  userId: string;
  walletNumber: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestDate: Date;
  processedDate?: Date;
  processedBy?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WithdrawalRequestDocument extends Omit<WithdrawalRequest, '_id'>, Document {}

const withdrawalRequestSchema = new Schema<WithdrawalRequestDocument>({
  userId: {
    type: Schema.Types.ObjectId as any,
    ref: 'User',
    required: true
  },
  walletNumber: {
    type: String,
    required: [true, 'رقم المحفظة مطلوب'],
    trim: true,
    minlength: [10, 'رقم المحفظة يجب أن يكون على الأقل 10 أرقام'],
    maxlength: [20, 'رقم المحفظة لا يمكن أن يتجاوز 20 رقم']
  },
  amount: {
    type: Number,
    required: [true, 'المبلغ مطلوب'],
    min: [50, 'الحد الأدنى للسحب هو 50₪'],
    max: [50000, 'الحد الأقصى للسحب هو 50,000₪']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedDate: {
    type: Date
  },
  processedBy: {
    type: Schema.Types.ObjectId as any,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'الملاحظات لا يمكن أن تتجاوز 500 حرف']
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'سبب الرفض لا يمكن أن يتجاوز 500 حرف']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
withdrawalRequestSchema.index({ userId: 1 });
withdrawalRequestSchema.index({ status: 1 });
withdrawalRequestSchema.index({ requestDate: -1 });
withdrawalRequestSchema.index({ processedDate: -1 });

// Compound indexes for common queries
withdrawalRequestSchema.index({ userId: 1, status: 1, requestDate: -1 }); // For user withdrawals by status
withdrawalRequestSchema.index({ status: 1, requestDate: -1 }); // For admin withdrawal management
withdrawalRequestSchema.index({ processedBy: 1, processedDate: -1 }); // For admin withdrawal history

// Virtual for formatted amount
withdrawalRequestSchema.virtual('formattedAmount').get(function() {
  return `${this.amount.toFixed(2)}₪`;
});

// Virtual for formatted request date
withdrawalRequestSchema.virtual('formattedRequestDate').get(function() {
  return this.requestDate.toLocaleDateString('ar-SA');
});

// Virtual for formatted processed date
withdrawalRequestSchema.virtual('formattedProcessedDate').get(function() {
  return this.processedDate ? this.processedDate.toLocaleDateString('ar-SA') : '';
});

// Pre-save middleware to validate amount against wallet balance
withdrawalRequestSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('amount')) {
    try {
      const Wallet = mongoose.model('Wallet');
      const wallet = await Wallet.findOne({ userId: this.userId });
      
      if (!wallet) {
        return next(new Error('المحفظة غير موجودة'));
      }
      
      if (wallet.balance < this.amount) {
        return next(new Error(`رصيد المحفظة غير كافي. الرصيد المتاح: ${wallet.balance}₪`));
      }
      
      if (this.amount < (wallet.minimumWithdrawal || 100)) {
        return next(new Error(`المبلغ أقل من الحد الأدنى للسحب: ${wallet.minimumWithdrawal || 100}₪`));
      }
    } catch (error) {
      return next(error instanceof Error ? error : new Error('خطأ غير معروف'));
    }
  }
  next();
});

export default mongoose.models.WithdrawalRequest || mongoose.model<WithdrawalRequestDocument>('WithdrawalRequest', withdrawalRequestSchema); 