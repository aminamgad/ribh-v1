'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'ما هي منصة ربح؟',
    a: 'ربح منصة تجارة إلكترونية فلسطينية تربط المسوقين بتجار الجملة. توفر المنتجات، التخزين، الشحن والتحصيل — والمسوق يركز على التسويق والربح بدون مخزون ولا رأس مال.',
  },
  {
    q: 'كيف أبدأ كمسوق؟',
    a: 'سجّل مجاناً واختر دور "مسوق"، ثم تصفّح المنتجات وأضفها للسلة، حدد سعر البيع بعملائك، وأرسل الطلب. ربح تتولى الشحن للعميل والتحصيل منك.',
  },
  {
    q: 'كيف أبدأ كتاجر جملة؟',
    a: 'سجّل كتاجر جملة، أضف منتجاتك بأسعار الجملة، وبعد اعتمادها من الإدارة سيتمكن المسوقون من عرضها وبيعها لعملائهم.',
  },
  {
    q: 'هل أحتاج مخزون أو رأس مال للبدء؟',
    a: 'لا. المسوق يبيع بدون مخزون — الطلب يُنفّذ من مخزون تاجر الجملة. التاجر يضيف منتجاته ويتعامل مع الطلبات عبر المنصة.',
  },
  {
    q: 'ما هي المناطق التي يغطيها الشحن؟',
    a: 'الشحن متاح لجميع محافظات فلسطين. يمكن اختيار المحافظة والمنطقة عند إنشاء الطلب، وتُحسب تكلفة الشحن تلقائياً.',
  },
  {
    q: 'كيف أستلم أرباحي؟',
    a: 'بعد توصيل الطلب للعميل، يتم تحصيل المبلغ وتسوية أرباحك. يمكنك طلب السحب عبر لوحة التحكم إلى حسابك البنكي أو المحفظة حسب الإعدادات.',
  },
  {
    q: 'هل يوجد حد أدنى للطلب؟',
    a: 'نعم، يتم تحديد الحد الأدنى والأقصى للطلب في إعدادات المنصة. يمكنك الاطلاع عليها من لوحة التحكم.',
  },
  {
    q: 'كيف أتواصل مع الدعم الفني؟',
    a: 'يمكنك التواصل عبر البريد الإلكتروني support@ribh.com أو من خلال صفحة الدعم الفني. نتعهد بالرد خلال 24 ساعة عمل.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center text-[#FF9800] hover:text-[#F57C00] mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
          العودة للرئيسية
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF9800]/20 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-[#FF9800]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">الأسئلة الشائعة</h1>
          <p className="text-gray-600 dark:text-gray-400">إجابات على أكثر الأسئلة شيوعاً حول منصة ربح</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between gap-4 px-4 py-4 text-right hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{item.q}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-[#FF9800] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">لم تجد إجابة؟ تواصل معنا</p>
          <Link href="/support" className="btn-primary inline-flex items-center">
            صفحة الدعم الفني
          </Link>
        </div>
      </div>
    </div>
  );
}
