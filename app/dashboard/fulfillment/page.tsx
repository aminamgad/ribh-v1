'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Plus, Search, Filter, Eye, CheckCircle, X, Clock, Package, Phone, Mail, MessageCircle, XCircle, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface FulfillmentRequest {
  _id: string;
  supplierName: string;
  supplierPhone?: string;
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

export default function FulfillmentPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FulfillmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const router = useRouter();

  // WhatsApp communication functions
  const openWhatsApp = (phone: string, message: string) => {
    const formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '970'); // Convert to international format
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateApprovalMessage = (request: any) => {
    const supplierName = request.supplierName || 'المورد';
    const productName = request.productName;
    const quantity = request.quantity;
    
    return `مرحباً ${supplierName} 👋

تم الموافقة على طلب التخزين الخاص بك! ✅

🛍️ المنتج: ${productName}
📦 الكمية: ${quantity}

سيتم التواصل معك قريباً لتأكيد التفاصيل النهائية.

شكراً لثقتك بنا 🙏`;
  };

  const generateRejectionMessage = (request: any, reason: string) => {
    const supplierName = request.supplierName || 'المورد';
    const productName = request.productName;
    
    return `مرحباً ${supplierName} 👋

نعتذر، تم رفض طلب التخزين الخاص بك ❌

🛍️ المنتج: ${productName}
📝 السبب: ${reason}

يمكنك التواصل معنا للمزيد من التفاصيل.

شكراً لاهتمامك 🙏`;
  };

  const handleWhatsAppApproval = (request: any) => {
    const message = generateApprovalMessage(request);
    const phone = request.supplierPhone || '';
    if (phone) {
      openWhatsApp(phone, message);
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

  const handleWhatsAppRejection = (request: any, reason: string) => {
    const message = generateRejectionMessage(request, reason);
    const phone = request.supplierPhone || '';
    if (phone) {
      openWhatsApp(phone, message);
    } else {
      toast.error('رقم الهاتف غير متوفر');
    }
  };

  useEffect(() => {
    fetchFulfillmentRequests();
    
    // Auto-refresh every 30 seconds for admins
    if (user?.role === 'admin') {
      const interval = setInterval(() => {
        fetchFulfillmentRequests(true); // Silent refresh
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  const fetchFulfillmentRequests = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const response = await fetch('/api/fulfillment');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
        if (!silent) {
          toast.success(`تم تحديث البيانات - ${data.requests.length} طلب`);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء جلب طلبات التخزين');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب طلبات التخزين');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
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
        const data = await response.json();
        toast.success(data.message || 'تم الموافقة على الطلب بنجاح وتم تحديث المخزون تلقائياً');
        fetchFulfillmentRequests();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء الموافقة على الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الموافقة على الطلب');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    setProcessingRequest(requestId);
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
        const data = await response.json();
        toast.success(data.message || 'تم رفض الطلب بنجاح');
        fetchFulfillmentRequests();
        setShowRejectModal(false);
        setSelectedRequestId(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء رفض الطلب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض الطلب');
    } finally {
      setProcessingRequest(null);
    }
  };

  const openRejectModal = (requestId: string) => {
    setSelectedRequestId(requestId);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (!selectedRequestId) {
      toast.error('خطأ في تحديد الطلب');
      return;
    }
    handleRejectRequest(selectedRequestId, 'تم رفض الطلب من قبل الإدارة');
  };

  const handleCancelReject = () => {
    console.log('Canceling rejection modal');
    setShowRejectModal(false);
    setSelectedRequestId(null);
    toast.success('تم إلغاء عملية الرفض');
  };

  const handleViewDetails = async (requestId: string) => {
    try {
      console.log('Navigating to fulfillment request:', requestId);
      console.log('Available requests:', requests.map(r => ({ id: r._id, status: r.status })));
      
      // Validate that the request exists in our current list
      const requestExists = requests.find(r => r._id === requestId);
      if (!requestExists) {
        console.error('Request not found in current list:', requestId);
        toast.error('طلب التخزين غير موجود في القائمة الحالية');
        return;
      }
      
      setNavigatingTo(requestId);
      
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await router.push(`/dashboard/fulfillment/${requestId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('حدث خطأ أثناء الانتقال إلى صفحة التفاصيل');
      
      // Fallback: try using window.location if router fails
      try {
        window.location.href = `/dashboard/fulfillment/${requestId}`;
      } catch (fallbackError) {
        console.error('Fallback navigation also failed:', fallbackError);
        toast.error('فشل في الانتقال إلى صفحة التفاصيل');
      }
    } finally {
      setNavigatingTo(null);
    }
  };

  // Filter and sort requests
  const filteredAndSortedRequests = requests
    .filter(request => {
      const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
      const matchesSearch = searchTerm === '' || 
        request.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.products.some(product => 
          product.productName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'totalValue':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'totalItems':
          comparison = a.totalItems - b.totalItems;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getStats = () => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalValue = requests.reduce((sum, r) => sum + r.totalValue, 0);
    const pendingValue = requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.totalValue, 0);
    const approvedValue = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.totalValue, 0);

    return { 
      total, 
      pending, 
      approved, 
      rejected,
      totalValue, 
      pendingValue, 
      approvedValue 
    };
  };

  const getStatusButton = (request: FulfillmentRequest) => {
    if (user?.role !== 'admin' || request.status !== 'pending') {
      return null;
    }

    return (
      <div className="flex items-center space-x-2 space-x-reverse">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleApproveRequest(request._id);
          }}
          disabled={processingRequest === request._id}
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
          title="موافقة"
        >
          {processingRequest === request._id ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openRejectModal(request._id);
          }}
          disabled={processingRequest === request._id}
          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
          title="رفض"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    );
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
        
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={() => fetchFulfillmentRequests()}
            disabled={refreshing}
            className="btn-secondary"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          
          {user?.role === 'supplier' && (
            <Link href="/dashboard/fulfillment/new" className="btn-primary">
              <Plus className="w-5 h-5 ml-2" />
              طلب تخزين جديد
            </Link>
          )}
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-lg">
              <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="bg-warning-100 dark:bg-warning-900/30 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">قيد الانتظار</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.pending}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{stats.pendingValue.toFixed(0)} ₪</p>
            </div>
          </div>
        </div>
        
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="bg-success-100 dark:bg-success-900/30 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">معتمد</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.approved}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{stats.approvedValue.toFixed(0)} ₪</p>
            </div>
          </div>
        </div>
        
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="bg-secondary-100 dark:bg-secondary-900/30 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي القيمة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.totalValue.toFixed(0)} ₪</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">جميع الطلبات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Filter className="w-4 h-4 text-gray-500" />
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
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field"
              >
                <option value="createdAt">تاريخ الإنشاء</option>
                <option value="totalValue">القيمة</option>
                <option value="totalItems">الكمية</option>
                <option value="status">الحالة</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="btn-secondary"
                title={sortOrder === 'asc' ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="البحث في المورد أو المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {filteredAndSortedRequests.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            {searchTerm || filterStatus !== 'all' ? 'لا توجد نتائج' : 'لا توجد طلبات تخزين'}
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            {searchTerm || filterStatus !== 'all' 
              ? 'جرب تغيير معايير البحث أو الفلترة'
              : user?.role === 'supplier' 
                ? 'لم تقم بإنشاء أي طلبات تخزين بعد. ابدأ بإنشاء طلبك الأول!'
                : 'لا توجد طلبات تخزين متاحة حالياً.'
            }
          </p>
          {(searchTerm || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="btn-secondary"
            >
              مسح الفلاتر
            </button>
          )}
          {user?.role === 'supplier' && !searchTerm && filterStatus === 'all' && (
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
                {filteredAndSortedRequests.map((request) => {
                  const StatusIcon = statusIcons[request.status];
                  return (
                    <tr 
                      key={request._id} 
                      className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => handleViewDetails(request._id)}
                    >
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
                          <span className="block text-xs text-red-600 dark:text-red-400 mt-1 flex items-center">
                            <AlertTriangle className="w-3 h-3 ml-1" />
                            متأخر
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(request._id);
                            }}
                            disabled={navigatingTo === request._id}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-all duration-200 p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 hover:scale-110"
                            title="عرض التفاصيل"
                          >
                            {navigatingTo === request._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                            ) : (
                              <Eye className="w-4 h-4 hover:scale-110 transition-transform duration-200" />
                            )}
                          </button>
                          
                          {/* WhatsApp Contact */}
                          {request.supplierPhone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const message = `مرحباً ${request.supplierName} 👋

معلومات طلب التخزين الخاص بك 📦

🛍️ المنتجات: ${request.products.map((p: any) => p.productName).join('، ')}
📦 إجمالي القطع: ${request.totalItems}
💰 القيمة الإجمالية: ${request.totalValue} ₪
🔄 الحالة: ${statusLabels[request.status]}

هل لديك أي استفسارات حول طلبك؟

شكراً لثقتك بنا 🙏`;
                                openWhatsApp(request.supplierPhone!, message);
                              }}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-all duration-200 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 hover:scale-110"
                              title="تواصل عبر واتساب"
                            >
                              <MessageCircle className="w-4 h-4 hover:scale-110 transition-transform duration-200" />
                            </button>
                          )}
                          
                          {/* Phone Contact */}
                          {request.supplierPhone && (
                            <a
                              href={`tel:${request.supplierPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] transition-all duration-200 p-2 rounded-lg hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-offset-2 hover:scale-110"
                              title="اتصال مباشر"
                            >
                              <Phone className="w-4 h-4 hover:scale-110 transition-transform duration-200" />
                            </a>
                          )}
                          
                          {getStatusButton(request)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Results Summary */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              عرض {filteredAndSortedRequests.length} من أصل {requests.length} طلب
              {searchTerm && ` - نتائج البحث عن "${searchTerm}"`}
            </p>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequestId(null);
        }}
        onConfirm={confirmReject}
        onCancel={handleCancelReject}
        title="رفض طلب التخزين"
        message="هل أنت متأكد من رفض هذا طلب التخزين؟"
        confirmText="رفض"
        cancelText="إلغاء"
        type="danger"
        loading={processingRequest === selectedRequestId}
      />
    </div>
  );
} 