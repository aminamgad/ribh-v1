import mongoose, { Schema, Document } from 'mongoose';

export interface CommissionRate {
  minPrice: number;
  maxPrice: number;
  rate: number;
}

export interface AdminProfitMargin {
  minPrice: number;
  maxPrice: number;
  margin: number; // Percentage
}

export interface WithdrawalSettings {
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFees: number;
}

export interface Governorate {
  name: string;
  cities: string[];
  shippingCost: number;
  isActive: boolean;
}

export interface ShippingRegion {
  _id?: mongoose.Types.ObjectId;
  regionName: string;
  description?: string;
  shippingCost: number;
  freeShippingThreshold?: number | null;
  isActive: boolean;
  villageIds?: number[];
  governorateName?: string;
  cityNames?: string[];
}

export interface SystemSettings {
  _id?: string;
  // Financial Settings
  withdrawalSettings: WithdrawalSettings;
  commissionRates: CommissionRate[];
  adminProfitMargins: AdminProfitMargin[]; // هامش ربح الإدارة بناءً على سعر المنتج
  
  // General Settings
  platformName: string;
  platformDescription: string;
  contactEmail: string;
  contactPhone: string;
  
  // Order Settings
  minimumOrderValue: number;
  maximumOrderValue: number;
  
  // Shipping Settings
  shippingEnabled: boolean;
  defaultShippingCost: number;
  defaultFreeShippingThreshold: number;
  governorates: Governorate[];
  shippingRegions?: ShippingRegion[];
  
  // Product Settings
  maxProductImages: number;
  maxProductDescriptionLength: number;
  autoApproveProducts: boolean;
  
  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  
  // Security Settings
  passwordMinLength: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  
  // Legal Settings
  termsOfService: string;
  privacyPolicy: string;
  refundPolicy: string;
  
  // Analytics Settings
  googleAnalyticsId: string;
  facebookPixelId: string;
  
  // Maintenance Settings
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  
  // External Company Integration Settings
  defaultExternalCompanyId?: mongoose.Types.ObjectId;
  autoCreatePackages?: boolean;
  createPackageOnOrderCreate?: boolean;
  
