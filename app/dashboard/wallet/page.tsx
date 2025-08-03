'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { DollarSign, TrendingUp, Clock, CheckCircle, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface WalletData {
  balance: number;
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

export default function WalletPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchWalletStatus();
  }, []);

  const fetchWalletStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wallet/status');
      if (response.ok) {
        const data = await response.json();
        setWallet(data.wallet);
        setEarnings(data.earnings);
        setTransactions(data.recentTransactions);
      } else {
        toast.error('حدث خطأ أثناء جلب حالة المحفظة');
      }
    } catch (error) {
      console.error('Error fetching wallet status:', error);
      toast.error('حدث خطأ أثناء جلب حالة المحفظة');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
    </div>
  );
} 