'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { 
  Store, 
  Link as LinkIcon, 
  Settings, 
  RefreshCw, 
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
  type: 'easy_orders' | 'youcan';
  status: 'active' | 'inactive' | 'pending' | 'error';
  storeName: string;
  storeUrl?: string;
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
  type: 'easy_orders' | 'youcan';
  storeName: string;
  storeUrl?: string;
  apiKey: string;
  apiSecret?: string;
  webhookUrl?: string;
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
  const [integrations, setIntegrations] = useState<StoreIntegration[]>([]);
  const [loading, setLoading] = useState(true);
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
    settings: {
      syncProducts: true,
      syncOrders: true,
      syncInventory: true,
      autoFulfillment: false,
      priceMarkup: 0
    }
  });

  useEffect(() => {
    if (!user || (user.role !== 'marketer' && user.role !== 'wholesaler')) {
      router.push('/dashboard');
      return;
    }
    fetchIntegrations();
  }, [user, router]);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations');
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      setIntegrations(data.integrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('حدث خطأ في جلب التكاملات');
    } finally {
      setLoading(false);
    }
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
      console.error('Error saving integration:', error);
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
      toast.success(`تمت المزامنة بنجاح: ${data.results.products} منتج، ${data.results.orders} طلب`);
      fetchIntegrations();
    } catch (error: any) {
      console.error('Error syncing:', error);
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
      console.error('Error deleting integration:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تكاملات المتاجر</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            قم بربط متجرك الخارجي لمزامنة المنتجات والطلبات
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تكامل</span>
        </button>
      </div>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <div className="card p-12 text-center">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            لا توجد تكاملات حتى الآن
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            قم بإضافة تكامل جديد لربط متجرك الخارجي
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary mx-auto"
          >
            إضافة تكامل الآن
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {integrations.map((integration) => (
            <div key={integration.id} className="card">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    {getPlatformLogo(integration.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {integration.storeName}
                      </h3>
                      {integration.storeUrl && (
                        <a
                          href={integration.storeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#FF9800] hover:underline flex items-center gap-1 mt-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {integration.storeUrl}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(integration.status)}
                    <span className={`text-sm font-medium ${
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className={`w-4 h-4 ${integration.settings.syncProducts ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-gray-700 dark:text-gray-300">مزامنة المنتجات</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className={`w-4 h-4 ${integration.settings.syncOrders ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-gray-700 dark:text-gray-300">مزامنة الطلبات</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <RefreshCw className={`w-4 h-4 ${integration.settings.syncInventory ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-gray-700 dark:text-gray-300">مزامنة المخزون</span>
                  </div>
                  {integration.settings.priceMarkup && integration.settings.priceMarkup > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        هامش ربح: {integration.settings.priceMarkup}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Last Sync Info */}
                {integration.lastSync && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    آخر مزامنة: {format(new Date(integration.lastSync), 'dd/MM/yyyy HH:mm')}
                  </div>
                )}

                {/* Errors */}
                {integration.syncErrors && integration.syncErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          أخطاء المزامنة:
                        </p>
                        <ul className="text-sm text-red-700 dark:text-red-300 mt-1 list-disc list-inside">
                          {integration.syncErrors.slice(-3).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSync(integration.id, 'all')}
                    disabled={syncingId === integration.id || integration.status !== 'active'}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    {syncingId === integration.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري المزامنة...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>مزامنة الكل</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSync(integration.id, 'products')}
                    disabled={syncingId === integration.id || integration.status !== 'active'}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Package className="w-4 h-4" />
                    <span>مزامنة المنتجات</span>
                  </button>
                  <button
                    onClick={() => handleSync(integration.id, 'orders')}
                    disabled={syncingId === integration.id || integration.status !== 'active'}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>مزامنة الطلبات</span>
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
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Settings className="w-4 h-4" />
                    <span>الإعدادات</span>
                  </button>
                  <button
                    onClick={() => handleDelete(integration)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingIntegration ? 'تعديل التكامل' : 'إضافة تكامل جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  المنصة
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`card p-4 cursor-pointer border-2 transition-colors ${
                    formData.type === 'easy_orders' 
                      ? 'border-[#FF9800] bg-[#FF9800]/10 dark:bg-[#FF9800]/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="type"
                      value="easy_orders"
                      checked={formData.type === 'easy_orders'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-[#FF9800]/20 dark:bg-[#FF9800]/30 rounded-lg flex items-center justify-center">
          <span className="text-[#FF9800] dark:text-[#FF9800] font-bold">EO</span>
        </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">EasyOrders</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">منصة إيزي أوردرز</p>
                      </div>
                    </div>
                  </label>

                  <label className={`card p-4 cursor-pointer border-2 transition-colors ${
                    formData.type === 'youcan' 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="type"
                      value="youcan"
                      checked={formData.type === 'youcan'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 dark:text-purple-300 font-bold">YC</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">YouCan</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">منصة يوكان</p>
                      </div>
                    </div>
                  </label>
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

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  مفتاح API <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey.apiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="input-field pl-10"
                    required={!editingIntegration}
                    placeholder={editingIntegration ? 'اتركه فارغاً إذا لم تريد تغييره' : ''}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey({ ...showApiKey, apiKey: !showApiKey.apiKey })}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showApiKey.apiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* API Secret (for YouCan) */}
              {formData.type === 'youcan' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    سر API
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey.apiSecret ? 'text' : 'password'}
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      className="input-field pl-10"
                      placeholder={editingIntegration ? 'اتركه فارغاً إذا لم تريد تغييره' : ''}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey({ ...showApiKey, apiSecret: !showApiKey.apiSecret })}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showApiKey.apiSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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