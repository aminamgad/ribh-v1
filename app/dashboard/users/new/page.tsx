'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  User, 
  Save, 
  Loader2,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CountrySelect from '@/components/ui/CountrySelect';

const userSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'رقم الهاتف غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'supplier', 'marketer', 'wholesaler']),
  // Marketing account fields
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female']).optional().or(z.literal('')),
  websiteLink: z.string().url('رابط الموقع غير صحيح').optional().or(z.literal('')),
     // Supplier account fields
  companyName: z.string().optional(),
   commercialRegisterNumber: z.string().optional(),
  address: z.string().optional(),
   // Wholesaler account fields
   wholesaleLicense: z.string().optional(),
   businessType: z.string().optional(),
   // Legacy field
  taxId: z.string().optional(),
  isActive: z.boolean(),
  isVerified: z.boolean()
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
}).refine((data) => {
  // Marketing account validation
  if (data.role === 'marketer') {
    if (!data.country) return false;
    if (!data.dateOfBirth) return false;
    if (!data.gender) return false;
  }
  return true;
}, {
  message: 'جميع الحقول مطلوبة لحساب المسوق',
  path: ['role'],
}).refine((data) => {
  // Supplier account validation
  if (data.role === 'supplier') {
    if (!data.companyName) return false;
    if (!data.commercialRegisterNumber) return false;
    if (!data.address) return false;
  }
  return true;
 }, {
   message: 'جميع الحقول مطلوبة لحساب المورد',
   path: ['role'],
 }).refine((data) => {
   // Wholesaler account validation
   if (data.role === 'wholesaler') {
     if (!data.companyName) return false;
     if (!data.wholesaleLicense) return false;
     if (!data.businessType) return false;
     if (!data.address) return false;
   }
   return true;
 }, {
   message: 'جميع الحقول مطلوبة لحساب تاجر الجملة',
   path: ['role'],
});

