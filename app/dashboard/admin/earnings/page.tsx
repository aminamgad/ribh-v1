'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { DollarSign, TrendingUp, Users, Package, Calendar, Settings, BarChart3, PieChart, CalendarDays, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface EarningsStatistics {
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  totalMarketerProfit: number;
  totalSupplierRevenue: number;
  totalWalletBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
}

interface EarningsByRole {
  _id: string;
  count: number;
  totalRevenue: number;
  totalProfit: number;
}

interface TopEarner {
  name: string;
  role: string;
  balance: number;
  totalEarnings: number;
}



export default function AdminEarningsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Generate cache key based on period/date range
  const cacheKey = useMemo(() => {
    if (customDateRange && startDate && endDate) {
      return `earnings_${startDate}_${endDate}`;
    }
    return `earnings_${period}`;
  }, [period, customDateRange, startDate, endDate]);

  // Use cache hook for earnings
  const { data: earningsData, loading, refresh } = useDataCache<{
    statistics: EarningsStatistics;
    earningsByRole: EarningsByRole[];
    topEarners: TopEarner[];
  }>({
    key: cacheKey,
    fetchFn: async () => {
      let url = `/api/admin/earnings?period=${period}`;
      
      if (customDateRange && startDate && endDate) {
        // Validate date range
        if (new Date(startDate) > new Date(endDate)) {
          throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        }
        
        url = `/api/admin/earnings?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
    forceRefresh: false,
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ أثناء جلب إحصائيات الأرباح');
    }
  });

  const statistics = earningsData?.statistics || null;
  const earningsByRole = earningsData?.earningsByRole || [];
  const topEarners = earningsData?.topEarners || [];

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

    window.addEventListener('refresh-earnings', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-earnings', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchEarnings for backward compatibility
  const fetchEarnings = useCallback(async () => {
    refresh();
  }, [refresh]);



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
  };

  const exportEarningsReport = async () => {
    try {
      let url = `/api/admin/earnings/export?period=${period}`;
      
      if (customDateRange && startDate && endDate) {
        url = `/api/admin/earnings/export?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = customDateRange && startDate && endDate 
          ? `earnings-${startDate}-to-${endDate}.csv`
          : `earnings-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('تم تصدير تقرير الأرباح بنجاح');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تصدير تقرير الأرباح');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <DollarSign className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">غير مصرح</h3>
          <p className="text-gray-600 dark:text-slate-400">لا يمكنك الوصول لهذه الصفحة</p>
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">إدارة الأرباح</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-slate-400 mt-1 sm:mt-2">إحصائيات الأرباح والعمولات</p>
          {customDateRange && startDate && endDate && (
            <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1">
              الفترة المحددة: من {new Date(startDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })} إلى {new Date(endDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 space-x-reverse w-full sm:w-auto">
          {/* Date Range Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 space-x-reverse">
            <select
              value={customDateRange ? 'custom' : period}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setCustomDateRange(true);
                } else {
                  setCustomDateRange(false);
                  setPeriod(e.target.value);
                }
              }}
              className="input-field text-sm sm:text-base min-h-[44px]"
            >
              <option value="week">آخر أسبوع</option>
              <option value="month">آخر شهر</option>
              <option value="year">آخر سنة</option>
              <option value="custom">فترة مخصصة</option>
            </select>
            
            {customDateRange && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 space-x-reverse">
                <div className="flex items-center space-x-1 space-x-reverse">
                  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 min-h-[44px] flex-1"
                    placeholder="من تاريخ"
                  />
                </div>
                <span className="text-xs sm:text-sm text-gray-500 text-center sm:text-right">إلى</span>
                <div className="flex items-center space-x-1 space-x-reverse">
                  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 min-h-[44px] flex-1"
                    placeholder="إلى تاريخ"
                  />
                </div>
                
                {/* Quick Date Presets */}
                <div className="flex items-center space-x-1 space-x-reverse sm:ml-2 flex-wrap gap-1 sm:gap-0">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                      setStartDate(lastWeek.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 min-h-[32px] sm:min-h-[auto]"
                  >
                    آخر أسبوع
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                      setStartDate(lastMonth.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 min-h-[32px] sm:min-h-[auto]"
                  >
                    آخر شهر
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastQuarter = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                      setStartDate(lastQuarter.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 min-h-[32px] sm:min-h-[auto]"
                  >
                    آخر 3 شهور
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={exportEarningsReport}
            className="px-3 sm:px-4 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-md flex items-center justify-center space-x-2 space-x-reverse transition-colors min-h-[44px] text-xs sm:text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير التقرير</span>
            <span className="sm:hidden">تصدير</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="mr-2 sm:mr-3 flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-400 truncate">إجمالي الإيرادات</p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {formatCurrency(statistics.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="mr-2 sm:mr-3 flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-400 truncate">عمولة المنصة</p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {formatCurrency(statistics.totalCommission)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mr-2 sm:mr-3 flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-400 truncate">أرباح المسوقين</p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {formatCurrency(statistics.totalMarketerProfit)}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="flex items-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mr-2 sm:mr-3 flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-slate-400 truncate">إيرادات الموردين</p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {formatCurrency(statistics.totalSupplierRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 ml-2" />
              إحصائيات المحافظ
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">إجمالي الرصيد</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(statistics.totalWalletBalance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">إجمالي الأرباح</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(statistics.totalEarnings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">إجمالي السحوبات</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(statistics.totalWithdrawals)}
                </span>
              </div>
            </div>
          </div>

          {/* Earnings by Role */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 ml-2" />
              الأرباح حسب الدور
            </h3>
            <div className="space-y-3">
              {earningsByRole.map((role) => (
                <div key={role._id} className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {role._id === 'marketer' ? 'مسوقين' : role._id === 'wholesaler' ? 'تجار جملة' : role._id}
                  </span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(role.totalProfit)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {role.count} طلب
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Earners */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 ml-2" />
              أعلى الأرباح
            </h3>
            <div className="space-y-3">
              {topEarners.slice(0, 5).map((earner, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{earner.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {earner.role === 'marketer' ? 'مسوق' : earner.role === 'wholesaler' ? 'تاجر جملة' : earner.role}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(earner.totalEarnings)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      رصيد: {formatCurrency(earner.balance)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
} 