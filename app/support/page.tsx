'use client';

import Link from 'next/link';
import { ArrowLeft, Headphones, Mail, Phone, MessageCircle, Clock } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center text-[#FF9800] hover:text-[#F57C00] mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
          العودة للرئيسية
        </Link>
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF9800]/20 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-[#FF9800]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">الدعم الفني</h1>
          <p className="text-gray-600 dark:text-gray-400">نحن هنا لمساعدتك. تواصل معنا بأي وسيلة تناسبك</p>
        </div>
        <div className="space-y-6">
          <a href="mailto:support@ribh.com" className="block bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-[#FF9800]/50 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FF9800]/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#FF9800]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">البريد الإلكتروني</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">الرد خلال 24 ساعة عمل</p>
                <span className="text-[#FF9800] font-medium">support@ribh.com</span>
              </div>
            </div>
          </a>
          <a href="tel:+970123456789" className="block bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-[#FF9800]/50 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#4CAF50]/20 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-[#4CAF50]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">الهاتف</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">أوقات الدوام: الأحد - الخميس</p>
                <span className="text-[#FF9800] font-medium">789 456 123 970+</span>
              </div>
            </div>
          </a>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">الدردشة المباشرة</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">بعد تسجيل الدخول، يمكنك التواصل مع الدعم عبر نظام الرسائل داخل لوحة التحكم.</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#FF9800]" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">أوقات الاستجابة</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">البريد: 24 ساعة | الهاتف: الأحد - الخميس 9:00 - 17:00</p>
            </div>
          </div>
        </div>
        <div className="mt-10 text-center">
          <Link href="/faq" className="text-[#FF9800] hover:underline">تصفح الأسئلة الشائعة</Link>
        </div>
      </div>
    </div>
  );
}
