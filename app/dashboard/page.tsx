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
  Clock,
  Edit,
  Save,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MediaThumbnail from '@/components/ui/MediaThumbnail';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  totalMessages?: number;
  pendingMessages?: number;
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
  
  // Quick edit states for supplier
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quickEditData, setQuickEditData] = useState({
    name: '',
    marketerPrice: 0,
    wholesalerPrice: 0,
    stockQuantity: 0,
    minimumSellingPrice: 0,
    isMinimumPriceMandatory: false
  });
  const [processing, setProcessing] = useState(false);

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

  // Quick edit functions for supplier
  const handleQuickEdit = (product: any) => {
    setSelectedProduct(product);
    setQuickEditData({
      name: product.name,
      marketerPrice: product.marketerPrice,
      wholesalerPrice: product.wholesalerPrice || 0,
      stockQuantity: product.stockQuantity,
      minimumSellingPrice: product.minimumSellingPrice || 0,
      isMinimumPriceMandatory: product.isMinimumPriceMandatory || false
    });
    setShowQuickEditModal(true);
  };

  const handleQuickEditSave = async () => {
    if (!selectedProduct) return;
    
    // Validation
    if (!quickEditData.name.trim()) {
      toast.error('اسم المنتج مطلوب');
      return;
    }
    
    if (quickEditData.marketerPrice <= 0) {
      toast.error('سعر المسوق يجب أن يكون أكبر من 0');
      return;
    }
    
    if (quickEditData.wholesalerPrice <= 0) {
      toast.error('سعر الجملة يجب أن يكون أكبر من 0');
      return;
    }
    
    if (quickEditData.wholesalerPrice >= quickEditData.marketerPrice) {
      toast.error('سعر الجملة يجب أن يكون أقل من سعر المسوق');
      return;
    }
    
    if (quickEditData.minimumSellingPrice > 0 && quickEditData.marketerPrice < quickEditData.minimumSellingPrice) {
      toast.error('سعر المسوق يجب أن يكون أكبر من أو يساوي السعر الأدنى للبيع');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quickEditData),
      });

      if (response.ok) {
        toast.success('تم تحديث المنتج بنجاح');
        fetchDashboardStats(); // Refresh dashboard data
        setShowQuickEditModal(false);
        setSelectedProduct(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في تحديث المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث المنتج');
    } finally {
      setProcessing(false);
    }
  };

  const handleProductClick = (productId: string) => {
    router.push(`/dashboard/products/${productId}`);
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/dashboard/orders/${orderId}`);
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
    <div className="space-y-12">
      {/* Enhanced Header */}
      <div className="card-glass p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-5xl font-bold gradient-text mb-2">{getRoleTitle()}</h1>
                <p className="text-gray-600 dark:text-slate-400 text-xl leading-relaxed">{getWelcomeMessage()}</p>
              </div>
            </div>
            
            {/* Quick Status Indicators - Only for Admin */}
            {user?.role === 'admin' && (
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">متصل</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="lg:text-right">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{getRoleLabel()}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Orders Card */}
        <div className="card-hover group p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                  +12.5%
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">
                {user?.role === 'admin' ? 'إجمالي الطلبات' : 'طلباتي'}
              </p>
              <p className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {stats?.totalOrders || 0}
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-slate-400">نشط</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="card-hover group p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-green-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                  +8.3%
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">
                {user?.role === 'admin' ? 'إجمالي الإيرادات' : 'إيراداتي'}
              </p>
              <p className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-slate-400">متنامي</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div className="card-hover group p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center text-sm font-medium text-amber-600 dark:text-amber-400">
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                  +15.2%
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">
                {user?.role === 'supplier' ? 'منتجاتي' : 
                 user?.role === 'marketer' ? 'المفضلة' : 'المنتجات'}
              </p>
              <p className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {user?.role === 'supplier' ? (stats?.totalProducts || 0) : 
                 user?.role === 'marketer' ? (stats?.favoritesCount || 0) : (stats?.totalProducts || 0)}
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-slate-400">متوفر</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Card - Only for Admin */}
        {user?.role === 'admin' ? (
          <>
            <div className="card-hover group p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center text-sm font-medium text-purple-600 dark:text-purple-400">
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                      +5.8%
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">المستخدمين</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                    {stats?.totalUsers || 0}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">مسجلين</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Card - Only for Admin */}
            <Link href="/dashboard/admin/messages" className="card-hover group p-8 relative overflow-hidden cursor-pointer">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center text-sm font-medium text-cyan-600 dark:text-cyan-400">
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                      +22.1%
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">الرسائل</p>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-4xl font-bold text-gray-900 dark:text-slate-100">
                      {stats?.totalMessages || 0}
                    </p>
                    {stats?.pendingMessages && stats.pendingMessages > 0 && (
                      <span className="badge badge-warning text-xs px-2 py-1">
                        {stats.pendingMessages} قيد المراجعة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">نشط</span>
                  </div>
                </div>
              </div>
            </Link>
           </>
         ) : (
          // Additional stats for non-admin users
          <div className="card-hover group p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center text-sm font-medium text-purple-600 dark:text-purple-400">
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                    +15.2%
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">
                  {user?.role === 'supplier' ? 'المنتجات النشطة' : 
                   user?.role === 'marketer' ? 'معدل النمو' : 'معدل النمو'}
                </p>
                <p className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                  {user?.role === 'supplier' ? (stats?.activeProducts || 0) : '+15%'}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {user?.role === 'supplier' ? 'نشط' : 'متنامي'}
                  </span>
                </div>
              </div>
            </div>
          </div>
         )}
      </div>

      {/* Role-specific Content */}
      {user?.role === 'admin' && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">آخر الطلبات</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">أحدث الطلبات المقدمة</p>
                </div>
              </div>
              <Link href="/dashboard/orders" className="btn-ghost text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-5">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: any) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <div 
                      key={order._id} 
                      className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleOrderClick(order._id)}
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-5">
                          <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1 p-4">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400 p-4">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1">{formatCurrency(order.total)}</p>
                        <span className={`badge ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-slate-400 mx-auto mb-6" />
                  <p className="text-gray-600 dark:text-slate-400 text-lg">لا توجد طلبات حديثة</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">أفضل المنتجات</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">المنتجات الأكثر مبيعاً</p>
                </div>
              </div>
              <Link href="/dashboard/products" className="btn-ghost text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-5">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 5).map((product: any) => (
                  <div 
                    key={product._id} 
                    className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer"
                    onClick={() => handleProductClick(product._id)}
                  >
                    <div className="flex items-center">
                      {/* Product Image */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden mr-5 flex-shrink-0 ">
                        <MediaThumbnail
                          media={product.images || []}
                          alt={product.name}
                          className="w-full h-full"
                          showTypeBadge={false}
                          fallbackIcon={<Package className="w-7 h-7 text-white" />}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1 p-4">{product.name}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400 p-4">{product.supplierName}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1">{product.sales || 0} مبيعات</p>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        <span className="text-sm text-gray-600 dark:text-slate-400 mr-1">{product.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 dark:text-slate-400 mx-auto mb-6" />
                  <p className="text-gray-600 dark:text-slate-400 text-lg">لا توجد منتجات</p>
                  <Link href="/dashboard/products/new" className="btn-primary mt-6">
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
          <div className="card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">منتجاتي</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">إدارة منتجاتك المعروضة</p>
                </div>
              </div>
              <Link href="/dashboard/products/new" className="btn-primary hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-1" />
                إضافة منتج
              </Link>
            </div>
            <div className="space-y-5">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 5).map((product: any) => (
                  <div 
                    key={product._id} 
                    className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer"
                    onClick={() => handleProductClick(product._id)}
                  >
                    <div className="flex items-center flex-1">
                      {/* Product Image */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden mr-5 flex-shrink-0">
                        <MediaThumbnail
                          media={product.images || []}
                          alt={product.name}
                          className="w-full h-full"
                          showTypeBadge={false}
                          fallbackIcon={<Package className="w-7 h-7 text-white" />}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{product.name}</p>
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <span className={`text-xs px-3 py-1 rounded-full ${
                            product.stockQuantity > 10 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : product.stockQuantity > 0 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            المخزون: {product.stockQuantity}
                          </span>
                          
                          {/* Quick Edit Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickEdit(product);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            title="تعديل سريع"
                          >
                            ✏️ تعديل
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-left ml-6">
                      <p className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{formatCurrency(product.marketerPrice)}</p>
                      <span className={`badge ${product.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {product.isApproved ? 'معتمد' : 'قيد المراجعة'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 dark:text-slate-400 mx-auto mb-6" />
                  <p className="text-gray-600 dark:text-slate-400 text-lg">لا توجد منتجات</p>
                  <Link href="/dashboard/products/new" className="btn-primary mt-6">
                    <Plus className="w-4 h-4 mr-1" />
                    إضافة منتج جديد
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">آخر الطلبات</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">أحدث طلبات العملاء</p>
                </div>
              </div>
              <Link href="/dashboard/orders" className="btn-ghost text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            <div className="space-y-5">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: any) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <div 
                      key={order._id} 
                      className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleOrderClick(order._id)}
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-5">
                          <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 mb-1">{formatCurrency(order.total)}</p>
                        <span className={`badge ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-slate-400 mx-auto mb-6" />
                  <p className="text-gray-600 dark:text-slate-400 text-lg">لا توجد طلبات حديثة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Featured Products */}
          <div className="card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">المنتجات المميزة</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">أفضل المنتجات المختارة لك</p>
                </div>
              </div>
              <Link href="/dashboard/products" className="btn-primary hover:shadow-lg transition-all">
                <Store className="w-4 h-4 mr-1" />
                تصفح الكل
              </Link>
            </div>
            <div className="space-y-6">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 4).map((product: any, index: number) => (
                  <div 
                    key={product._id} 
                    className="group relative flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-300 cursor-pointer border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600"
                    onClick={() => handleProductClick(product._id)}
                  >
                    {/* Product Image */}
                    <div className="flex items-center flex-1 ">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-xl overflow-hidden mr-6 flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300 p-4">
                          <MediaThumbnail
                            media={product.images || []}
                            alt={product.name}
                            className="w-full h-full"
                            showTypeBadge={false}
                            fallbackIcon={<Package className="w-8 h-8 text-white" />}
                          />
                        </div>
                        {/* Stock indicator */}
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                          product.stockQuantity > 10 ? 'bg-green-500' : 
                          product.stockQuantity > 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center space-x-3 space-x-reverse mb-3">
                          <span className="text-sm text-gray-600 dark:text-slate-400">
                            {product.categoryName}
                          </span>
                          <span className="text-gray-400 dark:text-slate-500">•</span>
                          <span className="text-sm text-gray-600 dark:text-slate-400">
                            {product.supplierName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 space-x-reverse">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            product.stockQuantity > 10 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : product.stockQuantity > 0 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {product.stockQuantity > 10 ? 'متوفر' : product.stockQuantity > 0 ? 'محدود' : 'نفذ'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {product.stockQuantity} قطعة متبقية
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left ml-6 flex flex-col items-end">
                      <div className="text-right mb-3">
                        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                          {formatCurrency(user?.role === 'wholesaler' ? product.wholesalerPrice : product.marketerPrice)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {user?.role === 'wholesaler' ? 'سعر الجملة' : 'سعر المسوق'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`badge ${product.inStock ? 'badge-success' : 'badge-danger'}`}>
                          {product.inStock ? 'متوفر' : 'غير متوفر'}
                        </span>
                        {index === 0 && (
                          <span className="badge badge-primary text-xs">
                            الأكثر طلباً
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Store className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">لا توجد منتجات مميزة</h4>
                  <p className="text-gray-600 dark:text-slate-400 mb-6">ابدأ بتصفح المنتجات المتاحة وإضافة المفضلة</p>
                  <Link href="/dashboard/products" className="btn-primary">
                    <Store className="w-4 h-4 mr-2" />
                    تصفح المنتجات
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Performance & Analytics */}
          <div className="space-y-6">
            {/* Performance Overview */}
            <div className="card p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">أداء المبيعات</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">إحصائيات أدائك</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-5">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-400 p-4">إجمالي المبيعات</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 p-4">
                        {formatCurrency(stats?.totalRevenue || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                      +12.5%
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-5">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-400 p-4">عدد الطلبات</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 p-4">
                        {stats?.totalOrders || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                      +8.3%
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-5">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-400 p-4">المنتجات المفضلة</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 p-4">
                        {stats?.favoritesCount || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center text-sm font-medium text-purple-600 dark:text-purple-400">
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                      +15.2%
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Recommendations */}
            <div className="card p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">توصيات ذكية</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">نصائح لتحسين أدائك</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">زيادة المبيعات</h4>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        ركز على المنتجات عالية الربح في فئة الإلكترونيات
                      </p>
                      <Link href="/dashboard/products" className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium">
                        تصفح المنتجات →
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">توقيت مثالي</h4>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        أفضل وقت للطلب هو بين 9 صباحاً و 2 ظهراً
                      </p>
                      <Link href="/dashboard/cart" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                        إضافة للسلة →
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">مخزون محدود</h4>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                        3 منتجات في قائمة المفضلة تنفد من المخزون قريباً
                      </p>
                      <Link href="/dashboard/favorites" className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">
                        مراجعة المفضلة →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">إجراءات سريعة</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">الوصول السريع للوظائف الأساسية</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">آخر تسجيل دخول</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {new Date().toLocaleDateString('ar-SA')}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">حالة الحساب</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {user?.isActive ? 'نشط' : 'متوقف'}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-xl">
              <div className={`w-6 h-6 rounded-full ${user?.isActive ? 'bg-green-600' : 'bg-red-600'}`}></div>
            </div>
          </div>
        </div>


      </div>

      {/* Quick Edit Modal for Supplier */}
      {showQuickEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
                  <Edit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">تعديل سريع</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{selectedProduct.name}</p>
                </div>
              </div>
              
              {/* Product Image Preview */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  اسم المنتج
                </label>
                <input
                  type="text"
                  value={quickEditData.name}
                  onChange={(e) => setQuickEditData({...quickEditData, name: e.target.value})}
                  className="input-field"
                  placeholder="اسم المنتج"
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                    سعر المسوق (الأساسي)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.marketerPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, marketerPrice: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                    سعر الجملة (للتجار)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.wholesalerPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, wholesalerPrice: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  الكمية المتوفرة
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={quickEditData.stockQuantity}
                    onChange={(e) => setQuickEditData({...quickEditData, stockQuantity: parseInt(e.target.value) || 0})}
                    className="input-field pr-12"
                    placeholder="0"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      quickEditData.stockQuantity > 10 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : quickEditData.stockQuantity > 0 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {quickEditData.stockQuantity > 10 ? 'متوفر' : quickEditData.stockQuantity > 0 ? 'منخفض' : 'نفذ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Minimum Selling Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                    السعر الأدنى للبيع (اختياري)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.minimumSellingPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, minimumSellingPrice: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex items-center mt-8">
                  <input
                    type="checkbox"
                    id="isMinimumPriceMandatory"
                    checked={quickEditData.isMinimumPriceMandatory}
                    onChange={(e) => setQuickEditData({...quickEditData, isMinimumPriceMandatory: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="isMinimumPriceMandatory" className="mr-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    إلزامي للمسوقين
                  </label>
                </div>
              </div>
            </div>
            
            {/* Profit Preview */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6 mt-8">
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">معاينة الأرباح</h4>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-slate-400">الفرق بين الأسعار:</span>
                  <span className="block font-medium text-green-600 dark:text-green-400 mt-1">
                    {(quickEditData.marketerPrice - quickEditData.wholesalerPrice).toFixed(2)} ₪
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-slate-400">نسبة الربح:</span>
                  <span className="block font-medium text-blue-600 dark:text-blue-400 mt-1">
                    {((quickEditData.marketerPrice - quickEditData.wholesalerPrice) / quickEditData.marketerPrice * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 space-x-reverse mt-8">
              <button
                onClick={() => {
                  setShowQuickEditModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={handleQuickEditSave}
                disabled={processing || !quickEditData.name.trim()}
                className="btn-primary flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 