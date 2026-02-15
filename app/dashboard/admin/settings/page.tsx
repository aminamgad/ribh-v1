'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
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
  RotateCw, 
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
  MapPin,
  Edit,
  X
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface AdminProfitMargin {
  minPrice: number;
  maxPrice: number;
  margin: number;
}

interface WithdrawalSettings {
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFees: number;
}

interface SystemSettings {
  financial: {
    withdrawalSettings: WithdrawalSettings;
    adminProfitMargins: AdminProfitMargin[];
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
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState(0); // 0-100
  const [recalcDetail, setRecalcDetail] = useState<{ processed: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // Form states for each section
  const [financialData, setFinancialData] = useState({
    withdrawalSettings: {
      minimumWithdrawal: 100,
      maximumWithdrawal: 50000,
      withdrawalFees: 0
    },
    adminProfitMargins: [
      { minPrice: 1, maxPrice: 100, margin: 5 },
      { minPrice: 101, maxPrice: 500, margin: 5 },
      { minPrice: 501, maxPrice: 1000, margin: 5 },
      { minPrice: 1001, maxPrice: 999999, margin: 5 }
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
    defaultFreeShippingThreshold: 500
  });

  // Shipping regions state
  const [shippingRegions, setShippingRegions] = useState<any[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<string | null>(null);
  const [regionForm, setRegionForm] = useState({
    regionName: '',
    description: '',
    shippingCost: 50,
    freeShippingThreshold: null as number | null,
    isActive: true,
    villageIds: [] as number[],
    governorateName: '',
    cityNames: [] as string[]
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
            adminProfitMargins: data.settings.adminProfitMargins || [
              { minPrice: 1, maxPrice: 100, margin: 5 },
              { minPrice: 101, maxPrice: 500, margin: 5 },
              { minPrice: 501, maxPrice: 1000, margin: 5 },
              { minPrice: 1001, maxPrice: 999999, margin: 5 }
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
            defaultFreeShippingThreshold: data.settings.defaultFreeShippingThreshold || 500
          });

          // Maintenance settings
          setMaintenanceData({
            maintenanceMode: data.settings.maintenanceMode !== undefined ? data.settings.maintenanceMode : false,
            maintenanceMessage: data.settings.maintenanceMessage || 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.'
          });
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('حدث خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchShippingRegions();
  }, []);

  // Fetch shipping regions
  const fetchShippingRegions = async () => {
    try {
      setLoadingRegions(true);
      const response = await fetch('/api/admin/settings/shipping');
      const data = await response.json();
      if (data.success) {
        setShippingRegions(data.regions || []);
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      setLoadingRegions(false);
    }
  };

  // Handle region form submit
  const handleRegionSubmit = async () => {
    if (!regionForm.regionName.trim()) {
      toast.error('اسم المنطقة مطلوب');
      return;
    }

    try {
      setSaving(true);
      const url = editingRegion 
        ? '/api/admin/settings/shipping'
        : '/api/admin/settings/shipping';
      
      const method = editingRegion ? 'PUT' : 'POST';
      const body = editingRegion
        ? { regionId: editingRegion._id, ...regionForm }
        : regionForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.success) {
        toast.success(editingRegion ? 'تم تحديث المنطقة بنجاح' : 'تم إضافة المنطقة بنجاح');
        setShowRegionModal(false);
        setEditingRegion(null);
        setRegionForm({
          regionName: '',
          description: '',
          shippingCost: 50,
          freeShippingThreshold: null,
          isActive: true,
          villageIds: [],
          governorateName: '',
          cityNames: []
        });
        fetchShippingRegions();
      } else {
        toast.error(result.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ المنطقة');
    } finally {
      setSaving(false);
    }
  };

  // Delete region
  const handleDeleteRegion = (regionId: string) => {
    setRegionToDelete(regionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRegion = async () => {
    if (!regionToDelete) return;

    try {
      const response = await fetch(`/api/admin/settings/shipping?regionId=${regionToDelete}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('تم حذف المنطقة بنجاح');
        fetchShippingRegions();
        setShowDeleteConfirm(false);
        setRegionToDelete(null);
      } else {
        toast.error(result.message || 'حدث خطأ');
        setShowDeleteConfirm(false);
        setRegionToDelete(null);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المنطقة');
      setShowDeleteConfirm(false);
      setRegionToDelete(null);
    }
  };

  // Save settings
  const saveSettings = async (section: string, data: any) => {
    try {
      setSaving(true);
      
      // Ensure data exists before sending
      if (!data) {
        toast.error('لا توجد بيانات للحفظ');
        return;
      }
      
      // For financial section, ensure adminProfitMargins is included
      if (section === 'financial' && data) {
        if (!data.adminProfitMargins) {
          data.adminProfitMargins = financialData.adminProfitMargins || [];
        }
      }
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ section, data }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // عرض رسالة الخادم (قد تتضمن إشعار إعادة الحساب في الخلفية)
        toast.success(result.message || 'تم حفظ الإعدادات بنجاح');
        
        // Update local state immediately with saved data
        if (result.settings?.adminProfitMargins) {
          setFinancialData(prev => ({
            ...prev,
            adminProfitMargins: result.settings.adminProfitMargins
          }));
        }
        
        // Refresh settings after successful save
        await fetchSettings();
      } else {
        toast.error(result.message || 'حدث خطأ في حفظ الإعدادات');
      }
    } catch (error) {
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // Admin profit margin handlers
  const addAdminProfitMargin = () => {
    setFinancialData(prev => ({
      ...prev,
      adminProfitMargins: [...(prev.adminProfitMargins || []), { minPrice: 0, maxPrice: 0, margin: 0 }]
    }));
  };

  const updateAdminProfitMargin = (index: number, field: keyof AdminProfitMargin, value: number) => {
    setFinancialData(prev => ({
      ...prev,
      adminProfitMargins: (prev.adminProfitMargins || []).map((margin, i) => 
        i === index ? { ...margin, [field]: value } : margin
      )
    }));
  };

  const removeAdminProfitMargin = (index: number) => {
    setFinancialData(prev => ({
      ...prev,
      adminProfitMargins: (prev.adminProfitMargins || []).filter((_, i) => i !== index)
    }));
  };

  const handleRecalculatePrices = async () => {
    setRecalculating(true);
    setRecalcProgress(0);
    setRecalcDetail(null);
    try {
      const response = await fetch('/api/admin/products/recalculate-prices-stream', { method: 'POST' });
      if (!response.ok || !response.body) {
        toast.error('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const match = line.match(/^data:\s*(.+)$/m);
          if (!match) continue;
          try {
            const data = JSON.parse(match[1].trim());
            if (data.type === 'progress') {
              setRecalcProgress(data.percent ?? 0);
              setRecalcDetail({ processed: data.processed ?? 0, total: data.total ?? 0 });
            } else if (data.type === 'done' && data.success) {
              setRecalcProgress(100);
              toast.success(data.message || 'تم إعادة حساب أسعار المنتجات بنجاح');
            } else if (data.type === 'error' || (data.type === 'done' && !data.success)) {
              toast.error(data.message || 'حدث خطأ أثناء إعادة حساب الأسعار');
            }
          } catch {
            // ignore parse errors for partial chunks
          }
        }
      }
      if (buffer) {
        const match = buffer.match(/^data:\s*(.+)$/m);
        if (match) {
          try {
            const data = JSON.parse(match[1].trim());
            if (data.type === 'done' && data.success) {
              setRecalcProgress(100);
              toast.success(data.message || 'تم إعادة حساب أسعار المنتجات بنجاح');
            } else if (data.type === 'error' || (data.type === 'done' && !data.success)) {
              toast.error(data.message || 'حدث خطأ أثناء إعادة حساب الأسعار');
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      toast.error('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
    } finally {
      setRecalculating(false);
      setRecalcDetail(null);
      setTimeout(() => setRecalcProgress(0), 400);
    }
  };

  // Maintenance settings state
  const [maintenanceData, setMaintenanceData] = useState({
    maintenanceMode: false,
    maintenanceMessage: 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.'
  });

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
    { id: 'shipping', label: 'الشحن', icon: Truck },
    { id: 'maintenance', label: 'الصيانة', icon: AlertCircle }
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <RotateCw className="w-8 h-8 animate-spin text-[#FF9800] dark:text-[#FFB74D] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  // Ensure data is loaded
  if (!financialData?.withdrawalSettings || !financialData?.adminProfitMargins) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">جاري تحميل البيانات...</p>
          <Button onClick={fetchSettings} className="mt-4 bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]">
            <RotateCw className="w-4 h-4 ml-2" />
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
          <RotateCw className="w-4 h-4 ml-2" />
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
                  ? 'bg-[#FF9800] text-white'
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
                <Settings className="w-5 h-5 ml-2 text-slate-600 dark:text-slate-400" />
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
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
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
                <DollarSign className="w-5 h-5 ml-2 text-slate-600 dark:text-slate-400" />
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

              {/* Admin Profit Margins - النظام الوحيد المستخدم */}
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <strong>ملاحظة:</strong> هامش ربح الإدارة يُحسب بناءً على <strong>سعر المنتج الفردي</strong> وليس إجمالي الطلب. 
                    على سبيل المثال: إذا كان سعر المنتج 50 وهامش الربح 10%، فستكون عمولة الإدارة 5 لكل منتج.
                    يمكنك استخدام أي نسبة مئوية (0% أو أكثر)، بما فيها 100% أو 200% وما فوق.
                  </p>
                </div>
              </div>

              {/* Admin Profit Margins */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">هامش ربح الإدارة (بناءً على سعر المنتج)</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      هامش ربح الإدارة يُحسب بناءً على <strong>سعر المنتج الفردي</strong> وليس إجمالي الطلب.
                      يتم تطبيق الهامش المناسب حسب نطاق السعر لكل منتج في الطلب.
                    </p>
                  </div>
                  <Button
                    onClick={addAdminProfitMargin}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة هامش ربح
                  </Button>
                </div>
                
                {/* Preview Section */}
                {financialData?.adminProfitMargins && financialData.adminProfitMargins.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">معاينة الهوامش:</h4>
                    <div className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
                      {financialData.adminProfitMargins.map((margin, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>من {margin.minPrice}₪ إلى {margin.maxPrice}₪:</span>
                          <span className="font-semibold">{margin.margin}%</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            (مثال: منتج بسعر {Math.floor((margin.minPrice + margin.maxPrice) / 2)}₪ = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((Math.floor((margin.minPrice + margin.maxPrice) / 2)) * margin.margin / 100)}₪ ربح)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {financialData?.adminProfitMargins?.map((margin, index) => (
                  <div key={index} className="flex items-start space-x-4 space-x-reverse p-4 border rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-700 dark:text-gray-200">من السعر (₪)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={margin.minPrice}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateAdminProfitMargin(index, 'minPrice', value);
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 dark:text-gray-200">إلى السعر (₪)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={margin.maxPrice}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateAdminProfitMargin(index, 'maxPrice', value);
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="999999"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 dark:text-gray-200">الهامش (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={margin.margin}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const safeValue = (value >= 0 && Number.isFinite(value)) ? value : 0;
                            updateAdminProfitMargin(index, 'margin', safeValue);
                          }}
                          className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="5 (أو 100، 200...)"
                        />
                        {margin.margin > 0 && margin.minPrice > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            مثال: منتج {margin.minPrice}₪ = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(margin.minPrice * margin.margin / 100)}₪ ربح
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => removeAdminProfitMargin(index)}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {(!financialData?.adminProfitMargins || financialData.adminProfitMargins.length === 0) && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>لا توجد هوامش ربح محددة</p>
                    <Button
                      onClick={addAdminProfitMargin}
                      className="mt-4 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                    >
                      + إضافة هامش ربح
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => {
                    const dataToSave = {
                      ...financialData,
                      adminProfitMargins: financialData.adminProfitMargins || []
                    };
                    saveSettings('financial', dataToSave);
                  }}
                  disabled={saving || recalculating}
                  className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </Button>
                <Button 
                  onClick={handleRecalculatePrices}
                  disabled={saving || recalculating}
                  variant="outline"
                  className="border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  <RotateCw className={`w-4 h-4 ml-2 ${recalculating ? 'animate-spin' : ''}`} />
                  {recalculating ? 'جاري إعادة الحساب...' : 'إعادة حساب أسعار المنتجات الآن'}
                </Button>
              </div>
              {recalculating && (
                <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    جاري إعادة حساب الأسعار
                  </p>
                  <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 dark:bg-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${recalcProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{recalcProgress}%</span>
                    {recalcDetail && recalcDetail.total > 0 && (
                      <span>{recalcDetail.processed} من {recalcDetail.total} منتج</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Settings */}
        {activeTab === 'orders' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <CreditCard className="w-5 h-5 ml-2 text-slate-600 dark:text-slate-400" />
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
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>ملاحظة:</strong> هذه الإعدادات تحكم الحد الأدنى والأقصى لقيم الطلبات التي يمكن للمسوقين إنشاؤها. 
                  سيتم تطبيق هذه القيود تلقائياً عند إنشاء الطلبات.
                </p>
              </div>
              
              <Button 
                onClick={() => saveSettings('orders', orderData)}
                disabled={saving}
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
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
            {/* Important Notice */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">ملاحظة مهمة:</h4>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                النظام يستخدم <strong>نموذج القرى (Village Model)</strong> و<strong>مناطق الشحن (Shipping Regions)</strong> لتحديد تكاليف الشحن.
                للتحديث الفعلي لتكاليف الشحن، يرجى استخدام <code>node scripts/import-villages.js</code> لاستيراد/تحديث القرى من ملف villages.json.
                يمكن إدارة مناطق الشحن من قسم "مناطق الشحن" أدناه.
              </p>
            </div>
            
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
                  <div>
                    <Checkbox
                      id="shippingEnabled"
                      checked={shippingData.shippingEnabled}
                      onChange={(e) => setShippingData({ ...shippingData, shippingEnabled: e.target.checked })}
                      label="تفعيل الشحن"
                    />
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
                
                <Button 
                  onClick={() => saveSettings('shipping', shippingData)}
                  disabled={saving}
                  className="mt-4 bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الشحن'}
                </Button>
              </CardContent>
            </Card>


            {/* Shipping Regions for Marketers */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-gray-900 dark:text-white">
                    <Truck className="w-5 h-5 ml-2 text-slate-600 dark:text-slate-400" />
                    مناطق التوصيل للمسوقين
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setEditingRegion(null);
                      setRegionForm({
                        regionName: '',
                        description: '',
                        shippingCost: 50,
                        freeShippingThreshold: null,
                        isActive: true,
                        villageIds: [],
                        governorateName: '',
                        cityNames: []
                      });
                      setShowRegionModal(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة منطقة جديدة
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  إدارة مناطق وأسعار التوصيل التي يراها المسوقون عند إنشاء الطلبات
                </p>
              </CardHeader>
              <CardContent>
                {loadingRegions ? (
                  <div className="text-center py-8">
                    <div className="loading-spinner w-8 h-8 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">جاري التحميل...</p>
                  </div>
                ) : shippingRegions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد مناطق توصيل مضافة بعد</p>
                    <p className="text-sm mt-1">انقر على "إضافة منطقة جديدة" لبدء الإضافة</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">المنطقة</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">سعر التوصيل</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">الشحن المجاني</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">الحالة</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {shippingRegions.map((region) => (
                          <tr key={region._id || region.regionName} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                              {region.regionName}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                              {region.shippingCost} ₪
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                              {region.freeShippingThreshold ? `${region.freeShippingThreshold} ₪` : 'لا يوجد'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={region.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'}>
                                {region.isActive ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingRegion(region);
                                  setRegionForm({
                                    regionName: region.regionName || '',
                                    description: region.description || '',
                                    shippingCost: region.shippingCost || 50,
                                      freeShippingThreshold: region.freeShippingThreshold || null,
                                      isActive: region.isActive !== false,
                                      villageIds: region.villageIds || [],
                                      governorateName: region.governorateName || '',
                                      cityNames: region.cityNames || []
                                    });
                                    setShowRegionModal(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3 ml-1" />
                                  تعديل
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteRegion(region._id || region.regionName)}
                                >
                                  <Trash2 className="w-3 h-3 ml-1" />
                                  حذف
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setRegionToDelete(null);
          }}
          onConfirm={confirmDeleteRegion}
          title="حذف منطقة التوصيل"
          message="هل أنت متأكد من حذف هذه المنطقة؟ لا يمكن التراجع عن هذا الإجراء."
          confirmText="حذف"
          cancelText="إلغاء"
          type="danger"
        />

        {/* Region Modal */}
        {showRegionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {editingRegion ? 'تعديل منطقة التوصيل' : 'إضافة منطقة توصيل جديدة'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowRegionModal(false);
                      setEditingRegion(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>اسم المنطقة <span className="text-red-500">*</span></Label>
                    <Input
                      value={regionForm.regionName}
                      onChange={(e) => setRegionForm({ ...regionForm, regionName: e.target.value })}
                      placeholder="مثال: الضفة الغربية"
                      required
                    />
                  </div>

                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      value={regionForm.description}
                      onChange={(e) => setRegionForm({ ...regionForm, description: e.target.value })}
                      placeholder="وصف المنطقة (اختياري)"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>سعر التوصيل (₪) <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={regionForm.shippingCost}
                        onChange={(e) => setRegionForm({ ...regionForm, shippingCost: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                    <div>
                      <Label>حد الشحن المجاني (₪)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={regionForm.freeShippingThreshold || ''}
                        onChange={(e) => setRegionForm({ ...regionForm, freeShippingThreshold: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="اتركه فارغاً للاستخدام الافتراضي"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      checked={regionForm.isActive}
                      onChange={(e) => setRegionForm({ ...regionForm, isActive: e.target.checked })}
                      label="منطقة نشطة"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-200 dark:border-slate-700">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRegionModal(false);
                        setEditingRegion(null);
                      }}
                      disabled={saving}
                    >
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleRegionSubmit}
                      disabled={saving || !regionForm.regionName.trim()}
                      className="bg-[#FF9800] hover:bg-[#F57C00]"
                    >
                      {saving ? 'جاري الحفظ...' : editingRegion ? 'تحديث' : 'إضافة'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Settings */}
        {activeTab === 'products' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <Package className="w-5 h-5 ml-2 text-slate-600 dark:text-slate-400" />
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
                <div>
                  <Checkbox
                    id="autoApproveProducts"
                    checked={productData.autoApproveProducts}
                    onChange={(e) => setProductData({ ...productData, autoApproveProducts: e.target.checked })}
                    label="تفعيل الموافقة التلقائية على المنتجات"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => saveSettings('products', productData)}
                disabled={saving}
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
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
                <Bell className="w-5 h-5 ml-2 text-slate-600 dark:text-slate-400" />
                إعدادات الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Checkbox
                    id="emailNotifications"
                    checked={notificationData.emailNotifications}
                    onChange={(e) => setNotificationData({ ...notificationData, emailNotifications: e.target.checked })}
                    label="الإشعارات البريدية"
                  />
                </div>
                <div>
                  <Checkbox
                    id="smsNotifications"
                    checked={notificationData.smsNotifications}
                    onChange={(e) => setNotificationData({ ...notificationData, smsNotifications: e.target.checked })}
                    label="الإشعارات النصية"
                  />
                </div>
                <div>
                  <Checkbox
                    id="pushNotifications"
                    checked={notificationData.pushNotifications}
                    onChange={(e) => setNotificationData({ ...notificationData, pushNotifications: e.target.checked })}
                    label="الإشعارات الصوتية"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => saveSettings('notifications', notificationData)}
                disabled={saving}
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
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
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
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
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
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
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Settings */}
        {activeTab === 'maintenance' && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <AlertCircle className="w-5 h-5 ml-2 text-yellow-600 dark:text-yellow-400" />
                إعدادات الصيانة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>تحذير:</strong> عند تفعيل وضع الصيانة، سيتم حظر جميع المستخدمين من الوصول إلى المنصة باستثناء الأدمن.
                </p>
              </div>
              
              <div>
                <Checkbox
                  id="maintenanceMode"
                  checked={maintenanceData.maintenanceMode}
                  onChange={(e) => setMaintenanceData({ ...maintenanceData, maintenanceMode: e.target.checked })}
                  label="تفعيل وضع الصيانة"
                />
              </div>
              
              <div>
                <Label htmlFor="maintenanceMessage" className="text-gray-700 dark:text-gray-200">رسالة الصيانة</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={maintenanceData.maintenanceMessage}
                  onChange={(e) => setMaintenanceData({ ...maintenanceData, maintenanceMessage: e.target.value })}
                  rows={4}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="المنصة تحت الصيانة. يرجى المحاولة لاحقاً."
                />
              </div>
              
              <Button 
                onClick={() => saveSettings('maintenance', maintenanceData)}
                disabled={saving}
                className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
              >
                <Save className="w-4 h-4 ml-2" />
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Other tabs can be implemented similarly */}
        {activeTab !== 'general' && activeTab !== 'financial' && activeTab !== 'orders' && activeTab !== 'products' && activeTab !== 'notifications' && activeTab !== 'security' && activeTab !== 'legal' && activeTab !== 'analytics' && activeTab !== 'shipping' && activeTab !== 'maintenance' && (
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