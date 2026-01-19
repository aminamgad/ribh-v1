'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Filter,
  User,
  Phone,
  Mail
} from 'lucide-react';

interface WithdrawalRequest {
  _id: string;
  userId: {
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
}

export default function AdminWithdrawalsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);

  // Generate cache key based on filters
  const cacheKey = useMemo(() => {
    return `admin_withdrawals_${statusFilter}_${currentPage}`;
  }, [statusFilter, currentPage]);

  // Use cache hook for withdrawals
  const { data: withdrawalsData, loading, refresh } = useDataCache<{
    success: boolean;
    withdrawals: WithdrawalRequest[];
    pagination: { pages: number };
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
        toast.success(data.message);
        fetchWithdrawals(); // Refresh data
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating withdrawal request:', error);
      toast.error('حدث خطأ في تحديث طلب السحب');
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
    return withdrawals.filter(w => w.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة طلبات السحب</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">مراجعة وإدارة طلبات سحب الأرباح</p>
        </div>
        <Button onClick={fetchWithdrawals} variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400 ml-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">معلق</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{getStatusCount('pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 ml-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">تمت الموافقة</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getStatusCount('approved')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400 ml-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">مرفوض</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{getStatusCount('rejected')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 ml-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">مكتمل</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{getStatusCount('completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Filter className="w-4 h-4 ml-2 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">تصفية حسب الحالة:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
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
                <div key={withdrawal._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {withdrawal.userId.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({withdrawal.userId.role})</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 ml-1" />
                          {withdrawal.userId.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 ml-1" />
                          {withdrawal.userId.phone}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(withdrawal.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">المبلغ:</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatAmount(withdrawal.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">رقم المحفظة:</p>
                      <p className="text-gray-900 dark:text-white font-mono">
                        {withdrawal.walletNumber}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">تاريخ الطلب:</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(withdrawal.requestDate)}
                      </p>
                    </div>
                    
                    {withdrawal.processedDate && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">تاريخ المعالجة:</p>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(withdrawal.processedDate)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {withdrawal.notes && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">ملاحظات الطلب:</p>
                      <p className="text-gray-900 dark:text-white text-sm">{withdrawal.notes}</p>
                    </div>
                  )}
                  
                  {withdrawal.rejectionReason && (
                    <div className="mb-4">
                      <p className="text-sm text-red-500 dark:text-red-400">سبب الرفض:</p>
                      <p className="text-red-600 dark:text-red-300 text-sm">{withdrawal.rejectionReason}</p>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {withdrawal.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleStatusUpdate(withdrawal._id, 'approved')}
                        disabled={processing === withdrawal._id}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                        size="sm"
                      >
                        {processing === withdrawal._id ? 'جاري...' : 'موافقة'}
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(withdrawal._id, 'completed')}
                        disabled={processing === withdrawal._id}
                        className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
                        size="sm"
                      >
                        {processing === withdrawal._id ? 'جاري...' : 'إكمال وتحويل'}
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = prompt('سبب الرفض:');
                          if (reason) {
                            handleStatusUpdate(withdrawal._id, 'rejected', undefined, reason);
                          }
                        }}
                        disabled={processing === withdrawal._id}
                        variant="destructive"
                        size="sm"
                      >
                        {processing === withdrawal._id ? 'جاري...' : 'رفض'}
                      </Button>
                    </div>
                  )}
                  
                  {withdrawal.status === 'approved' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleStatusUpdate(withdrawal._id, 'completed')}
                        disabled={processing === withdrawal._id}
                        className="bg-[#FF9800] hover:bg-[#F57C00] dark:bg-[#FF9800] dark:hover:bg-[#F57C00]"
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
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            السابق
          </Button>
          
          <span className="flex items-center px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
            صفحة {currentPage} من {totalPages}
          </span>
          
          <Button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
} 