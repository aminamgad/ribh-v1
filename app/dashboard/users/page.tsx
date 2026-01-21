'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { Search, Filter, Eye, Edit, Shield, UserCheck, UserX, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  companyName?: string;
  createdAt: string;
  lastLogin?: string;
  productCount?: number;
  orderCount?: number;
}

const roleLabels = {
  admin: 'الإدارة',
  supplier: 'المورد',
  marketer: 'المسوق',
  wholesaler: 'تاجر الجملة'
};

const roleColors = {
  admin: 'bg-red-100 text-red-800',
      supplier: 'bg-[#4CAF50]/20 text-[#4CAF50]',
  marketer: 'bg-green-100 text-green-800',
  wholesaler: 'bg-purple-100 text-purple-800'
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Helper function to get URL params without causing re-renders
  const getUrlParam = (key: string): string => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || '';
  };

  // Helper function to get filters from sessionStorage
  const getFiltersFromStorage = (): URLSearchParams | null => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem(`filters_${pathname}`);
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

  // Initialize filters from URL or sessionStorage
  const [searchTerm, setSearchTerm] = useState(() => getParamValue('search'));
  const [filterRole, setFilterRole] = useState(() => getParamValue('role', 'all'));
  const [filterStatus, setFilterStatus] = useState(() => getParamValue('status', 'all'));

  // URL query string state for cache key
  const [urlQueryString, setUrlQueryString] = useState(() => 
    typeof window !== 'undefined' ? window.location.search.substring(1) : ''
  );

  // Refs to store current filter values for immediate access in onChange handlers
  const searchTermRef = useRef(searchTerm);
  const filterRoleRef = useRef(filterRole);
  const filterStatusRef = useRef(filterStatus);

  // Update refs when state changes
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    filterRoleRef.current = filterRole;
  }, [filterRole]);

  useEffect(() => {
    filterStatusRef.current = filterStatus;
  }, [filterStatus]);

  // Ref to track if component just mounted (to avoid auto-update on mount)
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Mark initial mount as complete after first render
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-update function - accepts optional overrides for immediate updates
  const applyFiltersAuto = useCallback((
    overrideSearchTerm?: string,
    overrideFilterRole?: string,
    overrideFilterStatus?: string
  ) => {
    if (isInitialMount.current) return;
    
    const params = new URLSearchParams();

    // Search filters - use override values if provided, otherwise use state values
    const currentSearchTerm = overrideSearchTerm !== undefined ? overrideSearchTerm : searchTerm;
    const currentFilterRole = overrideFilterRole !== undefined ? overrideFilterRole : filterRole;
    const currentFilterStatus = overrideFilterStatus !== undefined ? overrideFilterStatus : filterStatus;
    
    if (currentSearchTerm.trim()) {
      params.set('search', currentSearchTerm.trim());
    } else {
      params.delete('search');
    }
    
    if (currentFilterRole && currentFilterRole !== 'all') {
      params.set('role', currentFilterRole);
    } else {
      params.delete('role');
    }
    
    if (currentFilterStatus && currentFilterStatus !== 'all') {
      params.set('status', currentFilterStatus);
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
    
    // Compare all relevant params - normalize empty strings and nulls
    const normalizeParam = (val: string | null) => val || '';
    const allParamsMatch = 
      normalizeParam(currentParams.get('search')) === normalizeParam(newParams.get('search')) &&
      normalizeParam(currentParams.get('role')) === normalizeParam(newParams.get('role')) &&
      normalizeParam(currentParams.get('status')) === normalizeParam(newParams.get('status'));
    
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
        sessionStorage.setItem(`filters_${pathname}`, queryString);
        if (user?.role === 'admin') {
          console.log('User filters saved to sessionStorage:', {
            key: `filters_${pathname}`,
            value: queryString
          });
        }
      } else {
        sessionStorage.removeItem(`filters_${pathname}`);
      }
    } catch (e) {
      // Ignore errors
      console.error('Error saving user filters to sessionStorage:', e);
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
  }, [searchTerm, filterRole, filterStatus, pathname, user?.role]);

  // Sync filter states with URL params when URL changes externally
  useEffect(() => {
    // Read from window.location directly since searchParams doesn't update with history.replaceState
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const searchFromUrl = params.get('search') || '';
    const roleFromUrl = params.get('role') || 'all';
    const statusFromUrl = params.get('status') || 'all';
    
    // Only update if different to avoid loops
    if (searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl);
    }
    if (roleFromUrl !== filterRole) {
      setFilterRole(roleFromUrl);
    }
    if (statusFromUrl !== filterStatus) {
      setFilterStatus(statusFromUrl);
    }
  }, []); // Only run once on mount - URL changes will be handled by the filters themselves

  // Sync with actual URL changes from popstate events and custom events
  useEffect(() => {
    const handleUrlChangeEvent = (e: Event) => {
      // Always use detail.query from custom event if available
      if (e && 'detail' in e && (e as any).detail?.query !== undefined) {
        const newQuery = (e as any).detail.query || '';
        console.log('User filters urlchange event received:', {
          newQuery,
          previousQuery: urlQueryString
        });
        // Update immediately for instant response (no startTransition delay)
        setUrlQueryString((prev) => {
          if (prev !== newQuery) {
            console.log('Updating urlQueryString:', { prev, newQuery });
            return newQuery;
          }
          return prev;
        });
      }
    };
    
    window.addEventListener('urlchange', handleUrlChangeEvent);
    
    return () => {
      window.removeEventListener('urlchange', handleUrlChangeEvent);
    };
  }, [urlQueryString]);

  // Restore filters from sessionStorage on mount (if URL is empty)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // Only restore from sessionStorage if URL is empty
    if (urlParams.toString() === '') {
      const savedFilters = sessionStorage.getItem(`filters_${pathname}`);
      if (savedFilters) {
        const params = new URLSearchParams(savedFilters);
        
        if (user?.role === 'admin') {
          console.log('Restoring user filters from sessionStorage:', {
            key: `filters_${pathname}`,
            value: savedFilters
          });
        }
        
        // Restore filter states
        if (params.get('search')) {
          setSearchTerm(params.get('search') || '');
        }
        if (params.get('role')) {
          setFilterRole(params.get('role') || 'all');
        }
        if (params.get('status')) {
          setFilterStatus(params.get('status') || 'all');
        }
        
        // Update URL and trigger data fetch
        if (savedFilters) {
          const newUrl = `${pathname}?${savedFilters}`;
          const newState = { ...window.history.state, as: newUrl, url: newUrl };
          window.history.replaceState(newState, '', newUrl);
          window.dispatchEvent(new CustomEvent('urlchange', { detail: { query: savedFilters } }));
        }
      }
    }
  }, [pathname, user?.role]);

  // Use URL query string directly - no need for searchParams which causes re-renders
  const queryString = urlQueryString || '';
  
  // Generate cache key based on query string - synchronous calculation
  const cacheKey = useMemo(() => {
    const newKey = `users_${queryString || 'default'}`;
    return newKey;
  }, [queryString]);

  // Use cache hook for users
  const { data: usersData, loading, refresh } = useDataCache<{ users: User[] }>({
    key: cacheKey,
    fetchFn: async () => {
      const params = new URLSearchParams(queryString);
      const apiParams = new URLSearchParams();
      
      if (params.get('search')) apiParams.append('search', params.get('search') || '');
      if (params.get('role') && params.get('role') !== 'all') apiParams.append('role', params.get('role') || '');
      if (params.get('status') && params.get('status') !== 'all') apiParams.append('status', params.get('status') || '');
      
      const queryParams = apiParams.toString();
      const response = await fetch(`/api/admin/users${queryParams ? `?${queryParams}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
    forceRefresh: false,
    onError: () => {
      toast.error('حدث خطأ أثناء جلب المستخدمين');
    }
  });

  const users = usersData?.users || [];

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      return;
    }
  }, [user]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-users', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-users', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchUsers for backward compatibility
  const fetchUsers = async () => {
    refresh();
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`تم ${currentStatus ? 'إيقاف' : 'تفعيل'} المستخدم بنجاح`);
        fetchUsers();
      } else {
        toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
      });

      if (response.ok) {
        toast.success('تم التحقق من المستخدم بنجاح');
        fetchUsers();
      } else {
        toast.error('حدث خطأ أثناء التحقق من المستخدم');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التحقق من المستخدم');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStats = () => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const verified = users.filter(u => u.isVerified).length;
    const suppliers = users.filter(u => u.role === 'supplier').length;
    const marketers = users.filter(u => u.role === 'marketer').length;
    const wholesalers = users.filter(u => u.role === 'wholesaler').length;

    return { total, active, verified, suppliers, marketers, wholesalers };
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">غير مصرح</h3>
          <p className="text-gray-600">لا يمكنك الوصول لهذه الصفحة</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">إدارة المستخدمين</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1 sm:mt-2">إدارة جميع المستخدمين في المنصة</p>
        </div>
        <Link
          href="/dashboard/users/new"
          className="btn-primary w-full sm:w-auto min-h-[44px] text-xs sm:text-sm px-3 sm:px-4"
        >
          <User className="w-4 h-4 ml-2" />
          <span className="hidden sm:inline">إضافة مستخدم جديد</span>
          <span className="sm:hidden">إضافة مستخدم</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="mr-2 sm:mr-3 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-300 truncate">إجمالي المستخدمين</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4">
          <div className="flex items-center">
            <div className="bg-success-100 dark:bg-success-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-success-600 dark:text-success-400" />
            </div>
            <div className="mr-2 sm:mr-3 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-300 truncate">نشط</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4">
          <div className="flex items-center">
            <div className="bg-warning-100 dark:bg-warning-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="mr-2 sm:mr-3 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-300 truncate">محقق</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100">{stats.verified}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4">
          <div className="flex items-center">
            <div className="bg-[#FF9800]/20 dark:bg-[#FF9800]/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF9800] dark:text-[#FF9800]" />
            </div>
            <div className="mr-2 sm:mr-3 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-300 truncate">الموردين</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100">{stats.suppliers}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="mr-2 sm:mr-3 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-300 truncate">المسوقين</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100">{stats.marketers}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4">
          <div className="flex items-center">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mr-2 sm:mr-3 min-w-0">
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-300 truncate">الجملة</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100">{stats.wholesalers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-slate-300 w-4 h-4 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="البحث بالاسم، البريد الإلكتروني، أو الهاتف..."
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchTerm(newValue);
                  // Update ref immediately
                  searchTermRef.current = newValue;
                  // Apply immediately with the new value directly
                  if (!isInitialMount.current) {
                    console.log('Search term changed - applying filters:', { newValue });
                    applyFiltersAuto(newValue, undefined, undefined);
                  }
                }}
                className="input-field pr-9 sm:pr-11 text-sm sm:text-base min-h-[44px]"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <select
              value={filterRole}
              onChange={(e) => {
                const newValue = e.target.value;
                setFilterRole(newValue);
                // Update ref immediately
                filterRoleRef.current = newValue;
                // Apply immediately with the new value directly
                if (!isInitialMount.current) {
                  console.log('Role filter changed - applying filters:', { newValue });
                  applyFiltersAuto(undefined, newValue, undefined);
                }
              }}
              className="input-field text-sm sm:text-base min-h-[44px]"
            >
              <option value="all">جميع الأدوار</option>
              <option value="admin">الإدارة</option>
              <option value="supplier">المورد</option>
              <option value="marketer">المسوق</option>
              <option value="wholesaler">تاجر الجملة</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => {
                const newValue = e.target.value;
                setFilterStatus(newValue);
                // Update ref immediately
                filterStatusRef.current = newValue;
                // Apply immediately with the new value directly
                if (!isInitialMount.current) {
                  console.log('Status filter changed - applying filters:', { newValue });
                  applyFiltersAuto(undefined, undefined, newValue);
                }
              }}
              className="input-field text-sm sm:text-base min-h-[44px]"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table/Cards */}
      {filteredUsers.length === 0 ? (
        <div className="card text-center py-8 sm:py-12">
          <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد مستخدمين</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400">لا توجد مستخدمين مطابقين للبحث.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="table-header">المستخدم</th>
                    <th className="table-header">معلومات الاتصال</th>
                    <th className="table-header">الدور</th>
                    <th className="table-header">الحالة</th>
                    <th className="table-header">التاريخ</th>
                    <th className="table-header">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredUsers.map((userItem) => (
                    <tr 
                      key={userItem._id} 
                      className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => router.push(`/dashboard/users/${userItem._id}`)}
                    >
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{userItem.name}</p>
                          {userItem.companyName && (
                            <p className="text-sm text-gray-500 dark:text-slate-300">{userItem.companyName}</p>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="w-4 h-4 ml-1 text-gray-400 dark:text-slate-300" />
                            {userItem.email}
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 ml-1 text-gray-400 dark:text-slate-300" />
                            {userItem.phone}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[userItem.role as keyof typeof roleColors]}`}>
                          {roleLabels[userItem.role as keyof typeof roleLabels]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userItem.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {userItem.isActive ? 'نشط' : 'غير نشط'}
                          </span>
                          {!userItem.isVerified && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              غير محقق
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(userItem.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="text-primary-600 hover:text-primary-700" title="عرض التفاصيل">
                            <Eye className="w-4 h-4" />
                          </div>
                          
                          <Link
                            href={`/dashboard/users/${userItem._id}/edit`}
                            className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
                            title="تعديل المستخدم"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(userItem._id, userItem.isActive);
                            }}
                            className={`${userItem.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                            title={userItem.isActive ? 'إيقاف المستخدم' : 'تفعيل المستخدم'}
                          >
                            {userItem.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          
                          {!userItem.isVerified && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerifyUser(userItem._id);
                              }}
                              className="text-[#FF9800] hover:text-[#F57C00]"
                              title="التحقق من المستخدم"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredUsers.map((userItem) => (
              <div
                key={userItem._id}
                className="card p-4 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => router.push(`/dashboard/users/${userItem._id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">
                      {userItem.name}
                    </h3>
                    {userItem.companyName && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mb-2">
                        {userItem.companyName}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${roleColors[userItem.role as keyof typeof roleColors]}`}>
                        {roleLabels[userItem.role as keyof typeof roleLabels]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${userItem.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {userItem.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                      {!userItem.isVerified && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          غير محقق
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 flex-shrink-0" />
                    <span className="truncate">{userItem.email}</span>
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 flex-shrink-0" />
                    <span>{userItem.phone}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-500">
                    {new Date(userItem.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/users/${userItem._id}`);
                    }}
                    className="btn-primary flex-1 sm:flex-initial min-h-[44px] text-xs sm:text-sm px-3 sm:px-4"
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5" />
                    عرض التفاصيل
                  </button>
                  <Link
                    href={`/dashboard/users/${userItem._id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="btn-secondary min-w-[44px] min-h-[44px] flex items-center justify-center px-3"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(userItem._id, userItem.isActive);
                    }}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center px-3 rounded-lg transition-colors ${
                      userItem.isActive 
                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    title={userItem.isActive ? 'إيقاف' : 'تفعيل'}
                  >
                    {userItem.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  {!userItem.isVerified && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyUser(userItem._id);
                      }}
                      className="text-[#FF9800] hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 min-w-[44px] min-h-[44px] flex items-center justify-center px-3 rounded-lg transition-colors"
                      title="التحقق"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 