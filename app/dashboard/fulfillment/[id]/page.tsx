'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Package, Clock, CheckCircle, XCircle, Calendar, MapPin, User, AlertCircle } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface FulfillmentRequest {
  _id: string;
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  products: Array<{
    productName: string;
    productImages: string[];
    quantity: number;
    currentStock: number;
    costPrice: number;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  totalValue: number;
  totalItems: number;
  notes?: string;
  adminNotes?: string;
  rejectionReason?: string;
  warehouseLocation?: string;
  expectedDeliveryDate?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  isOverdue?: boolean;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle
};

const statusLabels = {
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  rejected: 'مرفوض'
};

export default function FulfillmentDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<FulfillmentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    fetchFulfillmentRequest();
  }, [params.id]);

  const fetchFulfillmentRequest = async () => {
    try {
      console.log('Fetching fulfillment request with ID:', params.id);
      const response = await fetch(`/api/fulfillment/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fulfillment request data:', data);
        setRequest(data.request);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        
        if (response.status === 404) {
          toast.error(errorData.message || 'طلب التخزين غير موجود');
        } else if (response.status === 403) {
          toast.error(errorData.message || 'غير مصرح لك بالوصول لهذا الطلب');
        } else {
          toast.error(errorData.message || 'حدث خطأ أثناء جلب تفاصيل طلب التخزين');
        }
        
        // Navigate back to the list page
        setTimeout(() => {
          router.push('/dashboard/fulfillment');
        }, 2000);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('حدث خطأ أثناء جلب تفاصيل طلب التخزين');
      
      // Navigate back to the list page
      setTimeout(() => {
        router.push('/dashboard/fulfillment');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setShowApproveConfirm(true);
  };

  const confirmApprove = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/fulfillment/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          adminNotes: 'تم الموافقة على الطلب'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم الموافقة على الطلب بنجاح وتم تحديث المخزون تلقائياً');
        fetchFulfillmentRequest();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء الموافقة على الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الموافقة على الطلب');
    } finally {
      setUpdating(false);
      setShowApproveConfirm(false);
    }
  };

  const handleReject = async () => {
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/fulfillment/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: 'تم رفض الطلب بواسطة المستخدم' // Placeholder for rejection reason
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم رفض الطلب بنجاح');
        fetchFulfillmentRequest();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء رفض الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض الطلب');
    } finally {
      setUpdating(false);
      setShowRejectConfirm(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/fulfillment/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف الطلب بنجاح');
        router.push('/dashboard/fulfillment');
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء حذف الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الطلب');
    } finally {
      setUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
          طلب التخزين غير موجود
        </h3>
        <p className="text-gray-600 dark:text-slate-400">
          قد يكون الطلب محذوفاً أو غير موجود
        </p>
      </div>
    );
  }

  const StatusIcon = statusIcons[request.status];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">
            تفاصيل طلب التخزين
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-slate-400 mt-1 sm:mt-2 truncate">
            رقم الطلب: {request._id}
          </p>
        </div>

        {/* Status Badge */}
        <div className={`px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 flex-shrink-0 ${statusColors[request.status]}`}>
          <StatusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {statusLabels[request.status]}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Products */}
          <div className="card p-4 sm:p-6">
            <div className="card-header pb-3 sm:pb-4">
              <h3 className="card-title text-base sm:text-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
                المنتجات المطلوبة
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-3 sm:space-y-4">
                {request.products.map((product, index) => (
                  <div key={index} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex items-start space-x-2 sm:space-x-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden flex-shrink-0">
                        <MediaThumbnail
                          media={product.productImages || []}
                          alt={product.productName}
                          className="w-full h-full"
                          showTypeBadge={false}
                          fallbackIcon={<Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2 truncate">
                          {product.productName}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-slate-400 block sm:inline">الكمية:</span>
                            <span className="font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                              {product.quantity} قطعة
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-slate-400 block sm:inline">المخزون الحالي:</span>
                            <span className="font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                              {product.currentStock} قطعة
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-slate-400 block sm:inline">سعر التكلفة:</span>
                            <span className="font-medium text-primary-600 dark:text-primary-400 mr-1 sm:mr-2 block sm:inline">
                              {product.costPrice} ₪
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-slate-400 block sm:inline">القيمة الإجمالية:</span>
                            <span className="font-medium text-primary-600 dark:text-primary-400 mr-1 sm:mr-2 block sm:inline">
                              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.costPrice * product.quantity)} ₪
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mb-2 sm:mb-3">
                  ملخص الطلب
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">عدد المنتجات:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2">
                      {request.products.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">إجمالي القطع:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2">
                      {request.totalItems}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">القيمة الإجمالية:</span>
                    <span className="font-medium text-primary-600 dark:text-primary-400 mr-1 sm:mr-2">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(request.totalValue)} ₪
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(request.notes || request.adminNotes) && (
            <div className="card p-4 sm:p-6">
              <div className="card-header pb-3 sm:pb-4">
                <h3 className="card-title text-base sm:text-lg">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
                  الملاحظات
                </h3>
              </div>
              <div className="card-body space-y-3 sm:space-y-4">
                {request.notes && (
                  <div>
                    <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">
                      ملاحظات المورد:
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 p-2.5 sm:p-3 rounded-md">
                      {request.notes}
                    </p>
                  </div>
                )}
                {request.adminNotes && (
                  <div>
                    <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">
                      ملاحظات الإدارة:
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 p-2.5 sm:p-3 rounded-md">
                      {request.adminNotes}
                    </p>
                  </div>
                )}
                {request.rejectionReason && (
                  <div>
                    <h4 className="text-sm sm:text-base font-medium text-red-600 dark:text-red-400 mb-1.5 sm:mb-2">
                      سبب الرفض:
                    </h4>
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2.5 sm:p-3 rounded-md">
                      {request.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Supplier Info */}
          <div className="card p-4 sm:p-6">
            <div className="card-header pb-3 sm:pb-4">
              <h3 className="card-title text-base sm:text-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
                معلومات المورد
              </h3>
            </div>
            <div className="card-body space-y-2 sm:space-y-3">
              <div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">الاسم:</span>
                <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                  {request.supplierName}
                </span>
              </div>
              <div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">البريد الإلكتروني:</span>
                <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline break-all">
                  {request.supplierEmail}
                </span>
              </div>
              <div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">رقم الهاتف:</span>
                <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                  {request.supplierPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="card p-4 sm:p-6">
            <div className="card-header pb-3 sm:pb-4">
              <h3 className="card-title text-base sm:text-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
                تفاصيل الطلب
              </h3>
            </div>
            <div className="card-body space-y-2 sm:space-y-3">
              <div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">تاريخ الإنشاء:</span>
                <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                  {new Date(request.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {request.expectedDeliveryDate && (
                <div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">تاريخ التسليم المتوقع:</span>
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                    {new Date(request.expectedDeliveryDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              {request.warehouseLocation && (
                <div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">موقع المستودع:</span>
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                    {request.warehouseLocation}
                  </span>
                </div>
              )}
              {request.approvedAt && (
                <div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">تاريخ الموافقة:</span>
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                    {new Date(request.approvedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              {request.rejectedAt && (
                <div>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">تاريخ الرفض:</span>
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mr-1 sm:mr-2 block sm:inline">
                    {new Date(request.rejectedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {user?.role === 'admin' && request.status === 'pending' && (
            <div className="card p-4 sm:p-6">
              <div className="card-header pb-3 sm:pb-4">
                <h3 className="card-title text-base sm:text-lg">الإجراءات</h3>
              </div>
              <div className="card-body space-y-2 sm:space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={updating}
                  className="btn-primary w-full min-h-[44px] text-sm sm:text-base"
                >
                  {updating ? 'جاري...' : 'الموافقة على الطلب'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={updating}
                  className="btn-danger w-full min-h-[44px] text-sm sm:text-base"
                >
                  {updating ? 'جاري...' : 'رفض الطلب'}
                </button>
              </div>
            </div>
          )}

          {/* Delete Action */}
          {(user?.role === 'supplier' || user?.role === 'admin') && request.status !== 'approved' && (
            <div className="card p-4 sm:p-6">
              <div className="card-header pb-3 sm:pb-4">
                <h3 className="card-title text-base sm:text-lg">حذف الطلب</h3>
              </div>
              <div className="card-body">
                <button
                  onClick={handleDelete}
                  disabled={updating}
                  className="btn-danger w-full min-h-[44px] text-sm sm:text-base"
                >
                  {updating ? 'جاري...' : 'حذف الطلب'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={confirmApprove}
        title="موافقة على الطلب"
        message="هل أنت متأكد من الموافقة على هذا الطلب؟"
        confirmText="موافقة"
        cancelText="إلغاء"
        type="success"
        loading={updating}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="حذف الطلب"
        message="هل أنت متأكد من حذف هذا الطلب؟"
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
        loading={updating}
      />

      <ConfirmationModal
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={confirmReject}
        title="رفض الطلب"
        message="هل أنت متأكد من رفض هذا الطلب؟"
        confirmText="رفض"
        cancelText="إلغاء"
        type="danger"
        loading={updating}
      />
    </div>
  );
} 