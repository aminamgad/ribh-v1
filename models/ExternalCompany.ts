import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface ExternalCompanyDocument extends Document {
  companyName: string;
  apiKey: string;
  apiSecret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  // API endpoint for calling external shipping company
  apiEndpointUrl?: string; // URL of external shipping company API (e.g., https://shipping-company.com/api/create-package)
  apiToken?: string; // Bearer token for authenticating with external shipping company API
  // Shipping data specific to this company
  shippingCities?: Array<{
    cityName: string;
    cityCode?: string;
    isActive: boolean;
  }>;
  shippingRegions?: Array<{
    regionName: string;
    regionCode?: string;
    cities: string[];
    isActive: boolean;
  }>;
  generateApiKey(): string;
  generateApiSecret(): string;
  verifyApiKey(apiKey: string): boolean;
}

const externalCompanySchema = new Schema<ExternalCompanyDocument>({
  companyName: {
    type: String,
    required: [true, 'اسم الشركة مطلوب'],
    trim: true,
    maxlength: [200, 'اسم الشركة لا يمكن أن يتجاوز 200 حرف']
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  apiSecret: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  },
  // API endpoint for calling external shipping company
  apiEndpointUrl: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v: string | undefined) {
        if (!v) return true; // Optional field
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'apiEndpointUrl must be a valid URL'
    }
  },
  apiToken: {
    type: String,
    required: false,
    trim: true
  },
  // Shipping cities/regions specific to this company
  shippingCities: {
    type: [{
      cityName: { type: String, required: true },
      cityCode: { type: String },
      isActive: { type: Boolean, default: true }
    }],
    default: []
  },
  shippingRegions: {
    type: [{
      regionName: { type: String, required: true },
      regionCode: { type: String },
      cities: [{ type: String }],
      isActive: { type: Boolean, default: true }
    }],
    default: []
  }
}, {
  timestamps: true
});

// Generate API Key
externalCompanySchema.methods.generateApiKey = function(): string {
  return `ribh_${crypto.randomBytes(32).toString('hex')}`;
};

// Generate API Secret
externalCompanySchema.methods.generateApiSecret = function(): string {
  return crypto.randomBytes(64).toString('hex');
};

// Verify API Key
externalCompanySchema.methods.verifyApiKey = function(apiKey: string): boolean {
  return this.apiKey === apiKey && this.isActive;
};

// Indexes
externalCompanySchema.index({ apiKey: 1, isActive: 1 });
externalCompanySchema.index({ companyName: 1 }, { unique: true }); // Unique index for companyName

const ExternalCompany = mongoose.models.ExternalCompany || mongoose.model<ExternalCompanyDocument>('ExternalCompany', externalCompanySchema);

export default ExternalCompany;