export default function CreateUserPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'marketer' as 'marketer' | 'supplier' | 'wholesaler' | 'admin',
      country: '',
      dateOfBirth: '',
      gender: '',
      websiteLink: '',
      companyName: '',
       commercialRegisterNumber: '',
      address: '',
       wholesaleLicense: '',
       businessType: '',
      taxId: '',
      isActive: true,
      isVerified: false
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      router.push('/dashboard');
      return;
    }
  }, [currentUser, router]);

  const onSubmit = async (data: any) => {
    setSaving(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('تم إنشاء المستخدم بنجاح');
        router.push('/dashboard/users');
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في إنشاء المستخدم');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('حدث خطأ أثناء إنشاء المستخدم');
    } finally {
      setSaving(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">غير مصرح</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">لا يمكنك الوصول لهذه الصفحة</p>
          <Link href="/dashboard" className="btn-primary">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link 
              href="/dashboard/users"
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للمستخدمين
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">إنشاء مستخدم جديد</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">المعلومات الأساسية</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="input-field"
                  placeholder="الاسم الكامل"
                />
                {errors.name && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="input-field"
                  placeholder="example@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="input-field"
                                      placeholder="أدخل رقم الهاتف"
                />
                {errors.phone && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  الدور *
                </label>
                <select {...register('role')} className="input-field">
                  <option value="marketer">المسوق</option>
                   <option value="supplier">المورد</option>
                  <option value="wholesaler">تاجر الجملة</option>
                  <option value="admin">الإدارة</option>
                </select>
                {errors.role && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.role.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  كلمة المرور *
                </label>
                <input
                  type="password"
                  {...register('password')}
                  className="input-field"
                  placeholder="كلمة المرور"
                />
                {errors.password && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  تأكيد كلمة المرور *
                </label>
                <input
                  type="password"
                  {...register('confirmPassword')}
                  className="input-field"
                  placeholder="تأكيد كلمة المرور"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Marketing Account Fields */}
          {watchedValues.role === 'marketer' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">معلومات المسوق</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    دولة الجنسية *
                  </label>
                  <CountrySelect
                    value={watch('country')}
                    onChange={(value) => setValue('country', value)}
                    placeholder="اختر دولة الجنسية"
                    error={errors.country?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    تاريخ الميلاد *
                  </label>
                  <input
                    type="date"
                    {...register('dateOfBirth')}
                    className="input-field"
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.dateOfBirth.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    الجنس *
                  </label>
                  <select {...register('gender')} className="input-field">
                    <option value="">اختر الجنس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.gender.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    رابط الموقع/الصفحة (اختياري)
                  </label>
                  <input
                    type="url"
                    {...register('websiteLink')}
                    className="input-field"
                    placeholder="https://example.com"
                  />
                  {errors.websiteLink && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.websiteLink.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Supplier Account Fields */}
          {watchedValues.role === 'supplier' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">معلومات المورد</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    اسم الشركة *
                  </label>
                  <input
                    type="text"
                    {...register('companyName')}
                    className="input-field"
                    placeholder="اسم الشركة"
                  />
                  {errors.companyName && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.companyName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    رقم السجل التجاري *
                  </label>
                  <input
                    type="text"
                    {...register('commercialRegisterNumber')}
                    className="input-field"
                    placeholder="رقم السجل التجاري"
                  />
                  {errors.commercialRegisterNumber && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.commercialRegisterNumber.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    العنوان *
                  </label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="input-field"
                    placeholder="عنوان الشركة"
                  />
                  {errors.address && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>
                     )}

           {/* Wholesaler Account Fields */}
           {watchedValues.role === 'wholesaler' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
               <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">معلومات تاجر الجملة</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                     اسم الشركة *
                </label>
                <input
                  type="text"
                  {...register('companyName')}
                  className="input-field"
                  placeholder="اسم الشركة"
                />
                   {errors.companyName && (
                     <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.companyName.message}</p>
                   )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                     رخصة الجملة *
                </label>
                <input
                  type="text"
                     {...register('wholesaleLicense')}
                  className="input-field"
                     placeholder="رقم رخصة الجملة"
                   />
                   {errors.wholesaleLicense && (
                     <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.wholesaleLicense.message}</p>
                   )}
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                     نوع النشاط التجاري *
                   </label>
                   <select {...register('businessType')} className="input-field">
                     <option value="">اختر نوع النشاط</option>
                     <option value="electronics">الإلكترونيات</option>
                     <option value="clothing">الملابس</option>
                     <option value="food">الأغذية</option>
                     <option value="furniture">الأثاث</option>
                     <option value="automotive">السيارات</option>
                     <option value="construction">البناء</option>
                     <option value="healthcare">الرعاية الصحية</option>
                     <option value="other">أخرى</option>
                   </select>
                   {errors.businessType && (
                     <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.businessType.message}</p>
                   )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                     العنوان *
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="input-field"
                  placeholder="عنوان الشركة"
                />
                   {errors.address && (
                     <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.address.message}</p>
                   )}
              </div>
            </div>
          </div>
           )}

          {/* Account Status */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">حالة الحساب</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-4 h-4 text-primary-600 border-gray-300 dark:border-slate-600 rounded focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  الحساب نشط
                </label>
              </div>

              <div className="flex items-center space-x-3 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('isVerified')}
                  className="w-4 h-4 text-primary-600 border-gray-300 dark:border-slate-600 rounded focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  الحساب محقق
                </label>
              </div>
            </div>

            {/* Status Preview */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">معاينة الحالة:</h4>
              <div className="flex items-center space-x-2 space-x-reverse">
                {watchedValues.isActive ? (
                  <span className="badge badge-success">
                    <UserCheck className="w-4 h-4 ml-1" />
                    نشط
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    <UserX className="w-4 h-4 ml-1" />
                    متوقف
                  </span>
                )}
                {watchedValues.isVerified ? (
                  <span className="badge badge-success">
                    <Shield className="w-4 h-4 ml-1" />
                    محقق
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <Shield className="w-4 h-4 ml-1" />
                    قيد التحقق
                  </span>
                )}
                <span className={`badge ${
                  (watchedValues.role as string) === 'admin' ? 'badge-danger' :
                  (watchedValues.role as string) === 'supplier' ? 'badge-blue' :
                   (watchedValues.role as string) === 'wholesaler' ? 'badge-purple' :
                   'badge-success'
                }`}>
                  {(watchedValues.role as string) === 'admin' ? 'الإدارة' :
                   (watchedValues.role as string) === 'supplier' ? 'المورد' :
                    (watchedValues.role as string) === 'wholesaler' ? 'تاجر الجملة' :
                    'المسوق'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4 space-x-reverse">
            <Link
              href="/dashboard/users"
              className="btn-secondary"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  إنشاء المستخدم
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 