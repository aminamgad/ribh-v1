'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Eye, EyeOff, ArrowLeft, ShoppingBag, TrendingUp, Users, Mail, Lock, User, Phone, Globe, Building, MapPin, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import CountrySelect from '@/components/ui/CountrySelect';
import Image from 'next/image';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'marketer' as 'supplier' | 'marketer',
    // Marketing account fields
    country: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | '',
    websiteLink: '',
    // Supplier account fields
    companyName: '',
    commercialRegisterNumber: '',
    address: '',
    // Legacy field
    taxId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        toast.success('تم إنشاء الحساب بنجاح');
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'فشل إنشاء الحساب');
      }
    } catch (error) {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCountryChange = (value: string) => {
    setFormData({
      ...formData,
      country: value,
    });
  };

  const roleOptions = [
    {
      value: 'supplier',
      label: 'مورد',
      description: 'رفع المنتجات وإدارة المخزون',
      icon: ShoppingBag,
      color: 'from-[#FF9800] to-[#F57C00]',
      bgColor: 'from-[#FF9800]/10 to-[#F57C00]/10',
      borderColor: 'border-[#FF9800]/20',
    },
    {
      value: 'marketer',
      label: 'مسوق',
      description: 'تسويق المنتجات للعملاء',
      icon: TrendingUp,
      color: 'from-[#4CAF50] to-[#388E3C]',
      bgColor: 'from-[#4CAF50]/10 to-[#388E3C]/10',
      borderColor: 'border-[#4CAF50]/20',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9800]/10 via-white to-[#4CAF50]/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FF9800]/20 dark:bg-[#FF9800]/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#4CAF50]/20 dark:bg-[#4CAF50]/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-[#E65100] dark:text-[#FFB74D] hover:text-[#F57C00] dark:hover:text-[#FF9800] mb-4 transition-colors duration-200">
            <ArrowLeft className="w-5 h-5 ml-2" />
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
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">إنشاء حساب جديد</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            أو{' '}
            <Link href="/auth/login" className="font-medium text-[#FF9800] dark:text-[#FFB74D] hover:text-[#F57C00] dark:hover:text-[#FF9800] transition-colors duration-200">
              تسجيل الدخول إلى حسابك الحالي
            </Link>
          </p>
        </div>

        {/* Role Selection */}
        <div className="card-glass mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Users className="w-5 h-5 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
            اختر نوع الحساب
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange({ target: { name: 'role', value: option.value } } as any)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-right ${
                  formData.role === option.value
                    ? `${option.borderColor} bg-gradient-to-r ${option.bgColor}`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${option.color} flex items-center justify-center mr-3`}>
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{option.label}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <div className="card-glass">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="form-label flex items-center">
                  <User className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                  الاسم الكامل
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field focus:ring-[#FF9800] focus:border-[#FF9800]"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

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

              <div>
                <label htmlFor="phone" className="form-label flex items-center">
                  <Phone className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field focus:ring-[#FF9800] focus:border-[#FF9800]"
                  placeholder="أدخل رقم هاتفك"
                  dir="ltr"
                />
              </div>

              <div>
                <label htmlFor="country" className="form-label flex items-center">
                  <Globe className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                  الدولة
                </label>
                <CountrySelect
                  value={formData.country}
                  onChange={handleCountryChange}
                  className="input-field focus:ring-[#FF9800] focus:border-[#FF9800]"
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pr-10 focus:ring-[#FF9800] focus:border-[#FF9800]"
                    placeholder="أدخل كلمة المرور"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pr-3 flex items-center text-gray-400 hover:text-[#FF9800] dark:hover:text-[#FFB74D] transition-colors duration-200"
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

              <div>
                <label htmlFor="confirmPassword" className="form-label flex items-center">
                  <Lock className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-field pr-10 focus:ring-[#FF9800] focus:border-[#FF9800]"
                    placeholder="أعد إدخال كلمة المرور"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pr-3 flex items-center text-gray-400 hover:text-[#FF9800] dark:hover:text-[#FFB74D] transition-colors duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Role-specific fields */}
            {formData.role === 'marketer' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="dateOfBirth" className="form-label">
                    تاريخ الميلاد
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="input-field focus:ring-[#4CAF50] focus:border-[#4CAF50]"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="form-label">
                    الجنس
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input-field focus:ring-[#4CAF50] focus:border-[#4CAF50]"
                  >
                    <option value="">اختر الجنس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="websiteLink" className="form-label flex items-center">
                    <Globe className="w-4 h-4 ml-2 text-[#4CAF50] dark:text-[#81C784]" />
                    رابط الموقع
                  </label>
                  <input
                    id="websiteLink"
                    name="websiteLink"
                    type="url"
                    value={formData.websiteLink}
                    onChange={handleChange}
                    className="input-field focus:ring-[#4CAF50] focus:border-[#4CAF50]"
                    placeholder="https://example.com"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {formData.role === 'supplier' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="companyName" className="form-label flex items-center">
                    <Building className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                    اسم الشركة
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="input-field focus:ring-[#FF9800] focus:border-[#FF9800]"
                    placeholder="أدخل اسم الشركة"
                  />
                </div>

                <div>
                  <label htmlFor="commercialRegisterNumber" className="form-label flex items-center">
                    <FileText className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                    رقم السجل التجاري
                  </label>
                  <input
                    id="commercialRegisterNumber"
                    name="commercialRegisterNumber"
                    type="text"
                    required
                    value={formData.commercialRegisterNumber}
                    onChange={handleChange}
                    className="input-field focus:ring-[#FF9800] focus:border-[#FF9800]"
                    placeholder="أدخل رقم السجل التجاري"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="form-label flex items-center">
                    <MapPin className="w-4 h-4 ml-2 text-[#FF9800] dark:text-[#FFB74D]" />
                    عنوان الشركة
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="input-field focus:ring-[#FF9800] focus:border-[#FF9800]"
                    placeholder="أدخل عنوان الشركة الكامل"
                  />
                </div>
              </div>
            )}

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
                    جاري إنشاء الحساب...
                  </div>
                ) : (
                  <>
                    <span className="relative z-10">إنشاء الحساب</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#F57C00] to-[#E65100] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            لديك حساب بالفعل؟{' '}
            <Link 
              href="/auth/login" 
              className="font-semibold text-[#FF9800] dark:text-[#FFB74D] hover:text-[#F57C00] dark:hover:text-[#FF9800] transition-colors duration-200"
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 