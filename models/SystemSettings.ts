import mongoose, { Schema, Document } from 'mongoose';

export interface SystemSettings extends Document {
  // Commission settings
  commissionRates: {
    minPrice: number;
    maxPrice: number;
    rate: number;
  }[];
  
  // Platform settings
  platformName: string;
  platformDescription: string;
  contactEmail: string;
  contactPhone: string;
  supportWhatsApp: string;
  
  // Financial settings
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFee: number;
  currency: string;
  
  // Order settings
  autoApproveOrders: boolean;
  requireAdminApproval: boolean;
  maxOrderValue: number;
  minOrderValue: number;
  
  // Product settings
  autoApproveProducts: boolean;
  requireProductImages: boolean;
  maxProductImages: number;
  maxProductDescription: number;
  
  // Notification settings
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
  
  // Shipping settings
  defaultShippingCost: number;
  freeShippingThreshold: number;
  shippingCompanies: string[];
  
  // Security settings
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireTwoFactor: boolean;
  
  // Maintenance settings
  maintenanceMode: boolean;
  maintenanceMessage: string;
  
  // Social media
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  
  // Legal
  termsOfService: string;
  privacyPolicy: string;
  refundPolicy: string;
  
  // Analytics
  googleAnalyticsId: string;
  facebookPixelId: string;
  
  // Updated by
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const commissionRateSchema = new Schema({
  minPrice: {
    type: Number,
    required: true,
    min: 0
  },
  maxPrice: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
});

const systemSettingsSchema = new Schema<SystemSettings>({
  // Commission settings
  commissionRates: [commissionRateSchema],
  
  // Platform settings
  platformName: {
    type: String,
    default: 'ربح',
    trim: true,
    maxlength: [100, 'اسم المنصة لا يمكن أن يتجاوز 100 حرف']
  },
  platformDescription: {
    type: String,
    default: 'منصة التجارة الإلكترونية الذكية',
    trim: true,
    maxlength: [500, 'وصف المنصة لا يمكن أن يتجاوز 500 حرف']
  },
  contactEmail: {
    type: String,
    default: 'support@ribh.com',
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    default: '+20 123 456 789',
    trim: true
  },
  supportWhatsApp: {
    type: String,
    default: '+20 123 456 789',
    trim: true
  },
  
  // Financial settings
  minimumWithdrawal: {
    type: Number,
    default: 100,
    min: 0
  },
  maximumWithdrawal: {
    type: Number,
    default: 10000,
    min: 0
  },
  withdrawalFee: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currency: {
    type: String,
    default: '₪',
    trim: true
  },
  
  // Order settings
  autoApproveOrders: {
    type: Boolean,
    default: false
  },
  requireAdminApproval: {
    type: Boolean,
    default: true
  },
  maxOrderValue: {
    type: Number,
    default: 50000,
    min: 0
  },
  minOrderValue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Product settings
  autoApproveProducts: {
    type: Boolean,
    default: false
  },
  requireProductImages: {
    type: Boolean,
    default: true
  },
  maxProductImages: {
    type: Number,
    default: 10,
    min: 1,
    max: 20
  },
  maxProductDescription: {
    type: Number,
    default: 1000,
    min: 100,
    max: 5000
  },
  
  // Notification settings
  emailNotifications: {
    type: Boolean,
    default: true
  },
  whatsappNotifications: {
    type: Boolean,
    default: true
  },
  pushNotifications: {
    type: Boolean,
    default: false
  },
  
  // Shipping settings
  defaultShippingCost: {
    type: Number,
    default: 30,
    min: 0
  },
  freeShippingThreshold: {
    type: Number,
    default: 500,
    min: 0
  },
  shippingCompanies: [{
    type: String,
    trim: true
  }],
  
  // Security settings
  maxLoginAttempts: {
    type: Number,
    default: 5,
    min: 3,
    max: 10
  },
  sessionTimeout: {
    type: Number,
    default: 24, // hours
    min: 1,
    max: 168
  },
  requireTwoFactor: {
    type: Boolean,
    default: false
  },
  
  // Maintenance settings
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.',
    trim: true,
    maxlength: [500, 'رسالة الصيانة لا يمكن أن تتجاوز 500 حرف']
  },
  
  // Social media
  facebookUrl: {
    type: String,
    trim: true
  },
  instagramUrl: {
    type: String,
    trim: true
  },
  twitterUrl: {
    type: String,
    trim: true
  },
  linkedinUrl: {
    type: String,
    trim: true
  },
  
  // Legal
  termsOfService: {
    type: String,
    trim: true
  },
  privacyPolicy: {
    type: String,
    trim: true
  },
  refundPolicy: {
    type: String,
    trim: true
  },
  
  // Analytics
  googleAnalyticsId: {
    type: String,
    trim: true
  },
  facebookPixelId: {
    type: String,
    trim: true
  },
  
  // Updated by
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
systemSettingsSchema.index({ updatedAt: -1 });

// Static method to get current settings
systemSettingsSchema.statics.getCurrentSettings = function() {
  return this.findOne().sort({ updatedAt: -1 });
};

// Static method to create or update settings
systemSettingsSchema.statics.updateSettings = function(settingsData: any, userId: string) {
  return this.findOneAndUpdate(
    {},
    { ...settingsData, updatedBy: userId },
    { new: true, upsert: true }
  );
};

// Virtual for commission calculation
systemSettingsSchema.virtual('getCommissionRate').get(function(price: number) {
  if (!this.commissionRates || this.commissionRates.length === 0) {
    return 10; // Default 10%
  }
  
  const rate = this.commissionRates.find(rate => 
    price >= rate.minPrice && price <= rate.maxPrice
  );
  
  return rate ? rate.rate : 10; // Default 10% if no matching rate
});

export default mongoose.models.SystemSettings || mongoose.model<SystemSettings>('SystemSettings', systemSettingsSchema); 