'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Palette, 
  CreditCard,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface UserSettings {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  address?: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  profileVisibility: 'public' | 'private';
  language: 'ar' | 'en';
  autoWithdraw: boolean;
  withdrawThreshold: number;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [settings, setSettings] = useState<UserSettings>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    companyName: user?.companyName || '',
    address: user?.address || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    pushNotifications: true,
    profileVisibility: 'public',
    language: 'ar',
    autoWithdraw: false,
    withdrawThreshold: 100
  });

  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || '',
        address: user.address || '',
        // Load settings from user object
        emailNotifications: user.settings?.emailNotifications ?? true,
        pushNotifications: user.settings?.pushNotifications ?? true,
        profileVisibility: user.settings?.profileVisibility ?? 'public',
        language: user.settings?.language ?? 'ar',
        autoWithdraw: user.settings?.autoWithdraw ?? false,
        withdrawThreshold: user.settings?.withdrawThreshold ?? 100
      }));
      
      console.log('📋 Loaded user settings:', {
        user: user,
        settings: user.settings
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    // التحقق من صحة البيانات
    if (!settings.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    
    if (!settings.phone.trim()) {
      toast.error('رقم الهاتف مطلوب');
      return;
    }
    
    console.log('🔄 Starting profile update:', {
      currentUser: user,
      newSettings: {
        name: settings.name,
        phone: settings.phone,
        companyName: settings.companyName,
        address: settings.address
      }
    });
    
    setSaving(true);
    try {
      const requestBody = {
        name: settings.name.trim(),
        phone: settings.phone.trim(),
        companyName: settings.companyName?.trim() || '',
        address: settings.address?.trim() || ''
      };
      
      console.log('📤 Sending profile update request:', requestBody);
      
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Profile update response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Profile update result:', result);
        
        if (result.user) {
          updateUser(result.user);
          toast.success('تم تحديث الملف الشخصي بنجاح');
          
          // تحديث البيانات المحلية
          setSettings(prev => ({
            ...prev,
            name: result.user.name || '',
            phone: result.user.phone || '',
            companyName: result.user.companyName || '',
            address: result.user.address || ''
          }));
        } else {
          toast.error('لم يتم استلام بيانات المستخدم المحدثة');
        }
      } else {
        const error = await response.json();
        console.error('❌ Profile update error:', error);
        toast.error(error.message || 'فشل في تحديث الملف الشخصي');
      }
    } catch (error) {
      console.error('❌ Profile update exception:', error);
      toast.error('حدث خطأ أثناء تحديث الملف الشخصي');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (settings.newPassword !== settings.confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (settings.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: settings.currentPassword,
          newPassword: settings.newPassword
        }),
      });

      if (response.ok) {
        toast.success('تم تغيير كلمة المرور بنجاح');
        setSettings(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في تغيير كلمة المرور');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    console.log('🔄 Starting settings save:', {
      currentSettings: settings,
      settingsToSave: {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        profileVisibility: settings.profileVisibility,
        language: settings.language,
        autoWithdraw: settings.autoWithdraw,
        withdrawThreshold: settings.withdrawThreshold
      }
    });
    
    setSaving(true);
    try {
      const requestBody = {
        settings: {
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          profileVisibility: settings.profileVisibility,
          language: settings.language,
          autoWithdraw: settings.autoWithdraw,
          withdrawThreshold: settings.withdrawThreshold
        }
      };
      
      console.log('📤 Sending settings save request:', requestBody);
      
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Settings save response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Settings save result:', result);
        
        if (result.user) {
          updateUser(result.user);
          toast.success('تم حفظ الإعدادات بنجاح');
          
          // تحديث البيانات المحلية
          setSettings(prev => ({
            ...prev,
            emailNotifications: result.user.settings?.emailNotifications ?? true,
            pushNotifications: result.user.settings?.pushNotifications ?? true,
            profileVisibility: result.user.settings?.profileVisibility ?? 'public',
            language: result.user.settings?.language ?? 'ar',
            autoWithdraw: result.user.settings?.autoWithdraw ?? false,
            withdrawThreshold: result.user.settings?.withdrawThreshold ?? 100
          }));
        } else {
          toast.error('لم يتم استلام بيانات المستخدم المحدثة');
        }
      } else {
        const error = await response.json();
        console.error('❌ Settings save error:', error);
        toast.error(error.message || 'فشل في حفظ الإعدادات');
      }
    } catch (error) {
      console.error('❌ Settings save exception:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'security', label: 'الأمان', icon: Lock },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'preferences', label: 'التفضيلات', icon: Palette },
    { id: 'payment', label: 'الدفع', icon: CreditCard }
  ];

  const renderProfileTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4">
          المعلومات الشخصية
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[44px]"
              placeholder="الاسم الكامل"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={settings.email}
              disabled
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
              placeholder="البريد الإلكتروني"
            />
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-1">
              لا يمكن تغيير البريد الإلكتروني
            </p>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[44px]"
              placeholder="رقم الهاتف"
            />
          </div>
          
          {user?.role === 'supplier' && (
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                اسم الشركة
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[44px]"
                placeholder="اسم الشركة"
              />
            </div>
          )}
          
          <div className="md:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              العنوان
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[100px]"
              rows={3}
              placeholder="العنوان الكامل"
            />
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6">
          <button
            onClick={handleProfileUpdate}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 sm:py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            <Save className="w-4 h-4 ml-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4">
          تغيير كلمة المرور
        </h3>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              كلمة المرور الحالية
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={settings.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                className="w-full px-3 py-2 pl-12 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[44px]"
                placeholder="كلمة المرور الحالية"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center w-12 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 z-10 min-h-[44px]"
              >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              كلمة المرور الجديدة
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[44px]"
              placeholder="كلمة المرور الجديدة"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[44px]"
              placeholder="تأكيد كلمة المرور الجديدة"
            />
            {settings.newPassword && settings.confirmPassword && (
              <div className="mt-2">
                {settings.newPassword === settings.confirmPassword ? (
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                    <span className="text-xs sm:text-sm">كلمة المرور متطابقة</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                    <span className="text-xs sm:text-sm">كلمة المرور غير متطابقة</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6">
          <button
            onClick={handlePasswordChange}
            disabled={saving || !settings.currentPassword || !settings.newPassword || !settings.confirmPassword}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 sm:py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            <Lock className="w-4 h-4 ml-2" />
            {saving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4">
          إعدادات الإشعارات
        </h3>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100">إشعارات البريد الإلكتروني</h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">استلام الإشعارات عبر البريد الإلكتروني</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100">إشعارات الموقع</h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">استلام الإشعارات في المتصفح</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6">
          <button
            onClick={handleSettingsSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 sm:py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            <Save className="w-4 h-4 ml-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4">
          التفضيلات العامة
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              اللغة
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="input-field text-sm sm:text-base min-h-[44px]"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
              رؤية الملف الشخصي
            </label>
            <select
              value={settings.profileVisibility}
              onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
              className="input-field text-sm sm:text-base min-h-[44px]"
            >
              <option value="public">عام</option>
              <option value="private">خاص</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6">
          <button
            onClick={handleSettingsSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 sm:py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            <Save className="w-4 h-4 ml-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ التفضيلات'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentTab = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4">
          إعدادات الدفع والسحب
        </h3>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100">السحب التلقائي</h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">سحب الأموال تلقائياً عند الوصول للحد الأدنى</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.autoWithdraw}
                onChange={(e) => handleInputChange('autoWithdraw', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          {settings.autoWithdraw && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                الحد الأدنى للسحب التلقائي (₪)
              </label>
              <input
                type="number"
                value={settings.withdrawThreshold}
                onChange={(e) => handleInputChange('withdrawThreshold', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 min-h-[44px]"
                min="50"
                step="10"
                placeholder="100"
              />
            </div>
          )}
        </div>
        
        <div className="mt-4 sm:mt-6">
          <button
            onClick={handleSettingsSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 sm:py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            <Save className="w-4 h-4 ml-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الدفع'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'security':
        return renderSecurityTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'preferences':
        return renderPreferencesTab();
      case 'payment':
        return renderPaymentTab();
      default:
        return renderProfileTab();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1 sm:mb-2">
          الإعدادات
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-slate-400">
          إدارة إعدادات حسابك وتفضيلاتك الشخصية
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sidebar - Horizontal scroll on mobile */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
            <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-3 sm:-mx-4 px-3 sm:px-4 lg:mx-0 lg:px-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] lg:w-full ${
                      activeTab === tab.id
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-3 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 