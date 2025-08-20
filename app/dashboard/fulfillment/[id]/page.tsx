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
    const reason = prompt('يرجى إدخال سبب الرفض:');
    if (!reason) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/fulfillment/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: reason
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            تفاصيل طلب التخزين
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            رقم الطلب: {request._id}
          </p>
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status]}`}>
          <StatusIcon className="w-4 h-4 inline ml-1" />
          {statusLabels[request.status]}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Package className="w-5 h-5 ml-2" />
                المنتجات المطلوبة
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {request.products.map((product, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                        <MediaThumbnail
                          media={product.productImages || []}
                          alt={product.productName}
                          className="w-full h-full"
                          showTypeBadge={false}
                          fallbackIcon={<Package className="w-10 h-10 text-gray-400" />}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                          {product.productName}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-slate-400">الكمية:</span>
                            <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                              {product.quantity} قطعة
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-slate-400">المخزون الحالي:</span>
                            <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                              {product.currentStock} قطعة
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-slate-400">سعر التكلفة:</span>
                            <span className="font-medium text-primary-600 dark:text-primary-400 mr-2">
                              {product.costPrice} ₪
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-slate-400">القيمة الإجمالية:</span>
                            <span className="font-medium text-primary-600 dark:text-primary-400 mr-2">
                              {(product.costPrice * product.quantity).toFixed(2)} ₪
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">
                  ملخص الطلب
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">عدد المنتجات:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                      {request.products.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">إجمالي القطع:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                      {request.totalItems}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-slate-400">القيمة الإجمالية:</span>
                    <span className="font-medium text-primary-600 dark:text-primary-400 mr-2">
                      {request.totalValue.toFixed(2)} ₪
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(request.notes || request.adminNotes) && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <AlertCircle className="w-5 h-5 ml-2" />
                  الملاحظات
                </h3>
              </div>
              <div className="card-body space-y-4">
                {request.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                      ملاحظات المورد:
                    </h4>
                    <p className="text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 p-3 rounded-md">
                      {request.notes}
                    </p>
                  </div>
                )}
                {request.adminNotes && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                      ملاحظات الإدارة:
                    </h4>
                    <p className="text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 p-3 rounded-md">
                      {request.adminNotes}
                    </p>
                  </div>
                )}
                {request.rejectionReason && (
                  <div>
                    <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                      سبب الرفض:
                    </h4>
                    <p className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                      {request.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <User className="w-5 h-5 ml-2" />
                معلومات المورد
              </h3>
            </div>
            <div className="card-body space-y-3">
              <div>
                <span className="text-gray-600 dark:text-slate-400">الاسم:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                  {request.supplierName}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400">البريد الإلكتروني:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                  {request.supplierEmail}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400">رقم الهاتف:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                  {request.supplierPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Calendar className="w-5 h-5 ml-2" />
                تفاصيل الطلب
              </h3>
            </div>
            <div className="card-body space-y-3">
              <div>
                <span className="text-gray-600 dark:text-slate-400">تاريخ الإنشاء:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                  {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                </span>
              </div>
              {request.expectedDeliveryDate && (
                <div>
                  <span className="text-gray-600 dark:text-slate-400">تاريخ التسليم المتوقع:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                    {new Date(request.expectedDeliveryDate).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              )}
              {request.warehouseLocation && (
                <div>
                  <span className="text-gray-600 dark:text-slate-400">موقع المستودع:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                    {request.warehouseLocation}
                  </span>
                </div>
              )}
              {request.approvedAt && (
                <div>
                  <span className="text-gray-600 dark:text-slate-400">تاريخ الموافقة:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                    {new Date(request.approvedAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              )}
              {request.rejectedAt && (
                <div>
                  <span className="text-gray-600 dark:text-slate-400">تاريخ الرفض:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100 mr-2">
                    {new Date(request.rejectedAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {user?.role === 'admin' && request.status === 'pending' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">الإجراءات</h3>
              </div>
              <div className="card-body space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={updating}
                  className="btn-primary w-full"
                >
                  {updating ? 'جاري...' : 'الموافقة على الطلب'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={updating}
                  className="btn-danger w-full"
                >
                  {updating ? 'جاري...' : 'رفض الطلب'}
                </button>
              </div>
            </div>
          )}

          {/* Delete Action */}
          {(user?.role === 'supplier' || user?.role === 'admin') && request.status !== 'approved' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">حذف الطلب</h3>
              </div>
              <div className="card-body">
                <button
                  onClick={handleDelete}
                  disabled={updating}
                  className="btn-danger w-full"
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
    </div>
  );
} 