'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { 
  Store, 
  Link as LinkIcon, 
  Settings, 
  RotateCw, 
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  ShoppingBag,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';

interface StoreIntegration {
  id: string;
  type: 'easy_orders';
  status: 'active' | 'inactive' | 'pending' | 'error';
  storeName: string;
  storeUrl?: string;
  storeId?: string; // EasyOrders store ID
  shippingSynced?: boolean;
  lastShippingSync?: string;
  settings: {
    syncProducts: boolean;
    syncOrders: boolean;
    syncInventory: boolean;
    autoFulfillment: boolean;
    priceMarkup?: number;
    defaultCategory?: string;
  };
  lastSync?: string;
  syncErrors?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationFormData {
  type: 'easy_orders';
  storeName: string;
  storeUrl?: string;
  apiKey: string;
  apiSecret?: string;
  webhookUrl?: string;
  webhookSecret?: string; // EasyOrders webhook secret
  settings: {
    syncProducts: boolean;
    syncOrders: boolean;
    syncInventory: boolean;
    autoFulfillment: boolean;
    priceMarkup: number;
  };
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<StoreIntegration | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<StoreIntegration | null>(null);
  const [formData, setFormData] = useState<IntegrationFormData>({
    type: 'easy_orders',
    storeName: '',
    storeUrl: '',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    webhookSecret: '',
    settings: {
      syncProducts: true,
      syncOrders: true,
      syncInventory: true,
      autoFulfillment: false,
      priceMarkup: 0
    }
  });

  // Use cache hook for integrations
  const { data: integrationsData, loading, refresh } = useDataCache<{
    integrations: StoreIntegration[];
  }>({
    key: 'integrations',
    fetchFn: async () => {
      const response = await fetch('/api/integrations');
      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }
      return response.json();
    },
    enabled: !!user && (user.role === 'marketer' || user.role === 'wholesaler'),
    forceRefresh: false,
    onError: () => {
      toast.error('حدث خطأ في جلب التكاملات');
    }
  });

  const integrations = useMemo(() => integrationsData?.integrations || [], [integrationsData]);
  const [webhookStatus, setWebhookStatus] = useState<{ [key: string]: any }>({});

