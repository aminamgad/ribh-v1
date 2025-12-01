/**
 * API-specific Type Definitions
 * Types for API requests, responses, and handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from './index';

// API Handler Types
export type ApiHandler = (req: NextRequest, user: User) => Promise<NextResponse>;
export type ApiHandlerWithParams<T = Record<string, string>> = (
  req: NextRequest,
  user: User,
  context: { params: T }
) => Promise<NextResponse>;

// Request Context Types
export interface RequestContext {
  user: User;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

// API Response Types
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: Array<{ path: string; message: string }>;
  code?: string;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Query Parameters Types
export interface ProductQueryParams extends PaginationParams {
  categoryId?: string;
  supplierId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isApproved?: boolean;
  isActive?: boolean;
  featured?: boolean;
}

export interface OrderQueryParams extends PaginationParams {
  status?: string;
  customerId?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface UserQueryParams extends PaginationParams {
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  search?: string;
}

// System Settings Types
export type SystemSettingValue = 
  | string 
  | number 
  | boolean 
  | string[] 
  | number[] 
  | Record<string, string | number | boolean>;

export interface SystemSettingsUpdate {
  commission?: number;
  marketerCommission?: number;
  minProfitMargin?: number;
  maxProfitMargin?: number;
  baseShippingCost?: number;
  shippingCostPerKg?: number;
  minimumWithdrawal?: number;
  maximumWithdrawal?: number;
  withdrawalFee?: number;
  maxProductImages?: number;
  maxProductDescription?: number;
  requireProductImages?: boolean;
  orderProcessingTime?: number;
  maintenanceMode?: boolean;
  allowRegistration?: boolean;
  [key: string]: SystemSettingValue | undefined;
}

// Cache Types
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Logger Context Types
export interface LogContext {
  userId?: string;
  role?: UserRole;
  orderId?: string;
  productId?: string;
  categoryId?: string;
  [key: string]: string | number | boolean | undefined;
}

// Error Types
export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

// File Upload Types
export interface UploadedFile {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  secureUrl?: string;
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFile[];
  message?: string;
}

// Notification Options Types
export interface NotificationOptions {
  sendEmail?: boolean;
  sendSocket?: boolean;
}

