'use client';

import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FF9800]/20 dark:bg-[#FF9800]/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#4CAF50]/20 dark:bg-[#4CAF50]/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-[#E65100] dark:text-[#FFB74D] hover:text-[#F57C00] dark:hover:text-[#FF9800] mb-6 transition-colors duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform duration-200" />
            العودة لتسجيل الدخول
          </Link>

          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
              <Image
                src="/logo.png"
                alt="ربح"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FF9800] to-[#F57C00] bg-clip-text text-transparent">
              ربح
            </h1>
          </div>

          <div className="card-glass p-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FF9800]/20 dark:bg-[#FF9800]/30 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-[#FF9800] dark:text-[#FFB74D]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              استعادة كلمة المرور
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              هذه الميزة قيد التطوير. لتغيير كلمة المرور أو استعادتها، يرجى التواصل مع الدعم الفني.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF9800] to-[#F57C00] text-white font-medium hover:from-[#F57C00] hover:to-[#E65100] transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 ml-2" />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
