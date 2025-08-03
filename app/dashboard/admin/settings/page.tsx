'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  DollarSign, 
  CreditCard, 
  Package, 
  Bell, 
  Shield, 
  FileText, 
  BarChart3,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface CommissionRate {
  minPrice: number;
  maxPrice: number;
  rate: number;
}

interface WithdrawalSettings {
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFees: number;
}

interface SystemSettings {
  financial: {
    withdrawalSettings: WithdrawalSettings;
    commissionRates: CommissionRate[];
  };
  general: {
    platformName: string;
    platformDescription: string;
    contactEmail: string;
    contactPhone: string;
  };
  orders: {
    minimumOrderValue: number;
    maximumOrderValue: number;
    shippingCost: number;
    freeShippingThreshold: number;
  };
  products: {
    maxProductImages: number;
    maxProductDescriptionLength: number;
    autoApproveProducts: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };
  security: {
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  legal: {
    termsOfService: string;
    privacyPolicy: string;
    refundPolicy: string;
  };
  analytics: {
    googleAnalyticsId: string;
    facebookPixelId: string;
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Form states for each section
  const [financialData, setFinancialData] = useState({
    withdrawalSettings: {
      minimumWithdrawal: 100,
      maximumWithdrawal: 50000,
      withdrawalFees: 0
    },
    commissionRates: [
      { minPrice: 0, maxPrice: 1000, rate: 10 },
      { minPrice: 1001, maxPrice: 5000, rate: 8 },
      { minPrice: 5001, maxPrice: 10000, rate: 6 },
      { minPrice: 10001, maxPrice: 999999, rate: 5 }
    ]
  });
  
  const [generalData, setGeneralData] = useState({
    platformName: 'ربح',
    platformDescription: 'منصة التجارة الإلكترونية العربية',
    contactEmail: 'support@ribh.com',
    contactPhone: '+966500000000'
  });
  
  const [orderData, setOrderData] = useState({
    minimumOrderValue: 50,
    maximumOrderValue: 100000,
    shippingCost: 20,
    freeShippingThreshold: 500
  });
  
  const [productData, setProductData] = useState({
    maxProductImages: 10,
    maxProductDescriptionLength: 1000,
    autoApproveProducts: false
  });
  
  const [notificationData, setNotificationData] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });
  
  const [securityData, setSecurityData] = useState({
    passwordMinLength: 8,
    sessionTimeout: 60,
    maxLoginAttempts: 5
  });
  
  const [legalData, setLegalData] = useState({
    termsOfService: 'شروط الخدمة',
    privacyPolicy: 'سياسة الخصوصية',
    refundPolicy: 'سياسة الاسترداد'
  });
  
  const [analyticsData, setAnalyticsData] = useState({
    googleAnalyticsId: '',
    facebookPixelId: ''
  });

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        
        // Update form data with fetched settings
        if (data.settings.financial) {
          setFinancialData({
            withdrawalSettings: {
              minimumWithdrawal: data.settings.financial.withdrawalSettings?.minimumWithdrawal || 100,
              maximumWithdrawal: data.settings.financial.withdrawalSettings?.maximumWithdrawal || 50000,
              withdrawalFees: data.settings.financial.withdrawalSettings?.withdrawalFees || 0
            },
            commissionRates: data.settings.financial.commissionRates || [
              { minPrice: 0, maxPrice: 1000, rate: 10 },
              { minPrice: 1001, maxPrice: 5000, rate: 8 },
              { minPrice: 5001, maxPrice: 10000, rate: 6 },
              { minPrice: 10001, maxPrice: 999999, rate: 5 }
            ]
          });
        }
        
        if (data.settings.general) {
          setGeneralData({
            platformName: data.settings.general.platformName || 'ربح',
            platformDescription: data.settings.general.platformDescription || 'منصة التجارة الإلكترونية العربية',
            contactEmail: data.settings.general.contactEmail || 'support@ribh.com',
            contactPhone: data.settings.general.contactPhone || '+966500000000'
          });
        }
        
        if (data.settings.orders) {
          setOrderData({
            minimumOrderValue: data.settings.orders.minimumOrderValue || 50,
            maximumOrderValue: data.settings.orders.maximumOrderValue || 100000,
            shippingCost: data.settings.orders.shippingCost || 20,
            freeShippingThreshold: data.settings.orders.freeShippingThreshold || 500
          });
        }
        
        if (data.settings.products) {
          setProductData({
            maxProductImages: data.settings.products.maxProductImages || 10,
            maxProductDescriptionLength: data.settings.products.maxProductDescriptionLength || 1000,
            autoApproveProducts: data.settings.products.autoApproveProducts || false
          });
        }
        
