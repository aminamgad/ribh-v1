'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
});

interface UserData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  // Marketing account fields
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  websiteLink?: string;
  // Supplier account fields
  companyName?: string;
  commercialRegisterNumber?: string;
  address?: string;
  // Wholesaler account fields
  wholesaleLicense?: string;
  businessType?: string;
  // Legacy field
  taxId?: string;
  isActive: boolean;
  isVerified: boolean;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'marketer' as const,
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
    
    if (params.id) {
      fetchUser();
    }
  }, [params.id, currentUser]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Set form values
        setValue('name', data.user.name);
        setValue('email', data.user.email);
        setValue('phone', data.user.phone);
        setValue('role', data.user.role);
        // Marketing account fields
        setValue('country', data.user.country || '');
        setValue('dateOfBirth', data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : '');
        setValue('gender', data.user.gender || '');
        setValue('websiteLink', data.user.websiteLink || '');
        // Supplier account fields
        setValue('companyName', data.user.companyName || '');
        setValue('commercialRegisterNumber', data.user.commercialRegisterNumber || '');
        setValue('address', data.user.address || '');
        // Legacy field
        setValue('taxId', data.user.taxId || '');
        setValue('isActive', data.user.isActive);
        setValue('isVerified', data.user.isVerified);
      } else {
        toast.error('المستخدم غير موجود');
        router.push('/dashboard/admin/users');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب بيانات المستخدم');
      router.push('/dashboard/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('تم تحديث المستخدم بنجاح');
        router.push(`/dashboard/admin/users/${params.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في تحديث المستخدم');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('حدث خطأ أثناء تحديث المستخدم');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <UserX className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">المستخدم غير موجود</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">المستخدم الذي تبحث عنه غير موجود أو تم حذفه</p>
          <Link href="/dashboard/admin/users" className="btn-primary">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للمستخدمين
          </Link>
        </div>
      </div>
    );
  }

  const isOwnAccount = params.id === currentUser?._id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link 
              href={`/dashboard/admin/users/${params.id}`}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للمستخدم
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">تعديل المستخدم</h1>
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
                <select 
                  {...register('role')} 
                  className="input-field"
                  disabled={isOwnAccount}
                >
                  <option value="marketer">المسوق</option>
                  <option value="supplier">المورد</option>
                  <option value="wholesaler">تاجر الجملة</option>
                  <option value="admin">الإدارة</option>
                </select>
                {isOwnAccount && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">لا يمكنك تغيير دورك</p>
                )}
                {errors.role && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.role.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Marketing Account Fields */}
          {(watchedValues.role as string) === 'marketer' && (
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
          {(watchedValues.role as string) === 'supplier' && (
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
          {(watchedValues.role as string) === 'wholesaler' && (
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
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  disabled={isOwnAccount}
                />
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  الحساب نشط
                </label>
                {isOwnAccount && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">لا يمكنك إيقاف حسابك</p>
                )}
              </div>

              <div className="flex items-center space-x-3 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('isVerified')}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
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
              href={`/dashboard/admin/users/${params.id}`}
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
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 