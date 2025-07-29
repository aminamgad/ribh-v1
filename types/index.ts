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
  companyName?: string;
  address?: string;
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
  isActive: boolean;
  parentId?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  _id: string;
  name: string;
  nameEn?: string;
  description: string;
  images: string[];
  categoryId: string;
  supplierId: string;
  marketerPrice: number;
  wholesalePrice: number;
  costPrice: number;
  stockQuantity: number;
  isActive: boolean;
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
  specifications?: Record<string, any>;
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
  commission: number;
  total: number;
  status: OrderStatus;
  paymentMethod: 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed';
  shippingAddress: Address;
  deliveryNotes?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  priceType: 'marketer' | 'wholesale';
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
  supplierId: string;
  products: FulfillmentProduct[];
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  adminNotes?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  totalValue: number;
  warehouseLocation?: string;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
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

export interface SystemSettings {
  _id: string;
  key: string;
  value: any;
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

export interface ApiResponse<T = any> {
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
  companyName?: string;
  address?: string;
  taxId?: string;
}

export interface ProductForm {
  name: string;
  nameEn?: string;
  description: string;
  categoryId: string;
  marketerPrice: number;
  wholesalePrice: number;
  costPrice: number;
  stockQuantity: number;
  images: File[];
  tags: string[];
  specifications?: Record<string, any>;
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