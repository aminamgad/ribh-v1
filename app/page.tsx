'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Shield, ArrowLeft, CheckCircle, DollarSign, Truck, Box, X, ArrowUp, Menu, Megaphone, Store, Users, Package, MapPin, UserPlus, ShoppingCart, TrendingUp, Shirt, Smartphone, Sparkles, Baby, Headphones, Monitor, Footprints, PawPrint } from 'lucide-react';

const TOPBAR_STORAGE_KEY = 'ribh-landing-topbar-dismissed';

const BACK_TO_TOP_THRESHOLD = 600;
const ANCHOR_NAV_THRESHOLD = 400;

// إحصائيات — value للعرض النصي، valueNum للعدّاد، suffix بعد الرقم (مثلاً +)
const LANDING_STATS = [
  { value: 'آلاف', label: 'مسوق وتاجر جملة', valueNum: 5000, suffix: '+' },
  { value: '٥٠٠٠+', label: 'منتج متاح', valueNum: 5000, suffix: '+' },
  { value: 'جميع', label: 'محافظات فلسطين', valueNum: 16, suffix: '' },
] as const;

// نصوص رئيسية — تجهيز A/B Testing L34 (سهل تغيير النص من مكان واحد)
const LANDING_COPY = {
  heroTitle: 'ابدأ تجارتك الإلكترونية من دون مخزون ولا رأس مال',
  heroSubline: 'ربح تربطك بتجار الجملة وتوفر المنتج، التخزين، الشحن والتحصيل — وأنت تركز على التسويق والربح.',
  ctaPrimary: 'ابدأ البيع مجاناً',
  ctaSecondary: 'تعرف على المزيد',
  ctaSectionTitle: 'ابدأ رحلتك مع ربح اليوم',
  ctaSectionSub: 'انضم إلى آلاف المسوقين وتجار الجملة الناجحين في فلسطين',
} as const;

// L33: تتبع نقرات CTA (يعمل مع gtag إن وُجد من الإعدادات)
function trackLandingCTA(action: string, label: string) {
  try {
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...a: unknown[]) => void }).gtag('event', action, { event_category: 'landing_cta', event_label: label });
    }
  } catch (_) {}
}

// عدّاد للإحصائيات — يحترم prefers-reduced-motion
function useCountUp(end: number, durationMs: number, run: boolean, reduceMotion: boolean): number {
  const [n, setN] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (!run) return;
    if (reduceMotion) {
      setN(end);
      return;
    }
    startRef.current = null;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const easeOut = 1 - (1 - progress) ** 2;
      setN(Math.round(easeOut * end));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, durationMs, run, reduceMotion]);
  return n;
}

