import mongoose, { Schema, Document } from 'mongoose';

// Local interfaces for this file
export interface TransactionDocument extends Document {
  walletId: mongoose.Types.ObjectId;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletDocument extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  isActive: boolean;
  lastTransactionDate?: Date;
  minimumWithdrawal: number;
  availableBalance: number;
  canWithdraw: boolean;
  addTransaction(
    type: 'credit' | 'debit',
    amount: number,
    description: string,
    reference: string,
    metadata?: Record<string, any>
  ): Promise<TransactionDocument>;
  hasSufficientBalance(amount: number): boolean;
}

const transactionSchema = new Schema<TransactionDocument>({
  walletId: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'المبلغ يجب أن يكون أكبر من أو يساوي صفر']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'وصف المعاملة لا يمكن أن يتجاوز 200 حرف']
  },
  reference: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const walletSchema = new Schema<WalletDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'الرصيد لا يمكن أن يكون سالب']
  },
  totalEarnings: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'إجمالي الأرباح لا يمكن أن يكون سالب']
  },
  totalWithdrawals: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'إجمالي السحوبات لا يمكن أن يكون سالب']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTransactionDate: Date,
  minimumWithdrawal: {
    type: Number,
    default: 100 // 100 EGP minimum withdrawal
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
walletSchema.index({ userId: 1 });
walletSchema.index({ isActive: 1 });
walletSchema.index({ lastTransactionDate: -1 });

transactionSchema.index({ walletId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ reference: 1 });

// Virtual for available balance
walletSchema.virtual('availableBalance').get(function() {
  return Math.max(0, this.balance);
});

// Virtual for can withdraw
walletSchema.virtual('canWithdraw').get(function() {
  return this.balance >= this.minimumWithdrawal;
});

// Method to add transaction
walletSchema.methods.addTransaction = async function(
  type: 'credit' | 'debit',
  amount: number,
  description: string,
  reference: string,
  metadata?: Record<string, any>
) {
  const transaction = new TransactionModel({
    walletId: this._id,
    type,
    amount,
    description,
    reference,
    metadata
  });

  await transaction.save();

  // Update wallet balance
  if (type === 'credit') {
    this.balance += amount;
    this.totalEarnings += amount;
  } else {
    this.balance -= amount;
    this.totalWithdrawals += amount;
  }

  this.lastTransactionDate = new Date();
  await this.save();

  return transaction;
};

// Method to check if sufficient balance
walletSchema.methods.hasSufficientBalance = function(amount: number): boolean {
  return this.balance >= amount;
};

// Static method to find wallet by user
walletSchema.statics.findByUser = function(userId: string) {
  return this.findOne({ userId });
};

// Static method to get wallet with transactions
walletSchema.statics.findWithTransactions = function(userId: string) {
  return this.findOne({ userId }).populate({
    path: 'transactions',
    options: { sort: { createdAt: -1 } }
  });
};

// Transaction model
const TransactionModel = mongoose.models.Transaction || mongoose.model<TransactionDocument>('Transaction', transactionSchema);

export { TransactionModel as Transaction };
export default mongoose.models.Wallet || mongoose.model<WalletDocument>('Wallet', walletSchema); 