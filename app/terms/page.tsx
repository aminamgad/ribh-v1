'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-[#FF9800] hover:text-[#F57C00] mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
          العودة للرئيسية
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF9800]/20 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#FF9800]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">الشروط والأحكام</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">١. قبول الشروط</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              باستخدام منصة ربح، فإنك توافق على الالتزام بهذه الشروط والأحكام. إن عدم الموافقة يمنعك من استخدام الخدمات.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٢. وصف الخدمة</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              ربح منصة تجارة إلكترونية تربط المسوقين بتجار الجملة. توفر المنصة إدارة المنتجات، الطلبات، الشحن، التحصيل، ومسارات الربح. نحن نعمل كوسيط ولا نضمن نتائج مبيعات محددة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٣. التسجيل والحساب</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              يجب عليك تقديم معلومات صحيحة ودقيقة عند التسجيل. أنت مسؤول عن حفظ سرية كلمة المرور ومنع الوصول غير المصرح به لحسابك. يجب إبلاغنا فوراً بأي استخدام غير مأذون.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٤. المسوقون</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              المسوق يلتزم ببيع المنتجات المعتمدة فقط، واحترام الحد الأدنى لأسعار البيع عند تطبيقه. المسوق مسؤول عن دقة الطلبات وعناوين التوصيل. يتم تسوية الأرباح وفق سياسة المنصة وأوقات السحب المعتمدة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٥. تجار الجملة</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              تاجر الجملة يلتزم بتقديم منتجات أصلية وجودة مطابقة للوصف. يتحمل مسؤولية توفر المخزون ودقة المعلومات. يجب تنفيذ الطلبات ضمن الأوقات المتفق عليها.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٦. المحظورات</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-2">يمنع عليك:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 text-sm space-y-1 mr-4">
              <li>استخدام المنصة لأغراض غير قانونية أو مخالفة للأخلاق</li>
              <li>تقديم معلومات أو منتجات مزيفة أو مضللة</li>
              <li>التلاعب بالأسعار أو بالطلبات بشكل احتيالي</li>
              <li>محاولة اختراق المنصة أو إعاقة عملها</li>
              <li>انتهاك حقوق الملكية الفكرية للآخرين</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٧. المسؤولية والضمان</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              المنصة تقدم الخدمة "كما هي". لا نضمن عدم انقطاع الخدمة أو خلوها من الأخطاء. مسؤوليتنا محدودة وفق القوانين المعمول بها. في النزاعات بين المستخدمين، نسعى للتوسط دون التزام بالحل النهائي.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٨. الإنهاء</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              نحتفظ بحق تعليق أو إنهاء حساب أي مستخدم يخالف هذه الشروط. يمكنك إغلاق حسابك في أي وقت عبر الإعدادات. الطلبات والتسويات الجارية تُكمل وفق السياسات المعتمدة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">٩. التعديلات</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              قد نعدّل هذه الشروط. سيتم إبلاغك بالتغييرات الجوهرية عبر المنصة أو البريد. استمرارك في الاستخدام بعد التعديل يعني موافقتك على الشروط الجديدة.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">١٠. التواصل</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              للاستفسار عن الشروط: support@ribh.com | فلسطين
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
