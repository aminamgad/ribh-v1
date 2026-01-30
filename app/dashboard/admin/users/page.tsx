'use client';

import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { Search, Filter, Eye, Edit, Shield, UserCheck, UserX, Mail, Phone, UserPlus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
  supplier: 'bg-blue-100 text-blue-800',
  marketer: 'bg-green-100 text-green-800',
  wholesaler: 'bg-purple-100 text-purple-800'
};

// Memoized Stats Card Component to prevent unnecessary re-renders
const StatsCard = memo(({ 
  icon: Icon, 
  label, 
  value, 
  iconBg, 
  iconColor 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  iconBg: string; 
  iconColor: string; 
}) => {
  return (
    <div className="card">
      <div className="flex items-center">
        <div className={`${iconBg} p-2 rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="mr-3">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
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
  }, [searchTerm, filterRole, filterStatus, pathname]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - URL changes will be handled by the filters themselves

  // Sync with actual URL changes from popstate events and custom events
  useEffect(() => {
    const handleUrlChangeEvent = (e: Event) => {
      // Always use detail.query from custom event if available
      if (e && 'detail' in e && (e as any).detail?.query !== undefined) {
        const newQuery = (e as any).detail.query || '';
        // Update immediately for instant response (no startTransition delay)
        setUrlQueryString((prev) => {
          if (prev !== newQuery) {
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
    const newKey = `admin_users_${queryString || 'default'}`;
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

  const users = useMemo(() => usersData?.users || [], [usersData?.users]);

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

  // Filtering is now done on server side
  const filteredUsers = users;

  // CRITICAL FIX: Use useMemo for stats to prevent recalculation on every render
  // Only recalculate when users array changes
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const verified = users.filter(u => u.isVerified).length;
    const suppliers = users.filter(u => u.role === 'supplier').length;
    const marketers = users.filter(u => u.role === 'marketer').length;
    const wholesalers = users.filter(u => u.role === 'wholesaler').length;

    return { total, active, verified, suppliers, marketers, wholesalers };
  }, [users]);

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

  // CRITICAL FIX: Only show full-page loading on initial load (when no data exists)
  // After initial load, show loading indicator only for the table section
  const isInitialLoad = loading && !usersData;

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-600 mt-2">إدارة جميع المستخدمين في المنصة</p>
        </div>
        <Link
          href="/dashboard/admin/users/new"
          className="btn-primary"
        >
          <UserPlus className="w-4 h-4 ml-2" />
          إضافة مستخدم جديد
        </Link>
      </div>

      {/* Stats - Using memoized components to prevent unnecessary re-renders */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatsCard
          icon={Shield}
          label="إجمالي المستخدمين"
          value={stats.total}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
        />
        <StatsCard
          icon={UserCheck}
          label="نشط"
          value={stats.active}
          iconBg="bg-success-100"
          iconColor="text-success-600"
        />
        <StatsCard
          icon={Shield}
          label="محقق"
          value={stats.verified}
          iconBg="bg-warning-100"
          iconColor="text-warning-600"
        />
        <StatsCard
          icon={Shield}
          label="الموردين"
          value={stats.suppliers}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          icon={Shield}
          label="المسوقين"
          value={stats.marketers}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          icon={Shield}
          label="تجار الجملة"
          value={stats.wholesalers}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="البحث في المستخدمين..."
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchTerm(newValue);
                  // Update ref immediately
                  searchTermRef.current = newValue;
                  // Apply immediately with the new value directly
                  if (!isInitialMount.current) {
                    applyFiltersAuto(newValue, undefined, undefined);
                  }
                }}
                className="input-field pr-11"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => {
                const newValue = e.target.value;
                setFilterRole(newValue);
                // Update ref immediately
                filterRoleRef.current = newValue;
                // Apply immediately with the new value directly
                if (!isInitialMount.current) {
                  applyFiltersAuto(undefined, newValue, undefined);
                }
              }}
              className="input-field"
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
                  applyFiltersAuto(undefined, undefined, newValue);
                }
              }}
              className="input-field"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {/* CRITICAL FIX: Show loading indicator only for table section, not entire page */}
      {loading && usersData && (
        <div className="mb-4 flex items-center justify-center py-4">
          <div className="loading-spinner w-6 h-6"></div>
          <span className="mr-2 text-sm text-gray-600">جاري تحديث البيانات...</span>
        </div>
      )}
      
      {filteredUsers.length === 0 && !loading ? (
        <div className="card text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مستخدمين</h3>
          <p className="text-gray-600">لا توجد مستخدمين مطابقين للبحث.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">المستخدم</th>
                  <th className="table-header">معلومات الاتصال</th>
                  <th className="table-header">الدور</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">التاريخ</th>
                  <th className="table-header">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((userItem) => (
                  <tr 
                    key={userItem._id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/admin/users/${userItem._id}`)}
                  >
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">{userItem.name}</p>
                        {userItem.companyName && (
                          <p className="text-sm text-gray-500">{userItem.companyName}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 ml-1 text-gray-400" />
                          {userItem.email}
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 ml-1 text-gray-400" />
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {userItem.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                        {!userItem.isVerified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            غير محقق
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-500">
                        {new Date(userItem.createdAt).toLocaleDateString('en-US')}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="text-primary-600 hover:text-primary-700" title="عرض التفاصيل">
                          <Eye className="w-4 h-4" />
                        </div>
                        
                        <Link
                          href={`/dashboard/admin/users/${userItem._id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
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
                            className="text-blue-600 hover:text-blue-700"
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
      )}
    </div>
  );
} 