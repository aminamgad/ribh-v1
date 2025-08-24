'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import OrderExportModal from '@/components/ui/OrderExportModal';
import OrderImportModal from '@/components/ui/OrderImportModal';
import { Download, Upload } from 'lucide-react';

export default function TestOrderExportImportPage() {
  const { user } = useAuth();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            يرجى تسجيل الدخول
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            يجب تسجيل الدخول لاختبار وظائف التصدير والاستيراد
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-4">
          اختبار تصدير واستيراد الطلبات
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          صفحة اختبار لوظائف تصدير واستيراد الطلبات من وإلى ملفات Excel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="card">
          <div className="text-center">
            <Download className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
              تصدير الطلبات
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              تصدير الطلبات إلى ملف Excel مع إمكانية التصفية حسب التاريخ والحالة
            </p>
            
            {user.role === 'admin' || user.role === 'supplier' ? (
              <button
                onClick={() => setShowExportModal(true)}
                className="btn-primary flex items-center mx-auto"
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير الطلبات
              </button>
            ) : (
              <div className="text-red-600 dark:text-red-400">
                غير متاح لصلاحيتك الحالية
              </div>
            )}
          </div>
        </div>

        {/* Import Section */}
        <div className="card">
          <div className="text-center">
            <Upload className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
              استيراد الطلبات
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              استيراد الطلبات من ملف Excel مع التحقق من صحة البيانات
            </p>
            
            {user.role === 'marketer' ? (
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-primary flex items-center mx-auto"
              >
                <Upload className="w-4 h-4 ml-2" />
                استيراد الطلبات
              </button>
            ) : (
              <div className="text-red-600 dark:text-red-400">
                غير متاح لصلاحيتك الحالية
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          معلومات المستخدم
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-slate-300">الاسم:</span>
            <span className="text-gray-900 dark:text-slate-100 mr-2">{user.name}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-slate-300">البريد الإلكتروني:</span>
            <span className="text-gray-900 dark:text-slate-100 mr-2">{user.email}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-slate-300">الصلاحية:</span>
            <span className="text-gray-900 dark:text-slate-100 mr-2">{user.role}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-slate-300">الحالة:</span>
            <span className="text-gray-900 dark:text-slate-100 mr-2">
              {user.isActive ? 'نشط' : 'غير نشط'}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          تعليمات الاستخدام
        </h3>
        <div className="space-y-4 text-sm text-gray-600 dark:text-slate-400">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">تصدير الطلبات:</h4>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>متاح للمديرين والموردين فقط</li>
              <li>يمكن تصدير الطلبات بتنسيق Excel أو CSV</li>
              <li>إمكانية التصفية حسب التاريخ وحالة الطلب</li>
              <li>يحتوي الملف على تفاصيل كاملة للطلبات والمنتجات</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">استيراد الطلبات:</h4>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>متاح للمسوقين فقط</li>
              <li>يدعم ملفات Excel و CSV</li>
              <li>يتحقق من صحة البيانات تلقائياً</li>
              <li>ينشئ العملاء الجدد تلقائياً إذا لم يكونوا موجودين</li>
              <li>يتحقق من توفر المنتجات والمخزون</li>
              <li>يجب أن يحتوي الملف على الأعمدة التالية:</li>
              <div className="mr-6 mt-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <code className="text-xs">
                  اسم العميل, بريد العميل, هاتف العميل, رمز المنتج, اسم المنتج, الكمية, العنوان, المدينة, المحافظة, الرمز البريدي, طريقة الدفع, ملاحظات
                </code>
              </div>
              <li><strong>مهم:</strong> لا تستخدم ملفات الطلبات المصدرة للاستيراد</li>
              <li>استخدم فقط قالب الاستيراد المقدم في الواجهة</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">استكشاف الأخطاء:</h4>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>تأكد من أن أسماء الأعمدة في الملف تطابق القالب</li>
              <li>تأكد من أن المنتجات موجودة ومفعلة في النظام</li>
              <li>تأكد من توفر الكمية المطلوبة في المخزون</li>
              <li>راجع رسائل الخطأ في وحدة التحكم للمزيد من التفاصيل</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">الفرق بين التصدير والاستيراد:</h4>
            <div className="mr-4 space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">ملفات التصدير:</h5>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  تحتوي على بيانات الطلبات الموجودة (رقم الطلب، تاريخ الطلب، حالة الطلب، إلخ). 
                  هذه الملفات للقراءة فقط ولا يمكن استخدامها للاستيراد.
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h5 className="font-medium text-green-900 dark:text-green-100 mb-1">ملفات الاستيراد:</h5>
                <p className="text-sm text-green-700 dark:text-green-300">
                  تحتوي على بيانات العملاء والمنتجات لإنشاء طلبات جديدة 
                  (اسم العميل، بريد العميل، اسم المنتج، الكمية، إلخ).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <OrderExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        userRole={user.role}
      />

      <OrderImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          console.log('Import successful');
        }}
      />
    </div>
  );
}
