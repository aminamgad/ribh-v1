'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        toast.success('تم تسجيل الدخول بنجاح');
        // توجيه المسوق لصفحة المنتجات مباشرة
        if (result.user?.role === 'marketer') {
          router.push('/dashboard/products');
        } else {
          router.push('/dashboard');
        }
      } else {
        // Check if it's a maintenance mode error
        if (result.maintenance) {
          toast.error(result.error || 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.', {
            duration: 6000,
            icon: '🔧',
            style: {
              background: '#FF9800',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
            }
          });
        } else {
          toast.error(result.error || 'فشل تسجيل الدخول');
        }
      }
    } catch (error) {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-4" />
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
          </div>
          <div className="card">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FF9800]/20 dark:bg-[#FF9800]/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#4CAF50]/20 dark:bg-[#4CAF50]/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-[#E65100] dark:text-[#FFB74D] hover:text-[#F57C00] dark:hover:text-[#FF9800] mb-6 transition-colors duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform duration-200" />
            العودة للرئيسية
          </Link>
          
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16  rounded-2xl flex items-center justify-center mr-4 shadow-lg">
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
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            تسجيل الدخول
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            أدخل بياناتك للوصول إلى لوحة التحكم
          </p>
        </div>

        {/* Login Form */}
        <div className="card-glass">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="form-label flex items-center">
                <Mail className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field focus:ring-[#FF9800] focus:border-[#FF9800]"
                placeholder="أدخل بريدك الإلكتروني"
                dir="ltr"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="form-label flex items-center">
                <Lock className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-12 focus:ring-[#FF9800] focus:border-[#FF9800]"
                  placeholder="أدخل كلمة المرور"
                  dir="ltr"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center w-10 text-gray-400 hover:text-[#FF9800] dark:hover:text-[#FFB74D] transition-colors duration-200 z-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="relative"
                />
                <label htmlFor="remember-me" className="mr-2 block text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  تذكرني
                </label>
              </div>

              <div className="text-sm">
                <Link 
                  href="/auth/forgot-password" 
                  className="font-medium text-[#FF9800] dark:text-[#FFB74D] hover:text-[#F57C00] dark:hover:text-[#FF9800] transition-colors duration-200"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#FF9800] to-[#F57C00] hover:from-[#F57C00] hover:to-[#E65100] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9800] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden group"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner ml-2"></div>
                    جاري تسجيل الدخول...
                  </div>
                ) : (
                  <>
                    <span className="relative z-10">تسجيل الدخول</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#F57C00] to-[#E65100] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ليس لديك حساب؟{' '}
            <Link 
              href="/auth/register" 
              className="font-semibold text-[#FF9800] dark:text-[#FFB74D] hover:text-[#F57C00] dark:hover:text-[#FF9800] transition-colors duration-200"
            >
              إنشاء حساب جديد
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="card-glass">
          <div className="flex items-center mb-3">
            <Shield className="w-5 h-5 text-[#4CAF50] dark:text-[#81C784] ml-2" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">بيانات تجريبية</h3>
          </div>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <User className="w-3 h-3 ml-1" />
              <span className="font-mono">admin@ribh.com</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-3 h-3 ml-1" />
              <span className="font-mono">Admin123!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 