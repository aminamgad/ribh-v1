'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { DollarSign, TrendingUp, Users, Package, Calendar, Filter, Download, BarChart3, PieChart, Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface EarningsReport {
  period: string;
  summary: {
    totalCommission: number;
    totalOrders: number;
    totalRevenue: number;
    averageCommission: number;
    systemWalletBalance: number;
  };
  commissionByStatus: Array<{
    _id: string;
    commission: number;
    orders: number;
    revenue: number;
  }>;
  topSuppliers: Array<{
    _id: string;
    totalCommission: number;
    totalOrders: number;
    totalRevenue: number;
    supplier: {
      name: string;
      email: string;
      companyName?: string;
    };
  }>;
  recentCommissions: Array<{
    _id: string;
    orderNumber: string;
    commission: number;
    total: number;
    status: string;
    createdAt: string;
    supplierId: {
      name: string;
      companyName?: string;
    };
    customerId: {
      name: string;
    };
  }>;
}

const statusLabels: { [key: string]: string } = {
  pending: 'معلق',
  confirmed: 'مؤكد',
  processing: 'قيد المعالجة',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  returned: 'مرتجع'
};

const statusColors: { [key: string]: string } = {
  pending: 'bg-yellow-900/30 text-yellow-200 border border-yellow-700',
  confirmed: 'bg-blue-900/30 text-blue-200 border border-blue-700',
  processing: 'bg-purple-900/30 text-purple-200 border border-purple-700',
  shipped: 'bg-indigo-900/30 text-indigo-200 border border-indigo-700',
  delivered: 'bg-green-900/30 text-green-200 border border-green-700',
  cancelled: 'bg-red-900/30 text-red-200 border border-red-700',
  returned: 'bg-orange-900/30 text-orange-200 border border-orange-700'
};

export default function AdminEarningsPage() {
  const { user } = useAuth();
  const [report, setReport] = useState<EarningsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      return;
    }
    fetchEarningsReport();
  }, [user, period, startDate, endDate]);

  const fetchEarningsReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('period', period);
      }

      const response = await fetch(`/api/admin/earnings?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
      } else {
        toast.error('حدث خطأ أثناء جلب تقرير الأرباح');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب تقرير الأرباح');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IL');
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600 dark:text-gray-400">هذه الصفحة متاحة للمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">تقرير الأرباح والعمولات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">متابعة أرباح النظام والعمولات المكتسبة</p>
        </div>
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={fetchEarningsReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الفترة:</span>
          </div>
          
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="day">اليوم</option>
            <option value="week">الأسبوع</option>
            <option value="month">الشهر</option>
            <option value="year">السنة</option>
          </select>

          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">أو تحديد فترة:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <span className="text-gray-500">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي العمولات</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(report.summary.totalCommission)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {report.summary.totalOrders}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(report.summary.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">متوسط العمولة</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(report.summary.averageCommission)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">رصيد المحفظة</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(report.summary.systemWalletBalance)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commission by Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">العمولات حسب حالة الطلب</h3>
              <div className="space-y-3">
                {report.commissionByStatus.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      {getStatusBadge(item._id)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.orders} طلب
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.commission)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.revenue)} إيرادات
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Suppliers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">أفضل الموردين</h3>
              <div className="space-y-3">
                {report.topSuppliers.slice(0, 5).map((supplier) => (
                  <div key={supplier._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {supplier.supplier.companyName || supplier.supplier.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {supplier.totalOrders} طلب
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(supplier.totalCommission)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(supplier.totalRevenue)} إيرادات
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Commissions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">آخر العمولات</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      رقم الطلب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      المورد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      العميل
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      العمولة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      إجمالي الطلب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {report.recentCommissions.map((commission) => (
                    <tr key={commission._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {commission.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {commission.supplierId.companyName || commission.supplierId.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {commission.customerId.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(commission.commission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(commission.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(commission.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(commission.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">لا توجد بيانات متاحة</p>
        </div>
      )}
    </div>
  );
} 