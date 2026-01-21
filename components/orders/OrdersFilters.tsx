'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Calendar, X, Filter } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import OrderStatusMultiSelect from '@/components/ui/OrderStatusMultiSelect';
import type { OrderStatusValue } from '@/components/ui/OrderStatusMultiSelect';

interface OrdersFiltersProps {
  onFiltersChange?: () => void;
}

export default function OrdersFilters({ onFiltersChange }: OrdersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Filter states - initialize from URL
  const [customerSearch, setCustomerSearch] = useState(() => searchParams.get('customerSearch') || '');
  const [orderNumberSearch, setOrderNumberSearch] = useState(() => searchParams.get('orderNumberSearch') || '');
  const [productSearch, setProductSearch] = useState(() => searchParams.get('productSearch') || '');
  const [startDate, setStartDate] = useState(() => searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(() => searchParams.get('endDate') || '');
  
  // Refs to store current date values for immediate access in onChange handlers
  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  
  // Update refs when state changes
  useEffect(() => {
    startDateRef.current = startDate;
  }, [startDate]);
  
  useEffect(() => {
    endDateRef.current = endDate;
  }, [endDate]);
  // Status filter - now supports multiple selections (array)
  const [filterStatus, setFilterStatus] = useState<OrderStatusValue[]>(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== 'all') {
      return statusParam.split(',').filter(Boolean) as OrderStatusValue[];
    }
    return [];
  });

  // Ref to track if component just mounted (to avoid auto-update on mount)
  const isInitialMount = useRef(true);


  useEffect(() => {
    // Mark initial mount as complete after first render
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Sync filter states with URL params when URL changes externally
  useEffect(() => {
    // Read from window.location directly since searchParams doesn't update with history.replaceState
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const statusFromUrl = params.get('status') || '';
    const customerFromUrl = params.get('customerSearch') || '';
    const orderNumberFromUrl = params.get('orderNumberSearch') || '';
    const productFromUrl = params.get('productSearch') || '';
    const startDateFromUrl = params.get('startDate') || '';
    const endDateFromUrl = params.get('endDate') || '';
    
    // Only update if different to avoid loops
    // Parse status as array (comma-separated)
    const statusArray = statusFromUrl && statusFromUrl !== 'all' 
      ? statusFromUrl.split(',').filter(Boolean) as OrderStatusValue[]
      : [];
    if (JSON.stringify(statusArray) !== JSON.stringify(filterStatus)) {
      setFilterStatus(statusArray);
    }
    if (customerFromUrl !== customerSearch) {
      setCustomerSearch(customerFromUrl);
    }
    if (orderNumberFromUrl !== orderNumberSearch) {
      setOrderNumberSearch(orderNumberFromUrl);
    }
    if (productFromUrl !== productSearch) {
      setProductSearch(productFromUrl);
    }
    if (startDateFromUrl !== startDate) {
      setStartDate(startDateFromUrl);
    }
    if (endDateFromUrl !== endDate) {
      setEndDate(endDateFromUrl);
    }
  }, []); // Only run once on mount - URL changes will be handled by the filters themselves

  // Auto-update function - accepts optional overrides for immediate updates
  const applyFiltersAuto = useCallback((
    overrideCustomerSearch?: string,
    overrideOrderNumberSearch?: string,
    overrideProductSearch?: string,
    overrideStartDate?: string,
    overrideEndDate?: string,
    overrideFilterStatus?: OrderStatusValue[]
  ) => {
    if (isInitialMount.current) return;
    
    const params = new URLSearchParams();

    // Search filters - use override values if provided, otherwise use state values
    const currentCustomerSearch = overrideCustomerSearch !== undefined ? overrideCustomerSearch : customerSearch;
    const currentOrderNumberSearch = overrideOrderNumberSearch !== undefined ? overrideOrderNumberSearch : orderNumberSearch;
    const currentProductSearch = overrideProductSearch !== undefined ? overrideProductSearch : productSearch;
    
    if (currentCustomerSearch.trim()) {
      params.set('customerSearch', currentCustomerSearch.trim());
    }
    if (currentOrderNumberSearch.trim()) {
      params.set('orderNumberSearch', currentOrderNumberSearch.trim());
    }
    if (currentProductSearch.trim()) {
      params.set('productSearch', currentProductSearch.trim());
    }

    // Date range - use override values if provided, otherwise use state values
    // Input type="date" always returns YYYY-MM-DD format
    const currentStartDate = overrideStartDate !== undefined ? overrideStartDate : startDate;
    const currentEndDate = overrideEndDate !== undefined ? overrideEndDate : endDate;
    
    if (currentStartDate && currentStartDate.trim()) {
      params.set('startDate', currentStartDate.trim());
    }
    if (currentEndDate && currentEndDate.trim()) {
      params.set('endDate', currentEndDate.trim());
    }

    // Status filter - use override value if provided, otherwise use state value
    // Now supports array of statuses
    const currentFilterStatus = overrideFilterStatus !== undefined ? overrideFilterStatus : filterStatus;
    if (currentFilterStatus && currentFilterStatus.length > 0) {
      params.set('status', currentFilterStatus.join(','));
    } else {
      params.delete('status');
    }

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? `?${queryString}` : ''}`;
    
    // Get current URL directly (don't use searchParams in comparison to avoid infinite loop)
    const currentSearch = window.location.search || '';
    const currentUrl = `${pathname}${currentSearch}`;
    
    // Compare query strings using URLSearchParams for accurate comparison
    const currentParams = new URLSearchParams(currentSearch);
    const newParams = new URLSearchParams(queryString);
    
    // Check if all key params match (especially dates)
    const urlStartDate = currentParams.get('startDate') || '';
    const urlEndDate = currentParams.get('endDate') || '';
    const newStartDate = newParams.get('startDate') || '';
    const newEndDate = newParams.get('endDate') || '';
    
    // Compare all relevant params - normalize empty strings and nulls
    // For status, compare arrays (sorted to ensure consistent comparison)
    const normalizeParam = (val: string | null) => val || '';
    const normalizeStatusArray = (val: string | null) => {
      if (!val || val === 'all') return '';
      return val.split(',').filter(Boolean).sort().join(',');
    };
    const allParamsMatch = 
      normalizeStatusArray(currentParams.get('status')) === normalizeStatusArray(newParams.get('status')) &&
      normalizeParam(currentParams.get('customerSearch')) === normalizeParam(newParams.get('customerSearch')) &&
      normalizeParam(currentParams.get('orderNumberSearch')) === normalizeParam(newParams.get('orderNumberSearch')) &&
      normalizeParam(currentParams.get('productSearch')) === normalizeParam(newParams.get('productSearch')) &&
      urlStartDate === newStartDate &&
      urlEndDate === newEndDate;
    
    // Always update if query strings don't match exactly (including empty strings)
    const currentQueryNormalized = currentSearch.replace(/^\?/, '');
    const newQueryNormalized = queryString;
    
    if (allParamsMatch && currentQueryNormalized === newQueryNormalized) {
      // All params match exactly, no need to update
      return;
    }
    
    // Save filters to sessionStorage
    try {
      if (queryString) {
        sessionStorage.setItem('filters_/dashboard/orders', queryString);
      } else {
        sessionStorage.removeItem('filters_/dashboard/orders');
      }
    } catch (e) {
      // Ignore errors
    }

    // Update URL immediately using window.history (no router, no setTimeout)
    // This prevents Next.js from reloading the page and triggers immediate data refresh
    if (typeof window !== 'undefined') {
      const newState = { ...window.history.state, as: newUrl, url: newUrl };
      window.history.replaceState(newState, '', newUrl);
      
      // Trigger custom event immediately to update URL state in page component
      // This ensures cacheKey updates immediately and data refreshes right away
      window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: queryString } }));
    }
  }, [customerSearch, orderNumberSearch, productSearch, startDate, endDate, filterStatus, pathname]);
  
  // Ref to track current filterStatus for immediate access in onChange handlers
  const filterStatusRef = useRef(filterStatus);
  
  // Update ref when state changes
  useEffect(() => {
    filterStatusRef.current = filterStatus;
  }, [filterStatus]);

  // Note: All filters now apply immediately via onChange handlers
  // No useEffect needed - this ensures instant response

  // Note: Text inputs now apply filters immediately via onChange handlers
  // This useEffect is kept as a fallback but should not trigger often
  useEffect(() => {
    if (isInitialMount.current) return;
    // Text inputs handle their own updates now, so this is just a safety net
  }, [customerSearch, orderNumberSearch, productSearch, applyFiltersAuto]);

  // Note: applyFilters function removed - filters now apply automatically via onChange handlers
  // This provides instant response without needing a search button

  const clearFilters = () => {
    setCustomerSearch('');
    setOrderNumberSearch('');
    setProductSearch('');
    setStartDate('');
    setEndDate('');
    setFilterStatus([]);

    // Clear from sessionStorage
    try {
      sessionStorage.removeItem('filters_/dashboard/orders');
    } catch (e) {
      // Ignore errors
    }

    // Update URL immediately - state updates are synchronous for clearing
    if (typeof window !== 'undefined') {
      const newUrl = pathname;
      const newState = { ...window.history.state, as: newUrl, url: newUrl };
      window.history.replaceState(newState, '', newUrl);
      
      // Trigger custom event immediately to update URL state in page component
      // This ensures cacheKey updates immediately and data refreshes right away
      window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: '' } }));
    }
  };

  const hasActiveFilters =
    customerSearch.trim() ||
    orderNumberSearch.trim() ||
    productSearch.trim() ||
    startDate ||
    endDate ||
    (filterStatus && filterStatus.length > 0);

  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-gray-50 dark:bg-slate-800/50 p-3 sm:p-4 md:p-6 rounded-lg border border-gray-200 dark:border-slate-700">
      {/* Mobile Filter Toggle */}
      <div className="sm:hidden mb-3">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowFilters(!showFilters);
          }}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors min-h-[44px] ${
            hasActiveFilters
              ? 'bg-[#4CAF50] text-white'
              : 'bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">فلاتر البحث</span>
            {hasActiveFilters && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
                {[
                  customerSearch.trim(),
                  orderNumberSearch.trim(),
                  productSearch.trim(),
                  startDate,
                  endDate,
                  filterStatus.length > 0 ? filterStatus : null
                ].filter(Boolean).length}
              </span>
            )}
          </div>
          <span className="text-xs">{showFilters ? 'إخفاء' : 'عرض'}</span>
        </button>
      </div>

      {/* Filters Panel */}
      <div className={`${showFilters ? 'block' : 'hidden'} sm:block space-y-3 sm:space-y-4`}>
        {/* Search Fields Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Customer/Phone Search */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              قم بالبحث باستخدام اسم العميل أو رقم هاتف العميل
            </label>
            <div className="relative">
              <Search className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setCustomerSearch(newValue);
                  // Update ref immediately
                  // Apply immediately with the new value directly
                  if (!isInitialMount.current) {
                    applyFiltersAuto(newValue, undefined, undefined);
                  }
                }}
                placeholder="اسم العميل أو رقم الهاتف"
                className="w-full pr-9 sm:pr-11 pl-3 sm:pl-4 py-2.5 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
              />
            </div>
          </div>

          {/* Order Number Search */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              قم بالبحث باستخدام كود الطلب
            </label>
            <div className="relative">
              <Search className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
              <input
                type="text"
                value={orderNumberSearch}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setOrderNumberSearch(newValue);
                  // Apply immediately with the new value directly
                  if (!isInitialMount.current) {
                    applyFiltersAuto(undefined, newValue, undefined);
                  }
                }}
                placeholder="رقم الطلب"
                className="w-full pr-9 sm:pr-11 pl-3 sm:pl-4 py-2.5 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
              />
            </div>
          </div>

          {/* Product/SKU Search */}
          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              البحث باسم المنتج أو SKU
            </label>
            <div className="relative">
              <Search className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setProductSearch(newValue);
                  // Apply immediately with the new value directly
                  if (!isInitialMount.current) {
                    applyFiltersAuto(undefined, undefined, newValue);
                  }
                }}
                placeholder="اسم المنتج أو SKU"
                className="w-full pr-9 sm:pr-11 pl-3 sm:pl-4 py-2.5 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Search Fields Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
              من تاريخ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setStartDate(newDate);
                // Update ref immediately
                startDateRef.current = newDate;
                // Force immediate update for date changes - pass new value directly
                if (!isInitialMount.current) {
                  // Apply immediately with the new date value and current endDate from ref
                  applyFiltersAuto(undefined, undefined, undefined, newDate, endDateRef.current);
                }
              }}
              className="w-full px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline ml-1" />
              إلى تاريخ
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setEndDate(newDate);
                // Update ref immediately
                endDateRef.current = newDate;
                // Force immediate update for date changes - pass new value directly
                if (!isInitialMount.current) {
                  // Apply immediately with current startDate from ref and new date value
                  applyFiltersAuto(undefined, undefined, undefined, startDateRef.current, newDate);
                }
              }}
              className="w-full px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
            />
          </div>

          {/* Status Filter - Multi-Select */}
          <div className="sm:col-span-2 md:col-span-1">
            <OrderStatusMultiSelect
              value={filterStatus}
              onChange={(value) => {
                setFilterStatus(value);
                // Update ref immediately
                filterStatusRef.current = value;
                // Apply immediately with the new status array directly
                if (!isInitialMount.current) {
                  console.log('Order status filter changed - calling applyFiltersAuto:', {
                    value,
                    valueLength: value?.length,
                    valueType: typeof value,
                    isArray: Array.isArray(value)
                  });
                  applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, value);
                }
              }}
              label="حالة الطلب"
            />
          </div>
        </div>

        {/* Action Button - Clear Filters Only */}
        {/* Note: Search button removed - filters apply automatically when fields change */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-700">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-700 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base font-medium"
            >
              <X className="w-4 h-4" />
              إزالة الفلترة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

