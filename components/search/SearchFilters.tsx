'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo, useTransition } from 'react';
import { Search, Filter, X, ChevronDown, Calendar, Download } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import MultiSelect from '@/components/ui/MultiSelect';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
  nameEn: string;
}

interface Supplier {
  _id: string;
  name: string;
  companyName?: string;
}

interface SearchFiltersProps {
  onSearch?: (filters: any) => void;
}

function SearchFilters({ onSearch }: SearchFiltersProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [, startTransition] = useTransition();
  
  // Use refs to store user and pathname to avoid re-renders
  const userRef = useRef(user);
  const pathnameRef = useRef(pathname);
  
  // Initialize pathnameRef immediately
  if (typeof window !== 'undefined' && !pathnameRef.current) {
    pathnameRef.current = pathname;
  }
  
  // Update refs when values change
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  
  // Helper function to get URL params without causing re-renders
  const getUrlParam = (key: string): string => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || '';
  };
  
  // Helper function to get filters from sessionStorage
  const getFiltersFromStorage = (): URLSearchParams | null => {
    if (typeof window === 'undefined') return null;
    const currentPathname = pathnameRef.current || pathname;
    const saved = sessionStorage.getItem(`filters_${currentPathname}`);
    if (saved) {
      return new URLSearchParams(saved);
    }
    return null;
  };
  
  // Helper function to get param value from URL or sessionStorage
  const getParamValue = (key: string, defaultValue: string = ''): string => {
    // First try URL (has priority)
    const urlValue = getUrlParam(key);
    if (urlValue) return urlValue;
    
    // Then try sessionStorage
    const storageParams = getFiltersFromStorage();
    if (storageParams) {
      const storageValue = storageParams.get(key);
      if (storageValue) return storageValue;
    }
    
    return defaultValue;
  };
  
  const [searchQuery, setSearchQuery] = useState(() => getParamValue('q'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const categoryParam = getParamValue('category');
    return categoryParam ? categoryParam.split(',').filter(Boolean) : [];
  });
  const [minPrice, setMinPrice] = useState(() => getParamValue('minPrice'));
  const [maxPrice, setMaxPrice] = useState(() => getParamValue('maxPrice'));
  const [sortBy, setSortBy] = useState(() => getParamValue('sortBy', 'createdAt'));
  const [sortOrder, setSortOrder] = useState(() => getParamValue('sortOrder', 'desc'));
  // Preserve showFilters state across re-renders using sessionStorage
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      const currentPathname = pathnameRef.current || pathname;
      const saved = sessionStorage.getItem(`showFilters_${currentPathname}`);
      return saved === 'true';
    }
    return false;
  });
  
  // Use ref to track current showFilters value to prevent losing state on re-renders
  const showFiltersRef = useRef(showFilters);
  
  // Update ref when state changes
  useEffect(() => {
    showFiltersRef.current = showFilters;
    // Save to sessionStorage whenever showFilters changes (except on initial mount)
    if (typeof window !== 'undefined') {
      const currentPathname = pathnameRef.current || pathname;
      sessionStorage.setItem(`showFilters_${currentPathname}`, String(showFilters));
    }
  }, [showFilters, pathname]);
  
  // Sync showFilters with sessionStorage when pathname changes (but preserve state on filter updates)
  useEffect(() => {
    if (typeof window !== 'undefined' && pathnameRef.current) {
      const saved = sessionStorage.getItem(`showFilters_${pathnameRef.current}`);
      if (saved !== null) {
        const shouldShow = saved === 'true';
        // Only update if different and ref indicates it's safe to sync (not during filter updates)
        if (showFiltersRef.current !== shouldShow && shouldShow !== showFilters) {
          setShowFilters(shouldShow);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Only depend on pathname, not showFilters to avoid loops during filter updates
  
  // Listen to storage events to sync showFilters across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `showFilters_${pathnameRef.current || pathname}` && e.newValue !== null) {
        const shouldShow = e.newValue === 'true';
        if (showFilters !== shouldShow) {
          setShowFilters(shouldShow);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [showFilters, pathname]);
  const [selectedApprovalStatuses, setSelectedApprovalStatuses] = useState<string[]>(() => {
    const statusParam = getParamValue('status');
    return statusParam ? statusParam.split(',').filter(Boolean) : [];
  });

  // Admin-specific filter states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [minStock, setMinStock] = useState(() => getParamValue('minStock'));
  const [maxStock, setMaxStock] = useState(() => getParamValue('maxStock'));
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(() => {
    const suppliersParam = getParamValue('suppliers');
    return suppliersParam ? suppliersParam.split(',').filter(Boolean) : [];
  });
  const [startDate, setStartDate] = useState(() => getParamValue('startDate'));
  const [endDate, setEndDate] = useState(() => getParamValue('endDate'));
  const [manuallyModified, setManuallyModified] = useState(() => getParamValue('manuallyModified'));

  // Refs to store current date values for immediate access in onChange handlers
  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  
  // Refs to store current price values for immediate access in onChange handlers
  // This ensures both minPrice and maxPrice are passed together when one changes
  const minPriceRef = useRef(minPrice);
  const maxPriceRef = useRef(maxPrice);
  
  // Update refs when state changes
  useEffect(() => {
    startDateRef.current = startDate;
  }, [startDate]);
  
  useEffect(() => {
    endDateRef.current = endDate;
  }, [endDate]);
  
  useEffect(() => {
    minPriceRef.current = minPrice;
  }, [minPrice]);
  
  useEffect(() => {
    maxPriceRef.current = maxPrice;
  }, [maxPrice]);

  // Ref to track if component just mounted (to avoid auto-update on mount)
  const isInitialMount = useRef(true);
  
  // Refs to store filter values temporarily to avoid re-renders
  const categoriesRef = useRef(selectedCategories);
  const approvalStatusesRef = useRef(selectedApprovalStatuses);
  const suppliersRef = useRef(selectedSuppliers);
  
  // Update refs when state changes
  useEffect(() => {
    categoriesRef.current = selectedCategories;
  }, [selectedCategories]);
  
  useEffect(() => {
    approvalStatusesRef.current = selectedApprovalStatuses;
  }, [selectedApprovalStatuses]);
  
  useEffect(() => {
    suppliersRef.current = selectedSuppliers;
  }, [selectedSuppliers]);

  // Restore filters from sessionStorage on mount if URL is empty
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentPathname = pathnameRef.current || pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // If URL has no params, try to restore from sessionStorage
    if (urlParams.toString() === '') {
      const savedFilters = sessionStorage.getItem(`filters_${currentPathname}`);
      if (savedFilters) {
        const params = new URLSearchParams(savedFilters);
        
        // Restore all filters from sessionStorage
        if (params.get('q')) setSearchQuery(params.get('q') || '');
        if (params.get('category')) {
          const cats = params.get('category')?.split(',').filter(Boolean) || [];
          setSelectedCategories(cats);
        }
        if (params.get('minPrice')) setMinPrice(params.get('minPrice') || '');
        if (params.get('maxPrice')) setMaxPrice(params.get('maxPrice') || '');
        if (params.get('sortBy')) setSortBy(params.get('sortBy') || 'createdAt');
        if (params.get('sortOrder')) setSortOrder(params.get('sortOrder') || 'desc');
        if (params.get('status')) {
          const statuses = params.get('status')?.split(',').filter(Boolean) || [];
          setSelectedApprovalStatuses(statuses);
        }
        
        // Admin-specific filters
        if (user?.role === 'admin') {
          if (params.get('minStock')) setMinStock(params.get('minStock') || '');
          if (params.get('maxStock')) setMaxStock(params.get('maxStock') || '');
          if (params.get('suppliers')) {
            const supps = params.get('suppliers')?.split(',').filter(Boolean) || [];
            setSelectedSuppliers(supps);
          }
          if (params.get('startDate')) setStartDate(params.get('startDate') || '');
          if (params.get('endDate')) setEndDate(params.get('endDate') || '');
          if (params.get('manuallyModified')) setManuallyModified(params.get('manuallyModified') || '');
        }
        
        // Apply the restored filters to URL
        const newUrl = `${currentPathname}?${savedFilters}`;
        const newState = { ...window.history.state, as: newUrl, url: newUrl };
        window.history.replaceState(newState, '', newUrl);
        
        // Trigger urlchange event to update page component
        window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: savedFilters } }));
      }
    }
  }, [pathname, user?.role]);
  
  useEffect(() => {
    fetchCategories();
    if (user?.role === 'admin') {
      fetchSuppliers();
    }
    // Mark initial mount as complete after first render
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [user?.role]);

  // Note: No useEffect needed to sync with URL - filters apply immediately via onChange handlers
  // This prevents re-renders and ensures instant response

  // Auto-update function - accepts optional overrides for immediate updates
  const applyFiltersAuto = useCallback((
    overrideSearchQuery?: string,
    overrideMinPrice?: string,
    overrideMaxPrice?: string,
    overrideMinStock?: string,
    overrideMaxStock?: string,
    overrideStartDate?: string,
    overrideEndDate?: string,
    overrideSelectedCategories?: string[],
    overrideSelectedApprovalStatuses?: string[],
    overrideSelectedSuppliers?: string[],
    overrideSortBy?: string,
    overrideSortOrder?: string,
    overrideManuallyModified?: string
  ) => {
    if (isInitialMount.current) return;
    
    const params = new URLSearchParams();
    
    // Use override values if provided, otherwise use state values
    // IMPORTANT: For arrays, check if !== undefined (empty array [] is valid, undefined means use state)
    const currentSearchQuery = overrideSearchQuery !== undefined ? overrideSearchQuery : searchQuery;
    const currentMinPrice = overrideMinPrice !== undefined ? overrideMinPrice : minPrice;
    const currentMaxPrice = overrideMaxPrice !== undefined ? overrideMaxPrice : maxPrice;
    const currentMinStock = overrideMinStock !== undefined ? overrideMinStock : minStock;
    const currentMaxStock = overrideMaxStock !== undefined ? overrideMaxStock : maxStock;
    const currentSelectedCategories = overrideSelectedCategories !== undefined ? overrideSelectedCategories : selectedCategories;
    const currentSelectedApprovalStatuses = overrideSelectedApprovalStatuses !== undefined ? overrideSelectedApprovalStatuses : selectedApprovalStatuses;
    // CRITICAL FIX: For arrays, Array(0) is a valid value, so we must check !== undefined, not truthy
    const currentSelectedSuppliers = overrideSelectedSuppliers !== undefined ? overrideSelectedSuppliers : selectedSuppliers;
    const currentSortBy = overrideSortBy !== undefined ? overrideSortBy : sortBy;
    const currentSortOrder = overrideSortOrder !== undefined ? overrideSortOrder : sortOrder;
    
    // Search filters - use override values if provided, otherwise use state values
    if (currentSearchQuery.trim()) {
      params.set('q', currentSearchQuery.trim());
    }
    if (currentSelectedCategories.length > 0) {
      params.set('category', currentSelectedCategories.join(','));
    }
    // Price filters - set or delete based on value
    if (currentMinPrice && currentMinPrice.trim()) {
      params.set('minPrice', currentMinPrice.trim());
    } else {
      params.delete('minPrice');
    }
    if (currentMaxPrice && currentMaxPrice.trim()) {
      params.set('maxPrice', currentMaxPrice.trim());
    } else {
      params.delete('maxPrice');
    }
    
    if (currentSortBy && currentSortBy !== 'createdAt') {
      params.set('sortBy', currentSortBy);
    }
    if (currentSortOrder && currentSortOrder !== 'desc') {
      params.set('sortOrder', currentSortOrder);
    }
    if (currentSelectedApprovalStatuses.length > 0) {
      params.set('status', currentSelectedApprovalStatuses.join(','));
    }
    
    // Admin-specific filters - use ref to avoid re-render
    if (userRef.current?.role === 'admin') {
      // Handle minStock and maxStock - only add if they have valid values
      const minStockValue = (currentMinStock || '').trim();
      const maxStockValue = (currentMaxStock || '').trim();
      
      if (minStockValue) {
        params.set('minStock', minStockValue);
      } else {
        params.delete('minStock');
      }
      
      if (maxStockValue) {
        params.set('maxStock', maxStockValue);
      } else {
        params.delete('maxStock');
      }
      // Handle suppliers filter - IMPORTANT: Must be inside admin check
      // CRITICAL FIX: Use overrideSelectedSuppliers if provided, otherwise use state
      // This ensures we use the latest value passed to applyFiltersAuto, not stale state
      const suppliersToUse = overrideSelectedSuppliers !== undefined ? overrideSelectedSuppliers : currentSelectedSuppliers;
      
      if (suppliersToUse.length > 0) {
        const suppliersParam = suppliersToUse.join(',');
        params.set('suppliers', suppliersParam);
      } else {
        params.delete('suppliers');
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
      const currentManuallyModified = overrideManuallyModified !== undefined ? overrideManuallyModified : manuallyModified;
      if (currentManuallyModified === 'true') {
        params.set('manuallyModified', 'true');
      } else {
        params.delete('manuallyModified');
      }
    }
    
    const queryString = params.toString();
    const currentPathname = pathnameRef.current;
    
    const newUrl = `${currentPathname}${queryString ? `?${queryString}` : ''}`;
    
    // Get current URL directly (don't use searchParams in comparison to avoid infinite loop)
    const currentSearch = window.location.search || '';
    const currentUrl = `${currentPathname}${currentSearch}`;
    
    // Compare query strings using URLSearchParams for accurate comparison
    const currentParams = new URLSearchParams(currentSearch);
    const newParams = new URLSearchParams(queryString);
    
    // Check if all key params match (especially dates)
    const urlStartDate = currentParams.get('startDate') || '';
    const urlEndDate = currentParams.get('endDate') || '';
    const newStartDate = newParams.get('startDate') || '';
    const newEndDate = newParams.get('endDate') || '';
    
    // Compare all relevant params - normalize empty strings and nulls
    const normalizeParam = (val: string | null) => val || '';
    
    // CRITICAL FIX: Compare suppliers parameter - sort IDs to ensure consistent comparison
    // This ensures that suppliers=id1,id2 and suppliers=id2,id1 are considered the same
    const normalizeSuppliers = (val: string | null) => {
      if (!val) return '';
      const ids = val.split(',').map(id => id.trim()).filter(Boolean);
      return ids.sort().join(',');
    };
    
    const allParamsMatch = 
      normalizeParam(currentParams.get('q')) === normalizeParam(newParams.get('q')) &&
      normalizeParam(currentParams.get('category')) === normalizeParam(newParams.get('category')) &&
      normalizeParam(currentParams.get('minPrice')) === normalizeParam(newParams.get('minPrice')) &&
      normalizeParam(currentParams.get('maxPrice')) === normalizeParam(newParams.get('maxPrice')) &&
      normalizeParam(currentParams.get('sortBy')) === normalizeParam(newParams.get('sortBy')) &&
      normalizeParam(currentParams.get('sortOrder')) === normalizeParam(newParams.get('sortOrder')) &&
      normalizeParam(currentParams.get('status')) === normalizeParam(newParams.get('status')) &&
      normalizeParam(currentParams.get('minStock')) === normalizeParam(newParams.get('minStock')) &&
      normalizeParam(currentParams.get('maxStock')) === normalizeParam(newParams.get('maxStock')) &&
      normalizeSuppliers(currentParams.get('suppliers')) === normalizeSuppliers(newParams.get('suppliers')) &&
      urlStartDate === newStartDate &&
      urlEndDate === newEndDate &&
      normalizeParam(currentParams.get('manuallyModified')) === normalizeParam(newParams.get('manuallyModified'));
    
    // Always update if query strings don't match exactly (including empty strings)
    const currentQueryNormalized = currentSearch.replace(/^\?/, '');
    const newQueryNormalized = queryString;
    
    if (allParamsMatch && currentQueryNormalized === newQueryNormalized) {
      // All params match exactly, no need to update
      return;
    }
    
    // Save filters to sessionStorage - use ref to avoid re-render
    try {
      if (queryString) {
        sessionStorage.setItem(`filters_${currentPathname}`, queryString);
      } else {
        sessionStorage.removeItem(`filters_${currentPathname}`);
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
  }, [searchQuery, selectedCategories, minPrice, maxPrice, sortBy, sortOrder, selectedApprovalStatuses, minStock, maxStock, selectedSuppliers, startDate, endDate, manuallyModified]);

  // Note: All filters now apply immediately via onChange handlers
  // No useEffect needed - this ensures instant response

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      // Silently handle errors
    }
  };

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      // Fetch all suppliers regardless of status - don't filter by isActive
      // This ensures all suppliers with products are shown in the filter
      const response = await fetch('/api/admin/users?role=supplier&limit=1000');
      if (response.ok) {
        const data = await response.json();
        // Filter out any null/undefined suppliers and ensure we have valid data
        // Don't filter by isActive - show all suppliers that have valid data
        const validSuppliers = (data.users || []).filter((s: Supplier) => s && s._id && (s.name || s.companyName));
        
        setSuppliers(validSuppliers);
      } else {
        toast.error('حدث خطأ أثناء جلب قائمة الموردين');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب قائمة الموردين');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const supplierOptions = useMemo(() => {
    // Filter out any invalid suppliers and ensure we have valid options
    // Display both name and companyName together
    return suppliers
      .filter((supplier) => supplier && supplier._id && (supplier.name || supplier.companyName))
      .map((supplier) => {
        const name = supplier.name || '';
        const companyName = supplier.companyName || '';
        // Combine name and companyName, separated by space if both exist
        let label = '';
        if (name && companyName) {
          label = `${name} - ${companyName}`;
        } else if (name) {
          label = name;
        } else if (companyName) {
          label = companyName;
        } else {
          label = 'مورد غير محدد';
        }
        return {
          value: supplier._id,
          label,
        };
      });
  }, [suppliers]);

  const categoryOptions = useMemo(() => categories.map((category) => ({
    value: category._id,
    label: category.name,
  })), [categories]);

  const approvalStatusOptions = useMemo(() => [
    { value: 'approved', label: 'معتمد' },
    { value: 'pending', label: 'في انتظار الموافقة' },
    { value: 'rejected', label: 'مرفوض' },
  ], []);



  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setSelectedApprovalStatuses([]);
    
    // Clear admin filters
    if (user?.role === 'admin') {
      setMinStock('');
      setMaxStock('');
      setSelectedSuppliers([]);
      setStartDate('');
      setEndDate('');
      setManuallyModified('');
    }
    
    // Clear from sessionStorage
    try {
      sessionStorage.removeItem(`filters_${pathname}`);
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

  const hasActiveFilters = useMemo(() => 
    searchQuery || selectedCategories.length > 0 || minPrice || maxPrice || selectedApprovalStatuses.length > 0 ||
    (user?.role === 'admin' && (minStock || maxStock || selectedSuppliers.length > 0 || startDate || endDate || manuallyModified === 'true')),
    [searchQuery, selectedCategories, minPrice, maxPrice, selectedApprovalStatuses, user?.role, minStock, maxStock, selectedSuppliers, startDate, endDate, manuallyModified]
  );

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      
      if (minStock) {
        params.append('minStock', minStock);
      }
      if (maxStock) {
        params.append('maxStock', maxStock);
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
      if (manuallyModified === 'true') {
        params.append('manuallyModified', 'true');
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
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="البحث عن المنتجات..."
            value={searchQuery}
            onChange={(e) => {
              const newValue = e.target.value;
              // Update state immediately first to reflect UI change
              setSearchQuery(newValue);
              // Apply immediately with the new value directly
              if (!isInitialMount.current) {
                applyFiltersAuto(newValue);
              }
            }}
            onKeyPress={(e) => {
              // Enter key already triggers search automatically via onChange
              // This handler is kept for potential future use
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            className="input-field pr-9 sm:pr-10 text-sm sm:text-base min-h-[44px]"
          />
        </div>
        
        <div className="flex gap-2">
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
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-colors min-h-[44px] text-xs sm:text-sm ${
              user?.role === 'admin' && hasActiveFilters
                ? 'bg-[#FF9800] text-white'
                : 'btn-secondary'
            }`}
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2 flex-shrink-0" />
            <span className="hidden sm:inline">{user?.role === 'admin' ? 'فلاتر المنتجات' : 'فلاتر'}</span>
            <span className="sm:hidden">فلاتر</span>
            {hasActiveFilters && (
              <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                user?.role === 'admin' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-primary-600 text-white'
              }`}>
                {user?.role === 'admin'
                  ? [
                      searchQuery,
                      selectedCategories.length,
                      minPrice,
                      maxPrice,
                      selectedApprovalStatuses.length,
                      minStock,
                      maxStock,
                      selectedSuppliers.length,
                      startDate,
                      endDate,
                      manuallyModified === 'true'
                    ].filter(Boolean).length
                  : [
                      searchQuery,
                      selectedCategories.length,
                      minPrice,
                      maxPrice
                    ].filter(Boolean).length}
              </span>
            )}
          </button>
          
        </div>
      </div>

      {/* Export Button for Admin */}
      {user?.role === 'admin' && hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      )}

      {/* Filters Panel - Mobile Drawer / Desktop Panel */}
      {showFilters && (
        <>
          {/* Mobile Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => {
              setShowFilters(false);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(`showFilters_${pathname}`, 'false');
              }
            }}
          />
          
          {/* Filters Panel */}
          <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6 fixed sm:relative inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto z-50 sm:z-auto max-h-[85vh] sm:max-h-none overflow-y-auto sm:overflow-visible rounded-t-2xl sm:rounded-xl">
            <div className="flex justify-between items-center mb-3 sm:mb-4 sticky top-0 bg-white dark:bg-slate-800 pb-3 sm:pb-0 -mt-2 sm:mt-0 pt-2 sm:pt-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {user?.role === 'admin' ? 'فلاتر المنتجات' : 'فلاتر البحث'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {user?.role === 'admin'
                    ? 'الفئة · السعر · المورد · حالة المنتج · المخزون'
                    : (user?.role === 'marketer' || user?.role === 'wholesaler')
                    ? 'الفئة · نطاق السعر'
                    : 'الفئة · السعر'}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={clearFilters}
                  className="text-xs sm:text-sm text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 font-medium min-h-[36px] sm:min-h-[44px] px-2 sm:px-3"
                >
                  مسح الكل
                </button>
                <button
                  onClick={() => {
                    setShowFilters(false);
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem(`showFilters_${pathname}`, 'false');
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                الفئة
              </label>
              <MultiSelect
                options={categoryOptions}
                selected={selectedCategories}
                onChange={(value) => {
                  // Update ref immediately for use in applyFiltersAuto
                  categoriesRef.current = value;
                  // Apply filters immediately with the new categories value directly (before state update)
                  // This ensures URL updates immediately without waiting for React state update
                  if (!isInitialMount.current) {
                    applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, undefined, undefined, value, undefined, undefined, undefined);
                  }
                  // Update state using startTransition to mark as non-urgent, preventing full page re-render
                  startTransition(() => {
                    setSelectedCategories(value);
                  });
                }}
                placeholder="جميع الفئات"
              />
            </div>

            {/* Approval Status Filter - Admin Only */}
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  حالة المنتج
                </label>
                <MultiSelect
                  options={approvalStatusOptions}
                  selected={selectedApprovalStatuses}
                  onChange={(value) => {
                    // Update ref immediately
                    approvalStatusesRef.current = value;
                    // Apply immediately with the new approval statuses value directly
                    if (!isInitialMount.current) {
                      applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, value, undefined, undefined);
                    }
                    // Update state using startTransition to mark as non-urgent, preventing full page re-render
                    startTransition(() => {
                      setSelectedApprovalStatuses(value);
                    });
                  }}
                  placeholder="جميع الحالات"
                />
              </div>
            )}

            {/* Price Range - نطاق السعر (واحد للتسمية مع حقلين) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                نطاق السعر (₪)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <span className="block text-xs text-gray-500 dark:text-slate-400 mb-1">من</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setMinPrice(newValue || '');
                      if (!isInitialMount.current) {
                        applyFiltersAuto(undefined, newValue || '', maxPriceRef.current || '');
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value || '';
                      if (value !== (minPrice || '')) {
                        setMinPrice(value);
                        if (!isInitialMount.current) {
                          applyFiltersAuto(undefined, value, maxPriceRef.current || '');
                        }
                      }
                    }}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <span className="block text-xs text-gray-500 dark:text-slate-400 mb-1">إلى</span>
                  <input
                    type="number"
                    placeholder="—"
                    value={maxPrice}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setMaxPrice(newValue || '');
                      if (!isInitialMount.current) {
                        applyFiltersAuto(undefined, minPriceRef.current || '', newValue || '');
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value || '';
                      if (value !== (maxPrice || '')) {
                        setMaxPrice(value);
                        if (!isInitialMount.current) {
                          applyFiltersAuto(undefined, minPriceRef.current || '', value);
                        }
                      }
                    }}
                    className="input-field w-full"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Admin-specific Filters */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-1">
                  فلاتر الإدارة
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">المورد · حالة المنتج · المخزون · تاريخ الإضافة · المعدلة يدوياً</p>
                
                {/* المنتجات المعدلة يدوياً (سعر المسوق) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    المنتجات المعدلة يدوياً
                  </label>
                  <select
                    value={manuallyModified || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setManuallyModified(newValue);
                      if (!isInitialMount.current) {
                        applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, newValue);
                      }
                    }}
                    className="w-full py-2.5 pr-4 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100 appearance-none bg-[length:1.25rem] bg-[position:left_0.5rem_center] bg-no-repeat"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")` }}
                  >
                    <option value="">جميع المنتجات</option>
                    <option value="true">المنتجات المعدلة يدوياً فقط (سعر المسوق)</option>
                  </select>
                </div>

                {/* Stock Quantity Range Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    نطاق المخزون
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                        من
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={minStock || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          // Update state immediately first to reflect UI change
                          setMinStock(newValue || '');
                          // Apply immediately with the new value directly - use callback ref to get latest maxStock
                          if (!isInitialMount.current) {
                            // Get current maxStock value from state ref or use current state
                            // Pass both minStock and maxStock to ensure proper filter application
                            applyFiltersAuto(undefined, undefined, undefined, newValue || '', maxStock || '');
                          }
                        }}
                        onBlur={(e) => {
                          // Ensure empty values are properly handled on blur
                          const value = e.target.value || '';
                          if (value !== (minStock || '')) {
                            setMinStock(value);
                            if (!isInitialMount.current) {
                              applyFiltersAuto(undefined, undefined, undefined, value, maxStock || '');
                            }
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-slate-400 mb-1">
                        إلى
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="لا نهائي"
                        value={maxStock || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          // Update state immediately first to reflect UI change
                          setMaxStock(newValue || '');
                          // Apply immediately with the new value directly (after state update for other filters)
                          if (!isInitialMount.current) {
                            // Pass both minStock and maxStock to ensure proper filter application
                            applyFiltersAuto(undefined, undefined, undefined, minStock || '', newValue || '');
                          }
                        }}
                        onBlur={(e) => {
                          // Ensure empty values are properly handled on blur
                          const value = e.target.value || '';
                          if (value !== (maxStock || '')) {
                            setMaxStock(value);
                            if (!isInitialMount.current) {
                              applyFiltersAuto(undefined, undefined, undefined, minStock || '', value);
                            }
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Suppliers Filter */}
                <div className="mb-4">
                  <MultiSelect
                    options={supplierOptions}
                    selected={selectedSuppliers}
                    onChange={(value) => {
                      // Update state immediately first to reflect UI change
                      setSelectedSuppliers(value);
                      // Update ref immediately
                      suppliersRef.current = value;
                      
                      // Apply immediately with the new suppliers value directly
                      // IMPORTANT: Pass value as overrideSelectedSuppliers (9th parameter)
                      // Parameters order: searchQuery, minPrice, maxPrice, minStock, maxStock, startDate, endDate, categories, suppliers, sortBy, sortOrder
                      if (!isInitialMount.current) {
                        // Explicitly pass value as 10th parameter (overrideSelectedSuppliers)
                        // IMPORTANT: Parameter order:
                        // 1. overrideSearchQuery
                        // 2. overrideMinPrice
                        // 3. overrideMaxPrice
                        // 4. overrideMinStock
                        // 5. overrideMaxStock
                        // 6. overrideStartDate
                        // 7. overrideEndDate
                        // 8. overrideSelectedCategories
                        // 9. overrideSelectedApprovalStatuses
                        // 10. overrideSelectedSuppliers <- THIS IS THE ONE WE NEED
                        // 11. overrideSortBy
                        // 12. overrideSortOrder
                        applyFiltersAuto(
                          undefined, // overrideSearchQuery (1)
                          undefined, // overrideMinPrice (2)
                          undefined, // overrideMaxPrice (3)
                          undefined, // overrideMinStock (4)
                          undefined, // overrideMaxStock (5)
                          undefined, // overrideStartDate (6)
                          undefined, // overrideEndDate (7)
                          undefined, // overrideSelectedCategories (8)
                          undefined, // overrideSelectedApprovalStatuses (9)
                          value,     // overrideSelectedSuppliers (10) - THIS IS THE ONE WE NEED
                          undefined, // overrideSortBy (11)
                          undefined  // overrideSortOrder (12)
                        );
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
                          // Update ref immediately
                          startDateRef.current = newDate;
                          // Force immediate update for date changes - pass new value directly
                          if (!isInitialMount.current && user?.role === 'admin') {
                            // Apply immediately with the new date value and current endDate from ref
                            applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, newDate, endDateRef.current);
                          }
                          // Update state using startTransition to mark as non-urgent, preventing full page re-render
                          startTransition(() => {
                            setStartDate(newDate);
                          });
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
                          // Update ref immediately
                          endDateRef.current = newDate;
                          // Force immediate update for date changes - pass new value directly
                          if (!isInitialMount.current && userRef.current?.role === 'admin') {
                            // Apply immediately with current startDate from ref and new date value
                            applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, startDateRef.current, newDate);
                          }
                          // Update state using startTransition to mark as non-urgent, preventing full page re-render
                          startTransition(() => {
                            setEndDate(newDate);
                          });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

            {/* Sort Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-700">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  ترتيب حسب
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Apply immediately with the new sortBy value directly (before state update)
                    if (!isInitialMount.current) {
                      applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, newValue);
                    }
                    // Update state using startTransition to mark as non-urgent, preventing full page re-render
                    startTransition(() => {
                      setSortBy(newValue);
                    });
                  }}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                >
                  <option value="createdAt">تاريخ الإضافة</option>
                  <option value="price">السعر</option>
                  <option value="name">الاسم</option>
                  <option value="stock">المخزون</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  اتجاه الترتيب
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    // Apply immediately with the new sortOrder value directly (before state update)
                    if (!isInitialMount.current) {
                      applyFiltersAuto(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, newValue);
                    }
                    // Update state using startTransition to mark as non-urgent, preventing full page re-render
                    startTransition(() => {
                      setSortOrder(newValue);
                    });
                  }}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                >
                  <option value="desc">تنازلي</option>
                  <option value="asc">تصاعدي</option>
                </select>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// Custom comparison function to prevent unnecessary re-renders
export default memo(SearchFilters, (prevProps, nextProps) => {
  // Only re-render if onSearch callback reference changes
  // Since onSearch is memoized in parent, this should prevent most re-renders
  return prevProps.onSearch === nextProps.onSearch;
});