'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, DollarSign, ShoppingBag, Package, Users,
  Calendar, Download, Filter, ArrowUp, ArrowDown, CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AnalyticsData {
  revenue: {
    daily: Array<{ date: string; revenue: number }>;
    monthly: Array<{ month: string; revenue: number }>;
    total: number;
    growth: number;
  };
  orders: {
    daily: Array<{ date: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    total: number;
    growth: number;
  };
  products: {
    topSelling: Array<{ name: string; sales: number; revenue: number }>;
    byCategory: Array<{ category: string; count: number }>;
    total: number;
    growth: number;
  };
  users: {
    byRole: Array<{ role: string; count: number }>;
    newSignups: Array<{ date: string; count: number }>;
    total: number;
    growth: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, customDateRange, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      let url = `/api/analytics?range=${dateRange}`;
      
      if (customDateRange && startDate && endDate) {
        // Validate date range
        if (new Date(startDate) > new Date(endDate)) {
          toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
          return;
        }
        
        url = `/api/analytics?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب البيانات التحليلية');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      let url = `/api/analytics/export?range=${dateRange}`;
      
      if (customDateRange && startDate && endDate) {
        url = `/api/analytics/export?startDate=${startDate}&endDate=${endDate}`;
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
          ? `analytics-${startDate}-to-${endDate}.csv`
          : `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('تم تصدير التقرير بنجاح');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">التحليلات المتقدمة</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">تحليل شامل لأداء المنصة</p>
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
              value={customDateRange ? 'custom' : dateRange}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setCustomDateRange(true);
                } else {
                  setCustomDateRange(false);
                  setDateRange(e.target.value);
                }
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">آخر أسبوع</option>
              <option value="month">آخر شهر</option>
              <option value="quarter">آخر 3 شهور</option>
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
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            onClick={exportReport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center space-x-2 space-x-reverse transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير التقرير</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics?.revenue.total.toLocaleString()} ₪
              </p>
              <div className={`flex items-center text-sm mt-1 ${(analytics?.revenue.growth ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {(analytics?.revenue.growth ?? 0) >= 0 ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />}
                {Math.abs(analytics?.revenue.growth ?? 0)}%
              </div>
            </div>
            <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics?.orders.total.toLocaleString()}
              </p>
              <div className={`flex items-center text-sm mt-1 ${(analytics?.orders.growth ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {(analytics?.orders.growth ?? 0) >= 0 ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />}
                {Math.abs(analytics?.orders.growth ?? 0)}%
              </div>
            </div>
            <div className="bg-success-100 dark:bg-success-900 p-3 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المنتجات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics?.products.total.toLocaleString()}
              </p>
              <div className={`flex items-center text-sm mt-1 ${(analytics?.products.growth ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {(analytics?.products.growth ?? 0) >= 0 ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />}
                {Math.abs(analytics?.products.growth ?? 0)}%
              </div>
            </div>
            <div className="bg-warning-100 dark:bg-warning-900 p-3 rounded-lg">
              <Package className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المستخدمين</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {analytics?.users.total.toLocaleString()}
              </p>
              <div className={`flex items-center text-sm mt-1 ${(analytics?.users.growth ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {(analytics?.users.growth ?? 0) >= 0 ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />}
                {Math.abs(analytics?.users.growth ?? 0)}%
              </div>
            </div>
            <div className="bg-secondary-100 dark:bg-secondary-900 p-3 rounded-lg">
              <Users className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">الإيرادات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.revenue.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#F3F4F6'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#0088FE" 
                strokeWidth={2}
                dot={{ fill: '#0088FE', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">الطلبات حسب الحالة</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics?.orders.byStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.status}: ${entry.count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics?.orders.byStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Products */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">المنتجات الأكثر مبيعاً</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.products.topSelling.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#F3F4F6'
                }}
              />
              <Bar dataKey="sales" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Users by Role */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">المستخدمون حسب الدور</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics?.users.byRole}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.role}: ${entry.count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics?.users.byRole.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">المنتجات الأكثر مبيعاً - تفصيلي</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المنتج
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  المبيعات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  الإيرادات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {analytics?.products.topSelling.map((product, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {product.sales}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {product.revenue.toLocaleString()} ₪
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 