'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { 
  Link as LinkIcon, 
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2
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

export default function IntegrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<StoreIntegration | null>(null);

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

  useEffect(() => {
    if (!user || (user.role !== 'marketer' && user.role !== 'wholesaler')) {
      router.push('/dashboard');
      return;
    }

    // Check for EasyOrders callback status
    const searchParams = new URLSearchParams(window.location.search);
    const easyOrdersStatus = searchParams.get('easy_orders');
    
    if (easyOrdersStatus === 'connected') {
      toast.success('تم ربط EasyOrders بنجاح! تمت مزامنة مدن الشحن مع متجرك تلقائياً.');
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

  const fetchIntegrations = () => refresh();

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
      {/* Header - تكامل Easy Orders فقط */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">ربط Easy Orders</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          صدّر منتجاتك وبيعها من متجرك على Easy Orders بضغطة واحدة
        </p>
      </div>

      {/* المحتوى: إما زر الربط التلقائي فقط، أو حالة الربط مع إلغاء الربط فقط */}
      {integrations.length === 0 ? (
        <div className="max-w-lg mx-auto">
          <div className="card p-8 sm:p-10 text-center rounded-2xl border-2 border-[#FF9800]/20 dark:border-[#FF9800]/30 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl bg-[#FF9800]/15 dark:bg-[#FF9800]/25 flex items-center justify-center">
              <span className="text-3xl sm:text-4xl font-bold text-[#FF9800]">EO</span>
        </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
              ربط متجرك مع Easy Orders
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
              اضغط على الزر أدناه للانتقال إلى Easy Orders والموافقة على الربط. سيتم إنشاء الاتصال ومزامنة مدن الشحن تلقائياً.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/integrations/easy-orders/authorized-link');
                            const data = await response.json();
                            if (data.success && data.authorizedAppLink) {
                              window.open(data.authorizedAppLink, '_blank');
                    toast.success('تم فتح صفحة الربط. أكمل الموافقة في نافذة Easy Orders ثم ارجع هنا.');
                            } else {
                              throw new Error(data.error || 'فشل في إنشاء رابط الربط');
                            }
                          } catch (error: any) {
                            toast.error(error.message || 'حدث خطأ في إنشاء رابط الربط');
                          }
                        }}
              className="btn-primary inline-flex items-center justify-center gap-2 min-h-[48px] px-6 sm:px-8 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all"
                      >
              <LinkIcon className="w-5 h-5" />
              ربط تلقائي مع Easy Orders
                      </button>
                    </div>
                  </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {integrations.map((integration) => (
            <div key={integration.id} className="card p-6 sm:p-8 rounded-2xl border-2 border-green-200 dark:border-green-800/50 bg-gradient-to-b from-white to-green-50/30 dark:from-gray-800 dark:to-green-900/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-[#FF9800]/15 dark:bg-[#FF9800]/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-[#FF9800]">EO</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {integration.storeName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(integration.status)}
                    <span className={`text-sm font-medium ${
                      integration.status === 'active' ? 'text-green-600 dark:text-green-400' :
                      integration.status === 'error' ? 'text-amber-600 dark:text-amber-400' :
                      integration.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {getStatusText(integration.status)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                متجرك مربوط مع ربح. يمكنك تصدير المنتجات من صفحة المنتجات ومزامنة الطلبات تلقائياً.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleDelete(integration)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  إلغاء الربط
                </button>
              </div>
          </div>
          ))}
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