'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  Shield, 
  UserCheck, 
  UserX, 
  Package, 
  ShoppingCart, 
  DollarSign,
  Edit,
  Trash2,
  Clock,
  MapPin,
  FileText,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import { OptimizedImage } from '@/components/ui/LazyImage';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface UserDetail {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  companyName?: string;
  address?: string;
  taxId?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  productCount: number;
  orderCount: number;
  totalRevenue?: number;
  totalOrders?: number;
  recentProducts?: any[];
  recentOrders?: any[];
}

const roleLabels = {
  admin: 'الإدارة',
  supplier: 'المورد',
  marketer: 'المسوق',
  wholesaler: 'تاجر الجملة'
};

const roleColors = {
  admin: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  supplier: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  marketer: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  wholesaler: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      router.push('/dashboard');
      return;
    }
    
    if (params.id) {
      fetchUserDetail();
    }
  }, [params.id, user]);

  const fetchUserDetail = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserDetail(data.user);
      } else {
        toast.error('المستخدم غير موجود');
        router.push('/dashboard/admin/users');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب تفاصيل المستخدم');
      router.push('/dashboard/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!userDetail) return;

    try {
      const response = await fetch(`/api/admin/users/${params.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !userDetail.isActive }),
      });

      if (response.ok) {
        toast.success(`تم ${userDetail.isActive ? 'إيقاف' : 'تفعيل'} المستخدم بنجاح`);
        fetchUserDetail();
      } else {
        toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  const handleVerifyUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}/verify`, {
        method: 'PUT',
      });

      if (response.ok) {
        toast.success('تم التحقق من المستخدم بنجاح');
        fetchUserDetail();
      } else {
        toast.error('حدث خطأ أثناء التحقق من المستخدم');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التحقق من المستخدم');
    }
  };

  const handleDeleteUser = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف المستخدم بنجاح');
        router.push('/dashboard/admin/users');
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء حذف المستخدم');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المستخدم');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">جاري تحميل تفاصيل المستخدم...</p>
        </div>
      </div>
    );
  }

  if (!userDetail) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link 
              href="/dashboard/admin/users"
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للمستخدمين
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">تفاصيل المستخدم</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <Link
              href={`/dashboard/admin/users/${params.id}/edit`}
              className="btn-secondary"
            >
              <Edit className="w-4 h-4 ml-2" />
              تعديل
            </Link>
            <button
              onClick={handleDeleteUser}
              className="btn-danger"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    {userDetail.avatar ? (
                      <OptimizedImage
                        src={userDetail.avatar}
                        alt={userDetail.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover"
                        priority={true}
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{userDetail.name}</h2>
                    <p className="text-gray-600 dark:text-slate-400">{userDetail.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className={`badge ${roleColors[userDetail.role as keyof typeof roleColors]}`}>
                    {roleLabels[userDetail.role as keyof typeof roleLabels]}
                  </span>
                  {userDetail.isActive ? (
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
                  {userDetail.isVerified ? (
                    <span className="badge badge-success">
                      <Shield className="w-4 h-4 ml-1" />
                      محقق
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      <Clock className="w-4 h-4 ml-1" />
                      قيد التحقق
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">البريد الإلكتروني:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{userDetail.email}</span>
                </div>

                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">الهاتف:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{userDetail.phone}</span>
                </div>

                {userDetail.companyName && (
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">اسم الشركة:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{userDetail.companyName}</span>
                  </div>
                )}

                {userDetail.taxId && (
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">الرقم الضريبي:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{userDetail.taxId}</span>
                  </div>
                )}

                {userDetail.address && (
                  <div className="flex items-center md:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">العنوان:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{userDetail.address}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">تاريخ التسجيل:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">
                    {new Date(userDetail.createdAt).toLocaleDateString('en-US')}
                  </span>
                </div>

                {userDetail.lastLogin && (
                  <div className="flex items-center">
                    <Activity className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">آخر تسجيل دخول:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">
                      {new Date(userDetail.lastLogin).toLocaleDateString('en-US')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 text-center">
                <Package className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{userDetail.productCount}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">المنتجات</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 text-center">
                <ShoppingCart className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{userDetail.orderCount}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">الطلبات</p>
              </div>

              {userDetail.totalRevenue && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 text-center">
                  <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{userDetail.totalRevenue ? new Intl.NumberFormat('en-US').format(userDetail.totalRevenue) : '0'} ₪</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي المبيعات</p>
                </div>
              )}
            </div>

            {/* Recent Products */}
            {userDetail.recentProducts && userDetail.recentProducts.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">آخر المنتجات</h3>
                <div className="space-y-3">
                  {userDetail.recentProducts.map((product: any) => (
                    <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <MediaThumbnail
                          media={product.images || []}
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover"
                          showTypeBadge={false}
                          width={40}
                          height={40}
                          fallbackIcon={<Package className="w-6 h-6 text-gray-400 dark:text-slate-500" />}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{product.name}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{product.marketerPrice} ₪</p>
                        </div>
                      </div>
                      <span className={`badge ${product.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {product.isApproved ? 'معتمد' : 'قيد المراجعة'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            {userDetail.recentOrders && userDetail.recentOrders.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">آخر الطلبات</h3>
                <div className="space-y-3">
                  {userDetail.recentOrders.map((order: any) => (
                    <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">طلب #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{order.total} ₪</p>
                      </div>
                      <span className={`badge badge-${order.status === 'delivered' ? 'success' : 'warning'}`}>
                        {order.status === 'delivered' ? 'تم التسليم' : 'قيد المعالجة'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">الإجراءات السريعة</h3>
              <div className="space-y-3">
                <button
                  onClick={handleToggleStatus}
                  className={`w-full btn ${userDetail.isActive ? 'btn-danger' : 'btn-success'}`}
                >
                  {userDetail.isActive ? (
                    <>
                      <UserX className="w-4 h-4 ml-2" />
                      إيقاف المستخدم
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 ml-2" />
                      تفعيل المستخدم
                    </>
                  )}
                </button>

                {!userDetail.isVerified && (
                  <button
                    onClick={handleVerifyUser}
                    className="w-full btn btn-success"
                  >
                    <Shield className="w-4 h-4 ml-2" />
                    التحقق من المستخدم
                  </button>
                )}

                <Link
                  href={`/dashboard/admin/users/${params.id}/edit`}
                  className="w-full btn btn-primary"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل البيانات
                </Link>
              </div>
            </div>

            {/* User Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">نشاط المستخدم</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">المنتجات:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{userDetail.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">الطلبات:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{userDetail.orderCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">تاريخ التسجيل:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {new Date(userDetail.createdAt).toLocaleDateString('en-US')}
                  </span>
                </div>
                {userDetail.lastLogin && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-slate-400">آخر دخول:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {new Date(userDetail.lastLogin).toLocaleDateString('en-US')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="حذف المستخدم"
        message="هل أنت متأكد من حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
} 