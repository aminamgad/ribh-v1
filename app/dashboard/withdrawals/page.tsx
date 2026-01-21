'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface WalletData {
  balance: number;
  pendingWithdrawals?: number;
  availableBalance?: number;
  totalEarnings: number;
  totalWithdrawals: number;
  canWithdraw: boolean;
  minimumWithdrawal: number;
}

interface WithdrawalRequest {
  _id: string;
  walletNumber: string;
  amount: number;
  fees: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  createdAt: string;
  notes?: string;
}

interface SystemSettings {
  withdrawalSettings: {
    minimumWithdrawal: number;
    maximumWithdrawal: number;
    withdrawalFees: number;
  };
}

export default function WithdrawalsPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletNumber, setWalletNumber] = useState('');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // Use cache hook for withdrawal requests
  const { data: withdrawalsData, loading: isLoading, refresh: refreshWithdrawals } = useDataCache<{
    success: boolean;
    withdrawalRequests: WithdrawalRequest[];
  }>({
    key: 'withdrawals',
    fetchFn: async () => {
      const response = await fetch('/api/withdrawals');
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawals');
      }
      return response.json();
    },
    enabled: !!user,
    forceRefresh: false
  });

  // Use cache hook for wallet data
  const { data: walletResponse, refresh: refreshWallet } = useDataCache<{
    success: boolean;
    wallet: WalletData;
  }>({
    key: 'wallet_withdrawals',
    fetchFn: async () => {
      const response = await fetch('/api/wallet/status');
      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }
      return response.json();
    },
    enabled: !!user,
    forceRefresh: false
  });

  // Use cache hook for system settings
  const { data: settingsResponse, refresh: refreshSettings } = useDataCache<{
    success: boolean;
    settings: SystemSettings;
  }>({
    key: 'system_settings_withdrawals',
    fetchFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json();
    },
    enabled: !!user,
    forceRefresh: false
  });

  const walletData = walletResponse?.wallet || null;
  const withdrawalRequests = withdrawalsData?.withdrawalRequests || [];
  const systemSettings = settingsResponse?.settings || null;

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refreshWithdrawals();
      refreshWallet();
      refreshSettings();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-withdrawals', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-withdrawals', handleRefresh);
    };
  }, [refreshWithdrawals, refreshWallet, refreshSettings]);

  // Keep functions for backward compatibility
  const fetchWalletData = async () => {
    refreshWallet();
  };

  const fetchWithdrawalRequests = async () => {
    refreshWithdrawals();
  };

  const fetchSystemSettings = async () => {
    refreshSettings();
  };

  const handleSubmitWithdrawal = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate form data
      if (!walletNumber.trim()) {
        toast.error('رقم المحفظة مطلوب');
        return;
      }
      
      if (!amount || amount <= 0) {
        toast.error('المبلغ مطلوب ويجب أن يكون أكبر من صفر');
        return;
      }
      
      // Apply system settings validation
      if (systemSettings) {
        if (amount < systemSettings.withdrawalSettings.minimumWithdrawal) {
          toast.error(`الحد الأدنى للسحب هو ${systemSettings.withdrawalSettings.minimumWithdrawal}₪`);
          return;
        }
        
        if (amount > systemSettings.withdrawalSettings.maximumWithdrawal) {
          toast.error(`الحد الأقصى للسحب هو ${systemSettings.withdrawalSettings.maximumWithdrawal}₪`);
          return;
        }
      }
      
      // Calculate fees
      let fees = 0;
      if (systemSettings) {
        fees = (amount * systemSettings.withdrawalSettings.withdrawalFees) / 100;
      }
      const totalAmount = amount + fees;
      
      // Check if user has sufficient balance
      if (walletData && walletData.balance < totalAmount) {
        toast.error(`الرصيد غير كافي (المطلوب: ${totalAmount}₪ مع الرسوم)`);
        return;
      }
      
      // Create withdrawal request
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletNumber,
          amount,
          notes: notes
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('تم إرسال طلب السحب بنجاح');
        setWalletNumber('');
        setAmount(0);
        setNotes('');
        fetchWalletData();
        fetchWithdrawalRequests();
      } else {
        toast.error(data.message || 'حدث خطأ في إرسال طلب السحب');
      }
    } catch (error) {
      console.error('خطأ في إرسال طلب السحب:', error);
      toast.error('حدث خطأ في إرسال طلب السحب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      approved: { text: 'تمت الموافقة', className: 'bg-[#4CAF50]/20 text-[#4CAF50] dark:bg-[#4CAF50]/30 dark:text-[#4CAF50]' },
      completed: { text: 'مكتمل', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      rejected: { text: 'مرفوض', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">طلبات السحب</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Wallet Overview */}
        <Card className="p-3 sm:p-4 md:p-6">
          <CardHeader className="p-0 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg md:text-xl">نظرة عامة على المحفظة</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2 sm:space-y-3">
            {walletData ? (
              <>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">الرصيد الحالي:</span>
                  <span className="font-bold text-base sm:text-lg">{walletData.balance}₪</span>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">الرصيد المتاح:</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400">
                      {(walletData.availableBalance || walletData.balance)}₪
                    </span>
                    {(walletData.pendingWithdrawals || 0) > 0 && (
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        ({(walletData.pendingWithdrawals || 0)}₪ قيد السحب)
                      </span>
                    )}
                  </div>
                </div>
                {(walletData.pendingWithdrawals || 0) > 0 && (
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-gray-600 dark:text-gray-400">السحوبات المعلقة:</span>
                    <span className="text-orange-600 dark:text-orange-400">{walletData.pendingWithdrawals}₪</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">إجمالي الأرباح:</span>
                  <span>{walletData.totalEarnings}₪</span>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">إجمالي السحوبات:</span>
                  <span>{walletData.totalWithdrawals}₪</span>
                </div>
                {systemSettings && (
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-gray-600 dark:text-gray-400">الحد الأدنى للسحب:</span>
                    <span>{systemSettings.withdrawalSettings.minimumWithdrawal}₪</span>
                  </div>
                )}
                {systemSettings && (
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-gray-600 dark:text-gray-400">الحد الأقصى للسحب:</span>
                    <span>{systemSettings.withdrawalSettings.maximumWithdrawal}₪</span>
                  </div>
                )}
                {systemSettings && (
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-gray-600 dark:text-gray-400">رسوم السحب:</span>
                    <span>{systemSettings.withdrawalSettings.withdrawalFees}%</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm sm:text-base">جاري تحميل بيانات المحفظة...</p>
            )}
          </CardContent>
        </Card>

        {/* New Withdrawal Request */}
        <Card className="p-3 sm:p-4 md:p-6">
          <CardHeader className="p-0 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg md:text-xl">طلب سحب جديد</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="walletNumber" className="text-xs sm:text-sm mb-1.5 sm:mb-2">رقم المحفظة</Label>
              <Input
                id="walletNumber"
                value={walletNumber}
                onChange={(e) => setWalletNumber(e.target.value)}
                placeholder="أدخل رقم المحفظة"
                className="text-sm sm:text-base min-h-[44px]"
              />
            </div>
            
            <div>
              <Label htmlFor="amount" className="text-xs sm:text-sm mb-1.5 sm:mb-2">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="أدخل المبلغ"
                className="text-sm sm:text-base min-h-[44px]"
              />
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-xs sm:text-sm mb-1.5 sm:mb-2">ملاحظات (اختياري)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية"
                rows={3}
                className="text-sm sm:text-base min-h-[100px]"
              />
            </div>
            
            {systemSettings && amount > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                <h4 className="text-sm sm:text-base font-semibold mb-2">تفاصيل السحب:</h4>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span>المبلغ المطلوب:</span>
                    <span className="font-medium">{amount}₪</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>الرسوم ({systemSettings.withdrawalSettings.withdrawalFees}%):</span>
                    <span className="font-medium">{(amount * systemSettings.withdrawalSettings.withdrawalFees / 100)}₪</span>
                  </div>
                  <div className="flex justify-between items-center font-bold pt-1 border-t border-gray-200 dark:border-slate-700">
                    <span>الإجمالي:</span>
                    <span>{amount + (amount * systemSettings.withdrawalSettings.withdrawalFees / 100)}₪</span>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleSubmitWithdrawal}
              disabled={isSubmitting || !walletData?.canWithdraw}
              className="w-full min-h-[44px] text-sm sm:text-base font-medium"
            >
              {isSubmitting ? 'جاري إرسال الطلب...' : 'إرسال طلب السحب'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Requests History */}
      <Card className="mt-4 sm:mt-6 md:mt-8 p-3 sm:p-4 md:p-6">
        <CardHeader className="p-0 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg md:text-xl">سجل طلبات السحب</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {withdrawalRequests.length === 0 ? (
            <p className="text-center text-sm sm:text-base text-gray-600 dark:text-gray-400 py-4">لا توجد طلبات سحب</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {withdrawalRequests.map((request) => (
                <div key={request._id} className="border rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-2 sm:mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-semibold mb-1">رقم المحفظة: {request.walletNumber}</p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {new Date(request.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-0.5">المبلغ:</span>
                      <span className="font-medium">{request.amount}₪</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block mb-0.5">الرسوم:</span>
                      <span className="font-medium">{request.fees}₪</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                      <span className="text-gray-600 dark:text-gray-400 block mb-0.5">الإجمالي:</span>
                      <span className="font-semibold text-base sm:text-lg">{request.totalAmount}₪</span>
                    </div>
                  </div>
                  {request.notes && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 dark:border-slate-700">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 block mb-1">ملاحظات:</span>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-slate-100">{request.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 