  // Product price recalculation status (for admin notification when done)
  recalculationStatus?: {
    status: 'idle' | 'running' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    result?: { updated: number; skipped: number; errors: number };
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettingsDocument extends Omit<SystemSettings, '_id'>, Document {}

const commissionRateSchema = new Schema<CommissionRate>({
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

const adminProfitMarginSchema = new Schema<AdminProfitMargin>({
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
  margin: {
    type: Number,
    required: true,
    min: 0
    // لا حد أقصى: يمكن استخدام 100% أو 200% أو أي نسبة مئوية
  }
});

const withdrawalSettingsSchema = new Schema<WithdrawalSettings>({
  minimumWithdrawal: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  maximumWithdrawal: {
    type: Number,
    required: true,
    min: 0,
    default: 50000
  },
  withdrawalFees: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  }
});

const systemSettingsSchema = new Schema<SystemSettingsDocument>({
  // Financial Settings
  withdrawalSettings: {
    type: withdrawalSettingsSchema,
    required: true,
    default: () => ({
      minimumWithdrawal: 100,
      maximumWithdrawal: 50000,
      withdrawalFees: 0
    })
  },
  // commissionRates deprecated - using adminProfitMargins only
  commissionRates: {
    type: [commissionRateSchema],
    default: [] // Empty - not used anymore
  },
  adminProfitMargins: {
    type: [adminProfitMarginSchema],
    default: [
      { minPrice: 1, maxPrice: 100, margin: 5 },
      { minPrice: 101, maxPrice: 500, margin: 5 },
      { minPrice: 501, maxPrice: 1000, margin: 5 },
      { minPrice: 1001, maxPrice: 999999, margin: 5 }
    ]
  },
  
  // General Settings
  platformName: {
    type: String,
    required: true,
    default: 'ربح'
  },
  platformDescription: {
    type: String,
    default: 'منصة التجارة الإلكترونية العربية'
  },
  contactEmail: {
    type: String,
    default: 'support@ribh.com'
  },
  contactPhone: {
    type: String,
    default: '+966500000000'
  },
  
  // Order Settings
  minimumOrderValue: {
    type: Number,
    required: true,
    min: 0,
    default: 50
  },
  maximumOrderValue: {
    type: Number,
    required: true,
    min: 0,
    default: 100000
  },
  
  // Shipping Settings
  shippingEnabled: {
    type: Boolean,
    default: true
  },
  defaultShippingCost: {
    type: Number,
    required: true,
    min: 0,
    default: 50
  },
  defaultFreeShippingThreshold: {
    type: Number,
    required: true,
    min: 0,
    default: 500
  },
  governorates: {
    type: [
      {
        name: { type: String, required: true },
        cities: [{ type: String, required: true }],
        shippingCost: { type: Number, required: true, min: 0 },
        isActive: { type: Boolean, default: true }
      }
    ],
    default: [
      {
        name: 'المملكة العربية السعودية',
        cities: ['الرياض', 'جدة', 'مكة المكرمة', 'الدمام', 'الجبيل', 'الخبر', 'القطيف', 'الطائف', 'المدينة المنورة', 'الباحة', 'الحدود الشمالية', 'الحدود الجنوبية', 'المنطقة الشرقية', 'المنطقة الغربية'],
        shippingCost: 50,
        isActive: true
      }
    ]
  },
  // Shipping regions/prices for marketers (managed by admin)
  shippingRegions: {
    type: [
      {
        regionName: { type: String, required: true },
        description: { type: String },
        shippingCost: { type: Number, required: true, min: 0 },
        freeShippingThreshold: { type: Number, min: 0, default: null }, // null means use default
        isActive: { type: Boolean, default: true },
        // Optional: link to village IDs for automatic mapping
        villageIds: [{ type: Number }],
        // Optional: link to governorate/city names for mapping
        governorateName: { type: String },
        cityNames: [{ type: String }]
      }
    ],
    default: []
  },
  
  // Product Settings
  maxProductImages: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
    default: 10
  },
  maxProductDescriptionLength: {
    type: Number,
    required: true,
    min: 100,
    max: 5000,
    default: 1000
  },
  autoApproveProducts: {
    type: Boolean,
    default: false
  },
  
  // Notification Settings
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: false
  },
  pushNotifications: {
    type: Boolean,
    default: true
  },
  
  // Security Settings
  passwordMinLength: {
    type: Number,
    required: true,
    min: 6,
    max: 20,
    default: 8
  },
  sessionTimeout: {
    type: Number,
    required: true,
    min: 15,
    max: 1440,
    default: 60
  },
  maxLoginAttempts: {
    type: Number,
    required: true,
    min: 3,
    max: 10,
    default: 5
  },
  
  // Legal Settings
  termsOfService: {
    type: String,
    default: 'شروط الخدمة'
  },
  privacyPolicy: {
    type: String,
    default: 'سياسة الخصوصية'
  },
  refundPolicy: {
    type: String,
    default: 'سياسة الاسترداد'
  },
  
  // Analytics Settings
  googleAnalyticsId: {
    type: String,
    default: ''
  },
  facebookPixelId: {
    type: String,
    default: ''
  },
  
  // Maintenance Settings
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.'
  },
  
  // External Company Integration Settings
  defaultExternalCompanyId: {
    type: Schema.Types.ObjectId,
    ref: 'ExternalCompany',
    index: true
  },
  autoCreatePackages: {
    type: Boolean,
    default: true,
    // If true: Package is created immediately when order is created
    // If false: Package is created only when order status changes to ready_for_shipping
  },
  createPackageOnOrderCreate: {
    type: Boolean,
    default: true,
    // Alias for autoCreatePackages - for backward compatibility
    // If true: Order is sent to shipping company immediately upon creation
  },
  // Product price recalculation status (for admin completion notification)
  recalculationStatus: {
    status: { type: String, enum: ['idle', 'running', 'completed', 'failed'], default: 'idle' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    result: {
      updated: { type: Number },
      skipped: { type: Number },
      errors: { type: Number }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
systemSettingsSchema.index({ createdAt: -1 });

// Virtual for formatted commission rates
systemSettingsSchema.virtual('formattedCommissionRates').get(function() {
  return this.commissionRates.map(rate => ({
    ...rate,
    formattedRange: `${rate.minPrice}₪ - ${rate.maxPrice}₪`,
    formattedRate: `${rate.rate}%`
  }));
});

// Method to get commission rate for order total
systemSettingsSchema.methods.getCommissionRate = function(orderTotal: number): number {
  for (const rate of this.commissionRates) {
    if (orderTotal >= rate.minPrice && orderTotal <= rate.maxPrice) {
      return rate.rate;
    }
  }
  return 5; // Default rate
};

// Method to calculate commission
systemSettingsSchema.methods.calculateCommission = function(orderTotal: number): number {
  const rate = this.getCommissionRate(orderTotal);
  return (orderTotal * rate) / 100;
};

// Method to get admin profit margin for a product price
systemSettingsSchema.methods.getAdminProfitMargin = function(productPrice: number): number {
  if (!this.adminProfitMargins || this.adminProfitMargins.length === 0) {
    return 5; // Default margin
  }
  
  for (const margin of this.adminProfitMargins) {
    if (productPrice >= margin.minPrice && productPrice <= margin.maxPrice) {
      return margin.margin;
    }
  }
  
  return 5; // Default margin if no match
};

// Method to calculate admin profit for a product
systemSettingsSchema.methods.calculateAdminProfit = function(productPrice: number, quantity: number = 1): number {
  const margin = this.getAdminProfitMargin(productPrice);
  return (productPrice * margin / 100) * quantity;
};

// Method to validate withdrawal amount
systemSettingsSchema.methods.validateWithdrawalAmount = function(amount: number): { valid: boolean; message?: string } {
  if (amount < this.withdrawalSettings.minimumWithdrawal) {
    return {
      valid: false,
      message: `المبلغ أقل من الحد الأدنى للسحب: ${this.withdrawalSettings.minimumWithdrawal}₪`
    };
  }
  
  if (amount > this.withdrawalSettings.maximumWithdrawal) {
    return {
      valid: false,
      message: `المبلغ أكبر من الحد الأقصى للسحب: ${this.withdrawalSettings.maximumWithdrawal}₪`
    };
  }
  
  return { valid: true };
};

// Method to calculate withdrawal fees
systemSettingsSchema.methods.calculateWithdrawalFees = function(amount: number): number {
  return (amount * this.withdrawalSettings.withdrawalFees) / 100;
};

// Export model with proper handling for Next.js hot reloading
let SystemSettingsModel: mongoose.Model<SystemSettingsDocument>;

if (mongoose.models && mongoose.models.SystemSettings) {
  SystemSettingsModel = mongoose.models.SystemSettings as mongoose.Model<SystemSettingsDocument>;
} else {
  SystemSettingsModel = mongoose.model<SystemSettingsDocument>('SystemSettings', systemSettingsSchema);
}

export default SystemSettingsModel; 