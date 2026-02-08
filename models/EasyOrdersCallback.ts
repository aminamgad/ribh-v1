import mongoose, { Schema, Document } from 'mongoose';

export interface IEasyOrdersCallback extends Document {
  userId?: mongoose.Types.ObjectId; // Optional - will be set when user completes via GET
  apiKey: string;
  storeId: string;
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const easyOrdersCallbackSchema = new Schema<IEasyOrdersCallback>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Can be null initially, set later via GET endpoint
    index: true
  },
  apiKey: {
    type: String,
    required: true
  },
  storeId: {
    type: String,
    required: true
  },
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired documents
  }
}, {
  timestamps: true
});

// Index for finding unused callbacks
easyOrdersCallbackSchema.index({ userId: 1, used: 1 });

const EasyOrdersCallback = (mongoose.models.EasyOrdersCallback as mongoose.Model<IEasyOrdersCallback>) || 
  mongoose.model<IEasyOrdersCallback>('EasyOrdersCallback', easyOrdersCallbackSchema);

export default EasyOrdersCallback;


