'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import toast from 'react-hot-toast';

export default function TestOrderSettingsPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [testOrderTotal, setTestOrderTotal] = useState(100);
  const [validationResult, setValidationResult] = useState<any>(null);

  const testOrderValidation = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        const currentSettings = data.settings;
        const isValid = testOrderTotal >= currentSettings.minimumOrderValue && 
                       testOrderTotal <= currentSettings.maximumOrderValue;
        
        setValidationResult({
          orderTotal: testOrderTotal,
          minimumOrderValue: currentSettings.minimumOrderValue,
          maximumOrderValue: currentSettings.maximumOrderValue,
          isValid,
          message: isValid ? 'الطلب صالح' : 
                   testOrderTotal < currentSettings.minimumOrderValue ? 
                   `الحد الأدنى للطلب هو ${currentSettings.minimumOrderValue}₪` :
                   `الحد الأقصى للطلب هو ${currentSettings.maximumOrderValue}₪`
        });
      }
    } catch (error) {
      console.error('Error testing order validation:', error);
      toast.error('حدث خطأ في اختبار التحقق من الطلب');
    }
  };

  useEffect(() => {
    if (testOrderTotal > 0) {
      testOrderValidation();
    }
  }, [testOrderTotal]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            اختبار إعدادات الطلبات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            اختبار التحقق من صحة إعدادات الحد الأدنى والأقصى للطلبات
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              الإعدادات الحالية
            </h2>
            {settings ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-700 dark:text-gray-300">الحد الأدنى للطلب:</span>
                  <span className="font-semibold text-green-600">{settings.minimumOrderValue}₪</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-700 dark:text-gray-300">الحد الأقصى للطلب:</span>
                  <span className="font-semibold text-red-600">{settings.maximumOrderValue}₪</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">جاري تحميل الإعدادات...</p>
            )}
          </div>

          {/* Test Order Validation */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              اختبار قيمة الطلب
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  قيمة الطلب للاختبار
                </label>
                <input
                  type="number"
                  value={testOrderTotal}
                  onChange={(e) => setTestOrderTotal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0"
                  step="0.01"
                />
              </div>
              
              {validationResult && (
                <div className={`p-4 rounded-lg ${
                  validationResult.isValid 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      validationResult.isValid ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className={`font-medium ${
                        validationResult.isValid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        {validationResult.message}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        قيمة الطلب: {validationResult.orderTotal}₪
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            سيناريوهات الاختبار
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setTestOrderTotal(settings?.minimumOrderValue ? settings.minimumOrderValue - 1 : 0)}
              className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
            >
              أقل من الحد الأدنى
            </button>
            <button
              onClick={() => setTestOrderTotal(settings?.minimumOrderValue || 50)}
              className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
            >
              الحد الأدنى
            </button>
            <button
              onClick={() => setTestOrderTotal(settings?.maximumOrderValue ? settings.maximumOrderValue + 1 : 100001)}
              className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
            >
              أكثر من الحد الأقصى
            </button>
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            معلومات التصحيح
          </h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">المستخدم:</span> {user?.name} ({user?.role})
            </p>
            <p className="text-sm">
              <span className="font-medium">الإعدادات محملة:</span> {settings ? 'نعم' : 'لا'}
            </p>
            <p className="text-sm">
              <span className="font-medium">الحد الأدنى:</span> {settings?.minimumOrderValue || 'غير محدد'}₪
            </p>
            <p className="text-sm">
              <span className="font-medium">الحد الأقصى:</span> {settings?.maximumOrderValue || 'غير محدد'}₪
            </p>
            <p className="text-sm">
              <span className="font-medium">قيمة الاختبار:</span> {testOrderTotal}₪
            </p>
            <p className="text-sm">
              <span className="font-medium">النتيجة:</span> {validationResult?.isValid ? 'صالح' : 'غير صالح'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
