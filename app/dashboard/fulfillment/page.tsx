'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Package, Truck, CheckCircle, XCircle, Clock, Plus, Eye, Edit } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface FulfillmentRequest {
  _id: string;
  supplierName: string;
  products: Array<{
    productName: string;
    quantity: number;
    currentStock: number;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  totalValue: number;
  totalItems: number;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  approvedAt?: string;
  expectedDeliveryDate?: string;
  isOverdue?: boolean;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
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

export default function FulfillmentPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FulfillmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchFulfillmentRequests();
  }, []);

  const fetchFulfillmentRequests = async () => {
    try {
      const response = await fetch('/api/fulfillment');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب طلبات التخزين');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/fulfillment/${requestId}`, {
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
        toast.success('تم الموافقة على الطلب بنجاح');
        fetchFulfillmentRequests();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء الموافقة على الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الموافقة على الطلب');
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/fulfillment/${requestId}`, {
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
        toast.success('تم رفض الطلب بنجاح');
        fetchFulfillmentRequests();
      } else {
        toast.error('حدث خطأ أثناء رفض الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض الطلب');
    }
  };

  const filteredRequests = requests.filter(request => {
    return filterStatus === 'all' || request.status === filterStatus;
  });

  const getStats = () => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const totalValue = requests.reduce((sum, r) => sum + r.totalValue, 0);

    return { total, pending, approved, totalValue };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">إدارة التخزين</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            {user?.role === 'supplier' 
              ? 'إدارة طلبات تخزين منتجاتك'
              : 'إدارة جميع طلبات التخزين في المنصة'
            }
          </p>
        </div>
        
        {user?.role === 'supplier' && (
          <Link href="/dashboard/fulfillment/new" className="btn-primary">
            <Plus className="w-5 h-5 ml-2" />
            طلب تخزين جديد
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
              <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي الطلبات</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-warning-100 dark:bg-warning-900/30 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">قيد الانتظار</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">معتمد</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.approved}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-secondary-100 dark:bg-secondary-900/30 p-2 rounded-lg">
              <Truck className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي القيمة</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.totalValue.toFixed(0)} ₪</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">جميع الطلبات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">معتمد</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد طلبات تخزين</h3>
          <p className="text-gray-600 dark:text-slate-400">
            {user?.role === 'supplier' 
              ? 'لم تقم بإنشاء أي طلبات تخزين بعد. ابدأ بإنشاء طلبك الأول!'
              : 'لا توجد طلبات تخزين متاحة حالياً.'
            }
          </p>
          {user?.role === 'supplier' && (
            <Link href="/dashboard/fulfillment/new" className="btn-primary mt-4">
              <Plus className="w-5 h-5 ml-2" />
              طلب تخزين جديد
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="table-header">المورد</th>
                  <th className="table-header">المنتجات</th>
                  <th className="table-header">الكمية</th>
                  <th className="table-header">القيمة</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">التاريخ</th>
                  <th className="table-header">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredRequests.map((request) => {
                  const StatusIcon = statusIcons[request.status];
                  return (
                    <tr key={request._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{request.supplierName}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          {request.products.map((product, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-gray-900 dark:text-slate-100">{product.productName}</span>
                              <span className="text-gray-500 dark:text-slate-400">×{product.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-gray-900 dark:text-slate-100">{request.totalItems} قطعة</span>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-primary-600 dark:text-primary-400">{request.totalValue} ₪</span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {statusLabels[request.status]}
                        </span>
                        {request.isOverdue && (
                          <span className="block text-xs text-red-600 dark:text-red-400 mt-1">متأخر</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Link
                            href={`/dashboard/fulfillment/${request._id}`}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          {user?.role === 'admin' && request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveRequest(request._id)}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('سبب الرفض:');
                                  if (reason) {
                                    handleRejectRequest(request._id, reason);
                                  }
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 