  // Fetch webhook status for EasyOrders integrations
  useEffect(() => {
    const fetchWebhookStatus = async () => {
      if (integrations.length === 0) return;
      
      try {
        const response = await fetch('/api/integrations/easy-orders/webhook/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const statusMap: { [key: string]: any } = {};
            data.integrations?.forEach((integration: any) => {
              statusMap[integration.id] = {
                webhookUrl: data.webhookUrl,
                isLocalhost: data.isLocalhost,
                warning: data.warning,
                ...integration
              };
            });
            setWebhookStatus(statusMap);
          }
        }
      } catch (error) {
        // Silently fail - webhook status is optional
      }
    };

    if (integrations.length > 0) {
      fetchWebhookStatus();
    }
  }, [integrations]);

  useEffect(() => {
    if (!user || (user.role !== 'marketer' && user.role !== 'wholesaler')) {
      router.push('/dashboard');
      return;
    }

    // Check for EasyOrders callback status
    const searchParams = new URLSearchParams(window.location.search);
    const easyOrdersStatus = searchParams.get('easy_orders');
    
    if (easyOrdersStatus === 'connected') {
      toast.success('تم ربط EasyOrders بنجاح!');
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
      refresh();
    } else if (easyOrdersStatus === 'pending') {
      toast('جاري إكمال إعدادات EasyOrders...', { icon: 'ℹ️' });
      window.history.replaceState({}, '', '/dashboard/integrations');
    } else if (easyOrdersStatus === 'error' || searchParams.get('error')) {
      const error = searchParams.get('error');
      let errorMessage = 'حدث خطأ في الربط مع EasyOrders';
      
      if (error === 'missing_user') {
        errorMessage = 'خطأ: لم يتم العثور على المستخدم. يرجى المحاولة مرة أخرى.';
      } else if (error === 'invalid_user') {
        errorMessage = 'خطأ: معرف المستخدم غير صالح. يرجى المحاولة مرة أخرى.';
      } else if (error === 'callback_failed') {
        errorMessage = 'فشل في إكمال الربط. يرجى المحاولة مرة أخرى.';
      }
      
      toast.error(errorMessage);
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, [user, router, refresh]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-integrations', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-integrations', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchIntegrations for backward compatibility
  const fetchIntegrations = async () => {
    refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingIntegration 
        ? `/api/integrations/${editingIntegration.id}`
        : '/api/integrations';
      
      const method = editingIntegration ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'حدث خطأ في حفظ التكامل');
      }

      toast.success(editingIntegration ? 'تم تحديث التكامل بنجاح' : 'تم إضافة التكامل بنجاح');
      setShowAddModal(false);
      setEditingIntegration(null);
      resetForm();
      fetchIntegrations();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في حفظ التكامل');
    }
  };

  const handleSync = async (integrationId: string, type: 'products' | 'orders' | 'all') => {
    try {
      setSyncingId(integrationId);
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشلت المزامنة');
      }

      const data = await response.json();
      
      // Show appropriate message based on results
      if (data.results.errors && data.results.errors.length > 0) {
        toast.error(`تمت المزامنة مع ${data.results.errors.length} خطأ. تحقق من الأخطاء أدناه.`, {
          duration: 5000
        });
      } else {
        toast.success(`تمت المزامنة بنجاح: ${data.results.products} منتج، ${data.results.orders} طلب`);
      }
      
      fetchIntegrations();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في المزامنة');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (integration: StoreIntegration) => {
    setIntegrationToDelete(integration);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!integrationToDelete) return;

    try {
      const response = await fetch(`/api/integrations/${integrationToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete integration');

      toast.success('تم حذف التكامل بنجاح');
      fetchIntegrations();
    } catch (error) {
      toast.error('حدث خطأ في حذف التكامل');
    } finally {
      setShowDeleteConfirm(false);
      setIntegrationToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'easy_orders',
      storeName: '',
      storeUrl: '',
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      webhookSecret: '',
      settings: {
        syncProducts: true,
        syncOrders: true,
        syncInventory: true,
        autoFulfillment: false,
        priceMarkup: 0
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'error':
        return 'خطأ';
      case 'pending':
        return 'قيد الانتظار';
      default:
        return 'غير نشط';
    }
  };

  const getPlatformLogo = (type: string) => {
    if (type === 'easy_orders') {
      return <div className="w-10 h-10 bg-[#FF9800]/20 dark:bg-[#FF9800]/30 rounded-lg flex items-center justify-center">
        <span className="text-[#FF9800] dark:text-[#FF9800] font-bold">EO</span>
      </div>;
    } else {
      return <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
        <span className="text-purple-600 dark:text-purple-300 font-bold">YC</span>
      </div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">تكاملات المتاجر</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            قم بربط متجرك الخارجي لمزامنة المنتجات والطلبات
          </p>
          {/* Info Banner */}
          <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  كيف تبدأ؟
                </h4>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mb-2">
                  ربط Easy Orders يسمح لك بتصدير منتجاتك وبيعها مباشرة من متجرك. 
                  <br className="hidden sm:inline" />
                  <span className="block sm:inline mt-1 sm:mt-0">
                    للتطوير المحلي: استخدم ngrok أو Vercel للربط التلقائي.
                    <br className="hidden sm:inline" />
                    للإنتاج: استخدم الربط التلقائي للسهولة.
                  </span>
                </p>
                <Link 
                  href="/docs/marketer-easy-orders-guide" 
                  className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline"
                >
                  اقرأ الدليل الكامل →
                </Link>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base px-3 sm:px-4 w-full sm:w-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تكامل</span>
        </button>
      </div>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <div className="card p-6 sm:p-12 text-center">
          <Store className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            لا توجد تكاملات حتى الآن
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
            قم بإضافة تكامل جديد لربط متجرك الخارجي
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary mx-auto min-h-[44px] text-sm sm:text-base px-4 sm:px-6"
          >
            إضافة تكامل الآن
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {integrations.map((integration) => (
            <div key={integration.id} className="card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getPlatformLogo(integration.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {integration.storeName}
                    </h3>
                    {integration.storeUrl && (
                      <a
                        href={integration.storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm text-[#FF9800] hover:underline flex items-center gap-1 mt-1 break-all"
                      >
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{integration.storeUrl}</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusIcon(integration.status)}
                  <span className={`text-xs sm:text-sm font-medium ${
                    integration.status === 'active' ? 'text-green-600 dark:text-green-400' :
                    integration.status === 'error' ? 'text-red-600 dark:text-red-400' :
                    integration.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-gray-600 dark:text-slate-400'
                  }`}>
                    {getStatusText(integration.status)}
                  </span>
                </div>
              </div>

              {/* Settings Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Package className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${integration.settings.syncProducts ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-gray-700 dark:text-gray-300">مزامنة المنتجات</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <ShoppingBag className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${integration.settings.syncOrders ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-gray-700 dark:text-gray-300">مزامنة الطلبات</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${integration.settings.syncInventory ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-gray-700 dark:text-gray-300">مزامنة المخزون</span>
                </div>
                {integration.settings.priceMarkup && integration.settings.priceMarkup > 0 && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      هامش ربح: {integration.settings.priceMarkup}%
                    </span>
                  </div>
                )}
              </div>

              {/* EasyOrders Specific Info */}
              {integration.type === 'easy_orders' && integration.storeId && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3 sm:mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm mb-2">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Store ID:</span>
                      <span className="text-gray-900 dark:text-white font-mono mr-2">
                        {integration.storeId.substring(0, 8)}...
                      </span>
                    </div>
                    {integration.shippingSynced && integration.lastShippingSync && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">آخر مزامنة شحن:</span>
                        <span className="text-gray-900 dark:text-white mr-2">
                          {format(new Date(integration.lastShippingSync), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Webhook Info */}
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {/* Warning if localhost */}
                    {webhookStatus[integration.id]?.isLocalhost && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            ⚠️ Webhook URL يستخدم localhost - EasyOrders لن يتمكن من الوصول إليه. استخدم ngrok أو Vercel.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/integrations/easy-orders/webhook/status');
                            const data = await response.json();
                            
                            if (data.success) {
                              const webhookInfo = data.integrations?.find((i: any) => i.id === integration.id);
                              if (webhookInfo) {
                                const message = `معلومات Webhook:\n\n` +
                                  `Webhook URL: ${data.webhookUrl}\n` +
                                  `Webhook Secret: ${webhookInfo.hasWebhookSecret ? 'محفوظ ✓' : 'غير محفوظ ✗'}\n` +
                                  `Store ID: ${webhookInfo.storeId || 'غير محدد'}\n` +
                                  `الحالة: ${webhookInfo.webhookConfigured ? 'مضبوط ✓' : 'غير مضبوط ✗'}\n` +
                                  `إجمالي الطلبات: ${webhookInfo.stats?.totalOrders || 0}\n` +
                                  `آخر طلب: ${webhookInfo.stats?.lastOrder ? webhookInfo.stats.lastOrder.orderNumber : 'لا يوجد'}` +
                                  (data.warning ? `\n\n⚠️ تحذير: ${data.warning}` : '');
                                alert(message);
                              }
                            }
                          } catch (error: any) {
                            toast.error('حدث خطأ في الحصول على معلومات Webhook');
                          }
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        عرض معلومات Webhook
                      </button>
                      {integration.type === 'easy_orders' && (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400">|</span>
                          <button
                            onClick={() => {
                              setEditingIntegration(integration);
                              setFormData({
                                type: integration.type,
                                storeName: integration.storeName,
                                storeUrl: integration.storeUrl || '',
                                apiKey: '',
                                apiSecret: '',
                                webhookUrl: '',
                                webhookSecret: '',
                                settings: {
                                  ...integration.settings,
                                  priceMarkup: integration.settings.priceMarkup ?? 0
                                }
                              });
                              setShowAddModal(true);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            إضافة/تحديث Webhook Secret
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Last Sync Info */}
              {integration.lastSync && (
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                  آخر مزامنة: {format(new Date(integration.lastSync), 'dd/MM/yyyy HH:mm')}
                </div>
              )}

                {/* Errors */}
                {integration.syncErrors && integration.syncErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200">
                            أخطاء المزامنة ({integration.syncErrors.length}):
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                // Clear errors by triggering a new sync
                                await handleSync(integration.id, 'products');
                              } catch (error) {
                                // Error already handled in handleSync
                              }
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                            title="إعادة المزامنة لتحديث الأخطاء"
                          >
                            تحديث
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {integration.syncErrors.slice(-5).map((error, index) => {
                            // Parse error message to extract key information
                            let errorMessage = error;
                            let productName = '';
                            let productId = '';
                            
                            // Extract product name from error message (format: "سعر المورد مطلوب - يرجى إضافة سعر المورد للمنتج \"Product Name\"")
                            const productNameMatch = error.match(/للمنتج\s+"([^"]+)"/);
                            if (productNameMatch) {
                              productName = productNameMatch[1];
                            }
                            
                            // Extract product ID if available (format: "ID: 123456")
                            const productIdMatch = error.match(/\(ID:\s*([^)]+)\)/);
                            if (productIdMatch) {
                              productId = productIdMatch[1];
                            }
                            
                            // Try to find product by name to get its ID
                            let productLink = productName 
                              ? (productId 
                                  ? `/dashboard/products/${productId}` 
                                  : `/dashboard/products?search=${encodeURIComponent(productName)}`)
                              : null;
                            
                            // Format error message - handle both old and new error formats
                            if (error.includes('سعر المورد مطلوب')) {
                              // If we have product name, show it; otherwise show the full message
                              if (productName) {
                                errorMessage = `❌ سعر المورد مطلوب - المنتج: "${productName}"`;
                              } else {
                                // For old errors without product name, show a helpful message with link to products
                                errorMessage = `❌ سعر المورد مطلوب - يرجى إضافة سعر المورد للمنتج`;
                                // Add link to products page filtered by missing supplier price
                                productLink = `/dashboard/products?missingSupplierPrice=true`;
                              }
                            } else if (error.includes('صورة واحدة على الأقل')) {
                              if (productName) {
                                errorMessage = `❌ يجب أن يحتوي المنتج على صورة واحدة على الأقل - المنتج: "${productName}"`;
                              } else {
                                errorMessage = error.includes('للمنتج') ? error : `❌ يجب أن يحتوي المنتج على صورة واحدة على الأقل`;
                              }
                            } else if (error.includes('10 صور')) {
                              if (productName) {
                                errorMessage = `❌ يجب ألا يزيد عدد الصور عن 10 صور - المنتج: "${productName}"`;
                              } else {
                                errorMessage = error.includes('للمنتج') ? error : `❌ يجب ألا يزيد عدد الصور عن 10 صور`;
                              }
                            } else if (error.includes('validation failed')) {
                              errorMessage = `❌ فشل التحقق: ${error.split('validation failed:')[1]?.trim() || error}`;
                            } else {
                              // Keep original error message but format it nicely
                              errorMessage = error.replace(/^❌\s*/, ''); // Remove duplicate ❌ if exists
                              if (!errorMessage.startsWith('❌')) {
                                errorMessage = `❌ ${errorMessage}`;
                              }
                            }
                            
                            return (
                              <div key={index} className="flex items-start gap-1.5 text-xs sm:text-sm text-red-700 dark:text-red-300">
                                <span className="flex-shrink-0 mt-0.5">❌</span>
                                <div className="flex-1 min-w-0">
                                  <span className="break-words">{errorMessage}</span>
                                  {productLink && (
                                    <Link
                                      href={productLink}
                                      className="mr-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline font-medium inline-block mt-1"
                                    >
                                      → عرض المنتج
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {integration.syncErrors.length > 5 && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                            و {integration.syncErrors.length - 5} خطأ آخر...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {/* Verify Webhook Button for EasyOrders */}
                  {integration.type === 'easy_orders' && integration.status === 'active' && (
                    <button
                      onClick={async () => {
                        try {
                          setSyncingId(integration.id);
                          const response = await fetch('/api/integrations/easy-orders/webhook/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ integrationId: integration.id })
                          });

                          const data = await response.json();
                          
                          if (data.success) {
                            if (data.isHealthy) {
                              toast.success('Webhook مضبوط بشكل صحيح! ✓');
                            } else {
                              const issuesCount = data.verification?.issues?.length || 0;
                              const issues = data.verification?.issues?.join('\n• ') || '';
                              toast.error(`تم العثور على ${issuesCount} مشكلة:\n• ${issues}`, { duration: 5000 });
                            }
                          } else {
                            throw new Error(data.error || 'فشل التحقق من Webhook');
                          }
                        } catch (error: any) {
                          toast.error(error.message || 'حدث خطأ في التحقق من Webhook');
                        } finally {
                          setSyncingId(null);
                        }
                      }}
                      disabled={syncingId === integration.id}
                      className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-2"
                    >
                      <CheckCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${syncingId === integration.id ? 'animate-spin' : ''}`} />
                      التحقق من Webhook
                    </button>
                  )}
                  
                  {/* Test Webhook Button for EasyOrders */}
                  {integration.type === 'easy_orders' && integration.status === 'active' && (
                    <button
                      onClick={async () => {
                        try {
                          setSyncingId(integration.id);
                          const response = await fetch('/api/integrations/easy-orders/webhook/test', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ integrationId: integration.id })
                          });

                          const data = await response.json();
                          
                          if (data.success) {
                            toast.success('تم اختبار Webhook بنجاح! تحقق من Logs للتفاصيل.');
                          } else {
                            throw new Error(data.error || 'فشل اختبار Webhook');
                          }
                        } catch (error: any) {
                          toast.error(error.message || 'حدث خطأ في اختبار Webhook');
                        } finally {
                          setSyncingId(null);
                        }
                      }}
                      disabled={syncingId === integration.id}
                      className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-2"
                    >
                      <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${syncingId === integration.id ? 'animate-spin' : ''}`} />
                      اختبار Webhook
                    </button>
                  )}
                  
                  {/* Sync Shipping Button for EasyOrders */}
                  {integration.type === 'easy_orders' && integration.status === 'active' && (
                    <button
                      onClick={async () => {
                        try {
                          setSyncingId(integration.id);
                          const response = await fetch('/api/integrations/easy-orders/sync-shipping', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ integrationId: integration.id })
                          });

                          if (!response.ok) {
                            const data = await response.json();
                            throw new Error(data.error || 'فشلت مزامنة الشحن');
                          }

                          const data = await response.json();
                          toast.success(data.message || 'تمت مزامنة الشحن بنجاح');
                          fetchIntegrations();
                        } catch (error: any) {
                          toast.error(error.message || 'حدث خطأ في مزامنة الشحن');
                        } finally {
                          setSyncingId(null);
                        }
                      }}
                      disabled={syncingId === integration.id}
                      className="btn-secondary text-xs sm:text-sm flex items-center justify-center gap-1 min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
                    >
                      {syncingId === integration.id ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                          <span className="hidden sm:inline">جاري المزامنة...</span>
                          <span className="sm:hidden">جاري...</span>
                        </>
                      ) : (
                        <>
                          <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">مزامنة الشحن</span>
                          <span className="sm:hidden">الشحن</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleSync(integration.id, 'all')}
                    disabled={syncingId === integration.id || integration.status !== 'active'}
                    className="btn-secondary text-xs sm:text-sm flex items-center justify-center gap-1 min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
                  >
                    {syncingId === integration.id ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        <span className="hidden sm:inline">جاري المزامنة...</span>
                        <span className="sm:hidden">جاري...</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">مزامنة الكل</span>
                        <span className="sm:hidden">الكل</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSync(integration.id, 'products')}
                    disabled={syncingId === integration.id || integration.status !== 'active'}
                    className="btn-secondary text-xs sm:text-sm flex items-center justify-center gap-1 min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
                  >
                    <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">مزامنة المنتجات</span>
                    <span className="sm:hidden">المنتجات</span>
                  </button>
                  <button
                    onClick={() => handleSync(integration.id, 'orders')}
                    disabled={syncingId === integration.id || integration.status !== 'active'}
                    className="btn-secondary text-xs sm:text-sm flex items-center justify-center gap-1 min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">مزامنة الطلبات</span>
                    <span className="sm:hidden">الطلبات</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingIntegration(integration);
                      setFormData({
                        type: integration.type,
                        storeName: integration.storeName,
                        storeUrl: integration.storeUrl || '',
                        apiKey: '',
                        apiSecret: '',
                        webhookUrl: '',
                        settings: {
                          ...integration.settings,
                          priceMarkup: integration.settings.priceMarkup ?? 0
                        }
                      });
                      setShowAddModal(true);
                    }}
                    className="btn-secondary text-xs sm:text-sm flex items-center justify-center gap-1 min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>الإعدادات</span>
                  </button>
                  <button
                    onClick={() => handleDelete(integration)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs sm:text-sm flex items-center justify-center gap-1 min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mobile-modal-content">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              {editingIntegration ? 'تعديل التكامل' : 'إضافة تكامل جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Platform Selection - Only EasyOrders */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  المنصة
                </label>
                <div className="card p-4 border-2 border-[#FF9800] bg-[#FF9800]/10 dark:bg-[#FF9800]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FF9800]/20 dark:bg-[#FF9800]/30 rounded-lg flex items-center justify-center">
                      <span className="text-[#FF9800] dark:text-[#FF9800] font-bold">EO</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">EasyOrders</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">منصة إيزي أوردرز</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم المتجر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              {/* Store URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رابط المتجر
                </label>
                <input
                  type="url"
                  value={formData.storeUrl}
                  onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com"
                  dir="ltr"
                />
              </div>

              {/* EasyOrders Authorized App Link */}
              {formData.type === 'easy_orders' && !editingIntegration && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        الربط التلقائي
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                        قم بالربط التلقائي مع EasyOrders في خطوة واحدة. سيتم إنشاء API Key و Webhook تلقائياً.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/integrations/easy-orders/authorized-link');
                            const data = await response.json();
                            if (data.success && data.authorizedAppLink) {
                              window.open(data.authorizedAppLink, '_blank');
                              toast.success('سيتم فتح صفحة الربط في نافذة جديدة');
                            } else {
                              throw new Error(data.error || 'فشل في إنشاء رابط الربط');
                            }
                          } catch (error: any) {
                            toast.error(error.message || 'حدث خطأ في إنشاء رابط الربط');
                          }
                        }}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        <LinkIcon className="w-4 h-4 inline-block ml-2" />
                        ربط تلقائي مع EasyOrders
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* API Key - Only shown when editing existing integration */}
              {editingIntegration && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    مفتاح API
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey.apiKey ? 'text' : 'password'}
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="input-field pl-12"
                      placeholder="اتركه فارغاً إذا لم تريد تغييره"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey({ ...showApiKey, apiKey: !showApiKey.apiKey })}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center w-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
                    >
                      {showApiKey.apiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}


              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رابط Webhook
                </label>
                <input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com/webhook"
                  dir="ltr"
                />
              </div>

              {/* Webhook Secret for EasyOrders (when editing) */}
              {formData.type === 'easy_orders' && editingIntegration && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                        Webhook Secret
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                        إذا كان Webhook Secret غير محفوظ، انسخه من EasyOrders Dashboard وأضفه هنا.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Webhook Secret
                        </label>
                        <input
                          type="password"
                          value={formData.webhookSecret || ''}
                          onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                          className="input-field"
                          placeholder="انسخ Webhook Secret من EasyOrders"
                          dir="ltr"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          يمكنك العثور عليه في EasyOrders Dashboard {'>'} Public API {'>'} Webhooks
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  إعدادات المزامنة
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.settings.syncProducts}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        settings: { ...formData.settings, syncProducts: e.target.checked }
                      })}
                      className="w-4 h-4 text-[#FF9800] rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">مزامنة المنتجات</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.settings.syncOrders}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        settings: { ...formData.settings, syncOrders: e.target.checked }
                      })}
                      className="w-4 h-4 text-[#FF9800] rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">مزامنة الطلبات</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.settings.syncInventory}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        settings: { ...formData.settings, syncInventory: e.target.checked }
                      })}
                      className="w-4 h-4 text-[#FF9800] rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">مزامنة المخزون</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.settings.autoFulfillment}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        settings: { ...formData.settings, autoFulfillment: e.target.checked }
                      })}
                      className="w-4 h-4 text-[#FF9800] rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">التنفيذ التلقائي للطلبات</span>
                  </label>
                </div>
              </div>

              {/* Price Markup */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  هامش الربح (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.settings.priceMarkup}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { ...formData.settings, priceMarkup: parseInt(e.target.value) || 0 }
                  })}
                  className="input-field"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  سيتم إضافة هذه النسبة إلى أسعار المنتجات المستوردة
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingIntegration ? 'حفظ التغييرات' : 'إضافة التكامل'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingIntegration(null);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setIntegrationToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="حذف التكامل"
        message={`هل أنت متأكد من حذف التكامل "${integrationToDelete?.storeName}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
} 