        if (data.settings.notifications) {
          setNotificationData({
            emailNotifications: data.settings.notifications.emailNotifications !== undefined ? data.settings.notifications.emailNotifications : true,
            smsNotifications: data.settings.notifications.smsNotifications !== undefined ? data.settings.notifications.smsNotifications : false,
            pushNotifications: data.settings.notifications.pushNotifications !== undefined ? data.settings.notifications.pushNotifications : true
          });
        }
        
        if (data.settings.security) {
          setSecurityData({
            passwordMinLength: data.settings.security.passwordMinLength || 8,
            sessionTimeout: data.settings.security.sessionTimeout || 60,
            maxLoginAttempts: data.settings.security.maxLoginAttempts || 5
          });
        }
        
        if (data.settings.legal) {
          setLegalData({
            termsOfService: data.settings.legal.termsOfService || 'شروط الخدمة',
            privacyPolicy: data.settings.legal.privacyPolicy || 'سياسة الخصوصية',
            refundPolicy: data.settings.legal.refundPolicy || 'سياسة الاسترداد'
          });
        }
        
        if (data.settings.analytics) {
          setAnalyticsData({
            googleAnalyticsId: data.settings.analytics.googleAnalyticsId || '',
            facebookPixelId: data.settings.analytics.facebookPixelId || ''
          });
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save settings
  const saveSettings = async (section: string, data: any) => {
    try {
      setSaving(true);
      
      // Ensure data exists before sending
      if (!data) {
        toast.error('لا توجد بيانات للحفظ');
        return;
      }
      
      console.log('💾 حفظ الإعدادات:', { section, data });
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ section, data }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('تم حفظ الإعدادات بنجاح');
        console.log('✅ تم حفظ الإعدادات بنجاح:', result);
        
        // Refresh settings after successful save
        await fetchSettings();
      } else {
        console.error('❌ خطأ في حفظ الإعدادات:', result);
        toast.error(result.message || 'حدث خطأ في حفظ الإعدادات');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // Commission rate handlers
  const addCommissionRate = () => {
    setFinancialData(prev => ({
      ...prev,
      commissionRates: [...(prev.commissionRates || []), { minPrice: 0, maxPrice: 0, rate: 0 }]
    }));
  };

  const updateCommissionRate = (index: number, field: keyof CommissionRate, value: number) => {
    setFinancialData(prev => ({
      ...prev,
      commissionRates: (prev.commissionRates || []).map((rate, i) => 
        i === index ? { ...rate, [field]: value } : rate
      )
    }));
  };

  const removeCommissionRate = (index: number) => {
    setFinancialData(prev => ({
      ...prev,
      commissionRates: (prev.commissionRates || []).filter((_, i) => i !== index)
    }));
  };

  // Tab configuration
  const tabs = [
    { id: 'general', label: 'عام', icon: Settings },
    { id: 'financial', label: 'مالي', icon: DollarSign },
    { id: 'orders', label: 'الطلبات', icon: CreditCard },
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'security', label: 'الأمان', icon: Shield },
    { id: 'legal', label: 'قانوني', icon: FileText },
    { id: 'analytics', label: 'التحليلات', icon: BarChart3 }
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  // Ensure data is loaded
  if (!financialData?.withdrawalSettings || !financialData?.commissionRates) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">جاري تحميل البيانات...</p>
          <Button onClick={fetchSettings} className="mt-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
            <RefreshCw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إعدادات النظام</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">إدارة إعدادات المنصة والتكوين</p>
        </div>
        <Button onClick={fetchSettings} variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <Settings className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400" />
                الإعدادات العامة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platformName" className="text-gray-700 dark:text-gray-200">اسم المنصة</Label>
                  <Input
                    id="platformName"
                    value={generalData.platformName}
                    onChange={(e) => setGeneralData({ ...generalData, platformName: e.target.value })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail" className="text-gray-700 dark:text-gray-200">البريد الإلكتروني</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={generalData.contactEmail}
                    onChange={(e) => setGeneralData({ ...generalData, contactEmail: e.target.value })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="platformDescription" className="text-gray-700 dark:text-gray-200">وصف المنصة</Label>
                <Textarea
                  id="platformDescription"
                  value={generalData.platformDescription}
                  onChange={(e) => setGeneralData({ ...generalData, platformDescription: e.target.value })}
                  rows={3}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="contactPhone" className="text-gray-700 dark:text-gray-200">رقم الهاتف</Label>
                <Input
                  id="contactPhone"
                  value={generalData.contactPhone}
                  onChange={(e) => setGeneralData({ ...generalData, contactPhone: e.target.value })}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <Button 
                onClick={() => saveSettings('general', generalData)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Financial Settings */}
        {activeTab === 'financial' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <DollarSign className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400" />
                الإعدادات المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Withdrawal Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">إعدادات السحب</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="minimumWithdrawal" className="text-gray-700 dark:text-gray-200">الحد الأدنى للسحب</Label>
                    <Input
                      id="minimumWithdrawal"
                      type="number"
                      value={financialData?.withdrawalSettings?.minimumWithdrawal || 100}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        console.log('💰 تحديث الحد الأدنى للسحب:', value);
                        setFinancialData({
                          ...financialData,
                          withdrawalSettings: {
                            ...financialData.withdrawalSettings,
                            minimumWithdrawal: value
                          }
                        });
                      }}
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maximumWithdrawal" className="text-gray-700 dark:text-gray-200">الحد الأقصى للسحب</Label>
                    <Input
                      id="maximumWithdrawal"
                      type="number"
                      value={financialData?.withdrawalSettings?.maximumWithdrawal || 50000}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        console.log('💰 تحديث الحد الأقصى للسحب:', value);
                        setFinancialData({
                          ...financialData,
                          withdrawalSettings: {
                            ...financialData.withdrawalSettings,
                            maximumWithdrawal: value
                          }
                        });
                      }}
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="withdrawalFees" className="text-gray-700 dark:text-gray-200">رسوم السحب (%)</Label>
                    <Input
                      id="withdrawalFees"
                      type="number"
                      value={financialData?.withdrawalSettings?.withdrawalFees || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        console.log('💰 تحديث رسوم السحب:', value);
                        setFinancialData({
                          ...financialData,
                          withdrawalSettings: {
                            ...financialData.withdrawalSettings,
                            withdrawalFees: value
                          }
                        });
                      }}
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Commission Rates */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">نسب العمولة</h3>
                  <Button
                    onClick={addCommissionRate}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    + إضافة نسبة عمولة
                  </Button>
                </div>
                
