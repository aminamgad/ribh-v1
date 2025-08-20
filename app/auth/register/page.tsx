'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Eye, EyeOff, ArrowLeft, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import CountrySelect from '@/components/ui/CountrySelect';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      color: 'primary',
    },
    {
      value: 'marketer',
      label: 'مسوق',
      description: 'تسويق المنتجات للعملاء',
      icon: TrendingUp,
      color: 'success',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-4 transition-colors duration-200">
            <ArrowLeft className="w-5 h-5 ml-2" />
            العودة للرئيسية
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">إنشاء حساب جديد</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            أو{' '}
            <Link href="/auth/login" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors duration-200">
              تسجيل الدخول
            </Link>
          </p>
        </div>

        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="form-label">
                  الاسم الكامل *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              <div>
                <label htmlFor="email" className="form-label">
                  البريد الإلكتروني *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="أدخل بريدك الإلكتروني"
                  dir="ltr"
                />
              </div>

              <div>
                <label htmlFor="phone" className="form-label">
                  رقم الهاتف *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                                      placeholder="أدخل رقم الهاتف"
                  dir="ltr"
                />
              </div>

              <div>
                <label htmlFor="role" className="form-label">
                  نوع الحساب *
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  className="input-field"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Description */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                {(() => {
                  const selectedRole = roleOptions.find(r => r.value === formData.role);
                  const Icon = selectedRole?.icon;
                  const colorClass = `text-${selectedRole?.color}-600 dark:text-${selectedRole?.color}-400`;
                  return Icon ? <Icon className={`w-5 h-5 ml-2 ${colorClass}`} /> : null;
                })()}
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {roleOptions.find(r => r.value === formData.role)?.label}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {roleOptions.find(r => r.value === formData.role)?.description}
              </p>
            </div>

            {/* Marketing Account Fields */}
            {formData.role === 'marketer' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="country" className="form-label">
                    دولة الجنسية *
                  </label>
                  <CountrySelect
                    value={formData.country}
                    onChange={handleCountryChange}
                    placeholder="اختر دولة الجنسية"
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="form-label">
                    تاريخ الميلاد *
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="form-label">
                    الجنس *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">اختر الجنس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="websiteLink" className="form-label">
                    رابط الموقع/الصفحة (اختياري)
                  </label>
                  <input
                    id="websiteLink"
                    name="websiteLink"
                    type="url"
                    value={formData.websiteLink}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="https://example.com"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* Supplier Account Fields */}
            {formData.role === 'supplier' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="companyName" className="form-label">
                    اسم الشركة *
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="أدخل اسم الشركة"
                  />
                </div>

                <div>
                  <label htmlFor="commercialRegisterNumber" className="form-label">
                    رقم السجل التجاري *
                  </label>
                  <input
                    id="commercialRegisterNumber"
                    name="commercialRegisterNumber"
                    type="text"
                    required
                    value={formData.commercialRegisterNumber}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="أدخل رقم السجل التجاري"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="form-label">
                    العنوان *
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="أدخل العنوان"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="form-label">
                  كلمة المرور *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="أدخل كلمة المرور"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
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
                <label htmlFor="confirmPassword" className="form-label">
                  تأكيد كلمة المرور *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="أعد إدخال كلمة المرور"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
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

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center py-3"
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  'إنشاء الحساب'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            لديك حساب بالفعل؟{' '}
            <Link href="/auth/login" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors duration-200">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 