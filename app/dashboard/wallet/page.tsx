'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { DollarSign, TrendingUp, Clock, CheckCircle, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';

interface WalletData {
  balance: number;
  pendingWithdrawals?: number;
  totalEarnings: number;
  totalWithdrawals: number;
  availableBalance: number;
  canWithdraw: boolean;
  minimumWithdrawal: number;
}

interface EarningsData {
  totalEarned: number;
  pendingEarnings: number;
  deliveredOrders: number;
  pendingOrders: number;
}

interface Transaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdAt: string;
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

export default function WalletPage() {
  const { user } = useAuth();
  // Withdrawal states for marketer
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [walletNumber, setWalletNumber] = useState('');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use cache hook for wallet data
  const { data: walletData, loading, refresh } = useDataCache<{
    wallet: WalletData;
    earnings: EarningsData;
    recentTransactions: Transaction[];
  }>({
    key: 'wallet',
    fetchFn: async () => {
      const response = await fetch('/api/wallet/status');
      if (!response.ok) {
        throw new Error('Failed to fetch wallet status');
      }
      return response.json();
    },
    enabled: !!user,
    forceRefresh: false,
    onError: () => {
      toast.error('حدث خطأ أثناء جلب حالة المحفظة');
    }
  });

  const wallet = walletData?.wallet || null;
  const earnings = walletData?.earnings || null;
  const transactions = walletData?.recentTransactions || [];

  useEffect(() => {
    if (user?.role === 'marketer') {
      fetchWithdrawalRequests();
      fetchSystemSettings();
    }
  }, [user]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-wallet', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-wallet', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchWalletStatus for backward compatibility
  const fetchWalletStatus = async () => {
    refresh();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
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

  const fetchWithdrawalRequests = async () => {
    try {
      const response = await fetch('/api/withdrawals');
      const data = await response.json();
      
      if (data.success) {
        setWithdrawalRequests(data.withdrawalRequests);
      }
    } catch (error) {
      console.error('خطأ في جلب طلبات السحب:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSystemSettings(data.settings);
      }
    } catch (error) {
      console.error('خطأ في جلب إعدادات النظام:', error);
    }
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
      if (wallet && wallet.balance < totalAmount) {
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
        fetchWalletStatus();
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

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'marketer':
        return 'محفظة المسوق';
      case 'admin':
        return 'محفظة الإدارة';
      case 'supplier':
        return 'محفظة المورد';
      default:
        return 'المحفظة';
    }
  };

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'marketer':
        return 'إدارة أرباحك من الطلبات';
      case 'admin':
        return 'إدارة عمولات المنصة';
      case 'supplier':
        return 'إدارة أرباحك من المبيعات';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{getRoleTitle()}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">{getRoleDescription()}</p>
        </div>
      </div>

      {/* Wallet Overview */}
      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
                <WalletIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">الرصيد الحالي</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(wallet.balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">الرصيد المتاح</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(wallet.availableBalance)}
                </p>
                {(wallet.pendingWithdrawals || 0) > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ({formatCurrency(wallet.pendingWithdrawals || 0)} قيد السحب)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي الأرباح</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(wallet.totalEarnings)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-[#FF9800]/20 dark:bg-[#FF9800]/30 p-2 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-[#FF9800] dark:text-[#FF9800]" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي السحوبات</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {formatCurrency(wallet.totalWithdrawals)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Summary */}
      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 ml-2" />
              الأرباح المحققة
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">إجمالي الأرباح المحققة</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(earnings.totalEarned)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الطلبات المكتملة</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {earnings.deliveredOrders}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <Clock className="w-5 h-5 ml-2" />
              الأرباح المعلقة
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">إجمالي الأرباح المعلقة</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(earnings.pendingEarnings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الطلبات المعلقة</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {earnings.pendingOrders}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
          <ArrowUpRight className="w-5 h-5 ml-2" />
          آخر المعاملات
        </h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <WalletIcon className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">لا توجد معاملات حديثة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'credit' 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {transaction.type === 'credit' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="mr-3">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${
                    transaction.type === 'credit' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Info */}
      {wallet && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 ml-2" />
            معلومات السحب
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">الحد الأدنى للسحب</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(wallet.minimumWithdrawal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">إمكانية السحب</span>
              <span className={`font-medium ${
                wallet.canWithdraw 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {wallet.canWithdraw ? 'متاح' : 'غير متاح'}
              </span>
            </div>
            {!wallet.canWithdraw && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  يجب أن يصل رصيدك إلى {formatCurrency(wallet.minimumWithdrawal)} على الأقل للسحب
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Section for Marketer */}
      {user?.role === 'marketer' && (
        <>
          {/* New Withdrawal Request */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 ml-2" />
              طلب سحب جديد
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  رقم المحفظة
                </label>
                <input
                  type="text"
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  className="input-field"
                  placeholder="أدخل رقم المحفظة"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  المبلغ
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="input-field"
                  placeholder="أدخل المبلغ"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  placeholder="ملاحظات إضافية"
                  rows={3}
                />
              </div>
              
              {systemSettings && amount > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100">تفاصيل السحب:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">المبلغ المطلوب:</span>
                      <span className="text-gray-900 dark:text-slate-100">{amount}₪</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">الرسوم ({systemSettings.withdrawalSettings.withdrawalFees}%):</span>
                      <span className="text-gray-900 dark:text-slate-100">{(amount * systemSettings.withdrawalSettings.withdrawalFees / 100)}₪</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-900 dark:text-slate-100">الإجمالي:</span>
                      <span className="text-gray-900 dark:text-slate-100">{amount + (amount * systemSettings.withdrawalSettings.withdrawalFees / 100)}₪</span>
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleSubmitWithdrawal}
                disabled={isSubmitting || !wallet?.canWithdraw}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'جاري إرسال الطلب...' : 'إرسال طلب السحب'}
              </button>
            </div>
          </div>

          {/* Withdrawal Requests History */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <Clock className="w-5 h-5 ml-2" />
              سجل طلبات السحب
            </h3>
            {withdrawalRequests.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">لا توجد طلبات سحب</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawalRequests.map((request) => (
                  <div key={request._id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">رقم المحفظة: {request.walletNumber}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(request.createdAt).toLocaleDateString('en-US')}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">المبلغ:</span>
                        <span className="mr-2 font-medium text-gray-900 dark:text-slate-100">{request.amount}₪</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">الرسوم:</span>
                        <span className="mr-2 font-medium text-gray-900 dark:text-slate-100">{request.fees}₪</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600 dark:text-gray-400">الإجمالي:</span>
                        <span className="mr-2 font-semibold text-gray-900 dark:text-slate-100">{request.totalAmount}₪</span>
                      </div>
                    </div>
                    {request.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                        <span className="text-gray-600 dark:text-gray-400 text-sm">ملاحظات:</span>
                        <p className="text-sm mt-1 text-gray-900 dark:text-slate-100">{request.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 