                {financialData?.commissionRates?.map((rate, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-700 dark:text-gray-200">من</Label>
                        <Input
                          type="number"
                          value={rate.minPrice}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            console.log('💰 تحديث الحد الأدنى للعمولة:', value);
                            updateCommissionRate(index, 'minPrice', value);
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 dark:text-gray-200">إلى</Label>
                        <Input
                          type="number"
                          value={rate.maxPrice}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            console.log('💰 تحديث الحد الأقصى للعمولة:', value);
                            updateCommissionRate(index, 'maxPrice', value);
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 dark:text-gray-200">النسبة (%)</Label>
                        <Input
                          type="number"
                          value={rate.rate}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            console.log('💰 تحديث نسبة العمولة:', value);
                            updateCommissionRate(index, 'rate', value);
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => removeCommissionRate(index)}
                      variant="destructive"
                      size="sm"
                    >
                      حذف
                    </Button>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => {
                  console.log('💰 حفظ الإعدادات المالية:', financialData);
                  saveSettings('financial', financialData);
                }}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Order Settings */}
        {activeTab === 'orders' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <CreditCard className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400" />
                إعدادات الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimumOrderValue" className="text-gray-700 dark:text-gray-200">الحد الأدنى للطلب</Label>
                  <Input
                    id="minimumOrderValue"
                    type="number"
                    value={orderData.minimumOrderValue}
                    onChange={(e) => setOrderData({ ...orderData, minimumOrderValue: parseFloat(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="maximumOrderValue" className="text-gray-700 dark:text-gray-200">الحد الأقصى للطلب</Label>
                  <Input
                    id="maximumOrderValue"
                    type="number"
                    value={orderData.maximumOrderValue}
                    onChange={(e) => setOrderData({ ...orderData, maximumOrderValue: parseFloat(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="shippingCost" className="text-gray-700 dark:text-gray-200">تكلفة الشحن</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    value={orderData.shippingCost}
                    onChange={(e) => setOrderData({ ...orderData, shippingCost: parseFloat(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="freeShippingThreshold" className="text-gray-700 dark:text-gray-200">حد الشحن المجاني</Label>
                  <Input
                    id="freeShippingThreshold"
                    type="number"
                    value={orderData.freeShippingThreshold}
                    onChange={(e) => setOrderData({ ...orderData, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => saveSettings('orders', orderData)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Other tabs can be implemented similarly */}
        {activeTab !== 'general' && activeTab !== 'financial' && activeTab !== 'orders' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <AlertCircle className="w-5 h-5 ml-2 text-yellow-600 dark:text-yellow-400" />
                قيد التطوير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300">
                هذا القسم قيد التطوير وسيتم إضافته قريباً.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 