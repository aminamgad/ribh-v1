'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RotateCw,
  Filter,
  User,
  Phone,
  Mail
} from 'lucide-react';

interface WithdrawalRequest {
  _id: string;
  userId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  walletNumber: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestDate: string;
  processedDate?: string;
  notes?: string;
  rejectionReason?: string;
  processedBy?: string;
  walletInfo?: {
    balance: number;
    pendingWithdrawals: number;
    availableBalance: number;
  };
}

export default function AdminWithdrawalsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; withdrawalId: string | null; reason: string }>({
    isOpen: false,
    withdrawalId: null,
    reason: ''
  });
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; withdrawalId: string | null; status: string; notes: string }>({
    isOpen: false,
    withdrawalId: null,
    status: '',
    notes: ''
  });

  // Generate cache key based on filters
  const cacheKey = useMemo(() => {
    return `admin_withdrawals_${statusFilter}_${currentPage}`;
  }, [statusFilter, currentPage]);

  // Use cache hook for withdrawals
  const { data: withdrawalsData, loading, refresh } = useDataCache<{
    success: boolean;
    withdrawals: WithdrawalRequest[];
    pagination: { pages: number };
    statistics?: {
      pending: number;
      approved: number;
      rejected: number;
      completed: number;
      total: number;
    };
  }>({
    key: cacheKey,
    fetchFn: async () => {
      const response = await fetch(`/api/admin/withdrawals?status=${statusFilter}&page=${currentPage}`);
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawals');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch withdrawals');
      }
      return data;
    },
    enabled: !!user && user.role === 'admin',
    forceRefresh: false,
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ في جلب طلبات السحب');
    }
  });

  const withdrawals = withdrawalsData?.withdrawals || [];

  useEffect(() => {
    if (withdrawalsData?.pagination) {
      setTotalPages(withdrawalsData.pagination.pages);
    }
  }, [withdrawalsData]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-withdrawals', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-withdrawals', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchWithdrawals for backward compatibility
  const fetchWithdrawals = async () => {
    refresh();
  };

  const handleStatusUpdate = async (requestId: string, status: string, notes?: string, rejectionReason?: string) => {
    setProcessing(requestId);
    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status,
          notes,
          rejectionReason
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'تم تحديث حالة الطلب بنجاح');
        // Refresh data and statistics
        await fetchWithdrawals();
        // Force refresh to update statistics
        refresh();
      } else {
        // Show detailed error message
        const errorMessage = data.message || 'حدث خطأ في تحديث طلب السحب';
        toast.error(errorMessage, {
          duration: 5000,
        });
      }
    } catch (error: any) {
      // Handle network errors or JSON parsing errors
      const errorMessage = error?.message || 'حدث خطأ في الاتصال بالخادم';
      toast.error(`خطأ: ${errorMessage}`, {
        duration: 5000,
      });
      console.error('Error updating withdrawal status:', error);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: Clock, text: 'معلق' },
      approved: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: CheckCircle, text: 'تمت الموافقة' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle, text: 'مرفوض' },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle, text: 'مكتمل' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 ml-1" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}₪`;
  };

  const getStatusCount = (status: string) => {
    // Use statistics from API if available, otherwise fallback to filtered withdrawals
    if (withdrawalsData?.statistics) {
      return withdrawalsData.statistics[status as keyof typeof withdrawalsData.statistics] || 0;
    }
    return withdrawals.filter(w => w.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <RotateCw className="w-8 h-8 animate-spin text-[#FF9800] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">إدارة طلبات السحب</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1 sm:mt-2">مراجعة وإدارة طلبات سحب الأرباح</p>
        </div>
        <Button onClick={fetchWithdrawals} variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] text-sm sm:text-base px-3 sm:px-4 w-full sm:w-auto">
          <RotateCw className="w-4 h-4 ml-1.5 sm:ml-2" />
          تحديث
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 dark:text-yellow-400 ml-2 sm:ml-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">معلق</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate">{getStatusCount('pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 ml-2 sm:ml-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">تمت الموافقة</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate">{getStatusCount('approved')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400 ml-2 sm:ml-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">مرفوض</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 truncate">{getStatusCount('rejected')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 ml-2 sm:ml-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">مكتمل</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">{getStatusCount('completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 text-gray-600 dark:text-gray-300 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200">تصفية حسب الحالة:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm sm:text-base min-h-[44px] flex-1 sm:flex-initial"
            >
              <option value="all">جميع الطلبات</option>
              <option value="pending">معلق</option>
              <option value="approved">تمت الموافقة</option>
              <option value="rejected">مرفوض</option>
              <option value="completed">مكتمل</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Requests */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900 dark:text-white">
            <CreditCard className="w-5 h-5 ml-2 text-blue-600 dark:text-blue-400" />
            طلبات السحب
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات سحب</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal._id} className="border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-white dark:bg-gray-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                          {withdrawal.user?.name || 'غير معروف'}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">({withdrawal.user?.role || 'غير معروف'})</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 ml-1 flex-shrink-0" />
                          <span className="truncate">{withdrawal.user?.email || 'غير متوفر'}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 ml-1 flex-shrink-0" />
                          <span>{withdrawal.user?.phone || 'غير متوفر'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(withdrawal.status)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5">المبلغ:</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {formatAmount(withdrawal.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-0.5">رقم المحفظة:</p>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white font-mono break-all">
                        {withdrawal.walletNumber}
                      </p>
                    </div>
                  </div>
                  
                  {withdrawal.walletInfo && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">معلومات المحفظة:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">الرصيد الحالي:</p>
                          <p className={`text-xs sm:text-sm font-semibold ${withdrawal.walletInfo.balance >= withdrawal.amount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatAmount(withdrawal.walletInfo.balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">الرصيد المتاح:</p>
                          <p className={`text-xs sm:text-sm font-semibold ${withdrawal.walletInfo.availableBalance >= withdrawal.amount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatAmount(withdrawal.walletInfo.availableBalance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5">المبلغ المعلق:</p>
                          <p className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400">
                            {formatAmount(withdrawal.walletInfo.pendingWithdrawals)}
                          </p>
                        </div>
                      </div>
                      {withdrawal.walletInfo.availableBalance < withdrawal.amount && (
                        <div className="mt-2 sm:mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs sm:text-sm text-red-700 dark:text-red-300">
                          ⚠️ الرصيد المتاح غير كافي للموافقة على هذا الطلب
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-0.5">تاريخ الطلب:</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(withdrawal.requestDate)}
                      </p>
                    </div>
                    
                    {withdrawal.processedDate && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">تاريخ المعالجة:</p>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(withdrawal.processedDate)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {withdrawal.notes && (
                    <div className="mb-3 sm:mb-4 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات الطلب:</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white text-wrap-long">{withdrawal.notes}</p>
                    </div>
                  )}
                  
                  {withdrawal.rejectionReason && (
                    <div className="mb-3 sm:mb-4 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs sm:text-sm text-red-500 dark:text-red-400 mb-1">سبب الرفض:</p>
                      <p className="text-xs sm:text-sm text-red-600 dark:text-red-300 text-wrap-long">{withdrawal.rejectionReason}</p>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {withdrawal.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => {
                          setNotesModal({
                            isOpen: true,
                            withdrawalId: withdrawal._id,
                            status: 'approved',
                            notes: ''
                          });
                        }}
                        disabled={processing === withdrawal._id}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 min-h-[44px] text-sm sm:text-base flex-1 sm:flex-initial"
                        size="sm"
                      >
                        {processing === withdrawal._id ? 'جاري...' : 'موافقة'}
                      </Button>
                      <Button
                        onClick={() => {
                          setNotesModal({
                            isOpen: true,
                            withdrawalId: withdrawal._id,
                            status: 'completed',
                            notes: ''
                          });
                        }}
                        disabled={processing === withdrawal._id}
                        className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00] min-h-[44px] text-sm sm:text-base flex-1 sm:flex-initial"
                        size="sm"
                      >
                        {processing === withdrawal._id ? 'جاري...' : 'إكمال وتحويل'}
                      </Button>
                      <Button
                        onClick={() => {
                          setRejectionModal({
                            isOpen: true,
                            withdrawalId: withdrawal._id,
                            reason: ''
                          });
                        }}
                        disabled={processing === withdrawal._id}
                        variant="destructive"
                        size="sm"
                        className="min-h-[44px] text-sm sm:text-base flex-1 sm:flex-initial"
                      >
                        {processing === withdrawal._id ? 'جاري...' : 'رفض'}
                      </Button>
                    </div>
                  )}
                  
                  {withdrawal.status === 'approved' && (
                    <div className="flex gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => handleStatusUpdate(withdrawal._id, 'completed')}
                        disabled={processing === withdrawal._id}
                        className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00] min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
                        size="sm"
                      >
                        {processing === withdrawal._id ? 'جاري...' : 'إكمال وتحويل'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] text-sm sm:text-base px-3 sm:px-4"
          >
            السابق
          </Button>
          
          <span className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            صفحة {currentPage} من {totalPages}
          </span>
          
          <Button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] text-sm sm:text-base px-3 sm:px-4"
          >
            التالي
          </Button>
        </div>
      )}

      {/* Rejection Reason Modal */}
      <ConfirmationModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, withdrawalId: null, reason: '' })}
        onConfirm={() => {
          if (rejectionModal.withdrawalId && rejectionModal.reason.trim()) {
            handleStatusUpdate(rejectionModal.withdrawalId, 'rejected', undefined, rejectionModal.reason.trim());
            setRejectionModal({ isOpen: false, withdrawalId: null, reason: '' });
          } else {
            toast.error('يرجى إدخال سبب الرفض');
          }
        }}
        title="رفض طلب السحب"
        message="يرجى إدخال سبب رفض طلب السحب:"
        confirmText="رفض"
        cancelText="إلغاء"
        type="danger"
        loading={processing === rejectionModal.withdrawalId}
        customContent={
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              سبب الرفض
            </label>
            <textarea
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
              placeholder="أدخل سبب الرفض..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white text-sm min-h-[100px] resize-y"
              autoFocus
            />
          </div>
        }
      />

      {/* Notes Modal for Approval/Completion */}
      <ConfirmationModal
        isOpen={notesModal.isOpen}
        onClose={() => setNotesModal({ isOpen: false, withdrawalId: null, status: '', notes: '' })}
        onConfirm={() => {
          if (notesModal.withdrawalId) {
            handleStatusUpdate(notesModal.withdrawalId, notesModal.status, notesModal.notes.trim() || undefined);
            setNotesModal({ isOpen: false, withdrawalId: null, status: '', notes: '' });
          }
        }}
        title={notesModal.status === 'approved' ? 'موافقة على طلب السحب' : 'إكمال وتحويل طلب السحب'}
        message={notesModal.status === 'approved' ? 'يمكنك إضافة ملاحظات اختيارية:' : 'يمكنك إضافة ملاحظات اختيارية:'}
        confirmText={notesModal.status === 'approved' ? 'موافقة' : 'إكمال وتحويل'}
        cancelText="إلغاء"
        type={notesModal.status === 'approved' ? 'success' : 'info'}
        loading={processing === notesModal.withdrawalId}
        customContent={
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الملاحظات (اختياري)
            </label>
            <textarea
              value={notesModal.notes}
              onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
              placeholder="أدخل ملاحظاتك هنا..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white text-sm min-h-[100px] resize-y"
              autoFocus
            />
          </div>
        }
      />
    </div>
  );
} 