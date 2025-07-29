'use client';

import Link from 'next/link';
import { ShoppingBag, Users, TrendingUp, Shield, Star, ArrowLeft } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export default function HomePage() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-soft dark:shadow-soft-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {settings?.platformName || 'ربح'}
                </h1>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {settings?.platformDescription || 'منصة التجارة الإلكترونية الذكية'}
                </p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8 space-x-reverse">
              <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                تسجيل الدخول
              </Link>
              <Link href="/auth/register" className="btn-primary">
                إنشاء حساب
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              منصة <span className="text-primary-600 dark:text-primary-400">
                {settings?.platformName || 'ربح'}
              </span> الذكية
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {settings?.platformDescription || 'منصة تجارة إلكترونية متعددة الأدوار تربط الموردين والمسوقين وتجار الجملة في نظام واحد متكامل لتحقيق الأرباح للجميع'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
                ابدأ الآن
              </Link>
              <Link href="#features" className="btn-secondary text-lg px-8 py-3">
                تعرف على المزيد
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-100 mb-4">
              لماذا تختار منصة {settings?.platformName || 'ربح'}؟
            </h2>
            <p className="text-xl text-slate-300">
              نظام متكامل مصمم خصيصاً لاحتياجات السوق المصري
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 dark:bg-primary-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">أدوار متعددة</h3>
              <p className="text-slate-300">
                موردين، مسوقين، تجار جملة، وإدارة مركزية
              </p>
            </div>

            <div className="text-center">
              <div className="bg-success-100 dark:bg-success-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">عمولات ذكية</h3>
              <p className="text-slate-300">
                نظام عمولات ديناميكي حسب نطاق الأسعار
              </p>
            </div>

            <div className="text-center">
              <div className="bg-warning-100 dark:bg-warning-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">حماية متكاملة</h3>
              <p className="text-slate-300">
                محفظة إلكترونية آمنة ومراقبة إدارية شاملة
              </p>
            </div>

            <div className="text-center">
              <div className="bg-secondary-100 dark:bg-secondary-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">توصيل موثوق</h3>
              <p className="text-slate-300">
                نظام توصيل متكامل مع دفع عند الاستلام
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-100 mb-4">
              أدوار المنصة
            </h2>
            <p className="text-xl text-slate-300">
              كل دور له مميزاته ومسؤولياته الخاصة
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Supplier */}
            <div className="card">
              <div className="text-center mb-6">
                <div className="bg-primary-100 dark:bg-primary-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">المورد</h3>
                <p className="text-slate-300">رفع المنتجات وإدارة المخزون</p>
              </div>
              <ul className="space-y-3 text-right">
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-primary-500 dark:text-primary-400 ml-2" />
                  <span className="text-slate-200">رفع المنتجات للمنصة</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-primary-500 dark:text-primary-400 ml-2" />
                  <span className="text-slate-200">إدارة المخزون والأسعار</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-primary-500 dark:text-primary-400 ml-2" />
                  <span className="text-slate-200">متابعة الطلبات والتوصيل</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-primary-500 dark:text-primary-400 ml-2" />
                  <span className="text-slate-200">ربح من المبيعات</span>
                </li>
              </ul>
            </div>

            {/* Marketer */}
            <div className="card">
              <div className="text-center mb-6">
                <div className="bg-success-100 dark:bg-success-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-10 h-10 text-success-600 dark:text-success-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">المسوق</h3>
                <p className="text-slate-300">تسويق المنتجات للعملاء</p>
              </div>
              <ul className="space-y-3 text-right">
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-success-500 dark:text-success-400 ml-2" />
                  <span className="text-slate-200">تصفح المنتجات المعتمدة</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-success-500 dark:text-success-400 ml-2" />
                  <span className="text-slate-200">طلب المنتجات للعملاء</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-success-500 dark:text-success-400 ml-2" />
                  <span className="text-slate-200">متابعة الطلبات والتوصيل</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-success-500 dark:text-success-400 ml-2" />
                  <span className="text-slate-200">ربح من العمولات</span>
                </li>
              </ul>
            </div>

            {/* Wholesaler */}
            <div className="card">
              <div className="text-center mb-6">
                <div className="bg-warning-100 dark:bg-warning-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-warning-600 dark:text-warning-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">تاجر الجملة</h3>
                <p className="text-slate-300">شراء بأسعار الجملة وإعادة البيع</p>
              </div>
              <ul className="space-y-3 text-right">
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-warning-500 dark:text-warning-400 ml-2" />
                  <span className="text-slate-200">أسعار جملة خاصة</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-warning-500 dark:text-warning-400 ml-2" />
                  <span className="text-slate-200">شراء كميات كبيرة</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-warning-500 dark:text-warning-400 ml-2" />
                  <span className="text-slate-200">إعادة البيع مباشرة</span>
                </li>
                <li className="flex items-center">
                  <Star className="w-5 h-5 text-warning-500 dark:text-warning-400 ml-2" />
                  <span className="text-slate-200">أرباح أعلى من المسوقين</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 dark:bg-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            ابدأ رحلتك مع {settings?.platformName || 'ربح'} اليوم
          </h2>
          <p className="text-xl text-primary-100 dark:text-primary-200 mb-8">
            انضم إلى آلاف الموردين والمسوقين وتجار الجملة الناجحين
          </p>
          <Link href="/auth/register" className="bg-white text-primary-600 dark:text-primary-700 hover:bg-gray-100 dark:hover:bg-gray-200 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center">
            إنشاء حساب جديد
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">{settings?.platformName || 'ربح'}</h3>
              <p className="text-gray-300 dark:text-gray-400">
                {settings?.platformDescription || 'منصة التجارة الإلكترونية الذكية التي تربط الموردين والمسوقين وتجار الجملة'}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">الخدمات</h4>
              <ul className="space-y-2 text-gray-300 dark:text-gray-400">
                <li>تسويق المنتجات</li>
                <li>بيع الجملة</li>
                <li>إدارة المخزون</li>
                <li>التوصيل</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">الدعم</h4>
              <ul className="space-y-2 text-gray-300 dark:text-gray-400">
                <li>الأسئلة الشائعة</li>
                <li>الدعم الفني</li>
                <li>سياسة الخصوصية</li>
                <li>الشروط والأحكام</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-gray-300 dark:text-gray-400">
                <li>البريد الإلكتروني: {settings?.contactEmail || 'info@ribh.com'}</li>
                <li>الهاتف: {settings?.contactPhone || '+20 123 456 789'}</li>
                <li>العنوان: القاهرة، مصر</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 dark:border-gray-700 mt-8 pt-8 text-center text-gray-300 dark:text-gray-400">
            <p>&copy; 2024 منصة {settings?.platformName || 'ربح'}. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 