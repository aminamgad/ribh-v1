'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
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
  Trash2,
  RotateCw,
  Share2,
  Link as LinkIcon,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import ButtonLoader from '@/components/ui/ButtonLoader';
import { hasPermission, hasAnyOfPermissions, PERMISSIONS } from '@/lib/permissions';

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
  ordersPreviousMonth?: number;
  revenuePreviousMonth?: number;
  favoritesPreviousMonth?: number;
  productsPreviousMonth?: number;
  usersPreviousMonth?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Use cache hook for dashboard stats
  const { data: stats, loading, refresh } = useDataCache<DashboardStats>({
    key: 'dashboard_stats',
    fetchFn: async () => {
      const response = await fetch(`/api/dashboard/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      const data = await response.json();
      return data.stats;
    },
    enabled: !!user,
    forceRefresh: false
  });
  
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

  // Export to Easy Orders (marketer/wholesaler)
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingProductId, setExportingProductId] = useState<string | null>(null);
  const [unlinkingProductId, setUnlinkingProductId] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportLockRef = useRef(false);

  const handleUnlinkExport = async (productId: string) => {
    if (integrations.length === 0) return;
    const integrationId = integrations.length === 1 ? integrations[0].id : selectedIntegrationId || integrations[0]?.id;
    if (!integrationId) return;
    setUnlinkingProductId(productId);
    try {
      const res = await fetch('/api/integrations/easy-orders/unlink-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, integrationId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'تم إلغاء الربط. يمكنك تصدير المنتج مرة أخرى.');
        refresh();
      } else {
        toast.error(data.error || 'فشل إلغاء الربط');
      }
    } catch {
      toast.error('حدث خطأ أثناء إلغاء الربط');
    } finally {
      setUnlinkingProductId(null);
    }
  };

  useEffect(() => {
    if ((user?.role === 'marketer' || user?.role === 'wholesaler')) {
      fetch('/api/integrations')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.integrations) {
            const active = data.integrations.filter((int: any) => int.status === 'active' && int.type === 'easy_orders');
            setIntegrations(active);
            if (active.length === 1) setSelectedIntegrationId(active[0].id);
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const handleExportProduct = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (exportLockRef.current) return; // منع التصدير المتكرر
    if (integrations.length === 0) {
      toast.error('لا توجد تكاملات نشطة. يرجى إضافة تكامل Easy Orders أولاً');
      router.push('/dashboard/integrations');
      return;
    }
    if (integrations.length === 1) {
      setExportingProductId(productId);
      await performExport(productId, integrations[0].id);
    } else {
      setExportingProductId(productId);
      setShowExportModal(true);
    }
  };

  const performExport = async (productId: string, integrationId: string) => {
    if (exportLockRef.current) return;
    exportLockRef.current = true;
    setExporting(true);
    try {
      const res = await fetch('/api/integrations/easy-orders/export-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, integrationId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم تصدير المنتج بنجاح إلى Easy Orders!');
        setShowExportModal(false);
        setExportingProductId(null);
        setSelectedIntegrationId('');
      } else {
        toast.error(data.error || 'فشل في تصدير المنتج');
        setExportingProductId(null);
        setShowExportModal(false);
        setSelectedIntegrationId('');
      }
    } catch {
      toast.error('حدث خطأ أثناء تصدير المنتج');
      setExportingProductId(null);
      setShowExportModal(false);
      setSelectedIntegrationId('');
    } finally {
      setExporting(false);
      exportLockRef.current = false;
    }
  };

  const handleExportFromModal = async () => {
    if (!exportingProductId || !selectedIntegrationId) return;
    await performExport(exportingProductId, selectedIntegrationId);
  };

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Update last update time when stats change
    if (stats) {
      setLastUpdate(new Date());
    }
  }, [user, router, stats]);

  // Listen for refresh events from header button
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    // Listen for custom refresh event
    window.addEventListener('refresh-dashboard', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh);
    };
  }, [refresh]);
  
  const handleManualRefresh = () => {
    refresh();
    // No toast here - header button already shows notification
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
        return (
          <>
            <span className="block sm:inline">مرحباً بك في لوحة تحكم المسوق.</span>
            <span className="block sm:inline">يمكنك تصفح المنتجات وطلبها للعملاء من هنا.</span>
          </>
        );
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
    return new Intl.NumberFormat('en-US', {
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

  const getPercentageDisplay = (
    percentage: number | undefined,
    previousValue?: number
  ) => {
    if (percentage === undefined || percentage === null) return { text: '—', color: 'text-gray-500 dark:text-slate-400', icon: null };
    if (previousValue === 0 && (percentage === 100 || percentage === 0)) {
      return { text: percentage > 0 ? 'جديد' : '—', color: 'text-[#4CAF50] dark:text-[#4CAF50]', icon: percentage > 0 ? ArrowUpRight : null };
    }
    if (percentage === 0) return { text: '0%', color: 'text-gray-500 dark:text-slate-400', icon: null };
    if (percentage > 0) return { text: `+${percentage}%`, color: 'text-[#4CAF50] dark:text-[#4CAF50]', icon: ArrowUpRight };
    return { text: `${percentage}%`, color: 'text-red-600 dark:text-red-400', icon: ArrowDownRight };
  };

  const pctOrders = getPercentageDisplay(stats?.ordersPercentage, stats?.ordersPreviousMonth);
  const pctRevenue = getPercentageDisplay(stats?.revenuePercentage, stats?.revenuePreviousMonth);
  const pctProducts = getPercentageDisplay(
    user?.role === 'marketer' ? stats?.favoritesPercentage : stats?.productsPercentage,
    user?.role === 'marketer' ? stats?.favoritesPreviousMonth : stats?.productsPreviousMonth
  );
  const pctUsers = getPercentageDisplay(stats?.usersPercentage, stats?.usersPreviousMonth);
  const pctGrowth = getPercentageDisplay(
    user?.role === 'supplier' ? stats?.productsPercentage : 
    (user?.role === 'marketer' || user?.role === 'wholesaler') 
      ? Math.round(((stats?.ordersPercentage ?? 0) + (stats?.revenuePercentage ?? 0) + (stats?.favoritesPercentage ?? stats?.productsPercentage ?? 0)) / 3)
      : stats?.revenuePercentage
  );

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
        refresh(); // Refresh dashboard data
        setShowQuickEditModal(false);
        setSelectedProduct(null);
      } else if (response.status === 403) {
        // Access denied - supplier trying to edit another supplier's product
        const error = await response.json().catch(() => ({}));
        toast.error(error.message || 'غير مصرح لك بتعديل هذا المنتج');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9800] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Admin Hero - لوحة تحكم الإدارة */}
      {user?.role === 'admin' ? (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-6 sm:p-8 md:p-10 shadow-xl">
          <div className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                      مرحباً {user?.name?.split(' ')[0] || 'بك'}
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base">
                      إدارة جميع جوانب المنصة من مكان واحد
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-6">
                  {hasPermission(user, 'users.view') && (
                    <Link href="/dashboard/users" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-white/95 transition-all shadow-lg min-h-[44px]">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      إدارة المستخدمين
                    </Link>
                  )}
                  {hasPermission(user, 'products.view') && (
                    <Link href="/dashboard/products" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 border border-white/30 transition-all min-h-[44px]">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                      إدارة المنتجات
                    </Link>
                  )}
                  {hasPermission(user, 'orders.view') && (
                    <Link href="/dashboard/orders" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 border border-white/30 transition-all min-h-[44px]">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                      إدارة الطلبات
                    </Link>
                  )}
                  {hasPermission(user, 'settings.manage') && (
                    <Link href="/dashboard/admin/settings" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 border border-white/30 transition-all min-h-[44px]">
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                      إعدادات النظام
                    </Link>
                  )}
                </div>
              </div>
              <div className="hidden lg:flex flex-col items-end gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/30">
                  <span className="text-4xl sm:text-5xl font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <p className="text-white/90 font-medium">{user?.name}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (user?.role === 'marketer' || user?.role === 'wholesaler') ? (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FF9800] via-[#F57C00] to-[#E65100] p-6 sm:p-8 md:p-10 shadow-xl">
          <div className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <Store className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                      مرحباً {user?.name?.split(' ')[0] || 'بك'}
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base">
                      ابدأ البيع وزد أرباحك من خلال تصفح أفضل المنتجات
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-6">
                  <Link href="/dashboard/products" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white text-[#E65100] font-semibold rounded-xl hover:bg-white/95 transition-all shadow-lg min-h-[44px]">
                    <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                    تصفح المنتجات
                  </Link>
                  <Link href="/dashboard/cart" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 border border-white/30 transition-all min-h-[44px]">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    سلة المشتريات
                  </Link>
                  <Link href="/dashboard/favorites" className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 border border-white/30 transition-all min-h-[44px]">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                    المفضلة
                  </Link>
                </div>
              </div>
              <div className="hidden lg:flex flex-col items-end gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/30">
                  <span className="text-4xl sm:text-5xl font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <p className="text-white/90 font-medium">{user?.name}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Header للأدوار الأخرى */
        <div className="card-glass p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-white text-lg sm:text-xl font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-2">{getRoleTitle()}</h1>
                  <p className="text-gray-600 dark:text-slate-400 text-sm sm:text-base lg:text-lg leading-relaxed">{getWelcomeMessage()}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                {lastUpdate && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF9800]/10 dark:bg-[#FF9800]/20 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-[#FF9800]" />
                    <span className="text-xs sm:text-sm text-[#F57C00] dark:text-[#FFB74D]">
                      آخر تحديث: {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#FF9800]/10 hover:bg-[#FF9800]/20 rounded-full transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-[#FF9800] ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-xs sm:text-sm text-[#E65100] dark:text-[#FFB74D]">{loading ? 'جاري...' : 'تحديث'}</span>
                </button>
              </div>
            </div>
            <div className="lg:text-right flex items-center gap-3">
              <div className="text-right">
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{getRoleLabel()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white text-base sm:text-lg font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {/* Orders Card - حسب الصلاحية للإدارة */}
        {(user?.role !== 'admin' || hasPermission(user, 'orders.view')) && (
        <div className="card-hover group p-4 sm:p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#4CAF50]/10 to-[#388E3C]/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-[#4CAF50] to-[#388E3C] p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="text-left">
                <div className={`flex items-center text-xs sm:text-sm font-medium ${pctOrders.color}`}>
                  {pctOrders.icon && <pctOrders.icon className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />}
                  {pctOrders.text}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400 mb-2 sm:mb-3">
                {user?.role === 'admin' ? 'إجمالي الطلبات' : 'طلباتي'}
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">
                {stats?.totalOrders || 0}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  (stats?.ordersPercentage ?? 0) > 0 ? 'bg-[#4CAF50]' : (stats?.ordersPercentage ?? 0) < 0 ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                  {(stats?.ordersPercentage ?? 0) > 0 ? 'متنامي' : (stats?.ordersPercentage ?? 0) < 0 ? 'انخفاض' : 'ثابت'}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Revenue Card - حسب الصلاحية للإدارة */}
        {(user?.role !== 'admin' || hasPermission(user, 'earnings.view')) && (
        <div className="card-hover group p-4 sm:p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#FF9800]/10 to-[#F57C00]/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-[#FF9800] to-[#F57C00] p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="text-left">
                <div className={`flex items-center text-xs sm:text-sm font-medium ${pctRevenue.color}`}>
                  {pctRevenue.icon && <pctRevenue.icon className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />}
                  {pctRevenue.text}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400 mb-2 sm:mb-3">
                {user?.role === 'admin' ? 'إجمالي الإيرادات' : 'إيراداتي'}
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2 break-words">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  (stats?.revenuePercentage ?? 0) > 0 ? 'bg-[#4CAF50]' : (stats?.revenuePercentage ?? 0) < 0 ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                  {(stats?.revenuePercentage ?? 0) > 0 ? 'متنامي' : (stats?.revenuePercentage ?? 0) < 0 ? 'انخفاض' : 'ثابت'}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Products Card - حسب الصلاحية للإدارة (المفضلة للمسوق) */}
        {(user?.role !== 'admin' || hasPermission(user, 'products.view')) && (
        <div className="card-hover group p-4 sm:p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className={`p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300 ${
                user?.role === 'marketer' ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-[#FF9800] to-[#F57C00]'
              }`}>
                {user?.role === 'marketer' ? (
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                ) : (
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                )}
              </div>
              <div className="text-left">
                <div className={`flex items-center text-xs sm:text-sm font-medium ${pctProducts.color}`}>
                  {pctProducts.icon && <pctProducts.icon className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />}
                  {pctProducts.text}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400 mb-2 sm:mb-3">
                {user?.role === 'supplier' ? 'منتجاتي' : 
                 user?.role === 'marketer' ? 'المفضلة' : 'المنتجات'}
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">
                {user?.role === 'supplier' ? (stats?.totalProducts || 0) : 
                 user?.role === 'marketer' ? (stats?.favoritesCount || 0) : (stats?.totalProducts || 0)}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {(() => {
                  const pct = user?.role === 'marketer' ? (stats?.favoritesPercentage ?? 0) : (stats?.productsPercentage ?? 0);
                  return (
                    <>
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                        pct > 0 ? 'bg-[#4CAF50]' : pct < 0 ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                        {user?.role === 'marketer' ? (pct > 0 ? 'زيادة' : pct < 0 ? 'انخفاض' : 'ثابت') : (pct > 0 ? 'متنامي' : pct < 0 ? 'انخفاض' : 'ثابت')}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Users Card - للإدارة حسب صلاحية users.view */}
        {user?.role === 'admin' && hasPermission(user, 'users.view') && (
            <div className="card-hover group p-4 sm:p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#4CAF50]/10 to-[#388E3C]/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-[#4CAF50] to-[#388E3C] p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className={`flex items-center text-xs sm:text-sm font-medium ${pctUsers.color}`}>
                      {pctUsers.icon && <pctUsers.icon className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />}
                      {pctUsers.text}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400 mb-2 sm:mb-3">المستخدمين</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">
                    {stats?.totalUsers || 0}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      (stats?.usersPercentage ?? 0) > 0 ? 'bg-[#4CAF50]' : (stats?.usersPercentage ?? 0) < 0 ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                      {(stats?.usersPercentage ?? 0) > 0 ? 'متنامي' : (stats?.usersPercentage ?? 0) < 0 ? 'انخفاض' : 'مسجلين'}
                    </span>
                  </div>
              </div>
            </div>
            </div>
        )}

        {/* Messages Card - للإدارة مع أي صلاحية رسائل */}
        {user?.role === 'admin' && hasAnyOfPermissions(user, [PERMISSIONS.MESSAGES_VIEW, PERMISSIONS.MESSAGES_REPLY, PERMISSIONS.MESSAGES_MODERATE]) && (
            <Link href="/dashboard/messages" className="card-hover group p-4 sm:p-6 md:p-8 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#FF9800]/10 to-[#F57C00]/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-[#FF9800] to-[#F57C00] p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                      —
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400 mb-2 sm:mb-3">رسائل المنتجات</p>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 flex-wrap">
                    <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100">
                      {stats?.totalMessages || 0}
                    </p>
                    {stats?.pendingMessages && stats.pendingMessages > 0 && (
                      <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white shadow-sm">
                        {stats.pendingMessages} قيد المراجعة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#FF9800] rounded-full"></div>
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">نشط</span>
                  </div>
                </div>
              </div>
            </Link>
        )}

        {/* بطاقة إضافية لغير الإدارة (منتجات نشطة / معدل نمو) */}
        {user?.role !== 'admin' && (
          <div className="card-hover group p-4 sm:p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#4CAF50]/10 to-[#388E3C]/10 rounded-full -translate-y-12 translate-x-12 sm:-translate-y-16 sm:translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-[#4CAF50] to-[#388E3C] p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-all duration-300">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div className="text-left">
                  <div className={`flex items-center text-xs sm:text-sm font-medium ${pctGrowth.color}`}>
                    {pctGrowth.icon && <pctGrowth.icon className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />}
                    {pctGrowth.text}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400 mb-2 sm:mb-3">
                  {user?.role === 'supplier' ? 'المنتجات النشطة' : 
                   user?.role === 'marketer' ? 'معدل النمو' : 'معدل النمو'}
                </p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">
                  {user?.role === 'supplier' ? (stats?.activeProducts || 0) : (pctGrowth.text !== '—' ? pctGrowth.text : '—')}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                    user?.role === 'supplier' ? 'bg-[#4CAF50]' : 
                    (pctGrowth.text === 'جديد' || pctGrowth.text.startsWith('+')) ? 'bg-[#4CAF50]' : 
                    pctGrowth.text.startsWith('-') ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                    {user?.role === 'supplier' ? 'نشط' : 
                     pctGrowth.text === 'جديد' || pctGrowth.text.startsWith('+') ? 'متنامي' : 
                     pctGrowth.text.startsWith('-') ? 'انخفاض' : 'ثابت'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role-specific Content - حسب الصلاحيات للإدارة */}
      {user?.role === 'admin' && (hasPermission(user, 'orders.view') || hasPermission(user, 'products.view')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Recent Orders - حسب orders.view */}
          {hasPermission(user, 'orders.view') && (
          <div className="card p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#4CAF50] to-[#388E3C] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100">آخر الطلبات</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">أحدث الطلبات المقدمة</p>
                </div>
              </div>
              <Link href="/dashboard/orders" className="btn-ghost text-sm hover:bg-[#4CAF50]/10 dark:hover:bg-[#4CAF50]/20 transition-colors flex items-center gap-1 self-start sm:self-auto">
                عرض الكل
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4 sm:space-y-5">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: any) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <div 
                      key={order._id} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 p-4 sm:p-5 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/80 transition-all duration-200 cursor-pointer active:scale-[0.99] border border-transparent hover:border-[#4CAF50]/20 dark:hover:border-[#4CAF50]/30"
                      onClick={() => handleOrderClick(order._id)}
                    >
                      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#4CAF50] to-[#388E3C] rounded-xl flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">#{order.orderNumber}</p>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate">{order.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 sm:text-left">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm sm:text-base">{formatCurrency(order.total)}</p>
                        <span className={`badge text-xs min-h-[28px] flex items-center ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 sm:py-16 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#4CAF50]/20 to-[#388E3C]/20 dark:from-[#4CAF50]/30 dark:to-[#388E3C]/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-[#4CAF50] dark:text-[#4CAF50]" />
                  </div>
                  <p className="text-gray-600 dark:text-slate-400 text-base sm:text-lg">لا توجد طلبات حديثة</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Top Products - حسب products.view */}
          {hasPermission(user, 'products.view') && (
          <div className="card p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100">أفضل المنتجات</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">المنتجات الأكثر مبيعاً</p>
                </div>
              </div>
              <Link href="/dashboard/products" className="btn-ghost text-sm hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 transition-colors flex items-center gap-1 self-start sm:self-auto">
                عرض الكل
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4 sm:space-y-5">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 5).map((product: any, index: number) => (
                  <div 
                    key={product._id} 
                    className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-xl hover:from-[#FF9800]/5 hover:to-[#F57C00]/5 dark:hover:from-[#FF9800]/10 dark:hover:to-[#F57C00]/10 transition-all duration-300 cursor-pointer border border-gray-200 dark:border-slate-600 hover:border-[#FF9800]/30 dark:hover:border-[#FF9800]/40 active:scale-[0.99]"
                    onClick={() => handleProductClick(product._id)}
                  >
                    <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
                        <MediaThumbnail
                          media={product.images || []}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          showTypeBadge={false}
                          width={56}
                          height={56}
                          fallbackIcon={<Package className="w-7 h-7 text-white" />}
                        />
                        {index === 0 && (
                          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-bl-lg flex items-center justify-center">
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm sm:text-base line-clamp-2 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors">{product.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate mt-0.5">{product.supplierName || 'مدير النظام'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:flex-col sm:items-end sm:text-left shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">{product.sales || 0} مبيعات</span>
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">{product.rating ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(product.rating) : '0.0'}</span>
                        </span>
                      </div>
                      {index === 0 && (
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white">
                          الأكثر مبيعاً
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 sm:py-16 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#FF9800]/20 to-[#F57C00]/20 dark:from-[#FF9800]/30 dark:to-[#F57C00]/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Package className="w-8 h-8 sm:w-10 sm:h-10 text-[#FF9800] dark:text-[#FF9800]" />
                  </div>
                  <p className="text-gray-600 dark:text-slate-400 text-base sm:text-lg">لا توجد منتجات</p>
                  {hasPermission(user, 'products.manage') && (
                    <Link href="/dashboard/products/new" className="btn-primary mt-6">
                      <Plus className="w-4 h-4 mr-1" />
                      إضافة منتج جديد
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
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
                          width={56}
                          height={56}
                          fallbackIcon={<Package className="w-7 h-7 text-white" />}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{product.name}</p>
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <span className={`text-xs px-3 py-1 rounded-full ${
                            (product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                              ? product.variantOptions.reduce((sum: number, opt: any) => sum + (opt.stockQuantity || 0), 0)
                              : product.stockQuantity) > 10 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : (product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                                ? product.variantOptions.reduce((sum: number, opt: any) => sum + (opt.stockQuantity || 0), 0)
                                : product.stockQuantity) > 0 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            المخزون: {product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                              ? `${product.variantOptions.reduce((sum: number, opt: any) => sum + (opt.stockQuantity || 0), 0)} (${product.variantOptions.length} متغير${product.variantOptions.length > 1 ? 'ات' : ''})`
                              : product.stockQuantity
                            }
                          </span>
                          
                          {/* Quick Edit Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickEdit(product);
                            }}
                            className="text-xs text-[#FF9800] dark:text-[#FF9800] hover:text-[#F57C00] dark:hover:text-[#F57C00] font-medium"
                            title="تعديل سريع"
                          >
                            ✏️ تعديل
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-left ml-6">
                      <p className={`font-semibold mb-2 ${
                        (product as any).isMarketerPriceManuallyAdjusted
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-900 dark:text-slate-100'
                      }`}>{formatCurrency(product.marketerPrice)}</p>
                      {user?.role !== 'marketer' && (
                        <span className={`badge ${product.isApproved ? 'badge-success' : 'badge-warning'}`}>
                          {product.isApproved ? 'معتمد' : 'قيد المراجعة'}
                        </span>
                      )}
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
                <div className="w-12 h-12 bg-gradient-to-br from-[#4CAF50] to-[#388E3C] rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">آخر الطلبات</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">أحدث طلبات العملاء</p>
                </div>
              </div>
              <Link href="/dashboard/orders" className="btn-ghost text-sm hover:bg-[#4CAF50]/10 dark:hover:bg-[#4CAF50]/20 transition-colors">
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
                        <div className="w-12 h-12 bg-gradient-to-br from-[#4CAF50] to-[#388E3C] rounded-lg flex items-center justify-center mr-5">
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
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Featured Products */}
          <div className="card p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100">المنتجات المميزة</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate">أفضل المنتجات المختارة لك</p>
                </div>
              </div>
              <Link href="/dashboard/products" className="btn-primary hover:shadow-lg transition-all min-h-[44px] flex items-center justify-center flex-shrink-0 w-full sm:w-auto">
                <Store className="w-4 h-4 mr-1" />
                تصفح الكل
              </Link>
            </div>
            <div className="space-y-4 sm:space-y-5">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.slice(0, 4).map((product: any, index: number) => (
                  <div 
                    key={product._id} 
                    className="group relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-xl hover:from-[#FF9800]/10 hover:to-[#F57C00]/10 dark:hover:from-[#FF9800]/20 dark:hover:to-[#F57C00]/20 transition-all duration-300 cursor-pointer border border-gray-200 dark:border-slate-600 hover:border-[#FF9800]/30 dark:hover:border-[#FF9800]/40 active:scale-[0.99]"
                    onClick={() => handleProductClick(product._id)}
                  >
                    {/* Product Image & Info */}
                    <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                          <MediaThumbnail
                            media={product.images || []}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            showTypeBadge={false}
                            width={64}
                            height={64}
                            fallbackIcon={<Package className="w-8 h-8 text-white" />}
                          />
                        </div>
                        <div className={`absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                          product.stockQuantity > 10 ? 'bg-green-500' : 
                          product.stockQuantity > 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-base sm:text-lg group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-200 line-clamp-2">
                          {product.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate mt-0.5">
                          {product.categoryName || 'غير محدد'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-medium shrink-0 ${
                            product.stockQuantity > 10 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : product.stockQuantity > 0 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {product.stockQuantity > 10 ? 'متوفر' : product.stockQuantity > 0 ? 'محدود' : 'نفذ'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {product.stockQuantity} قطعة
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Price & Actions */}
                    <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 border-t sm:border-t-0 border-gray-200 dark:border-slate-600 pt-4 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className={`text-xl sm:text-2xl font-bold group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors ${
                          user?.role !== 'wholesaler' && (product as any).isMarketerPriceManuallyAdjusted
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-900 dark:text-slate-100'
                        }`}>
                          {formatCurrency(user?.role === 'wholesaler' ? product.wholesalerPrice : product.marketerPrice)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {user?.role === 'wholesaler' ? 'سعر الجملة' : 'سعر المسوق'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                        {(user?.role === 'marketer' || user?.role === 'wholesaler') && integrations.length > 0 && product.isApproved !== false && !(product as any).metadata?.easyOrdersProductId && (
                          <button
                            onClick={(e) => handleExportProduct(e, product._id)}
                            disabled={!!exportingProductId}
                            className="btn-export disabled:opacity-60 min-h-[36px] text-xs px-2 py-1.5"
                            title="تصدير إلى Easy Orders"
                          >
                            {exportingProductId === product._id ? (
                              <ButtonLoader variant="light" size="sm" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                            <span className="hidden sm:inline">{exportingProductId === product._id ? 'جاري...' : 'تصدير'}</span>
                          </button>
                        )}
                        {(user?.role === 'marketer' || user?.role === 'wholesaler') && integrations.length > 0 && product.isApproved !== false && (product as any).metadata?.easyOrdersProductId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnlinkExport(product._id); }}
                            disabled={!!unlinkingProductId}
                            className="px-2 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition-colors text-xs min-h-[36px]"
                            title="إلغاء الربط"
                          >
                            مُصدّر
                          </button>
                        )}
                        <span className={`badge text-xs min-h-[28px] flex items-center ${product.inStock ? 'badge-success' : 'badge-danger'}`}>
                          {product.inStock ? 'متوفر' : 'غير متوفر'}
                        </span>
                        {index === 0 && (
                          <span className="badge badge-primary text-xs shrink-0 min-h-[28px] flex items-center">
                            الأكثر طلباً
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 sm:py-16 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#FF9800]/20 to-[#F57C00]/20 dark:from-[#FF9800]/30 dark:to-[#F57C00]/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Store className="w-8 h-8 sm:w-10 sm:h-10 text-[#FF9800] dark:text-[#FF9800]" />
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2 sm:mb-3">لا توجد منتجات مميزة</h4>
                  <p className="text-gray-600 dark:text-slate-400 mb-4 sm:mb-6 text-sm sm:text-base">ابدأ بتصفح المنتجات المتاحة وإضافة المفضلة</p>
                  <Link href="/dashboard/products" className="btn-primary min-h-[44px] inline-flex items-center justify-center">
                    <Store className="w-4 h-4 mr-2" />
                    تصفح المنتجات
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Performance & Analytics */}
          <div className="space-y-4 sm:space-y-6">
            {/* Performance Overview */}
            <div className="card p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100">أداء المبيعات</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">إحصائيات أدائك</p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                  <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400">إجمالي المبيعات</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">
                        {formatCurrency(stats?.totalRevenue || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0 border-t sm:border-t-0 border-emerald-200/50 dark:border-emerald-800/50 pt-3 sm:pt-0">
                    <div className={`flex items-center text-xs sm:text-sm font-medium ${pctRevenue.color}`}>
                      {pctRevenue.icon && <pctRevenue.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />}
                      {pctRevenue.text}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-[#4CAF50]/10 to-[#388E3C]/10 dark:from-[#4CAF50]/20 dark:to-[#388E3C]/20 rounded-xl">
                  <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#4CAF50] to-[#388E3C] rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400">عدد الطلبات</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">
                        {stats?.totalOrders || 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0 border-t sm:border-t-0 border-[#4CAF50]/20 dark:border-[#4CAF50]/30 pt-3 sm:pt-0">
                    <div className={`flex items-center text-xs sm:text-sm font-medium ${pctOrders.color}`}>
                      {pctOrders.icon && <pctOrders.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />}
                      {pctOrders.text}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                  </div>
                </div>

                {user?.role === 'marketer' && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400">المنتجات المفضلة</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">
                          {stats?.favoritesCount || 0}
                        </p>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0 border-t sm:border-t-0 border-purple-200/50 dark:border-purple-800/50 pt-3 sm:pt-0">
                      <div className={`flex items-center text-xs sm:text-sm font-medium ${pctProducts.color}`}>
                        {pctProducts.icon && <pctProducts.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />}
                        {pctProducts.text}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">من الشهر الماضي</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Recommendations */}
            <div className="card p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-slate-100">توصيات ذكية</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">نصائح لتحسين أدائك</p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <Link href="/dashboard/products" className="block p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-200 active:scale-[0.99]">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-1 sm:mb-2 text-sm sm:text-base">زيادة المبيعات</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mb-2 sm:mb-3 line-clamp-2">
                        ركز على المنتجات عالية الربح في فئة الإلكترونيات
                      </p>
                      <span className="text-sm text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1 min-h-[44px]">
                        تصفح المنتجات
                        <span className="rtl:rotate-180">→</span>
                      </span>
                    </div>
                  </div>
                </Link>

                <Link href="/dashboard/cart" className="block p-3 sm:p-4 bg-gradient-to-r from-[#FF9800]/10 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/20 rounded-xl border border-[#FF9800]/20 dark:border-[#FF9800]/30 hover:border-[#FF9800]/50 dark:hover:border-[#FF9800]/50 transition-all duration-200 active:scale-[0.99]">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-1 sm:mb-2 text-sm sm:text-base">توقيت مثالي</h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mb-2 sm:mb-3">
                        أفضل وقت للطلب هو بين 9 صباحاً و 2 ظهراً
                      </p>
                      <span className="text-sm text-[#FF9800] dark:text-[#FF9800] font-medium inline-flex items-center gap-1 min-h-[44px]">
                        إضافة للسلة
                        <span className="rtl:rotate-180">→</span>
                      </span>
                    </div>
                  </div>
                </Link>

                {user?.role === 'marketer' && (
                  <Link href="/dashboard/favorites" className="block p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 active:scale-[0.99]">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-1 sm:mb-2 text-sm sm:text-base">مخزون محدود</h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mb-2 sm:mb-3 line-clamp-2">
                          3 منتجات في قائمة المفضلة تنفد من المخزون قريباً
                        </p>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium inline-flex items-center gap-1 min-h-[44px]">
                          مراجعة المفضلة
                          <span className="rtl:rotate-180">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">إجراءات سريعة</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">الوصول السريع للوظائف الأساسية</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* الإدارة: استبعاد الأزرار المكررة (موجودة في الهيرو)، إظهار إجراءات إضافية */}
          {user?.role === 'admin' && (
            <>
              {hasPermission(user, PERMISSIONS.EARNINGS_VIEW) && (
                <Link href="/dashboard/admin/earnings" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all min-h-[52px]">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">تقرير الأرباح</span>
                </Link>
              )}
              {hasPermission(user, PERMISSIONS.WITHDRAWALS_VIEW) && (
                <Link href="/dashboard/admin/withdrawals" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all min-h-[52px]">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">طلبات السحب</span>
                </Link>
              )}
              {hasPermission(user, PERMISSIONS.ANALYTICS_VIEW) && (
                <Link href="/dashboard/analytics" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all min-h-[52px]">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">التحليلات</span>
                </Link>
              )}
              {hasPermission(user, PERMISSIONS.CATEGORIES_MANAGE) && (
                <Link href="/dashboard/admin/categories" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-[#4CAF50]/30 bg-[#4CAF50]/5 hover:bg-[#4CAF50]/10 hover:border-[#4CAF50]/50 transition-all min-h-[52px]">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#4CAF50] flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">إدارة الفئات</span>
                </Link>
              )}
            </>
          )}
          
          {user?.role === 'supplier' && (
            <>
              <Link href="/dashboard/products/new" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white shadow-md hover:shadow-lg transition-all min-h-[52px]">
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate text-center">إضافة منتج</span>
              </Link>
              <Link href="/dashboard/fulfillment" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-[#4CAF50]/30 bg-[#4CAF50]/5 hover:bg-[#4CAF50]/10 transition-all min-h-[52px]">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-[#4CAF50] flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">طلب تخزين</span>
              </Link>
            </>
          )}
          
          {user?.role === 'marketer' && (
            <>
              <Link href="/dashboard/integrations" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-[#4CAF50] to-[#388E3C] text-white shadow-md hover:shadow-lg transition-all min-h-[52px]">
                <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate text-center">ربط Easy Orders</span>
              </Link>
              <Link href="/dashboard/orders" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-[#4CAF50]/30 bg-[#4CAF50]/5 hover:bg-[#4CAF50]/10 hover:border-[#4CAF50]/50 transition-all min-h-[52px]">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#4CAF50] flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">طلباتي</span>
              </Link>
            </>
          )}
          
          {user?.role === 'wholesaler' && (
            <>
              <Link href="/dashboard/integrations" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-[#4CAF50] to-[#388E3C] text-white shadow-md hover:shadow-lg transition-all min-h-[52px]">
                <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate text-center">ربط Easy Orders</span>
              </Link>
              <Link href="/dashboard/orders" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-[#4CAF50]/30 bg-[#4CAF50]/5 hover:bg-[#4CAF50]/10 transition-all min-h-[52px]">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#4CAF50] flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">طلباتي</span>
              </Link>
            </>
          )}

          {/* رسائل المنتجات: للإدارة مع أي صلاحية رسائل، لغير الإدارة متاح دائماً */}
          {(user?.role !== 'admin' || hasAnyOfPermissions(user, [PERMISSIONS.MESSAGES_VIEW, PERMISSIONS.MESSAGES_REPLY, PERMISSIONS.MESSAGES_MODERATE])) && (
            <Link href="/dashboard/messages" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all min-h-[52px]">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">رسائل المنتجات</span>
            </Link>
          )}
          {(user?.role === 'supplier' || user?.role === 'marketer' || user?.role === 'wholesaler') && (
            <Link href="/dashboard/wallet" className="flex flex-col sm:flex-row items-center justify-center gap-2 p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all min-h-[52px]">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 truncate text-center">المحفظة</span>
            </Link>
          )}
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-2">آخر تسجيل دخول</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {new Date().toLocaleDateString('en-US')}
              </p>
            </div>
                            <div className="bg-[#FF9800]/20 dark:bg-[#FF9800]/30 p-4 rounded-xl">
                  <Clock className="w-6 h-6 text-[#FF9800] dark:text-[#FF9800]" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto safe-area-inset">
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 max-w-lg w-full shadow-xl my-auto max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center flex-1 min-w-0">
                <div className="bg-[#FF9800]/20 dark:bg-[#FF9800]/30 p-2 sm:p-3 rounded-full mr-2 sm:mr-4 flex-shrink-0">
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#FF9800] dark:text-[#FF9800]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">تعديل سريع</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate">{selectedProduct.name}</p>
                </div>
              </div>
              
              {/* Product Image Preview */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 mr-2 sm:mr-4">
                  <MediaThumbnail
                    media={selectedProduct.images}
                    alt={selectedProduct.name}
                    className="w-full h-full"
                    showTypeBadge={false}
                    width={64}
                    height={64}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 sm:mb-3">
                  اسم المنتج
                </label>
                <input
                  type="text"
                  value={quickEditData.name}
                  onChange={(e) => setQuickEditData({...quickEditData, name: e.target.value})}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                  placeholder="اسم المنتج"
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">
                      سعر المسوق (الأساسي)
                    </label>
                    {quickEditData.isMinimumPriceMandatory && quickEditData.minimumSellingPrice > 0 && (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                        إلزامي
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.marketerPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, marketerPrice: parseFloat(e.target.value) || 0})}
                    className={`input-field text-sm sm:text-base min-h-[44px] ${
                      quickEditData.isMinimumPriceMandatory && quickEditData.minimumSellingPrice > 0
                        ? 'border-orange-500 dark:border-orange-500 focus:ring-orange-500 dark:focus:ring-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : ''
                    }`}
                    placeholder="0.00"
                  />
                  {quickEditData.isMinimumPriceMandatory && quickEditData.minimumSellingPrice > 0 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      السعر الأدنى: {quickEditData.minimumSellingPrice.toFixed(2)} ₪
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 sm:mb-3">
                  الكمية المتوفرة
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={quickEditData.stockQuantity}
                    onChange={(e) => setQuickEditData({...quickEditData, stockQuantity: parseInt(e.target.value) || 0})}
                    className="input-field pr-20 sm:pr-24 text-sm sm:text-base min-h-[44px]"
                    placeholder="0"
                  />
                  <div className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2">
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 sm:mb-3">
                    السعر الأدنى للبيع (اختياري)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickEditData.minimumSellingPrice}
                    onChange={(e) => setQuickEditData({...quickEditData, minimumSellingPrice: parseFloat(e.target.value) || 0})}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex items-center mt-6 sm:mt-8">
                  <input
                    type="checkbox"
                    id="isMinimumPriceMandatory"
                    checked={quickEditData.isMinimumPriceMandatory}
                    onChange={(e) => setQuickEditData({...quickEditData, isMinimumPriceMandatory: e.target.checked})}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF9800] bg-gray-100 border-gray-300 rounded focus:ring-[#FF9800] dark:focus:ring-[#FF9800] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 min-w-[20px] min-h-[20px]"
                  />
                  <label htmlFor="isMinimumPriceMandatory" className="mr-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">
                    إلزامي للمسوقين
                  </label>
                </div>
              </div>
            </div>
            
            {/* Profit Preview */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 sm:p-6 mt-4 sm:mt-6 md:mt-8">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 sm:mb-4">معاينة الأرباح</h4>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600 dark:text-slate-400 block mb-1">الفرق بين الأسعار:</span>
                  <span className="block font-medium text-green-600 dark:text-green-400 text-sm sm:text-base">
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quickEditData.marketerPrice - quickEditData.wholesalerPrice)} ₪
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-slate-400 block mb-1">نسبة الربح:</span>
                  <span className="block font-medium text-[#FF9800] dark:text-[#FF9800] text-sm sm:text-base">
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format((quickEditData.marketerPrice - quickEditData.wholesalerPrice) / quickEditData.marketerPrice * 100)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 space-y-reverse sm:space-x-reverse mt-6 sm:mt-8">
              <button
                onClick={() => {
                  setShowQuickEditModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary w-full sm:w-auto min-h-[44px] text-xs sm:text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleQuickEditSave}
                disabled={processing || !quickEditData.name.trim()}
                className="btn-primary flex items-center justify-center w-full sm:w-auto min-h-[44px] text-xs sm:text-sm"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal (marketer/wholesaler) */}
      {showExportModal && (user?.role === 'marketer' || user?.role === 'wholesaler') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تصدير المنتج إلى Easy Orders</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">اختر التكامل:</p>
            <div className="space-y-2 mb-6">
              {integrations.map((int: any) => (
                <label
                  key={int.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${
                    selectedIntegrationId === int.id ? 'border-[#4CAF50] bg-[#4CAF50]/10' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="integration"
                    value={int.id}
                    checked={selectedIntegrationId === int.id}
                    onChange={(e) => setSelectedIntegrationId(e.target.value)}
                    className="w-4 h-4 text-[#4CAF50]"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">{int.storeName}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowExportModal(false); setExportingProductId(null); }} className="btn-secondary flex-1" disabled={exporting}>إلغاء</button>
              <button onClick={handleExportFromModal} disabled={exporting || !selectedIntegrationId} className="btn-export flex-1 flex items-center justify-center px-4 py-2.5 text-sm">
                {exporting ? <><ButtonLoader variant="light" size="sm" className="ml-2" /> جاري التصدير...</> : <><Share2 className="w-4 h-4 ml-2" /> تصدير</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 