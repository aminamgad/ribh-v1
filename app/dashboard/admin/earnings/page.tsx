'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
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
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<EarningsStatistics | null>(null);
  const [earningsByRole, setEarningsByRole] = useState<EarningsByRole[]>([]);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [period, setPeriod] = useState('month');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/admin/earnings?period=${period}`;
      
      if (customDateRange && startDate && endDate) {
        // Validate date range
        if (new Date(startDate) > new Date(endDate)) {
          toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
          return;
        }
        
        url = `/api/admin/earnings?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
        setEarningsByRole(data.earningsByRole);
        setTopEarners(data.topEarners);
      } else {
        toast.error('حدث خطأ أثناء جلب إحصائيات الأرباح');
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast.error('حدث خطأ أثناء جلب إحصائيات الأرباح');
    } finally {
      setLoading(false);
    }
  }, [period, customDateRange, startDate, endDate]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      return;
    }
    fetchEarnings();
  }, [user, fetchEarnings]);



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">إدارة الأرباح</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">إحصائيات الأرباح والعمولات</p>
          {customDateRange && startDate && endDate && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              الفترة المحددة: من {new Date(startDate).toLocaleDateString('ar-SA')} إلى {new Date(endDate).toLocaleDateString('ar-SA')}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4 space-x-reverse">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2 space-x-reverse">
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
                             className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#FF9800] focus:border-[#FF9800]"
            >
              <option value="week">آخر أسبوع</option>
              <option value="month">آخر شهر</option>
              <option value="year">آخر سنة</option>
              <option value="custom">فترة مخصصة</option>
            </select>
            
            {customDateRange && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="flex items-center space-x-1 space-x-reverse">
                  <CalendarDays className="w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="من تاريخ"
                  />
                </div>
                <span className="text-gray-500">إلى</span>
                <div className="flex items-center space-x-1 space-x-reverse">
                  <CalendarDays className="w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="إلى تاريخ"
                  />
                </div>
                
                {/* Quick Date Presets */}
                <div className="flex items-center space-x-1 space-x-reverse ml-4">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                      setStartDate(lastWeek.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
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
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
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
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    آخر 3 شهور
                  </button>
                                 </div>
               </div>
             )}
           </div>
           
           <button
             onClick={exportEarningsReport}
             className="px-4 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-md flex items-center space-x-2 space-x-reverse transition-colors"
           >
             <Download className="w-4 h-4" />
             <span>تصدير التقرير</span>
           </button>
         </div>
       </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي الإيرادات</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(statistics.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">عمولة المنصة</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(statistics.totalCommission)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">أرباح المسوقين</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(statistics.totalMarketerProfit)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">إيرادات الموردين</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
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