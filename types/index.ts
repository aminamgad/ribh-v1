export type UserRole = 'admin' | 'supplier' | 'marketer' | 'wholesaler';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  // Marketing account fields
  country?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female';
  websiteLink?: string;
  // Supplier account fields
  companyName?: string;
  commercialRegisterNumber?: string;
  address?: string;
  // Wholesaler account fields
  wholesaleLicense?: string;
  businessType?: 'electronics' | 'clothing' | 'food' | 'furniture' | 'automotive' | 'construction' | 'healthcare' | 'other';
  // Legacy field
  taxId?: string;
  settings?: {
    // Notification settings
    emailNotifications: boolean;
    pushNotifications: boolean;
    orderUpdates: boolean;
    productUpdates: boolean;
    marketingEmails: boolean;
    
    // Privacy settings
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    
    // Preferences
    language: 'ar' | 'en';
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    
    // Payment settings
    autoWithdraw: boolean;
    withdrawThreshold: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  _id: string;
  userId: string;
  balance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  transactions: Transaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  _id: string;
  walletId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string; // orderId, withdrawalId, etc.
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface Category {
  _id: string;
  name: string;
  nameEn?: string;
  description?: string;
  image?: string;
  images?: string[];
  icon?: string;
  isActive: boolean;
  parentId?: string;
  order: number;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  featured?: boolean;
  productCount?: number;
  level?: number;
  path?: string[];
  seoKeywords?: string[];
  showInMenu?: boolean;
  showInHome?: boolean;
  subcategories?: Category[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantValue {
  value: string;
  stockQuantity?: number; // الكمية المتوفرة لهذه القيمة
  customPrice?: number; // السعر المخصص لهذه القيمة
}

export interface ProductVariant {
  _id: string;
  name: string; // e.g., "Color", "Size", "Material"
  values: string[]; // e.g., ["Red", "Blue", "Green"] or ["S", "M", "L", "XL"] - kept for backward compatibility
  valueDetails?: ProductVariantValue[]; // تفاصيل كل قيمة مع السعر والكمية
  isRequired: boolean;
  order: number;
  stockQuantity?: number; // الكمية المتوفرة للمتغير (legacy - للتوافق مع الإصدارات السابقة)
  customPrice?: number; // السعر المخصص للمتغير (legacy - للتوافق مع الإصدارات السابقة)
}

export interface ProductVariantOption {
  variantId: string;
  variantName: string;
  value: string;
  price?: number; // Optional price adjustment for this variant
  stockQuantity: number;
  sku?: string;
  images?: string[]; // Specific images for this variant
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  marketingText?: string;
  images: string[];
  categoryId?: string;
  supplierId: string;
  supplierPrice: number;
  marketerPrice: number;
  wholesalerPrice: number;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
  stockQuantity: number;
  isActive: boolean;
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  lockReason?: string;
  isApproved: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  adminNotes?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  isFulfilled: boolean; // stored in Ribh warehouse
  tags: string[];
  specifications?: Record<string, string | number | boolean>;
  sku?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  views?: number;
  sales?: number;
  rating?: {
    average: number;
    count: number;
  };
  featured?: boolean;
  featuredUntil?: Date;
  // New variant fields
  hasVariants: boolean;
  variants?: ProductVariant[];
  variantOptions?: ProductVariantOption[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerRole: 'marketer' | 'wholesaler';
  supplierId: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  shippingMethod: string;
  shippingZone: string;
  commission: number;
  total: number;
  marketerProfit?: number;
  status: OrderStatus;
  paymentMethod: 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed';
  shippingAddress: Address;
  deliveryNotes?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingCompany?: string;
  cancellationReason?: string;
  returnReason?: string;
  adminNotes?: string;
  // Processing timestamps
  confirmedAt?: Date;
  confirmedBy?: string;
  processingAt?: Date;
  processedBy?: string;
  readyForShippingAt?: Date;
  readyForShippingBy?: string;
  shippedAt?: Date;
  shippedBy?: string;
  outForDeliveryAt?: Date;
  outForDeliveryBy?: string;
  deliveredAt?: Date;
  deliveredBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  returnedAt?: Date;
  returnedBy?: string;
  refundedAt?: Date;
  refundedBy?: string;
  fulfillmentRequestId?: string; // Link to fulfillment request
  // Profit distribution tracking
  profitsDistributed?: boolean;
  profitsDistributedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_shipping'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface OrderItem {
  productId: string | Product;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  priceType: 'marketer' | 'wholesale';
  selectedVariants?: Record<string, string>;
  variantOption?: {
    variantId: string;
    variantName: string;
    value: string;
    price: number;
    stockQuantity: number;
    sku: string;
    images: string[];
  };
}

export interface Address {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorate: string;
  postalCode?: string;
  notes?: string;
}

export interface FulfillmentRequest {
  _id: string;
  supplierId: string | User;
  supplierName?: string;
  supplierPhone?: string;
  products: FulfillmentProduct[];
  status: 'pending' | 'approved' | 'rejected';
  totalValue: number;
  totalItems: number;
  notes?: string;
  adminNotes?: string;
  approvedAt?: Date;
  approvedBy?: string | User;
  rejectedAt?: Date;
  rejectedBy?: string | User;
  rejectionReason?: string;
  warehouseLocation?: string;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  orderIds?: string[]; // Linked orders
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface FulfillmentProduct {
  productId: string;
  quantity: number;
  currentStock: number;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  productId?: string;
  subject: string;
  content: string;
  isRead: boolean;
  isApproved: boolean;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
}

export interface CommissionRate {
  _id: string;
  minPrice: number;
  maxPrice: number;
  percentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

import { SystemSettingValue } from './api';

export interface SystemSettings {
  _id: string;
  key: string;
  value: SystemSettingValue;
  description?: string;
  updatedAt: Date;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: Order[];
  topProducts: Product[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  // Marketing account fields
  country?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  websiteLink?: string;
  // Supplier account fields
  companyName?: string;
  commercialRegisterNumber?: string;
  address?: string;
  // Wholesaler account fields
  wholesaleLicense?: string;
  businessType?: 'electronics' | 'clothing' | 'food' | 'furniture' | 'automotive' | 'construction' | 'healthcare' | 'other';
  // Legacy field
  taxId?: string;
}

export interface ProductForm {
  name: string;
  description?: string;
  categoryId?: string;
  marketerPrice: number;
  wholesalerPrice: number;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
  stockQuantity: number;
  images: File[];
  tags: string[];
  specifications?: Record<string, string | number | boolean>;
}

export interface OrderForm {
  items: {
    productId: string;
    quantity: number;
  }[];
  shippingAddress: Address;
  deliveryNotes?: string;
}

// Filter and search types
export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFulfilled?: boolean;
  search?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  supplierId?: string;
  search?: string;
} 