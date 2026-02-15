'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-[#FF9800] hover:text-[#F57C00] mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
          العودة للرئيسية
        </Link>
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF9800]/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-[#FF9800]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">سياسة الخصوصية</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">١. مقدمة</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              نحترم خصوصيتك في منصة ربح ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك عند استخدام خدماتنا.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٢. البيانات التي نجمعها</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-2">نجمع: البيانات الشخصية (الاسم، البريد، الهاتف)، عنوان التوصيل، سجل الطلبات، بيانات تسجيل الدخول، وبيانات فنية (عنوان IP، نوع المتصفح).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٣. استخدام البيانات</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              نستخدم بياناتك لتقديم الخدمات، معالجة الطلبات، إدارة الحساب، تحسين المنصة، والتواصل معك. لا نبيع بياناتك الشخصية لأطراف ثالثة.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٤. حماية البيانات</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              نطبق إجراءات أمنية مناسبة لحماية بياناتك. نقل البيانات يتم عبر قنوات مشفرة.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٥. الكوكيز</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              نستخدم ملفات تعريف الارتباط لتسهيل استخدام الموقع. يمكنك تعطيلها من إعدادات المتصفح.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٦. حقوقك</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              لديك الحق في الاطلاع، التصحيح، الحذف، أو طلب نقل بياناتك. للاستفسار: support@ribh.com
            </p>
          </section>
        </div>
        <div className="mt-8 text-center">
          <Link href="/" className="btn-primary inline-flex items-center">
            <ArrowLeft className="w-5 h-5 ml-2" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
