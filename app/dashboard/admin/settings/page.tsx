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
  AlertCircle,
  Truck,
  MapPin
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
  shipping: {
    shippingEnabled: boolean;
    defaultShippingCost: number;
    defaultFreeShippingThreshold: number;
    governorates: {
      name: string;
      cities: string[];
      shippingCost: number;
      isActive: boolean;
    }[];
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
    maximumOrderValue: 100000
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

  // Shipping settings state
  const [shippingData, setShippingData] = useState({
    shippingEnabled: true,
    defaultShippingCost: 50,
    defaultFreeShippingThreshold: 500,
    governorates: []
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
        if (data.settings) {
          // Financial settings
          setFinancialData({
            withdrawalSettings: {
              minimumWithdrawal: data.settings.withdrawalSettings?.minimumWithdrawal || 100,
              maximumWithdrawal: data.settings.withdrawalSettings?.maximumWithdrawal || 50000,
              withdrawalFees: data.settings.withdrawalSettings?.withdrawalFees || 0
            },
            commissionRates: data.settings.commissionRates || [
              { minPrice: 0, maxPrice: 1000, rate: 10 }
            ]
          });
          
          // General settings
          setGeneralData({
            platformName: data.settings.platformName || 'ربح',
            platformDescription: data.settings.platformDescription || 'منصة التجارة الإلكترونية العربية',
            contactEmail: data.settings.contactEmail || 'support@ribh.com',
            contactPhone: data.settings.contactPhone || '+966500000000'
          });
          
          // Order settings
          setOrderData({
            minimumOrderValue: data.settings.minimumOrderValue || 50,
            maximumOrderValue: data.settings.maximumOrderValue || 100000
          });
          
          // Product settings
          setProductData({
            maxProductImages: data.settings.maxProductImages || 10,
            maxProductDescriptionLength: data.settings.maxProductDescriptionLength || 1000,
            autoApproveProducts: data.settings.autoApproveProducts || false
          });
          
          // Notification settings
          setNotificationData({
            emailNotifications: data.settings.emailNotifications !== undefined ? data.settings.emailNotifications : true,
            smsNotifications: data.settings.smsNotifications !== undefined ? data.settings.smsNotifications : false,
            pushNotifications: data.settings.pushNotifications !== undefined ? data.settings.pushNotifications : true
          });
          
          // Security settings
          setSecurityData({
            passwordMinLength: data.settings.passwordMinLength || 8,
            sessionTimeout: data.settings.sessionTimeout || 60,
            maxLoginAttempts: data.settings.maxLoginAttempts || 5
          });
          
          // Legal settings
          setLegalData({
            termsOfService: data.settings.termsOfService || 'شروط الخدمة',
            privacyPolicy: data.settings.privacyPolicy || 'سياسة الخصوصية',
            refundPolicy: data.settings.refundPolicy || 'سياسة الاسترداد'
          });
          
          // Analytics settings
          setAnalyticsData({
            googleAnalyticsId: data.settings.googleAnalyticsId || '',
            facebookPixelId: data.settings.facebookPixelId || ''
          });

          // Shipping settings
          setShippingData({
            shippingEnabled: data.settings.shippingEnabled !== undefined ? data.settings.shippingEnabled : true,
            defaultShippingCost: data.settings.defaultShippingCost || 50,
            defaultFreeShippingThreshold: data.settings.defaultFreeShippingThreshold || 500,
            governorates: data.settings.governorates || []
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
    { id: 'analytics', label: 'التحليلات', icon: BarChart3 },
    { id: 'shipping', label: 'الشحن', icon: Truck }
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    الحد الأدنى لقيمة الطلب المطلوبة من المسوقين
                  </p>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    الحد الأقصى لقيمة الطلب المسموح بها للمسوقين
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>ملاحظة:</strong> هذه الإعدادات تحكم الحد الأدنى والأقصى لقيم الطلبات التي يمكن للمسوقين إنشاؤها. 
                  سيتم تطبيق هذه القيود تلقائياً عند إنشاء الطلبات.
                </p>
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

        {/* Shipping Settings */}
        {activeTab === 'shipping' && (
          <div className="space-y-6">
            {/* General Shipping Settings */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Truck className="w-5 h-5 ml-2 text-green-600 dark:text-green-400" />
                  إعدادات الشحن العامة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="shippingEnabled"
                      checked={shippingData.shippingEnabled}
                      onChange={(e) => setShippingData({ ...shippingData, shippingEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="shippingEnabled" className="text-gray-700 dark:text-gray-200">تفعيل الشحن</Label>
                  </div>
                  <div>
                    <Label htmlFor="defaultShippingCost" className="text-gray-700 dark:text-gray-200">تكلفة الشحن الافتراضية</Label>
                    <Input
                      id="defaultShippingCost"
                      type="number"
                      value={shippingData.defaultShippingCost}
                      onChange={(e) => setShippingData({ ...shippingData, defaultShippingCost: parseFloat(e.target.value) || 0 })}
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultFreeShippingThreshold" className="text-gray-700 dark:text-gray-200">حد الشحن المجاني الافتراضي</Label>
                    <Input
                      id="defaultFreeShippingThreshold"
                      type="number"
                      value={shippingData.defaultFreeShippingThreshold}
                      onChange={(e) => setShippingData({ ...shippingData, defaultFreeShippingThreshold: parseFloat(e.target.value) || 0 })}
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Zones */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <MapPin className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400" />
                  المحافظات ومناطق الشحن
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {shippingData.governorates.map((zone, zoneIndex) => (
                  <div key={zoneIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/50">
                    {/* Governorate Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`zoneName-${zoneIndex}`} className="text-gray-700 dark:text-gray-200 font-medium">اسم المحافظة</Label>
                        <Input
                          id={`zoneName-${zoneIndex}`}
                          value={(zone as any).name}
                          onChange={(e) => {
                            const newZones = [...shippingData.governorates];
                            (newZones[zoneIndex] as any).name = e.target.value;
                            setShippingData({ ...shippingData, governorates: newZones });
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`zoneShippingCost-${zoneIndex}`} className="text-gray-700 dark:text-gray-200 font-medium">تكلفة الشحن (₪)</Label>
                        <Input
                          id={`zoneShippingCost-${zoneIndex}`}
                          type="number"
                          value={(zone as any).shippingCost}
                          onChange={(e) => {
                            const newZones = [...shippingData.governorates];
                            (newZones[zoneIndex] as any).shippingCost = parseFloat(e.target.value) || 0;
                            setShippingData({ ...shippingData, governorates: newZones });
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse pt-6">
                        <input
                          type="checkbox"
                          id={`zoneActive-${zoneIndex}`}
                          checked={(zone as any).isActive}
                          onChange={(e) => {
                            const newZones = [...shippingData.governorates];
                            (newZones[zoneIndex] as any).isActive = e.target.checked;
                            setShippingData({ ...shippingData, governorates: newZones });
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor={`zoneActive-${zoneIndex}`} className="text-gray-700 dark:text-gray-200 font-medium">نشط</Label>
                      </div>
                    </div>

                    {/* Cities Management */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <Label className="text-gray-700 dark:text-gray-200 font-medium">المدن والمناطق</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const newZones = [...shippingData.governorates];
                              (newZones[zoneIndex] as any).cities = [...(newZones[zoneIndex] as any).cities, 'مدينة جديدة'];
                              setShippingData({ ...shippingData, governorates: newZones });
                            }}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-sm"
                          >
                            <Plus className="w-3 h-3 ml-1" />
                            إضافة مدينة
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const bulkCities = prompt('أدخل أسماء المدن مفصولة بفواصل:\nمثال: الرياض، جدة، الدمام، مكة المكرمة');
                              if (bulkCities) {
                                const cities = bulkCities.split(/[،,]/).map(city => city.trim()).filter(city => city.length > 0);
                                if (cities.length > 0) {
                                  const newZones = [...shippingData.governorates];
                                  (newZones[zoneIndex] as any).cities = [...(newZones[zoneIndex] as any).cities, ...cities];
                                  setShippingData({ ...shippingData, governorates: newZones });
                                }
                              }
                            }}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                          >
                            <Plus className="w-3 h-3 ml-1" />
                            إضافة متعددة
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(zone as any).cities.map((city: any, cityIndex: number) => (
                          <div key={cityIndex} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                            <Input
                              value={city}
                              onChange={(e) => {
                                const newZones = [...shippingData.governorates];
                                (newZones[zoneIndex] as any).cities[cityIndex] = e.target.value;
                                setShippingData({ ...shippingData, governorates: newZones });
                              }}
                              className="flex-1 text-sm border-none focus:ring-1 focus:ring-blue-500 bg-transparent"
                              placeholder="اسم المدينة"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newZones = [...shippingData.governorates];
                                (newZones[zoneIndex] as any).cities = (newZones[zoneIndex] as any).cities.filter((_: any, i: number) => i !== cityIndex);
                                setShippingData({ ...shippingData, governorates: newZones });
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      {(zone as any).cities.length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-md border border-dashed border-gray-300 dark:border-gray-600">
                          لا توجد مدن مضافة. انقر على "إضافة مدينة" لبدء إضافة المدن.
                        </div>
                      )}
                    </div>

                    {/* Delete Governorate Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newZones = shippingData.governorates.filter((_, i) => i !== zoneIndex);
                          setShippingData({ ...shippingData, governorates: newZones });
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف المحافظة بالكامل
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  onClick={() => {
                    const newZone = {
                      name: 'محافظة جديدة',
                      cities: ['مدينة جديدة'],
                      shippingCost: 50,
                      isActive: true
                    };
                    setShippingData({
                      ...shippingData,
                      governorates: [...shippingData.governorates, newZone] as any
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة محافظة جديدة
                </Button>
              </CardContent>
            </Card>

            <Button 
              onClick={() => saveSettings('shipping', shippingData)}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الشحن'}
            </Button>
          </div>
        )}

        {/* Products Settings */}
        {activeTab === 'products' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <Package className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400" />
                إعدادات المنتجات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxProductImages" className="text-gray-700 dark:text-gray-200">الصور الأقصى للمنتج</Label>
                  <Input
                    id="maxProductImages"
                    type="number"
                    value={productData.maxProductImages}
                    onChange={(e) => setProductData({ ...productData, maxProductImages: parseInt(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="maxProductDescriptionLength" className="text-gray-700 dark:text-gray-200">طول الوصف الأقصى للمنتج</Label>
                  <Input
                    id="maxProductDescriptionLength"
                    type="number"
                    value={productData.maxProductDescriptionLength}
                    onChange={(e) => setProductData({ ...productData, maxProductDescriptionLength: parseInt(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="autoApproveProducts"
                    checked={productData.autoApproveProducts}
                    onChange={(e) => setProductData({ ...productData, autoApproveProducts: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="autoApproveProducts" className="text-gray-700 dark:text-gray-200">تفعيل الموافقة التلقائية على المنتجات</Label>
                </div>
              </div>
              
              <Button 
                onClick={() => saveSettings('products', productData)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <Bell className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400" />
                إعدادات الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={notificationData.emailNotifications}
                    onChange={(e) => setNotificationData({ ...notificationData, emailNotifications: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="emailNotifications" className="text-gray-700 dark:text-gray-200">الإشعارات البريدية</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="smsNotifications"
                    checked={notificationData.smsNotifications}
                    onChange={(e) => setNotificationData({ ...notificationData, smsNotifications: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="smsNotifications" className="text-gray-700 dark:text-gray-200">الإشعارات النصية</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="pushNotifications"
                    checked={notificationData.pushNotifications}
                    onChange={(e) => setNotificationData({ ...notificationData, pushNotifications: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="pushNotifications" className="text-gray-700 dark:text-gray-200">الإشعارات الصوتية</Label>
                </div>
              </div>
              
              <Button 
                onClick={() => saveSettings('notifications', notificationData)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <Shield className="w-5 h-5 ml-2 text-purple-600 dark:text-purple-400" />
                إعدادات الأمان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passwordMinLength" className="text-gray-700 dark:text-gray-200">طول الرقم السري الأدنى</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={securityData.passwordMinLength}
                    onChange={(e) => setSecurityData({ ...securityData, passwordMinLength: parseInt(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout" className="text-gray-700 dark:text-gray-200">وقت انتهاء الجلسة (دقائق)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securityData.sessionTimeout}
                    onChange={(e) => setSecurityData({ ...securityData, sessionTimeout: parseInt(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="maxLoginAttempts" className="text-gray-700 dark:text-gray-200">حد أقصى لمحاولات الدخول</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={securityData.maxLoginAttempts}
                    onChange={(e) => setSecurityData({ ...securityData, maxLoginAttempts: parseInt(e.target.value) || 0 })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => saveSettings('security', securityData)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Legal Settings */}
        {activeTab === 'legal' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <FileText className="w-5 h-5 ml-2 text-red-600 dark:text-red-400" />
                إعدادات قانونية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="termsOfService" className="text-gray-700 dark:text-gray-200">شروط الخدمة</Label>
                <Textarea
                  id="termsOfService"
                  value={legalData.termsOfService}
                  onChange={(e) => setLegalData({ ...legalData, termsOfService: e.target.value })}
                  rows={5}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="privacyPolicy" className="text-gray-700 dark:text-gray-200">سياسة الخصوصية</Label>
                <Textarea
                  id="privacyPolicy"
                  value={legalData.privacyPolicy}
                  onChange={(e) => setLegalData({ ...legalData, privacyPolicy: e.target.value })}
                  rows={5}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="refundPolicy" className="text-gray-700 dark:text-gray-200">سياسة الاسترداد</Label>
                <Textarea
                  id="refundPolicy"
                  value={legalData.refundPolicy}
                  onChange={(e) => setLegalData({ ...legalData, refundPolicy: e.target.value })}
                  rows={5}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <Button 
                onClick={() => saveSettings('legal', legalData)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Analytics Settings */}
        {activeTab === 'analytics' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <BarChart3 className="w-5 h-5 ml-2 text-green-600 dark:text-green-400" />
                إعدادات التحليلات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="googleAnalyticsId" className="text-gray-700 dark:text-gray-200">معرف Google Analytics</Label>
                  <Input
                    id="googleAnalyticsId"
                    value={analyticsData.googleAnalyticsId}
                    onChange={(e) => setAnalyticsData({ ...analyticsData, googleAnalyticsId: e.target.value })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="facebookPixelId" className="text-gray-700 dark:text-gray-200">معرف Facebook Pixel</Label>
                  <Input
                    id="facebookPixelId"
                    value={analyticsData.facebookPixelId}
                    onChange={(e) => setAnalyticsData({ ...analyticsData, facebookPixelId: e.target.value })}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => saveSettings('analytics', analyticsData)}
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
        {activeTab !== 'general' && activeTab !== 'financial' && activeTab !== 'orders' && activeTab !== 'products' && activeTab !== 'notifications' && activeTab !== 'security' && activeTab !== 'legal' && activeTab !== 'analytics' && activeTab !== 'shipping' && (
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