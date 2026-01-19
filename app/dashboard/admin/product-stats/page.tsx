'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import {
  TrendingUp, DollarSign, ShoppingBag, Package, Users,
  Calendar, Download, Filter, ArrowUp, ArrowDown, CalendarDays,
  BarChart3, PieChart as PieChartIcon, Activity, Target,
  Eye, Share2, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import MediaThumbnail from '@/components/ui/MediaThumbnail';

interface ProductStats {
  product: {
    _id: string;
    name: string;
    description: string;
    categoryId: string;
    images: string[];
    price: number;
    wholesalePrice: number;
    costPrice: number;
    stockQuantity: number;
    isActive: boolean;
    isApproved: boolean;
  };
  statistics: {
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    marketShare: number;
    averageOrderValue: string;
    averageQuantityPerOrder: string;
  };
  ordersByStatus: Array<{
    status: string;
    count: number;
    quantity: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    orders: number;
    quantity: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerName: string;
    customerEmail: string;
    customerRole: string;
    orders: number;
    quantity: number;
    revenue: number;
  }>;
  categoryComparison: {
    categoryTotalOrders: number;
    categoryTotalQuantity: number;
    categoryTotalRevenue: number;
    categoryProductCount: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const statusLabels: { [key: string]: string } = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  processing: 'قيد المعالجة',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  returned: 'مرتجع'
};

export default function ProductStatsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDateRange, setCustomDateRange] = useState(false);
  const [selectedRange, setSelectedRange] = useState('30d'); // Track selected range

  // Generate cache key based on productId and date range
  const cacheKey = useMemo(() => {
    if (!productId) return '';
    if (customDateRange && startDate && endDate) {
      return `product_stats_${productId}_${startDate}_${endDate}`;
    }
    return `product_stats_${productId}_${selectedRange}`;
  }, [productId, customDateRange, startDate, endDate, selectedRange]);

  // Use cache hook for product stats
  const { data: statsData, loading, refresh } = useDataCache<ProductStats>({
    key: cacheKey,
    fetchFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      let url = `/api/admin/product-stats?productId=${productId}`;
      
      if (customDateRange && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      } else if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch product stats');
      }
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch product stats');
      }

      // Add fallback data for empty charts
      return {
        ...data,
        ordersByStatus: data.ordersByStatus.length > 0 ? data.ordersByStatus : [
          { status: 'pending', count: 0, quantity: 0, revenue: 0 },
          { status: 'confirmed', count: 0, quantity: 0, revenue: 0 },
          { status: 'processing', count: 0, quantity: 0, revenue: 0 },
          { status: 'shipped', count: 0, quantity: 0, revenue: 0 },
          { status: 'delivered', count: 0, quantity: 0, revenue: 0 }
        ],
        dailySales: data.dailySales.length > 0 ? data.dailySales : generateEmptyDailySales(startDate, endDate),
        topCustomers: data.topCustomers.length > 0 ? data.topCustomers : []
      };
    },
    enabled: !!productId && !!user && user.role === 'admin',
    forceRefresh: false,
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ أثناء جلب إحصائيات المنتج');
    }
  });

  const stats = statsData || null;

  useEffect(() => {
    if (!productId) {
      toast.error('معرف المنتج مطلوب');
      router.push('/dashboard/admin/products');
      return;
    }

    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      router.push('/dashboard');
      return;
    }
  }, [productId, user?.role, router]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-product-stats', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-product-stats', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchProductStats for backward compatibility
  const fetchProductStats = async () => {
    refresh();
  };

  const generateEmptyDailySales = (start: string, end: string) => {
    const sales = [];
    const startDate = new Date(start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(end || new Date());
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      sales.push({
        date: d.toISOString().split('T')[0],
        orders: 0,
        quantity: 0,
        revenue: 0
      });
    }
    
    return sales;
  };

  const handleCustomDateApply = () => {
    if (!startDate || !endDate) {
      toast.error('يرجى تحديد تاريخ البداية والنهاية');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }
    
    console.log('📅 Applying custom date range:', { startDate, endDate });
    // The useEffect will automatically trigger fetchProductStats when startDate/endDate change
  };

  const handleDateRangeChange = (range: string) => {
    setCustomDateRange(false);
    setStartDate('');
    setEndDate('');
    setSelectedRange(range);
    
    const now = new Date();
    let start = new Date();
    
    switch (range) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        setCustomDateRange(true);
        setSelectedRange('custom');
        return;
    }
    
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];
    
    console.log('📅 Setting date range:', { range, startDateStr, endDateStr });
    
    setStartDate(startDateStr);
    setEndDate(endDateStr);
    
    // The useEffect will automatically trigger fetchProductStats when startDate/endDate change
  };

  const exportStats = () => {
    if (!stats) return;
    
    const csvContent = generateCSV(stats);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `product-stats-${stats.product.name}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = (data: ProductStats) => {
    const headers = [
      'اسم المنتج',
      'إجمالي الطلبات',
      'إجمالي الكمية',
      'إجمالي الإيرادات',
      'إجمالي التكلفة',
      'إجمالي الربح',
      'هامش الربح (%)',
      'حصة السوق (%)',
      'متوسط قيمة الطلب',
      'متوسط الكمية لكل طلب'
    ];

    const values = [
      data.product.name,
      data.statistics.totalOrders,
      data.statistics.totalQuantity,
      data.statistics.totalRevenue,
      data.statistics.totalCost,
      data.statistics.totalProfit,
      data.statistics.profitMargin,
      data.statistics.marketShare,
      data.statistics.averageOrderValue,
      data.statistics.averageQuantityPerOrder
    ];

    return [headers.join(','), values.join(',')].join('\n');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          لا توجد بيانات متاحة
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          لم يتم العثور على إحصائيات للمنتج المحدد
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={() => router.back()}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              إحصائيات المنتج
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {stats.product.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={exportStats}
            className="btn-secondary"
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير البيانات
          </button>
        </div>
      </div>

      {/* Product Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Info */}
        <div className="card">
          <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
            {/* Product Image - Made larger and more prominent */}
            <div className="flex-shrink-0">
              {stats.product.images && stats.product.images.length > 0 ? (
                <div className="relative group">
                  <MediaThumbnail
                    media={stats.product.images}
                    alt={stats.product.name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl transition-shadow duration-200"
                    showTypeBadge={false}
                    width={160}
                    height={160}
                    fallbackIcon={
                      <div className="text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">صورة المنتج</p>
                      </div>
                    }
                  />
                </div>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 shadow-lg">
                  <div className="text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">لا توجد صورة</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {stats.product.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                {stats.product.description}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    ₪{stats.product.price}
                  </span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-sm text-gray-500">
                    المخزون: {stats.product.stockQuantity}
                  </span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    stats.product.isApproved 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}>
                    {stats.product.isApproved ? 'معتمد' : 'قيد المراجعة'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.statistics.totalOrders}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الطلبات</p>
          </div>

          <div className="card text-center">
            <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ₪{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stats.statistics.totalRevenue)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الإيرادات</p>
          </div>

          <div className="card text-center">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ₪{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stats.statistics.totalProfit)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الربح</p>
          </div>

          <div className="card text-center">
            <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.statistics.profitMargin}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">هامش الربح</p>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              تحديد فترة معينة
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              اختر الفترة الزمنية لعرض الإحصائيات
            </p>
            {stats && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                الفترة المحددة: {new Date(stats.dateRange.start).toLocaleDateString('en-US')} - {new Date(stats.dateRange.end).toLocaleDateString('en-US')}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <button
                onClick={() => handleDateRangeChange('7d')}
                className={`btn-secondary text-sm ${selectedRange === '7d' ? 'bg-primary-600 text-white' : ''}`}
              >
                7 أيام
              </button>
              <button
                onClick={() => handleDateRangeChange('30d')}
                className={`btn-secondary text-sm ${selectedRange === '30d' ? 'bg-primary-600 text-white' : ''}`}
              >
                30 يوم
              </button>
              <button
                onClick={() => handleDateRangeChange('90d')}
                className={`btn-secondary text-sm ${selectedRange === '90d' ? 'bg-primary-600 text-white' : ''}`}
              >
                90 يوم
              </button>
              <button
                onClick={() => handleDateRangeChange('1y')}
                className={`btn-secondary text-sm ${selectedRange === '1y' ? 'bg-primary-600 text-white' : ''}`}
              >
                سنة
              </button>
              <button
                onClick={() => handleDateRangeChange('custom')}
                className={`btn-secondary text-sm ${selectedRange === 'custom' ? 'bg-primary-600 text-white' : ''}`}
              >
                مخصص
              </button>
            </div>
            
            {customDateRange && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field text-sm"
                />
                <span className="text-gray-500">إلى</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field text-sm"
                />
                <button
                  onClick={handleCustomDateApply}
                  className="btn-primary text-sm"
                >
                  تطبيق
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            اتجاه المبيعات اليومية
          </h3>
          {stats.statistics.totalOrders === 0 ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  لا توجد طلبات لهذا المنتج
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  في الفترة المحددة ({new Date(stats.dateRange.start).toLocaleDateString('en-US')} - {new Date(stats.dateRange.end).toLocaleDateString('en-US')})
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US')}
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US')}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#00C49F" 
                  fill="#00C49F" 
                  fillOpacity={0.3}
                  name="الإيرادات"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            الطلبات حسب الحالة
          </h3>
          {stats.statistics.totalOrders === 0 ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <PieChartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  لا توجد طلبات لهذا المنتج
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  في الفترة المحددة
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${statusLabels[entry.status] || entry.status}: ${entry.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          أفضل العملاء
        </h3>
        {stats.topCustomers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              لا يوجد عملاء لهذا المنتج
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              في الفترة المحددة
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="table-header">العميل</th>
                  <th className="table-header">البريد الإلكتروني</th>
                  <th className="table-header">الدور</th>
                  <th className="table-header">عدد الطلبات</th>
                  <th className="table-header">الكمية</th>
                  <th className="table-header">الإيرادات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.topCustomers.map((customer, index) => (
                  <tr key={index}>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {customer.customerName}
                      </span>
                    </td>
                    <td className="table-cell text-gray-600 dark:text-gray-400">
                      {customer.customerEmail}
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {customer.customerRole}
                      </span>
                    </td>
                    <td className="table-cell text-gray-900 dark:text-gray-100">
                      {customer.orders}
                    </td>
                    <td className="table-cell text-gray-900 dark:text-gray-100">
                      {customer.quantity}
                    </td>
                    <td className="table-cell text-primary-600 dark:text-primary-400 font-medium">
                      ₪{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(customer.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Market Share */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            حصة السوق
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">حصة السوق في الفئة</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {stats.statistics.marketShare}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full" 
                style={{ width: `${Math.min(stats.statistics.marketShare, 100)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              من أصل {stats.categoryComparison.categoryProductCount} منتج في نفس الفئة
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            مقاييس الأداء
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">متوسط قيمة الطلب</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                ₪{stats.statistics.averageOrderValue}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">متوسط الكمية لكل طلب</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {stats.statistics.averageQuantityPerOrder}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">إجمالي الكمية المباعة</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {stats.statistics.totalQuantity}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
