'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Settings, Save, RefreshCw, Shield, DollarSign, Truck, Bell, Globe, FileText, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemSettings {
  _id: string;
  commissionRates: Array<{
    minPrice: number;
    maxPrice: number;
    rate: number;
  }>;
  platformName: string;
  platformDescription: string;
  contactEmail: string;
  contactPhone: string;
  supportWhatsApp: string;
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFee: number;
  currency: string;
  autoApproveOrders: boolean;
  requireAdminApproval: boolean;
  maxOrderValue: number;
  minOrderValue: number;
  autoApproveProducts: boolean;
  requireProductImages: boolean;
  maxProductImages: number;
  maxProductDescription: number;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
  defaultShippingCost: number;
  freeShippingThreshold: number;
  shippingCompanies: string[];
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireTwoFactor: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  termsOfService: string;
  privacyPolicy: string;
  refundPolicy: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
  updatedAt: string;
}

const tabs = [
  { id: 'general', label: 'عام', icon: Settings },
  { id: 'financial', label: 'مالي', icon: DollarSign },
  { id: 'orders', label: 'الطلبات', icon: Truck },
  { id: 'products', label: 'المنتجات', icon: Globe },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'legal', label: 'قانوني', icon: FileText },
  { id: 'analytics', label: 'التحليلات', icon: BarChart3 }
];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { settings, loading, refreshSettings, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      return;
    }
  }, [user]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCommissionRateChange = (index: number, field: string, value: number) => {
    const updatedRates = [...(formData.commissionRates || [])];
    updatedRates[index] = {
      ...updatedRates[index],
      [field]: value
    };
    handleInputChange('commissionRates', updatedRates);
  };

  const addCommissionRate = () => {
    const newRate = { minPrice: 0, maxPrice: 0, rate: 10 };
    const updatedRates = [...(formData.commissionRates || []), newRate];
    handleInputChange('commissionRates', updatedRates);
  };

  const removeCommissionRate = (index: number) => {
    const updatedRates = (formData.commissionRates || []).filter((_, i) => i !== index);
    handleInputChange('commissionRates', updatedRates);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await updateSettings(formData);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">إعدادات النظام</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">إدارة إعدادات المنصة والتكوين</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refreshSettings()}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCw className="w-5 h-5 ml-2" />
            تحديث
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={saving}
          >
            <Save className="w-5 h-5 ml-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8 space-x-reverse">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <Icon className="w-4 h-4 ml-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">الإعدادات العامة</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  اسم المنصة
                </label>
                <input
                  type="text"
                  value={formData.platformName || ''}
                  onChange={(e) => handleInputChange('platformName', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  وصف المنصة
                </label>
                <input
                  type="text"
                  value={formData.platformDescription || ''}
                  onChange={(e) => handleInputChange('platformDescription', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  البريد الإلكتروني للتواصل
                </label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={formData.contactPhone || ''}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  واتساب الدعم
                </label>
                <input
                  type="text"
                  value={formData.supportWhatsApp || ''}
                  onChange={(e) => handleInputChange('supportWhatsApp', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  العملة
                </label>
                <input
                  type="text"
                  value={formData.currency || ''}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 space-x-reverse">
              <input
                type="checkbox"
                id="maintenanceMode"
                checked={formData.maintenanceMode || false}
                onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="maintenanceMode" className="text-sm font-medium text-gray-700">
                وضع الصيانة
              </label>
            </div>

            {formData.maintenanceMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  رسالة الصيانة
                </label>
                <textarea
                  value={formData.maintenanceMessage || ''}
                  onChange={(e) => handleInputChange('maintenanceMessage', e.target.value)}
                  className="input-field"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">الإعدادات المالية</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الحد الأدنى للسحب
                </label>
                <input
                  type="number"
                  value={formData.minimumWithdrawal || 0}
                  onChange={(e) => handleInputChange('minimumWithdrawal', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الحد الأقصى للسحب
                </label>
                <input
                  type="number"
                  value={formData.maximumWithdrawal || 0}
                  onChange={(e) => handleInputChange('maximumWithdrawal', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  رسوم السحب (%)
                </label>
                <input
                  type="number"
                  value={formData.withdrawalFee || 0}
                  onChange={(e) => handleInputChange('withdrawalFee', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-slate-100 mb-4">نسب العمولة</h4>
              {(formData.commissionRates || []).map((rate, index) => (
                <div key={index} className="flex items-center space-x-4 space-x-reverse mb-4">
                  <input
                    type="number"
                    placeholder="السعر الأدنى"
                    value={rate.minPrice}
                    onChange={(e) => handleCommissionRateChange(index, 'minPrice', parseFloat(e.target.value))}
                    className="input-field w-32"
                  />
                  <span className="text-gray-500">إلى</span>
                  <input
                    type="number"
                    placeholder="السعر الأقصى"
                    value={rate.maxPrice}
                    onChange={(e) => handleCommissionRateChange(index, 'maxPrice', parseFloat(e.target.value))}
                    className="input-field w-32"
                  />
                  <input
                    type="number"
                    placeholder="النسبة %"
                    value={rate.rate}
                    onChange={(e) => handleCommissionRateChange(index, 'rate', parseFloat(e.target.value))}
                    className="input-field w-24"
                  />
                  <button
                    onClick={() => removeCommissionRate(index)}
                    className="text-danger-600 hover:text-danger-700"
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                onClick={addCommissionRate}
                className="btn-secondary text-sm"
              >
                إضافة نسبة عمولة
              </button>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعدادات الطلبات</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الحد الأقصى لقيمة الطلب
                </label>
                <input
                  type="number"
                  value={formData.maxOrderValue || 0}
                  onChange={(e) => handleInputChange('maxOrderValue', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الحد الأدنى لقيمة الطلب
                </label>
                <input
                  type="number"
                  value={formData.minOrderValue || 0}
                  onChange={(e) => handleInputChange('minOrderValue', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  تكلفة الشحن الافتراضية
                </label>
                <input
                  type="number"
                  value={formData.defaultShippingCost || 0}
                  onChange={(e) => handleInputChange('defaultShippingCost', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  حد الشحن المجاني
                </label>
                <input
                  type="number"
                  value={formData.freeShippingThreshold || 0}
                  onChange={(e) => handleInputChange('freeShippingThreshold', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 space-x-reverse">
                <input
                  type="checkbox"
                  id="autoApproveOrders"
                  checked={formData.autoApproveOrders || false}
                  onChange={(e) => handleInputChange('autoApproveOrders', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="autoApproveOrders" className="text-sm font-medium text-gray-700">
                  الموافقة التلقائية على الطلبات
                </label>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <input
                  type="checkbox"
                  id="requireAdminApproval"
                  checked={formData.requireAdminApproval || false}
                  onChange={(e) => handleInputChange('requireAdminApproval', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="requireAdminApproval" className="text-sm font-medium text-gray-700">
                  تتطلب موافقة الإدارة
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعدادات المنتجات</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الحد الأقصى لعدد الصور
                </label>
                <input
                  type="number"
                  value={formData.maxProductImages || 0}
                  onChange={(e) => handleInputChange('maxProductImages', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الحد الأقصى لوصف المنتج
                </label>
                <input
                  type="number"
                  value={formData.maxProductDescription || 0}
                  onChange={(e) => handleInputChange('maxProductDescription', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 space-x-reverse">
                <input
                  type="checkbox"
                  id="autoApproveProducts"
                  checked={formData.autoApproveProducts || false}
                  onChange={(e) => handleInputChange('autoApproveProducts', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="autoApproveProducts" className="text-sm font-medium text-gray-700">
                  الموافقة التلقائية على المنتجات
                </label>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <input
                  type="checkbox"
                  id="requireProductImages"
                  checked={formData.requireProductImages || false}
                  onChange={(e) => handleInputChange('requireProductImages', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="requireProductImages" className="text-sm font-medium text-gray-700">
                  تتطلب صور المنتجات
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعدادات الإشعارات</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4 space-x-reverse">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={formData.emailNotifications || false}
                  onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
                  إشعارات البريد الإلكتروني
                </label>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <input
                  type="checkbox"
                  id="whatsappNotifications"
                  checked={formData.whatsappNotifications || false}
                  onChange={(e) => handleInputChange('whatsappNotifications', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="whatsappNotifications" className="text-sm font-medium text-gray-700">
                  إشعارات الواتساب
                </label>
              </div>

              <div className="flex items-center space-x-4 space-x-reverse">
                <input
                  type="checkbox"
                  id="pushNotifications"
                  checked={formData.pushNotifications || false}
                  onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="pushNotifications" className="text-sm font-medium text-gray-700">
                  إشعارات Push
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعدادات الأمان</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الحد الأقصى لمحاولات تسجيل الدخول
                </label>
                <input
                  type="number"
                  value={formData.maxLoginAttempts || 0}
                  onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  مهلة الجلسة (ساعات)
                </label>
                <input
                  type="number"
                  value={formData.sessionTimeout || 0}
                  onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 space-x-reverse">
              <input
                type="checkbox"
                id="requireTwoFactor"
                checked={formData.requireTwoFactor || false}
                onChange={(e) => handleInputChange('requireTwoFactor', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="requireTwoFactor" className="text-sm font-medium text-gray-700">
                تتطلب المصادقة الثنائية
              </label>
            </div>
          </div>
        )}

        {activeTab === 'legal' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">المحتوى القانوني</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  شروط الخدمة
                </label>
                <textarea
                  value={formData.termsOfService || ''}
                  onChange={(e) => handleInputChange('termsOfService', e.target.value)}
                  className="input-field"
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سياسة الخصوصية
                </label>
                <textarea
                  value={formData.privacyPolicy || ''}
                  onChange={(e) => handleInputChange('privacyPolicy', e.target.value)}
                  className="input-field"
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سياسة الاسترداد
                </label>
                <textarea
                  value={formData.refundPolicy || ''}
                  onChange={(e) => handleInputChange('refundPolicy', e.target.value)}
                  className="input-field"
                  rows={6}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">التحليلات والتتبع</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  معرف Google Analytics
                </label>
                <input
                  type="text"
                  value={formData.googleAnalyticsId || ''}
                  onChange={(e) => handleInputChange('googleAnalyticsId', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  معرف Facebook Pixel
                </label>
                <input
                  type="text"
                  value={formData.facebookPixelId || ''}
                  onChange={(e) => handleInputChange('facebookPixelId', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 