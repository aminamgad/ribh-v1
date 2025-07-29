'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  BarChart3, 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Eye, 
  Star, 
  Truck, 
  Store, 
  MessageSquare, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  Plus,
  ShoppingCart,
  Heart,
  Settings,
  Bell,
  Calendar,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: any[];
  topProducts: any[];
  monthlyRevenue: { month: string; revenue: number }[];
  pendingOrders?: number;
  activeProducts?: number;
  lowStockProducts?: number;
  ordersPercentage: number;
  revenuePercentage: number;
  productsPercentage: number;
  usersPercentage: number;
  favoritesCount?: number;
  favoritesPercentage?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchDashboardStats();
    
    // Update every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardStats();
      setLastUpdate(new Date());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.error('Failed to fetch dashboard stats');
        toast.error('فشل في تحميل الإحصائيات');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('حدث خطأ أثناء تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'لوحة تحكم الإدارة';
      case 'supplier':
        return 'لوحة تحكم المورد';
      case 'marketer':
        return 'لوحة تحكم المسوق';
      case 'wholesaler':
        return 'لوحة تحكم تاجر الجملة';
      default:
        return 'لوحة التحكم';
    }
  };

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'admin':
        return 'مرحباً بك في لوحة تحكم الإدارة. يمكنك إدارة جميع جوانب المنصة من هنا.';
      case 'supplier':
        return 'مرحباً بك في لوحة تحكم المورد. يمكنك إدارة منتجاتك وطلبات التخزين من هنا.';
      case 'marketer':
        return 'مرحباً بك في لوحة تحكم المسوق. يمكنك تصفح المنتجات وطلبها للعملاء من هنا.';
      case 'wholesaler':
        return 'مرحباً بك في لوحة تحكم تاجر الجملة. يمكنك شراء المنتجات بأسعار الجملة من هنا.';
      default:
        return 'مرحباً بك في لوحة التحكم.';
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin':
        return 'الإدارة';
      case 'supplier':
        return 'المورد';
      case 'marketer':
        return 'المسوق';
      case 'wholesaler':
        return 'تاجر الجملة';
      default:
        return 'مستخدم';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { label: 'قيد الانتظار', class: 'badge-warning' },
      'processing': { label: 'قيد المعالجة', class: 'badge-info' },
      'shipped': { label: 'تم الشحن', class: 'badge-primary' },
      'delivered': { label: 'تم التوصيل', class: 'badge-success' },
      'cancelled': { label: 'ملغي', class: 'badge-danger' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return { label: config.label, class: config.class };
  };

  const getPercentageDisplay = (percentage: number) => {
    if (percentage === 0) return { text: '0%', color: 'text-gray-500 dark:text-slate-400', icon: null };
    if (percentage > 0) return { text: `+${percentage}%`, color: 'text-emerald-600 dark:text-emerald-400', icon: ArrowUpRight };
    return { text: `${percentage}%`, color: 'text-red-600 dark:text-red-400', icon: ArrowDownRight };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card-glass">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">{getRoleTitle()}</h1>
            <p className="text-gray-600 dark:text-slate-400 text-lg">{getWelcomeMessage()}</p>
          </div>
          <div className="hidden lg:flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500 dark:text-slate-400">
              <Activity className="w-4 h-4" />
              <span>آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{getRoleLabel()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Orders Card */}
        <div className="card-hover group">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
                  {user?.role === 'admin' ? 'إجمالي الطلبات' : 'طلباتي'}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                  {stats?.totalOrders || 0}
                </p>
              </div>
            </div>
            <div className="text-right">
              {(() => {
                const percentageDisplay = getPercentageDisplay(stats?.ordersPercentage || 0);
                return (
                  <div className={`flex items-center text-sm font-medium ${percentageDisplay.color}`}>
                    {percentageDisplay.icon && <percentageDisplay.icon className="w-4 h-4 ml-1" />}
                    {percentageDisplay.text}
                  </div>
                );
              })()}
              <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="card-hover group">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
                  {user?.role === 'admin' ? 'إجمالي الإيرادات' : 'إيراداتي'}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>
            </div>
            <div className="text-right">
              {(() => {
                const percentageDisplay = getPercentageDisplay(stats?.revenuePercentage || 0);
                return (
                  <div className={`flex items-center text-sm font-medium ${percentageDisplay.color}`}>
                    {percentageDisplay.icon && <percentageDisplay.icon className="w-4 h-4 ml-1" />}
                    {percentageDisplay.text}
                  </div>
                );
              })()}
              <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div className="card-hover group">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
                  {user?.role === 'supplier' ? 'منتجاتي' : 
                   user?.role === 'marketer' ? 'المفضلة' : 'المنتجات'}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                  {user?.role === 'supplier' ? (stats?.totalProducts || 0) : 
                   user?.role === 'marketer' ? (stats?.favoritesCount || 0) : (stats?.totalProducts || 0)}
                </p>
              </div>
            </div>
            <div className="text-right">
              {(() => {
                const percentageDisplay = getPercentageDisplay(
                  user?.role === 'marketer' ? (stats?.favoritesPercentage || 0) : (stats?.productsPercentage || 0)
                );
                return (
                  <div className={`flex items-center text-sm font-medium ${percentageDisplay.color}`}>
                    {percentageDisplay.icon && <percentageDisplay.icon className="w-4 h-4 ml-1" />}
                    {percentageDisplay.text}
                  </div>
                );
              })()}
              <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
            </div>
          </div>
        </div>

        {/* Users Card - Only for Admin */}
        {user?.role === 'admin' ? (
          <div className="card-hover group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">المستخدمين</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                    {stats?.totalUsers || 0}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {(() => {
                  const percentageDisplay = getPercentageDisplay(stats?.usersPercentage || 0);
                  return (
                    <div className={`flex items-center text-sm font-medium ${percentageDisplay.color}`}>
                      {percentageDisplay.icon && <percentageDisplay.icon className="w-4 h-4 ml-1" />}
                      {percentageDisplay.text}
                    </div>
                  );
                })()}
                <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
          </div>
        ) : (
          // Additional stats for non-admin users
          <div className="card-hover group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
                    {user?.role === 'supplier' ? 'المنتجات النشطة' : 'المفضلة'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                    {user?.role === 'supplier' ? (stats?.activeProducts || 0) : (stats?.totalProducts || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {(() => {
                  const percentageDisplay = getPercentageDisplay(10); // Fixed percentage for this card
                  return (
                    <div className={`flex items-center text-sm font-medium ${percentageDisplay.color}`}>
                      {percentageDisplay.icon && <percentageDisplay.icon className="w-4 h-4 ml-1" />}
                      {percentageDisplay.text}
                    </div>
                  );
                })()}
                <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role-specific Content */}
      {user?.role === 'admin' && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">آخر الطلبات</h3>
              <Link href="/dashboard/orders" className="btn-ghost text-sm">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: any) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                          <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(order.total)}</p>
                        <span className={`badge ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-slate-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">لا توجد طلبات حديثة</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">أفضل المنتجات</h3>
              <Link href="/dashboard/products" className="btn-ghost text-sm">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 5).map((product: any) => (
                  <div key={product._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{product.name}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{product.supplierName}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{product.sales || 0} مبيعات</p>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        <span className="text-sm text-gray-600 dark:text-slate-400 mr-1">{product.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 dark:text-slate-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">لا توجد منتجات</p>
                  <Link href="/dashboard/products/new" className="btn-primary mt-4">
                    <Plus className="w-4 h-4 mr-1" />
                    إضافة منتج جديد
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'supplier' && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* My Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">منتجاتي</h3>
              <Link href="/dashboard/products/new" className="btn-primary">
                <Plus className="w-4 h-4 mr-1" />
                إضافة منتج
              </Link>
            </div>
            <div className="space-y-4">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 5).map((product: any) => (
                  <div key={product._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{product.name}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">المخزون: {product.stockQuantity}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(product.marketerPrice)}</p>
                      <span className={`badge ${product.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {product.isApproved ? 'معتمد' : 'قيد المراجعة'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 dark:text-slate-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">لا توجد منتجات</p>
                  <Link href="/dashboard/products/new" className="btn-primary mt-4">
                    <Plus className="w-4 h-4 mr-1" />
                    إضافة منتج جديد
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">آخر الطلبات</h3>
              <Link href="/dashboard/orders" className="btn-ghost text-sm">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: any) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                          <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(order.total)}</p>
                        <span className={`badge ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-slate-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">لا توجد طلبات حديثة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Available Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">المنتجات المتاحة</h3>
              <Link href="/dashboard/products" className="btn-primary">
                <Store className="w-4 h-4 mr-1" />
                تصفح المنتجات
              </Link>
            </div>
            <div className="space-y-4">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 5).map((product: any) => (
                  <div key={product._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{product.name}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {product.categoryName} • {product.supplierName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          المخزون: {product.stockQuantity} قطعة
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {formatCurrency(user?.role === 'wholesaler' ? product.wholesalePrice : product.marketerPrice)}
                      </p>
                      <span className={`badge ${product.inStock ? 'badge-success' : 'badge-danger'}`}>
                        {product.inStock ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 dark:text-slate-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">لا توجد منتجات متاحة</p>
                  <Link href="/dashboard/products" className="btn-primary mt-4">
                    <Store className="w-4 h-4 mr-1" />
                    تصفح المنتجات
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* My Orders */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">طلباتي</h3>
              <Link href="/dashboard/orders" className="btn-ghost text-sm">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: any) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                          <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{order.supplierName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(order.total)}</p>
                        <span className={`badge ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-slate-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">لا توجد طلبات</p>
                  <Link href="/dashboard/products" className="btn-primary mt-4">
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    تصفح المنتجات
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Marketer Specific Stats */}
      {user?.role === 'marketer' && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Sales Performance */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">أداء المبيعات</h3>
              <div className="text-sm text-gray-500 dark:text-slate-400">
                هذا الشهر
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400">إجمالي المبيعات</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <div className={`flex items-center text-sm font-medium ${
                    (stats?.revenuePercentage || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(stats?.revenuePercentage || 0) > 0 ? <ArrowUpRight className="w-4 h-4 ml-1" /> : <ArrowDownRight className="w-4 h-4 ml-1" />}
                    {Math.abs(stats?.revenuePercentage || 0)}%
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-4">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400">عدد الطلبات</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {stats?.totalOrders || 0}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <div className={`flex items-center text-sm font-medium ${
                    (stats?.ordersPercentage || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(stats?.ordersPercentage || 0) > 0 ? <ArrowUpRight className="w-4 h-4 ml-1" /> : <ArrowDownRight className="w-4 h-4 ml-1" />}
                    {Math.abs(stats?.ordersPercentage || 0)}%
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                </div>
              </div>
            </div>
          </div>

          {/* Favorites & Recommendations */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">المفضلة والتوصيات</h3>
              <Link href="/dashboard/favorites" className="btn-ghost text-sm">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-4">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400">المنتجات المفضلة</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {stats?.favoritesCount || 0}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <div className={`flex items-center text-sm font-medium ${
                    (stats?.favoritesPercentage || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(stats?.favoritesPercentage || 0) > 0 ? <ArrowUpRight className="w-4 h-4 ml-1" /> : <ArrowDownRight className="w-4 h-4 ml-1" />}
                    {Math.abs(stats?.favoritesPercentage || 0)}%
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                </div>
              </div>

              <div className="text-center py-6">
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                  احصل على توصيات مخصصة بناءً على مشترياتك
                </p>
                <Link href="/dashboard/products" className="btn-primary">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  اكتشف منتجات جديدة
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marketer Tips & Insights */}
      {user?.role === 'marketer' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tips Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">نصائح للمسوق</h3>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  راجع المنتجات المفضلة بانتظام للحصول على أفضل العروض
                </p>
              </div>
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  تابع المخزون المتاح لتجنب نفاد المنتجات
                </p>
              </div>
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  استخدم سلة التسوق لتنظيم مشترياتك
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">النشاط الأخير</h3>
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                    <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">آخر طلب</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {stats?.recentOrders && stats.recentOrders.length > 0 
                        ? new Date(stats.recentOrders[0].createdAt).toLocaleDateString('ar-SA')
                        : 'لا توجد طلبات'
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-3">
                    <Heart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">آخر إضافة للمفضلة</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {stats?.favoritesCount > 0 ? 'هذا الشهر' : 'لا توجد مفضلة'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">إحصائيات سريعة</h3>
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stats?.totalOrders || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي الطلبات</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي المبيعات</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">إجراءات سريعة</h3>
          <div className="text-sm text-gray-500 dark:text-slate-400">
            الوصول السريع للوظائف الأساسية
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {user?.role === 'admin' && (
            <>
              <Link href="/dashboard/users" className="btn-primary">
                <Users className="w-5 h-5 mr-2" />
                إدارة المستخدمين
              </Link>
              <Link href="/dashboard/products" className="btn-secondary">
                <Package className="w-5 h-5 mr-2" />
                إدارة المنتجات
              </Link>
            </>
          )}
          
          {user?.role === 'supplier' && (
            <>
              <Link href="/dashboard/products/new" className="btn-primary">
                <Plus className="w-5 h-5 mr-2" />
                إضافة منتج جديد
              </Link>
              <Link href="/dashboard/fulfillment" className="btn-secondary">
                <Truck className="w-5 h-5 mr-2" />
                طلب تخزين
              </Link>
            </>
          )}
          
          {user?.role === 'marketer' && (
            <>
              <Link href="/dashboard/products" className="btn-primary">
                <Store className="w-5 h-5 mr-2" />
                تصفح المنتجات
              </Link>
              <Link href="/dashboard/favorites" className="btn-secondary">
                <Heart className="w-5 h-5 mr-2" />
                المفضلة
              </Link>
              <Link href="/dashboard/cart" className="btn-secondary">
                <ShoppingCart className="w-5 h-5 mr-2" />
                سلة التسوق
              </Link>
              <Link href="/dashboard/orders" className="btn-secondary">
                <ShoppingBag className="w-5 h-5 mr-2" />
                طلباتي
              </Link>
            </>
          )}
          
          {user?.role === 'wholesaler' && (
            <>
              <Link href="/dashboard/products" className="btn-primary">
                <Store className="w-5 h-5 mr-2" />
                تصفح المنتجات
              </Link>
              <Link href="/dashboard/favorites" className="btn-secondary">
                <Heart className="w-5 h-5 mr-2" />
                المفضلة
              </Link>
            </>
          )}
          
          <Link href="/dashboard/messages" className="btn-secondary">
            <MessageSquare className="w-5 h-5 mr-2" />
            الرسائل
          </Link>
          <Link href="/dashboard/wallet" className="btn-secondary">
            <Wallet className="w-5 h-5 mr-2" />
            المحفظة
          </Link>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">آخر تسجيل دخول</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {new Date().toLocaleDateString('ar-SA')}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">حالة الحساب</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {user?.isActive ? 'نشط' : 'متوقف'}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
              <div className={`w-6 h-6 rounded-full ${user?.isActive ? 'bg-green-600' : 'bg-red-600'}`}></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">الإشعارات</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">0 جديد</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/20 p-3 rounded-lg">
              <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 