export default function HomePage() {
  const [topBarHidden, setTopBarHidden] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showAnchorNav, setShowAnchorNav] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const statsRef = useRef<HTMLElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    try {
      setTopBarHidden(sessionStorage.getItem(TOPBAR_STORAGE_KEY) === '1');
    } catch (_) {}
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setHeaderScrolled(window.scrollY > 24);
      setShowBackToTop(window.scrollY > BACK_TO_TOP_THRESHOLD);
      setShowAnchorNav(window.scrollY > ANCHOR_NAV_THRESHOLD);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  // مراقبة ظهور قسم الإحصائيات للعدّاد
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setStatsInView(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // G12: ظهور الأقسام عند التمرير (مع احترام prefers-reduced-motion)
  useEffect(() => {
    if (reduceMotion) {
      document.querySelectorAll('[data-landing-reveal]').forEach((el) => el.classList.add('landing-reveal-visible'));
      return;
    }
    const els = document.querySelectorAll('[data-landing-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('landing-reveal-visible');
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => els.forEach((el) => observer.unobserve(el));
  }, [reduceMotion]);

  const stat1 = useCountUp(LANDING_STATS[0].valueNum, 1400, statsInView, reduceMotion);
  const stat2 = useCountUp(LANDING_STATS[1].valueNum, 1400, statsInView, reduceMotion);
  const stat3 = useCountUp(LANDING_STATS[2].valueNum, 1000, statsInView, reduceMotion);

  const dismissTopBar = () => {
    try {
      sessionStorage.setItem(TOPBAR_STORAGE_KEY, '1');
      setTopBarHidden(true);
    } catch (_) {}
  };

  const anchorLinks = [
    { href: '#features', label: 'المميزات' },
    { href: '#how-it-works', label: 'كيف يعمل' },
    { href: '#categories', label: 'التصنيفات' },
    { href: '#cta', label: 'ابدأ الآن' },
  ] as const;

  return (
    <div className="landing-page min-h-screen bg-white dark:bg-gray-900" dir="rtl">
      {/* Skip to content - إمكانية الوصول G5 */}
      <a
        href="#main"
        className="skip-to-content"
      >
        تخطي للمحتوى
      </a>

      {/* Top Bar - الوضع الفاتح: خلفية كريمية، الوضع المظلم: داكن */}
      {!topBarHidden && (
        <div className="bg-amber-50 dark:bg-[#1A1A1A] text-stone-800 dark:text-white py-3 sm:py-4 border-b border-amber-200/60 dark:border-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 space-x-reverse">
                <span className="text-sm font-medium">منصة متكاملة لتقديم حلول التجارة الإلكترونية في فلسطين</span>
                <div className="bg-[#FF9800] text-white px-2 py-1 rounded text-xs font-semibold shadow-sm">
                  جديد
                </div>
              </div>
              <button
                type="button"
                onClick={dismissTopBar}
                className="p-2 rounded text-stone-600 dark:text-white hover:bg-amber-200/50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-[#1A1A1A] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - شفاف فوق الهيرو، صلبة بعد التمرير */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          headerScrolled
            ? 'bg-white/95 dark:bg-gray-800/95 shadow-md border-b border-amber-200/60 dark:border-gray-700 backdrop-blur-md'
            : 'bg-transparent dark:bg-transparent shadow-none border-b border-transparent dark:border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Image src="/logo.png" alt="شعار منصة ربح للتجارة الإلكترونية" width={48} height={48} sizes="40px" className="w-10 h-10 sm:w-12 sm:h-12 mr-3" priority />
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${headerScrolled ? 'text-[#FF9800] dark:text-[#FF9800]' : 'text-white dark:text-white'}`}>
                    ربح
                  </h1>
                  <p className={`text-xs sm:text-sm transition-colors duration-300 ${headerScrolled ? 'text-stone-600 dark:text-gray-300' : 'text-white/90 dark:text-gray-200'}`}>
                    منصة التجارة الإلكترونية الفلسطينية
                  </p>
                </div>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8 space-x-reverse">
              <Link href="/auth/login" onClick={() => trackLandingCTA('click', 'header_login')} className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 rounded px-1 py-0.5 ${headerScrolled ? 'text-gray-700 dark:text-gray-300 hover:text-[#FF9800]' : 'text-white/95 hover:text-white'}`}>
                تسجيل الدخول
              </Link>
              <Link href="/auth/register" onClick={() => trackLandingCTA('click', 'header_register')} className="bg-[#FF9800] dark:bg-[#FF9800] text-white px-6 py-2 rounded-lg hover:bg-[#F57C00] dark:hover:bg-[#F57C00] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-white">
                إنشاء حساب
              </Link>
            </nav>
            {/* Mobile - قائمة هامبرغر L27 */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className={`p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] min-h-[44px] min-w-[44px] flex items-center justify-center ${headerScrolled ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-white/95 hover:bg-white/10'}`}
                aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="w-6 h-6" />
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 bg-black/40 z-40 top-0 left-0 right-0 bottom-0" aria-hidden onClick={() => setMobileMenuOpen(false)} />
                  <div className="fixed top-0 inset-inline-end-0 w-72 max-w-[85vw] h-full bg-white dark:bg-gray-800 shadow-xl z-50 p-6 flex flex-col gap-4">
                    <button type="button" onClick={() => setMobileMenuOpen(false)} className="self-start p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="إغلاق">
                      <X className="w-5 h-5" />
                    </button>
                    <Link href="/auth/login" className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-[#FF9800]/10 text-gray-800 dark:text-gray-100 font-medium min-h-[44px]" onClick={() => setMobileMenuOpen(false)}>
                      تسجيل الدخول
                    </Link>
                    <Link href="/auth/register" className="flex items-center gap-3 py-3 px-4 rounded-lg bg-[#FF9800] text-white font-medium min-h-[44px] justify-center" onClick={() => setMobileMenuOpen(false)}>
                      إنشاء حساب
                    </Link>
                    <Link href="#features" className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 min-h-[44px]" onClick={() => setMobileMenuOpen(false)}>
                      تعرف على المزيد
                    </Link>
                    <Link href="#how-it-works" className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 min-h-[44px]" onClick={() => setMobileMenuOpen(false)}>
                      كيف يعمل
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero - تدرج هوية ربح: برتقالي/سلايت/كريمي */}
      <section id="main" className="relative py-12 sm:py-16 lg:py-20 overflow-hidden bg-[linear-gradient(135deg,_#1e293b_0%,_#334155_30%,_#c2410c_70%,_#ea580c_85%,_#fef3c7_100%)] dark:bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_40%,_#c2410c_75%,_#ea580c_90%,_#1e293b_100%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* جانب المحتوى - خلفية داكنة */}
            <div className="text-right text-white order-2 lg:order-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                {LANDING_COPY.heroTitle}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-100 dark:text-gray-200 mb-4 leading-relaxed">
                {LANDING_COPY.heroSubline}
              </p>
              <p className="text-sm sm:text-base text-gray-200 dark:text-gray-300 mb-6 sm:mb-8 hidden sm:block">
                متاح في جميع محافظات فلسطين. سجّل واختر من آلاف المنتجات وابدأ البيع خلال دقائق.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register" onClick={() => trackLandingCTA('click', 'hero_register')} className="bg-[#FF9800] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-[#F57C00] dark:hover:bg-[#E65100] active:scale-[0.98] transition-all duration-200 text-base sm:text-lg font-semibold text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] dark:focus-visible:ring-offset-slate-900 min-h-[44px] sm:min-h-0 flex items-center justify-center shadow-lg shadow-[#FF9800]/20">
                  {LANDING_COPY.ctaPrimary}
                </Link>
                <Link href="#features" onClick={() => trackLandingCTA('click', 'hero_learn_more')} className="border-2 border-[#FF9800] text-[#FF9800] dark:text-[#FFB74D] px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 transition-colors text-base sm:text-lg font-semibold text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 min-h-[44px] sm:min-h-0 flex items-center justify-center">
                  {LANDING_COPY.ctaSecondary}
                </Link>
              </div>
              <p className="mt-4 text-sm text-amber-100/90 dark:text-gray-400 leading-relaxed">
                <Link href="#how-it-works" onClick={() => trackLandingCTA('click', 'hero_how_it_works')} className="underline hover:text-amber-50 transition-colors">شاهد كيف تعمل المنصة</Link>
              </p>
              {/* Palestine Focus - مؤشرات مرئية في الوضعين */}
              <div className="mt-6 sm:mt-8">
                <p className="text-gray-100 dark:text-gray-300 mb-3 text-sm sm:text-base">متاح في جميع محافظات فلسطين:</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-4 h-3 sm:w-6 sm:h-4 bg-[#FF9800] rounded shadow-sm" aria-hidden></div>
                    <span className="text-xs sm:text-sm text-white dark:text-gray-200">القدس</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-4 h-3 sm:w-6 sm:h-4 bg-[#4CAF50] rounded shadow-sm" aria-hidden></div>
                    <span className="text-xs sm:text-sm text-white dark:text-gray-200">رام الله</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="w-4 h-3 sm:w-6 sm:h-4 bg-amber-400/90 dark:bg-amber-400 rounded shadow-sm" aria-hidden></div>
                    <span className="text-xs sm:text-sm text-white dark:text-gray-200">غزة</span>
                  </div>
                </div>
              </div>
            </div>

            {/* جانب البطاقة - عمق وظل احترافي */}
            <div className="relative order-1 lg:order-2 landing-hero-card-wrapper">
              <div className="relative z-10">
                <div className="w-64 h-80 sm:w-80 sm:h-96 bg-gradient-to-br from-amber-400 to-[#F57C00] rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/20 dark:from-[#FF9800] dark:to-[#EA580C] dark:shadow-[#FF9800]/25 transform rotate-3 transition-transform duration-500 hover:rotate-6" aria-hidden></div>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-[#F57C00] rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/15 dark:from-[#FF9800] dark:to-[#EA580C] transform -rotate-3 transition-transform duration-500 hover:-rotate-6" aria-hidden></div>
                <div className="absolute inset-0 bg-white/98 dark:bg-slate-800/98 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/10 dark:shadow-xl border border-amber-200/60 dark:border-[#FF9800]/40 flex items-center justify-center backdrop-blur-sm ring-1 ring-white/50 dark:ring-white/10 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  <div className="text-center px-4">
                    <Image
                      src="/logo.png"
                      alt="شعار منصة ربح للتجارة الإلكترونية"
                      width={96}
                      height={96}
                      sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 96px"
                      className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 drop-shadow-sm"
                      priority
                    />
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white">منصة ربح</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">التجارة الإلكترونية الفلسطينية</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 -inset-inline-end-8 sm:-bottom-10 sm:-inset-inline-end-10 w-24 h-24 sm:w-32 sm:h-32 border-inline-start-4 border-b-4 border-amber-400 dark:border-[#FFB74D] rounded-bl-full rounded-s-none transform rotate-45 opacity-90 [direction:ltr]" aria-hidden></div>
            </div>
          </div>
        </div>
      </section>

      {/* إحصائيات - عدّاد + أيقونات */}
      <section ref={statsRef} className="py-8 sm:py-12 bg-amber-50/80 dark:bg-gray-900 border-b border-amber-200/50 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-6 sm:gap-10 text-center">
            {[Users, Package, MapPin].map((Icon, i) => {
              const stat = LANDING_STATS[i];
              const num = [stat1, stat2, stat3][i];
              const display = stat.suffix ? `${num.toLocaleString('en-US')}${stat.suffix}` : num.toString();
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FF9800]/15 dark:bg-[#FF9800]/25 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF9800] dark:text-[#FF9800]" aria-hidden />
                  </div>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#FF9800] dark:text-[#FF9800] tabular-nums" aria-live="polite">
                    {display}
                  </p>
                  <p className="text-sm sm:text-base text-stone-600 dark:text-gray-400 mt-1">{stat.label}</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-stone-500 dark:text-gray-400 mt-6">
            انضم هذا الأسبوع العشرات من المسوقين وتجار الجملة — سجّل الآن.
          </p>
        </div>
      </section>

      {/* Value Proposition - تدرج دافئ متناسق */}
      <section id="features" data-landing-reveal className="landing-reveal py-12 sm:py-16 lg:py-20 bg-orange-50/40 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
              نوفر لك المنتج، التخزين، الشحن والتحصيل — وعليك فقط التسويق والربح
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#FF9800] dark:text-[#FF9800] leading-relaxed">
              لا مخزون، لا رأس مال — ربح يحلّها لك
            </p>
            {/* لماذا ربح؟ L18 */}
            <div className="flex flex-wrap justify-center gap-8 mt-8 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#4CAF50]" /> لا مخزون</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#4CAF50]" /> لا رأس مال</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#4CAF50]" /> توصيل لجميع المحافظات</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#4CAF50]" /> تحصيل أرباح سريع</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Exclusive Products */}
            <div className="landing-reveal-stagger landing-reveal-stagger-0 bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg border border-amber-200/60 dark:border-gray-600 relative transition-shadow duration-300 hover:shadow-xl hover:border-[#FF9800]/30 dark:hover:border-[#FF9800]/40">
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
            <div className="landing-reveal-stagger landing-reveal-stagger-1 bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg border border-amber-200/60 dark:border-gray-600 transition-shadow duration-300 hover:shadow-xl hover:border-[#FF9800]/30 dark:hover:border-[#FF9800]/40">
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
            <div className="landing-reveal-stagger landing-reveal-stagger-2 bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg border border-amber-200/60 dark:border-gray-600 transition-shadow duration-300 hover:shadow-xl hover:border-[#FF9800]/30 dark:hover:border-[#FF9800]/40">
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
            <div className="landing-reveal-stagger landing-reveal-stagger-3 bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg border border-amber-200/60 dark:border-gray-600 transition-shadow duration-300 hover:shadow-xl hover:border-[#FF9800]/30 dark:hover:border-[#FF9800]/40">
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

      {/* كيف يعمل - خط زمني + أيقونات */}
      <section id="how-it-works" data-landing-reveal className="landing-reveal py-12 sm:py-16 lg:py-20 bg-amber-50/50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 text-center mb-16 leading-tight">
            كيف يعمل؟
          </h2>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {/* خط ربط على الديسكتوب */}
            <div className="hidden md:block absolute top-[28px] inset-inline-start-[20%] inset-inline-end-[20%] h-0.5 bg-gradient-to-l from-[#FF9800]/50 via-[#FF9800] to-[#FF9800]/50 dark:from-[#FF9800]/40 dark:via-[#FF9800] dark:to-[#FF9800]/40" aria-hidden />
            {[
              { step: '١', icon: UserPlus, title: 'سجّل مجاناً', desc: 'أنشئ حسابك واختر دورك: مسوق أو تاجر جملة.' },
              { step: '٢', icon: ShoppingCart, title: 'اختر المنتجات', desc: 'تصفّح آلاف المنتجات وأضف ما تريد للسلة.' },
              { step: '٣', icon: TrendingUp, title: 'سوّق واربح', desc: 'بع لعملائك ونحن نولّي الشحن والتحصيل.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#FF9800]/20 dark:bg-[#FF9800]/30 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-[#FF9800] border-2 border-[#FF9800]/40 dark:border-[#FF9800]/50 shadow-inner relative z-10">
                  <Icon className="w-7 h-7 text-[#FF9800] dark:text-[#FF9800]" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* مسوق؟ تاجر جملة؟ */}
      <section className="py-8 sm:py-12 bg-orange-50/30 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Link href="/auth/register?role=marketer" onClick={() => trackLandingCTA('click', 'card_marketer')} className="flex items-center gap-4 p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg hover:border-[#FF9800]/50 border border-transparent transition-all">
              <div className="w-12 h-12 rounded-full bg-[#FF9800]/20 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-6 h-6 text-[#FF9800]" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">مسوق؟</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">اربح من التسويق فقط — بدون مخزون ولا رأس مال.</p>
              </div>
            </Link>
            <Link href="/auth/register?role=wholesaler" onClick={() => trackLandingCTA('click', 'card_wholesaler')} className="flex items-center gap-4 p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg hover:border-[#4CAF50]/50 border border-transparent transition-all">
              <div className="w-12 h-12 rounded-full bg-[#4CAF50]/20 flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-[#4CAF50]" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">تاجر جملة؟</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">بع منتجاتك لآلاف المسوقين ووسّع مبيعاتك.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Product Categories Section - أيقونات Lucide + تلميح تمرير على الموبايل */}
      <section id="categories" data-landing-reveal className="landing-reveal py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6 leading-tight">
              اختار من بين أكثر من ٢٠ قسم و ٥٠٠٠ منتج مختلف
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
              أقسام ومنتجات متنوعة قطاعي وجملة تساعدك تتاجر في اللي تحبه
            </p>
            <p className="md:hidden text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-1">
              <span className="inline-block w-6 h-1 rounded-full bg-[#FF9800]/50" /> اسحب لرؤية المزيد
            </p>
          </div>

          <div className="flex md:grid md:grid-cols-4 lg:grid-cols-8 gap-6 sm:gap-8 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory md:overflow-visible scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 [scrollbar-width:thin]">
            {[
              { name: 'ملابس', icon: Shirt },
              { name: 'الكترونيات', icon: Smartphone },
              { name: 'الصحة والجمال', icon: Sparkles },
              { name: 'أطفال', icon: Baby },
              { name: 'اكسسوارات موبايل', icon: Headphones },
              { name: 'اكسسوارات كمبيوتر', icon: Monitor },
              { name: 'أحذية', icon: Footprints },
              { name: 'منتجات حيوانات أليفة', icon: PawPrint },
            ].map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="group text-center flex-shrink-0 w-[120px] sm:w-[140px] md:flex-shrink snap-center min-h-[100px] flex flex-col items-center justify-end md:min-h-0 cursor-default"
                >
                  <div className="bg-gray-100 dark:bg-gray-800/80 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 min-w-[56px] min-h-[56px] border border-gray-200/60 dark:border-gray-700/60 shadow-sm transition-all duration-300 group-hover:bg-[#FF9800]/15 dark:group-hover:bg-[#FF9800]/25 group-hover:border-[#FF9800]/40 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-[#FF9800]/10">
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600 dark:text-gray-300 group-hover:text-[#FF9800] dark:group-hover:text-[#FF9800] transition-colors duration-300" aria-hidden />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium group-hover:text-[#FF9800] dark:group-hover:text-[#FFB74D] transition-colors duration-300">
                    {category.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section data-landing-reveal className="landing-reveal py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Multi-Country Trading */}
            <div className="bg-white dark:bg-gray-700 rounded-xl p-8 shadow-md border border-gray-200 dark:border-gray-600">
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
            <div className="bg-white dark:bg-gray-700 rounded-xl p-8 shadow-md border border-gray-200 dark:border-gray-600">
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

          {/* Cart Preview - L25: توضيح تجربة الطلبات */}
          <div className="mt-8 bg-white dark:bg-gray-700 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-600 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-right">
              كيف تطلب على المنصة؟
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-right mb-4">
              بعد التسجيل أضف المنتجات إلى السلة وأرسل الطلب — نولّي التخزين والشحن والتحصيل.
            </p>
            <div className="text-center py-6">
              <ShoppingBag className="w-12 h-12 text-[#FF9800] dark:text-[#FF9800] mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">عربة واحدة لكل طلباتك — شحن لجميع محافظات فلسطين</p>
              <div className="flex items-center justify-center mt-3 space-x-2 space-x-reverse">
                <div className="w-4 h-3 bg-[#FF9800] rounded"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">فلسطين</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* شهادات - مع صورة رمزية (حرف أول) */}
      <section data-landing-reveal className="landing-reveal py-12 sm:py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-12 leading-tight">
            ماذا يقول من جربوا ربح؟
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: 'بدأت كمسوق وربح يوصّل للعميل ويحاسبني بسرعة. ما بحتاج مخزون.', role: 'مسوق، رام الله', initial: 'م', color: 'bg-[#FF9800]/20 text-[#FF9800]' },
              { quote: 'المنصة وفرتلي قناة توزيع جديدة. المسوقين بيسوّقوا وأنا بأركّز على الإنتاج.', role: 'تاجر جملة', initial: 'ت', color: 'bg-[#4CAF50]/20 text-[#4CAF50]' },
              { quote: 'التوصيل لجميع المحافظات والتحصيل من العميل — ربح بتدير كل شي.', role: 'مسوق، نابلس', initial: 'ن', color: 'bg-[#FF9800]/20 text-[#FF9800]' },
            ].map((t, i) => (
              <div key={i} className="bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg border border-gray-200/80 dark:border-gray-600 transition-shadow hover:shadow-xl">
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">&quot;{t.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${t.color}`} aria-hidden>{t.initial}</div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-[#FF9800] dark:bg-[#F57C00]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {LANDING_COPY.ctaSectionTitle}
          </h2>
          <p className="text-xl text-orange-100 dark:text-orange-200 mb-8">
            {LANDING_COPY.ctaSectionSub}
          </p>
          <Link href="/auth/register" onClick={() => trackLandingCTA('click', 'cta_section_register')} className="bg-white text-[#FF9800] dark:text-[#F57C00] hover:bg-gray-100 dark:hover:bg-gray-200 active:scale-[0.98] font-semibold py-4 px-10 rounded-xl transition-all duration-200 inline-flex items-center text-lg shadow-xl shadow-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#F57C00] min-h-[52px] items-center justify-center">
            {LANDING_COPY.ctaPrimary}
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Link>
          {/* شارات ثقة */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-10 text-white/95 text-sm">
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> دفع آمن</span>
            <span className="flex items-center gap-2"><Truck className="w-4 h-4" /> شحن لجميع المحافظات</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> دعم فني</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> بدون بطاقة ائتمان</span>
          </div>
        </div>
      </section>

      {/* CTA قبل الفوتر - L26 */}
      <section className="py-16 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            ما زلت تفكر؟ انضم الآن وابدأ خلال دقائق.
          </p>
          <Link href="/auth/register" onClick={() => trackLandingCTA('click', 'pre_footer_register')} className="inline-flex items-center gap-2 bg-[#FF9800] text-white px-6 py-3 rounded-lg hover:bg-[#F57C00] transition-colors font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2">
            ابدأ مجاناً
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer - G20 فوتر غني */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
            <div>
              <Link href="/" className="inline-block">
                <h3 className="text-2xl font-bold mb-4 text-[#FF9800]">ربح</h3>
              </Link>
              <p className="text-gray-300 text-sm leading-relaxed">
                منصة التجارة الإلكترونية الفلسطينية التي تربط المسوقين وتجار الجملة — بدون مخزون ولا رأس مال.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">الخدمات</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><Link href="/auth/register?role=marketer" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">تسويق المنتجات</Link></li>
                <li><Link href="/auth/register?role=wholesaler" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">بيع الجملة</Link></li>
                <li><Link href="/#features" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">إدارة التخزين</Link></li>
                <li><Link href="/#how-it-works" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">التوصيل والتحصيل</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">الدعم</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><Link href="/faq" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">الأسئلة الشائعة</Link></li>
                <li><Link href="/support" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">الدعم الفني</Link></li>
                <li><Link href="/privacy" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">سياسة الخصوصية</Link></li>
                <li><Link href="/terms" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">الشروط والأحكام</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">المميزات</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><Link href="/#how-it-works" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">كيف يعمل</Link></li>
                <li><Link href="/#categories" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">التصنيفات</Link></li>
                <li><Link href="/#cta" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded px-1">ابدأ الآن</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">تواصل معنا</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li><a href="mailto:support@ribh.com" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded">support@ribh.com</a></li>
                <li><a href="tel:+970123456789" className="hover:text-[#FF9800] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded">789 456 123 970+</a></li>
                <li>فلسطين</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} منصة ربح. جميع الحقوق محفوظة.</p>
            <div className="flex gap-6">
              <Link href="/" className="hover:text-[#FF9800] transition-colors">الرئيسية</Link>
              <Link href="/auth/login" onClick={() => trackLandingCTA('click', 'footer_login')} className="hover:text-[#FF9800] transition-colors">تسجيل الدخول</Link>
              <Link href="/auth/register" onClick={() => trackLandingCTA('click', 'footer_register')} className="hover:text-[#FF9800] transition-colors">إنشاء حساب</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* تنقل داخلي G3 - يظهر عند التمرير */}
      {showAnchorNav && (
        <nav className="fixed bottom-20 inset-inline-end-6 z-40 hidden sm:block" aria-label="تنقل داخل الصفحة">
          <div className="flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-2">
            {anchorLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#FF9800] hover:bg-[#FF9800]/5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* زر العودة للأعلى - G4 */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className={`fixed inset-inline-end-6 z-40 p-3 rounded-full bg-[#FF9800] text-white shadow-lg hover:bg-[#F57C00] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9800] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 bottom-6 ${showAnchorNav ? 'sm:bottom-48' : ''}`}
          aria-label="العودة للأعلى"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
} 