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
  generateApiKey(): string;
  generateApiSecret(): string;
  verifyApiKey(apiKey: string): boolean;
}

const externalCompanySchema = new Schema<ExternalCompanyDocument>({
  companyName: {
    type: String,
    required: [true, 'اسم الشركة مطلوب'],
    trim: true,
    unique: true,
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
externalCompanySchema.index({ companyName: 1 });

const ExternalCompany = mongoose.models.ExternalCompany || mongoose.model<ExternalCompanyDocument>('ExternalCompany', externalCompanySchema);

export default ExternalCompany;

