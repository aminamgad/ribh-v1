'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Wallet, TrendingUp, TrendingDown, Download, Upload, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  availableBalance: number;
  pendingBalance: number;
  withdrawalSettings?: {
    minimumWithdrawal: number;
    maximumWithdrawal: number;
    withdrawalFee: number;
    canWithdraw: boolean;
    maxWithdrawable: number;
  };
}

const transactionIcons = {
  credit: TrendingUp,
  debit: TrendingDown
};

const transactionColors = {
  credit: 'text-success-600',
  debit: 'text-danger-600'
};

const statusColors = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
};

const statusIcons = {
  pending: Clock,
  completed: CheckCircle,
  failed: XCircle
};

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawalSettings, setWithdrawalSettings] = useState({
    minimumWithdrawal: 100,
    maximumWithdrawal: 10000,
    withdrawalFee: 0,
    canWithdraw: false,
    maxWithdrawable: 0
  });

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [walletResponse, transactionsResponse] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/wallet/transactions')
      ]);

      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setWallet(walletData.wallet);
        
        // Store withdrawal settings from API
        if (walletData.wallet.withdrawalSettings) {
          setWithdrawalSettings(walletData.wallet.withdrawalSettings);
        }
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب بيانات المحفظة');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (amount < withdrawalSettings.minimumWithdrawal) {
      toast.error(`الحد الأدنى للسحب هو ${withdrawalSettings.minimumWithdrawal} ₪`);
      return;
    }

    if (amount > withdrawalSettings.maximumWithdrawal) {
      toast.error(`الحد الأقصى للسحب هو ${withdrawalSettings.maximumWithdrawal} ₪`);
      return;
    }

    if (wallet && amount > wallet.availableBalance) {
      toast.error('المبلغ المطلوب أكبر من الرصيد المتاح');
      return;
    }

    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        toast.success('تم إرسال طلب السحب بنجاح');
        setWithdrawAmount('');
        setShowWithdrawForm(false);
        fetchWalletData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء إرسال طلب السحب');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال طلب السحب');
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            {user?.role === 'admin' ? 'إدارة المحافظ' : 'المحفظة'}
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            {user?.role === 'admin' 
              ? 'إدارة محافظ جميع المستخدمين والمعاملات المالية'
              : 'إدارة رصيدك والمعاملات المالية'
            }
          </p>
        </div>
        
        {wallet && wallet.availableBalance > 0 && user?.role !== 'admin' && (
          <button
            onClick={() => setShowWithdrawForm(true)}
            className="btn-primary"
          >
            <Download className="w-5 h-5 ml-2" />
            سحب رصيد
          </button>
        )}
      </div>

      {/* Wallet Stats */}
      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
                <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">الرصيد المتاح</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{wallet.availableBalance.toFixed(2)} ₪</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي الأرباح</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{wallet.totalEarnings.toFixed(2)} ₪</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="bg-warning-100 dark:bg-warning-900/30 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">رصيد معلق</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{wallet.pendingBalance.toFixed(2)} ₪</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="bg-secondary-100 dark:bg-secondary-900/30 p-2 rounded-lg">
                <Download className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي السحوبات</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{wallet.totalWithdrawals.toFixed(2)} ₪</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Form */}
      {showWithdrawForm && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">طلب سحب رصيد</h2>
          
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                المبلغ المطلوب *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="input-field pr-8"
                  placeholder="0.00"
                  min={withdrawalSettings.minimumWithdrawal}
                  max={Math.min(wallet?.availableBalance || 0, withdrawalSettings.maximumWithdrawal)}
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400">₪</span>
              </div>
              {wallet && (
                <div className="text-sm text-gray-500 dark:text-slate-400 mt-1 space-y-1">
                  <p>الرصيد المتاح: {wallet.availableBalance.toFixed(2)} ₪</p>
                  <p>الحد الأدنى: {withdrawalSettings.minimumWithdrawal} ₪</p>
                  <p>الحد الأقصى: {Math.min(wallet.availableBalance, withdrawalSettings.maximumWithdrawal)} ₪</p>
                  {withdrawalSettings.withdrawalFee > 0 && (
                    <p>رسوم السحب: {withdrawalSettings.withdrawalFee}%</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                type="button"
                onClick={() => setShowWithdrawForm(false)}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                <Download className="w-5 h-5 ml-2" />
                إرسال الطلب
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">المعاملات الأخيرة</h2>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد معاملات</h3>
            <p className="text-gray-600 dark:text-slate-400">لم تقم بأي معاملات مالية بعد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="table-header">النوع</th>
                  <th className="table-header">المبلغ</th>
                  <th className="table-header">الوصف</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {transactions.map((transaction) => {
                  const TransactionIcon = transactionIcons[transaction.type];
                  const StatusIcon = statusIcons[transaction.status];
                  
                  return (
                    <tr key={transaction._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <TransactionIcon className={`w-4 h-4 ml-2 ${transactionColors[transaction.type]}`} />
                          <span className={transactionColors[transaction.type]}>
                            {transaction.type === 'credit' ? 'إيداع' : 'سحب'}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`font-medium ${transactionColors[transaction.type]}`}>
                          {transaction.type === 'credit' ? '+' : '-'}{transaction.amount.toFixed(2)} ₪
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-gray-900 dark:text-slate-100">{transaction.description}</span>
                        <p className="text-xs text-gray-500 dark:text-slate-400">#{transaction.reference}</p>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[transaction.status]}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {transaction.status === 'pending' && 'قيد المعالجة'}
                          {transaction.status === 'completed' && 'مكتمل'}
                          {transaction.status === 'failed' && 'فشل'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(transaction.createdAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">معلومات مهمة</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
            <li className="flex items-start">
              <span className="text-primary-600 dark:text-primary-400 ml-2">•</span>
              الحد الأدنى للسحب: {withdrawalSettings.minimumWithdrawal} ₪
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 dark:text-primary-400 ml-2">•</span>
              الحد الأقصى للسحب: {withdrawalSettings.maximumWithdrawal} ₪
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 dark:text-primary-400 ml-2">•</span>
              رسوم السحب: {withdrawalSettings.withdrawalFee.toFixed(2)} ₪
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 dark:text-primary-400 ml-2">•</span>
              يتم معالجة طلبات السحب خلال 24-48 ساعة
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 dark:text-primary-400 ml-2">•</span>
              الرصيد المعلق يتم إضافته بعد تأكيد الطلبات
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 dark:text-primary-400 ml-2">•</span>
              العمولات تُحسب تلقائياً حسب سياسة المنصة
            </li>
          </ul>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">كيفية زيادة رصيدك</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
            <li className="flex items-start">
              <span className="text-success-600 dark:text-success-400 ml-2">•</span>
              {user?.role === 'supplier' && 'بيع منتجاتك عبر المنصة'}
              {user?.role === 'marketer' && 'تسويق المنتجات للعملاء'}
              {user?.role === 'wholesaler' && 'شراء وبيع المنتجات بكميات كبيرة'}
            </li>
            <li className="flex items-start">
              <span className="text-success-600 dark:text-success-400 ml-2">•</span>
              الحصول على عمولات من المبيعات
            </li>
            <li className="flex items-start">
              <span className="text-success-600 dark:text-success-400 ml-2">•</span>
              إحالة موردين ومسوقين جدد
            </li>
            <li className="flex items-start">
              <span className="text-success-600 dark:text-success-400 ml-2">•</span>
              المشاركة في العروض والخصومات
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 