'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Filter, X, Calendar, Download } from 'lucide-react';
import { usePathname } from 'next/navigation';
import MultiSelect from '@/components/ui/MultiSelect';
import toast from 'react-hot-toast';

interface Supplier {
  _id: string;
  name: string;
  companyName?: string;
}

interface AdminProductFiltersProps {
  onFiltersChange?: () => void;
}

const AdminProductFilters = memo(function AdminProductFilters({ onFiltersChange }: AdminProductFiltersProps) {
  const pathname = usePathname();
  
  // Helper function to get URL params without causing re-renders
  const getUrlParam = (key: string): string => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || '';
  };
  
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`showFilters_${pathname}`);
      return saved === 'true';
    }
    return false;
  });
  
  // Use ref to track current showFilters value to prevent losing state on re-renders
  const showFiltersRef = useRef(showFilters);
  
  // Update ref and sessionStorage when state changes
  useEffect(() => {
    showFiltersRef.current = showFilters;
    // Save to sessionStorage whenever showFilters changes (except on initial mount)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`showFilters_${pathname}`, String(showFilters));
    }
  }, [showFilters, pathname]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Filter states
  const [selectedStockStatus, setSelectedStockStatus] = useState<string[]>(() => {
    const stockParam = getUrlParam('stockStatus');
    return stockParam ? stockParam.split(',').filter(Boolean) : [];
  });
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(() => {
    const suppliersParam = getUrlParam('suppliers');
    return suppliersParam ? suppliersParam.split(',').filter(Boolean) : [];
  });
  const [startDate, setStartDate] = useState(() => getUrlParam('startDate'));
  const [endDate, setEndDate] = useState(() => getUrlParam('endDate'));
  
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

  // Ref to track if component just mounted (to avoid auto-update on mount)
  const isInitialMount = useRef(true);

  // Stock status options
  const stockStatusOptions = useMemo(() => [
    { value: 'in_stock', label: 'متوفر (أكثر من 10)' },
    { value: 'low_stock', label: 'منخفض (1-10)' },
    { value: 'out_of_stock', label: 'نفد (0)' },
  ], []);

  useEffect(() => {
    fetchSuppliers();
    // Mark initial mount as complete after first render
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-update function - accepts optional overrides for immediate updates
  const applyFiltersAuto = useCallback((
    overrideStartDate?: string,
    overrideEndDate?: string,
    overrideSelectedStockStatus?: string[],
    overrideSelectedSuppliers?: string[]
  ) => {
    if (isInitialMount.current) return;
    
    // Get current search params directly (don't include in dependencies to avoid infinite loop)
    const currentSearch = window.location.search || '';
    const currentParams = new URLSearchParams(currentSearch);
    const params = new URLSearchParams();

    // Stock status filter - use override value if provided, otherwise use state value
    const currentSelectedStockStatus = overrideSelectedStockStatus !== undefined ? overrideSelectedStockStatus : selectedStockStatus;
    if (currentSelectedStockStatus.length > 0) {
      params.set('stockStatus', currentSelectedStockStatus.join(','));
    } else {
      params.delete('stockStatus');
    }

    // Suppliers filter - use override value if provided, otherwise use state value
    const currentSelectedSuppliers = overrideSelectedSuppliers !== undefined ? overrideSelectedSuppliers : selectedSuppliers;
    if (currentSelectedSuppliers.length > 0) {
      params.set('suppliers', currentSelectedSuppliers.join(','));
    } else {
      params.delete('suppliers');
    }

    // Date range filter - use override values if provided, otherwise use state values
    const currentStartDate = overrideStartDate !== undefined ? overrideStartDate : startDate;
    const currentEndDate = overrideEndDate !== undefined ? overrideEndDate : endDate;
    
    if (currentStartDate) {
      params.set('startDate', currentStartDate);
    } else {
      params.delete('startDate');
    }

    if (currentEndDate) {
      params.set('endDate', currentEndDate);
    } else {
      params.delete('endDate');
    }

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? `?${queryString}` : ''}`;
    
    // Only update if URL actually changed to avoid unnecessary updates
    // Normalize comparison - remove leading ? from currentSearch
    const currentQueryNormalized = currentSearch.replace(/^\?/, '');
    const newQueryNormalized = queryString;
    const currentUrl = `${pathname}${currentSearch}`;
    
    // Compare query strings using URLSearchParams for accurate comparison
    const normalizeParam = (val: string | null) => val || '';
    const allParamsMatch = 
      normalizeParam(currentParams.get('stockStatus')) === normalizeParam(new URLSearchParams(queryString).get('stockStatus')) &&
      normalizeParam(currentParams.get('suppliers')) === normalizeParam(new URLSearchParams(queryString).get('suppliers')) &&
      normalizeParam(currentParams.get('startDate')) === normalizeParam(new URLSearchParams(queryString).get('startDate')) &&
      normalizeParam(currentParams.get('endDate')) === normalizeParam(new URLSearchParams(queryString).get('endDate'));
    
    if (allParamsMatch && currentQueryNormalized === newQueryNormalized) {
      // All params match exactly, no need to update
      return;
    }
    
    // Save filters to sessionStorage
    try {
      if (queryString) {
        sessionStorage.setItem(`filters_${pathname}`, queryString);
      } else {
        sessionStorage.removeItem(`filters_${pathname}`);
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
    
    // Update data AFTER URL update to ensure cache key is updated first
    if (onFiltersChange) {
      onFiltersChange();
    }
  }, [selectedStockStatus, selectedSuppliers, startDate, endDate, onFiltersChange, pathname]);

  // Note: All filters now apply immediately via onChange handlers
  // No useEffect needed - this ensures instant response

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const response = await fetch('/api/admin/users?role=supplier&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.users || []);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب قائمة الموردين');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const supplierOptions = useMemo(() => suppliers.map((supplier) => ({
    value: supplier._id,
    label: supplier.companyName || supplier.name,
  })), [suppliers]);

  const applyFilters = () => {
    applyFiltersAuto();
    // Don't hide filters automatically - let user close them manually
  };

  const clearFilters = () => {
    setSelectedStockStatus([]);
    setSelectedSuppliers([]);
    setStartDate('');
    setEndDate('');

    // Get current URL params and remove filter params
    const currentSearch = window.location.search || '';
    const params = new URLSearchParams(currentSearch);
    params.delete('stockStatus');
    params.delete('suppliers');
    params.delete('startDate');
    params.delete('endDate');

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? `?${queryString}` : ''}`;

    // Clear from sessionStorage
    try {
      if (queryString) {
        sessionStorage.setItem(`filters_${pathname}`, queryString);
      } else {
        sessionStorage.removeItem(`filters_${pathname}`);
      }
    } catch (e) {
      // Ignore errors
    }

    // Update URL immediately - state updates are synchronous for clearing
    if (typeof window !== 'undefined') {
      const newState = { ...window.history.state, as: newUrl, url: newUrl };
      window.history.replaceState(newState, '', newUrl);
      
      // Trigger custom event immediately to update URL state in page component
      // This ensures cacheKey updates immediately and data refreshes right away
      window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: queryString } }));
    }
    
    // Update data AFTER URL update to ensure cache key is updated first
    if (onFiltersChange) {
      onFiltersChange();
    }
  };

  const hasActiveFilters = useMemo(() =>
    selectedStockStatus.length > 0 ||
    selectedSuppliers.length > 0 ||
    startDate ||
    endDate,
    [selectedStockStatus, selectedSuppliers, startDate, endDate]
  );

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedStockStatus.length > 0) {
        params.append('stockStatus', selectedStockStatus.join(','));
      }
      if (selectedSuppliers.length > 0) {
        params.append('suppliers', selectedSuppliers.join(','));
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/products/export?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('تم تصدير المنتجات بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في تصدير المنتجات');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تصدير المنتجات');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const newValue = !showFilters;
            setShowFilters(newValue);
            // Save to sessionStorage to persist across re-renders
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(`showFilters_${pathname}`, String(newValue));
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            hasActiveFilters
              ? 'bg-[#FF9800] text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>فلاتر المنتجات</span>
          {hasActiveFilters && (
            <span className="bg-white/20 dark:bg-white/20 text-xs px-2 py-0.5 rounded-full">
              {[selectedStockStatus.length, selectedSuppliers.length, startDate ? 1 : 0, endDate ? 1 : 0]
                .filter((count) => count > 0).length}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              فلاتر المنتجات المتقدمة
            </h3>
            <button
              onClick={() => {
                setShowFilters(false);
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem(`showFilters_${pathname}`, 'false');
                }
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stock Status Filter */}
          <div>
            <MultiSelect
              options={stockStatusOptions}
              selected={selectedStockStatus}
              onChange={(value) => {
                setSelectedStockStatus(value);
                // Apply immediately with the new stock status value directly
                if (!isInitialMount.current) {
                  applyFiltersAuto(undefined, undefined, value);
                }
              }}
              placeholder="اختر حالة المخزون"
              label="حالة المخزون"
            />
          </div>

          {/* Suppliers Filter */}
          <div>
            <MultiSelect
              options={supplierOptions}
              selected={selectedSuppliers}
              onChange={(value) => {
                setSelectedSuppliers(value);
                // Apply immediately with the new suppliers value directly
                if (!isInitialMount.current) {
                  applyFiltersAuto(undefined, undefined, undefined, value);
                }
              }}
              placeholder={loadingSuppliers ? 'جاري التحميل...' : 'اختر الموردين'}
              label="المورد"
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              تاريخ الإضافة
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
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
                      applyFiltersAuto(newDate, endDateRef.current);
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
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
                      applyFiltersAuto(startDateRef.current, newDate);
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              مسح الفلاتر
            </button>
            <button
              onClick={applyFilters}
              className="px-6 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg transition-colors"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default AdminProductFilters;

