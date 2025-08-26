'use client';

import Link from 'next/link';
import { ShoppingBag, Users, TrendingUp, Shield, Star, ArrowLeft, CheckCircle, Globe, Package, DollarSign, Truck, Box } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-[#282828] dark:bg-[#1A1A1A] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-sm">منصة متكاملة لتقديم حلول التجارة الإلكترونية في فلسطين</span>
              <div className="bg-[#FF9800] text-white px-2 py-1 rounded text-xs font-medium">
                جديد
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src="/logo.png" 
                  alt="ربح" 
                  className="w-10 h-10 sm:w-12 sm:h-12 mr-3"
                />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#FF9800] dark:text-[#FF9800]">
                    ربح
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    منصة التجارة الإلكترونية الفلسطينية
                  </p>
                </div>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8 space-x-reverse">
              <Link href="/auth/login" className="text-gray-700 dark:text-gray-300 hover:text-[#FF9800] dark:hover:text-[#FF9800] transition-colors">
                تسجيل الدخول
              </Link>
              <Link href="/auth/register" className="bg-[#FF9800] dark:bg-[#FF9800] text-white px-6 py-2 rounded-lg hover:bg-[#F57C00] dark:hover:bg-[#F57C00] transition-colors">
                إنشاء حساب
              </Link>
            </nav>
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Link href="/auth/login" className="bg-[#FF9800] dark:bg-[#FF9800] text-white px-4 py-2 rounded-lg hover:bg-[#F57C00] dark:hover:bg-[#F57C00] transition-colors text-sm">
                دخول
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Split Design */}
      <section className="relative py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-[#282828] via-[#1A1A1A] to-gray-100 dark:from-[#282828] dark:via-[#1A1A1A] dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Dark Background with Content */}
            <div className="text-right text-white order-2 lg:order-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                فرصتك لبداية مشروعك في التجارة الإلكترونية من أي مكان في فلسطين
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-6 sm:mb-8 leading-relaxed">
                ربح أسهل طريقة لبدء تجارتك الإلكترونية لأننا نقوم بالربط بين المسوقين وتجار الجملة في السوق الفلسطيني لتوفير عدد كبير ومتنوع من المنتجات المناسبة التي تستطيع تحقيق الأرباح عند تسويقها. نتولي إدارة التخزين والتوصيل وتحصيل أرباح طلباتك، وكل ما عليك هو التسويق للمنتج.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/auth/register" className="bg-[#FF9800] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-[#F57C00] transition-colors text-base sm:text-lg font-semibold text-center">
                  تاجر معنا الآن
                </Link>
                <Link href="#features" className="border-2 border-[#4CAF50] text-[#4CAF50] px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-[#4CAF50]/10 transition-colors text-base sm:text-lg font-semibold text-center">
                  تعرف على المزيد
                </Link>
              </div>
              
              {/* Palestine Focus */}
              <div className="mt-6 sm:mt-8">
                <p className="text-gray-200 mb-3 text-sm sm:text-base">متاح في جميع محافظات فلسطين:</p>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-4 h-3 sm:w-6 sm:h-4 bg-[#FF9800] rounded"></div>
                    <span className="text-xs sm:text-sm text-white">القدس</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-4 h-3 sm:w-6 sm:h-4 bg-[#4CAF50] rounded"></div>
                    <span className="text-xs sm:text-sm text-white">رام الله</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-4 h-3 sm:w-6 sm:h-4 bg-[#282828] rounded"></div>
                    <span className="text-xs sm:text-sm text-white">غزة</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Light Background with Card */}
            <div className="relative order-1 lg:order-2">
              <div className="relative z-10">
                <div className="w-64 h-80 sm:w-80 sm:h-96 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-xl sm:rounded-2xl shadow-2xl transform rotate-3"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-xl sm:rounded-2xl shadow-2xl transform -rotate-3"></div>
                <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl flex items-center justify-center">
                  <div className="text-center">
                    <img 
                      src="/logo.png" 
                      alt="ربح" 
                      className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-3 sm:mb-4"
                    />
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">منصة ربح</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">التجارة الإلكترونية الفلسطينية</p>
                  </div>
                </div>
              </div>
              {/* Curved Arrow */}
                             <div className="absolute -bottom-8 -left-8 sm:-bottom-10 sm:-left-10 w-24 h-24 sm:w-32 sm:h-32 border-l-4 border-b-4 border-[#FF9800] rounded-bl-full transform rotate-45"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
              ربح أسهل طريقة لبدء تجارتك الإلكترونية لأننا نوفر لك المنتج المناسب، التخزين، الشحن والتحصيل من العميل وكل اللي عليك هو التسويق للمنتجات
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#FF9800] dark:text-[#FF9800]">
              مش هنخليك تشيل الهم ربح هتحلها
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Exclusive Products */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg relative">
              <div className="absolute top-4 right-4 bg-[#4CAF50]/20 dark:bg-[#4CAF50]/30 text-[#4CAF50] dark:text-[#4CAF50] text-xs px-2 py-1 rounded">
                جديد ربح
              </div>
              <div className="text-center mb-4">
                <div className="bg-[#4CAF50]/20 dark:bg-[#4CAF50]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-[#4CAF50] dark:text-[#4CAF50]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  منتجات فلسطينية حصرية
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm text-right">
                منتجات محلية عالية الجودة من أفضل المصانع الفلسطينية، متوفرة حصرياً على منصة ربح.
              </p>
            </div>

            {/* Profit Collection */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-[#FF9800]/20 dark:bg-[#FF9800]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-[#FF9800] dark:text-[#FF9800]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  تحصيل أرباحك وتحويلها
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm text-right">
                أرباحك متوصلك من غير تأخير ولا مشاكل تحصيل المال
              </p>
            </div>

            {/* Shipping */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-[#4CAF50]/20 dark:bg-[#4CAF50]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-[#4CAF50] dark:text-[#4CAF50]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  الشحن والتوصيل
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm text-right">
                شحن المنتجات لعملائك في جميع محافظات فلسطين بأسعار منافسة
              </p>
            </div>

            {/* Diverse Products */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-[#FF9800]/20 dark:bg-[#FF9800]/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Box className="w-8 h-8 text-[#FF9800] dark:text-[#FF9800]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  منتجات متنوعة وكسبانة
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm text-right">
                ربح بتوفرلك تشكيلة واسعة من المنتجات من غير ما تشيل هم التخزين ولا رأسي المال
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              اختار من بين أكثر من ٢٠ قسم و ٥٠٠٠ منتج مختلف
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300">
              أقسام و منتجات متنوعة قطاعي وجملة تساعدك تتاجر في اللي تحبه
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
            {[
              { name: 'ملابس', icon: '👕' },
              { name: 'الكترونيات', icon: '📱' },
              { name: 'الصحة والجمال', icon: '💄' },
              { name: 'أطفال', icon: '👶' },
              { name: 'اكسسوارات موبايل', icon: '📱' },
              { name: 'اكسسوارات كمبيوتر', icon: '🖱️' },
              { name: 'أحذية', icon: '👟' },
              { name: 'منتجات حيوانات أليفة', icon: '🐾' },
            ].map((category, index) => (
              <div key={index} className="text-center">
                <div className="bg-[#FF9800]/10 dark:bg-[#FF9800]/20 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-3 text-2xl hover:bg-[#FF9800]/20 dark:hover:bg-[#FF9800]/30 transition-colors">
                  {category.icon}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{category.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Multi-Country Trading */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-right">
                ربح في جميع محافظات فلسطين
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <CheckCircle className="w-6 h-6 text-[#4CAF50] dark:text-[#4CAF50]" />
                  <span className="text-gray-700 dark:text-gray-300">توصيل سريع لجميع المحافظات</span>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <CheckCircle className="w-6 h-6 text-[#4CAF50] dark:text-[#4CAF50]" />
                  <span className="text-gray-700 dark:text-gray-300">سحب أرباحك من أي مكان في فلسطين</span>
                </div>
              </div>
            </div>

            {/* Flexible Pricing */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-right">
                بيع بالسعر اللي تحبه
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <CheckCircle className="w-6 h-6 text-[#FF9800] dark:text-[#FF9800]" />
                  <span className="text-gray-700 dark:text-gray-300">إمكانية اختيار وتعديل سعر البيع</span>
                </div>
                <div className="flex items-center space-x-3 space-x-reverse">
                  <CheckCircle className="w-6 h-6 text-[#FF9800] dark:text-[#FF9800]" />
                  <span className="text-gray-700 dark:text-gray-300">ارسال الطلب</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Preview */}
          <div className="mt-8 bg-white dark:bg-gray-700 rounded-lg p-6 shadow-lg max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-right">
              العربة (الفارغة)
            </h3>
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-[#FF9800] dark:text-[#FF9800] mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">لا يوجد منتجات في العربة العامة بعد</p>
              <div className="flex items-center justify-center mt-4 space-x-2 space-x-reverse">
                <div className="w-4 h-3 bg-[#FF9800] rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">فلسطين</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#FF9800] dark:bg-[#F57C00]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            ابدأ رحلتك مع ربح اليوم
          </h2>
          <p className="text-xl text-orange-100 dark:text-orange-200 mb-8">
            انضم إلى آلاف المسوقين وتجار الجملة الناجحين في فلسطين
          </p>
          <Link href="/auth/register" className="bg-white text-[#FF9800] dark:text-[#F57C00] hover:bg-gray-100 dark:hover:bg-gray-200 font-semibold py-4 px-8 rounded-lg transition-colors inline-flex items-center text-lg">
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
              <h3 className="text-2xl font-bold mb-4 text-[#FF9800]">ربح</h3>
              <p className="text-gray-300">
                منصة التجارة الإلكترونية الفلسطينية التي تربط المسوقين وتجار الجملة
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">الخدمات</h4>
              <ul className="space-y-2 text-gray-300">
                <li>تسويق المنتجات</li>
                <li>بيع الجملة</li>
                <li>إدارة التخزين</li>
                <li>التوصيل والتحصيل</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">الدعم</h4>
              <ul className="space-y-2 text-gray-300">
                <li>الأسئلة الشائعة</li>
                <li>الدعم الفني</li>
                <li>سياسة الخصوصية</li>
                <li>الشروط والأحكام</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-gray-300">
                <li>البريد الإلكتروني: support@ribh.com</li>
                <li>الهاتف: +970 123 456 789</li>
                <li>العنوان: فلسطين</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 منصة ربح. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 