'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { DollarSign, TrendingUp, Users, Package, Calendar, Settings, BarChart3, PieChart } from 'lucide-react';
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

interface CommissionRate {
  minPrice: number;
  maxPrice: number;
  rate: number;
}

export default function AdminEarningsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<EarningsStatistics | null>(null);
  const [earningsByRole, setEarningsByRole] = useState<EarningsByRole[]>([]);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [period, setPeriod] = useState('month');
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [savingRates, setSavingRates] = useState(false);

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/earnings?period=${period}`);
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
  }, [period]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      return;
    }
    fetchEarnings();
  }, [user, fetchEarnings]);

  const updateCommissionRates = async () => {
    try {
      setSavingRates(true);
      const response = await fetch('/api/admin/earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commissionRates }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم تحديث نسب العمولة بنجاح');
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء تحديث نسب العمولة');
      }
    } catch (error) {
      console.error('Error updating commission rates:', error);
      toast.error('حدث خطأ أثناء تحديث نسب العمولة');
    } finally {
      setSavingRates(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
        </div>
        <div className="flex items-center space-x-4 space-x-reverse">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          >
            <option value="week">الأسبوع</option>
            <option value="month">الشهر</option>
            <option value="year">السنة</option>
          </select>
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

      {/* Commission Settings */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
            <Settings className="w-5 h-5 ml-2" />
            نسب العمولة
          </h3>
          <button
            onClick={updateCommissionRates}
            disabled={savingRates}
            className="btn-primary flex items-center"
          >
            {savingRates ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
            ) : (
              <Settings className="w-4 h-4 ml-2" />
            )}
            {savingRates ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>

        <div className="space-y-4">
          {commissionRates.map((rate, index) => (
            <div key={index} className="flex items-center space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <input
                type="number"
                placeholder="السعر الأدنى"
                value={rate.minPrice}
                onChange={(e) => {
                  const newRates = [...commissionRates];
                  newRates[index].minPrice = parseFloat(e.target.value) || 0;
                  setCommissionRates(newRates);
                }}
                className="input-field w-32"
              />
              <span className="text-gray-500">إلى</span>
              <input
                type="number"
                placeholder="السعر الأقصى"
                value={rate.maxPrice}
                onChange={(e) => {
                  const newRates = [...commissionRates];
                  newRates[index].maxPrice = parseFloat(e.target.value) || 0;
                  setCommissionRates(newRates);
                }}
                className="input-field w-32"
              />
              <input
                type="number"
                placeholder="النسبة %"
                value={rate.rate}
                onChange={(e) => {
                  const newRates = [...commissionRates];
                  newRates[index].rate = parseFloat(e.target.value) || 0;
                  setCommissionRates(newRates);
                }}
                className="input-field w-24"
              />
              <button
                onClick={() => {
                  const newRates = commissionRates.filter((_, i) => i !== index);
                  setCommissionRates(newRates);
                }}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                حذف
              </button>
            </div>
          ))}
          
          <button
            onClick={() => setCommissionRates([...commissionRates, { minPrice: 0, maxPrice: 0, rate: 10 }])}
            className="btn-secondary text-sm"
          >
            إضافة نسبة عمولة
          </button>
        </div>
      </div>
    </div>
  );
} 