import mongoose, { Schema, Document, Model } from 'mongoose';

// Store Integration Types
export enum IntegrationType {
  EASY_ORDERS = 'easy_orders',
  YOUCAN = 'youcan'
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ERROR = 'error'
}

// TypeScript interfaces
export interface IStoreIntegration extends Document {
  userId: mongoose.Types.ObjectId;
  type: IntegrationType;
  status: IntegrationStatus;
  storeName: string;
  storeUrl?: string;
  apiKey: string;
  apiSecret?: string;
  webhookUrl?: string;
  settings: {
    syncProducts: boolean;
    syncOrders: boolean;
    syncInventory: boolean;
    autoFulfillment: boolean;
    priceMarkup?: number;
    defaultCategory?: mongoose.Types.ObjectId;
  };
  lastSync?: Date;
  syncErrors?: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreIntegrationMethods {
  testConnection(): Promise<boolean>;
  syncProducts(): Promise<number>;
  syncOrders(): Promise<number>;
  updateStatus(status: IntegrationStatus, error?: string): Promise<void>;
}

export interface IStoreIntegrationModel extends Model<IStoreIntegration, {}, IStoreIntegrationMethods> {
  findByUser(userId: string): Promise<IStoreIntegration[]>;
  findActiveIntegrations(): Promise<IStoreIntegration[]>;
  findByType(type: IntegrationType): Promise<IStoreIntegration[]>;
}

// Schema definition
const storeIntegrationSchema = new Schema<IStoreIntegration, IStoreIntegrationModel, IStoreIntegrationMethods>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(IntegrationType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(IntegrationStatus),
    default: IntegrationStatus.PENDING
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  storeUrl: {
    type: String,
    trim: true
  },
  apiKey: {
    type: String,
    required: true
  },
  apiSecret: {
    type: String
  },
  webhookUrl: {
    type: String
  },
  settings: {
    syncProducts: {
      type: Boolean,
      default: true
    },
    syncOrders: {
      type: Boolean,
      default: true
    },
    syncInventory: {
      type: Boolean,
      default: true
    },
    autoFulfillment: {
      type: Boolean,
      default: false
    },
    priceMarkup: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    defaultCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    }
  },
  lastSync: Date,
  syncErrors: [String],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
storeIntegrationSchema.index({ userId: 1, type: 1 }, { unique: true });
storeIntegrationSchema.index({ status: 1, isActive: 1 });
storeIntegrationSchema.index({ lastSync: 1 });

// Compound indexes for common queries
storeIntegrationSchema.index({ userId: 1, isActive: 1 }); // For user active integrations
storeIntegrationSchema.index({ status: 1, lastSync: 1 }); // For sync management

// Instance methods
storeIntegrationSchema.methods.testConnection = async function(): Promise<boolean> {
  // This would be implemented with actual API calls to the respective platforms
  // For now, simulate the test
  try {
    if (this.type === IntegrationType.EASY_ORDERS) {
      // Simulate EasyOrders API test
      if (process.env.NODE_ENV === 'development') {
        const logger = require('@/lib/logger').logger;
        logger.debug('Testing EasyOrders connection...');
      }
      return this.apiKey.length > 10;
    } else if (this.type === IntegrationType.YOUCAN) {
      // Simulate YouCan API test
      if (process.env.NODE_ENV === 'development') {
        const logger = require('@/lib/logger').logger;
        logger.debug('Testing YouCan connection...');
      }
      return this.apiKey.length > 10 && !!this.apiSecret;
    }
    return false;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const logger = require('@/lib/logger').logger;
      logger.error('Connection test failed', error);
    }
    return false;
  }
};

storeIntegrationSchema.methods.syncProducts = async function(): Promise<number> {
  // This would fetch products from the external store and sync with our database
  // For now, return a simulated count
  if (process.env.NODE_ENV === 'development') {
    const logger = require('@/lib/logger').logger;
    logger.debug(`Syncing products from ${this.type}...`);
  }
  this.lastSync = new Date();
  await this.save();
  return Math.floor(Math.random() * 50) + 10;
};

storeIntegrationSchema.methods.syncOrders = async function(): Promise<number> {
  // This would fetch orders from the external store and create them in our system
  // For now, return a simulated count
  if (process.env.NODE_ENV === 'development') {
    const logger = require('@/lib/logger').logger;
    logger.debug(`Syncing orders from ${this.type}...`);
  }
  this.lastSync = new Date();
  await this.save();
  return Math.floor(Math.random() * 20) + 5;
};

storeIntegrationSchema.methods.updateStatus = async function(status: IntegrationStatus, error?: string): Promise<void> {
  this.status = status;
  if (error && status === IntegrationStatus.ERROR) {
    this.syncErrors = this.syncErrors || [];
    this.syncErrors.push(error);
    if (this.syncErrors.length > 10) {
      this.syncErrors = this.syncErrors.slice(-10); // Keep only last 10 errors
    }
  }
  await this.save();
};

// Static methods
storeIntegrationSchema.statics.findByUser = function(userId: string): Promise<IStoreIntegration[]> {
  return this.find({ userId, isActive: true }).populate('settings.defaultCategory');
};

storeIntegrationSchema.statics.findActiveIntegrations = function(): Promise<IStoreIntegration[]> {
  return this.find({ status: IntegrationStatus.ACTIVE, isActive: true });
};

storeIntegrationSchema.statics.findByType = function(type: IntegrationType): Promise<IStoreIntegration[]> {
  return this.find({ type, isActive: true });
};

// Create and export model
const StoreIntegration = (mongoose.models.StoreIntegration as IStoreIntegrationModel) || 
  mongoose.model<IStoreIntegration, IStoreIntegrationModel>('StoreIntegration', storeIntegrationSchema);

export default StoreIntegration; 