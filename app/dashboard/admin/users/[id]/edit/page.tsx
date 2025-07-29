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

const userSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  role: z.enum(['admin', 'supplier', 'marketer', 'wholesaler']),
  companyName: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  isActive: z.boolean(),
  isVerified: z.boolean()
});

interface UserData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  companyName?: string;
  address?: string;
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
      companyName: '',
      address: '',
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
        setValue('companyName', data.user.companyName || '');
        setValue('address', data.user.address || '');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">المستخدم غير موجود</h2>
          <p className="text-gray-600 mb-4">المستخدم الذي تبحث عنه غير موجود أو تم حذفه</p>
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
    <div className="min-h-screen bg-gray-50">
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
            <h1 className="text-2xl font-bold text-gray-900">تعديل المستخدم</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg p-6 border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">المعلومات الأساسية</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="input-field"
                  placeholder="الاسم الكامل"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="input-field"
                  placeholder="example@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="input-field"
                  placeholder="05xxxxxxxx"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الدور *
                </label>
                <select 
                  {...register('role')} 
                  className="input-field"
                  disabled={isOwnAccount}
                >
                  <option value="marketer">المسوق</option>
                  <option value="wholesaler">تاجر الجملة</option>
                  <option value="supplier">المورد</option>
                  <option value="admin">الإدارة</option>
                </select>
                {isOwnAccount && (
                  <p className="text-yellow-600 text-sm mt-1">لا يمكنك تغيير دورك</p>
                )}
                {errors.role && (
                  <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-lg p-6 border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">معلومات الشركة</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الشركة
                </label>
                <input
                  type="text"
                  {...register('companyName')}
                  className="input-field"
                  placeholder="اسم الشركة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الرقم الضريبي
                </label>
                <input
                  type="text"
                  {...register('taxId')}
                  className="input-field"
                  placeholder="الرقم الضريبي"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="input-field"
                  placeholder="عنوان الشركة"
                />
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-lg p-6 border">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">حالة الحساب</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  disabled={isOwnAccount}
                />
                <label className="text-sm font-medium text-gray-700">
                  الحساب نشط
                </label>
                {isOwnAccount && (
                  <p className="text-yellow-600 text-sm">لا يمكنك إيقاف حسابك</p>
                )}
              </div>

              <div className="flex items-center space-x-3 space-x-reverse">
                <input
                  type="checkbox"
                  {...register('isVerified')}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  الحساب محقق
                </label>
              </div>
            </div>

            {/* Status Preview */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">معاينة الحالة:</h4>
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
                  watchedValues.role === 'admin' ? 'badge-danger' :
                  watchedValues.role === 'supplier' ? 'badge-blue' :
                  watchedValues.role === 'marketer' ? 'badge-success' :
                  'badge-purple'
                }`}>
                  {watchedValues.role === 'admin' ? 'الإدارة' :
                   watchedValues.role === 'supplier' ? 'المورد' :
                   watchedValues.role === 'marketer' ? 'المسوق' :
                   'تاجر الجملة'}
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