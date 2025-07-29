'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Search, Filter, Eye, Package, Truck, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerRole: string;
  supplierName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  commission: number;
  total: number;
  status: string;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  processing: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
  shipped: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200',
  delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  returned: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
};

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  returned: XCircle
};

const statusLabels = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  processing: 'قيد المعالجة',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  returned: 'مرتجع'
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders for user:', user?.role, user?._id);
      const response = await fetch('/api/orders');
      console.log('Orders response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Orders API response:', data);
        console.log('User role:', user?.role, 'User ID:', user?._id);
        console.log('Orders for user:', data.orders?.map((o: any) => ({
          id: o._id,
          supplierId: o.supplierId,
          customerId: o.customerId,
          status: o.status,
          supplierIdType: typeof o.supplierId,
          customerIdType: typeof o.customerId
        })));
        setOrders(data.orders || []);
      } else {
        const errorData = await response.json();
        console.error('Orders API error:', errorData);
        toast.error(errorData.message || 'حدث خطأ أثناء جلب الطلبات');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ أثناء جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const fulfillOrder = async (orderId: string) => {
    try {
      console.log('Fulfilling order:', orderId);
      
      const response = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Fulfill response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Fulfill success:', data);
        toast.success(data.message || 'تم تنفيذ الطلب بنجاح');
        fetchOrders(); // Refresh orders list
      } else {
        const error = await response.json();
        console.error('Fulfill error:', error);
        toast.error(error.message || 'حدث خطأ أثناء تنفيذ الطلب');
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      toast.error('حدث خطأ أثناء تنفيذ الطلب');
    }
  };

  const completeOrder = async (orderId: string, marketerProfit: number = 0) => {
    try {
      console.log('Completing order:', orderId, 'with profit:', marketerProfit);
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          marketerProfit
        }),
      });

      console.log('Complete response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Complete success:', data);
        toast.success('تم إكمال الطلب وإضافة الأرباح للمحفظة بنجاح');
        fetchOrders(); // Refresh orders
      } else {
        const error = await response.json();
        console.error('Complete error:', error);
        toast.error(error.message || 'حدث خطأ أثناء إكمال الطلب');
      }
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('حدث خطأ أثناء إكمال الطلب');
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'supplier':
        return 'طلباتي';
      case 'admin':
        return 'إدارة الطلبات';
      case 'marketer':
      case 'wholesaler':
        return 'طلباتي';
      default:
        return 'الطلبات';
    }
  };

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'supplier':
        return 'إدارة الطلبات الواردة لمنتجاتك';
      case 'admin':
        return 'إدارة جميع الطلبات في المنصة';
      case 'marketer':
      case 'wholesaler':
        return 'إدارة طلباتك وطلبات عملائك';
      default:
        return '';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getTotalStats = () => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const confirmed = orders.filter(o => o.status === 'confirmed').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return { total, pending, confirmed, delivered, totalRevenue };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{getRoleTitle()}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">{getRoleDescription()}</p>
        </div>
        
        {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
          <Link href="/dashboard/orders/new" className="btn-primary">
            <Package className="w-5 h-5 ml-2" />
            طلب جديد
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
              <p className="text-sm text-gray-600 dark:text-slate-400">مؤكد</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.confirmed}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-secondary-100 dark:bg-secondary-900/30 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي المبيعات</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.totalRevenue.toFixed(2)} ₪</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="البحث في الطلبات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pr-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">جميع الطلبات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="confirmed">مؤكد</option>
              <option value="processing">قيد المعالجة</option>
              <option value="shipped">تم الشحن</option>
              <option value="delivered">تم التوصيل</option>
              <option value="cancelled">ملغي</option>
              <option value="returned">مرتجع</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد طلبات</h3>
          <p className="text-gray-600 dark:text-slate-400">
            {user?.role === 'marketer' || user?.role === 'wholesaler'
              ? 'لم تقم بإنشاء أي طلبات بعد. ابدأ بإنشاء طلبك الأول!'
              : 'لا توجد طلبات متاحة حالياً.'
            }
          </p>
          {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
            <Link href="/dashboard/orders/new" className="btn-primary mt-4">
              <Package className="w-5 h-5 ml-2" />
              طلب جديد
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="table-header">رقم الطلب</th>
                  <th className="table-header">العميل</th>
                  {user?.role === 'admin' && <th className="table-header">المورد</th>}
                  <th className="table-header">المنتجات</th>
                  <th className="table-header">المجموع</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">التاريخ</th>
                  <th className="table-header">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredOrders.map((order) => {
                  const StatusIcon = statusIcons[order.status as keyof typeof statusIcons] || Clock;
                  return (
                    <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="table-cell">
                        <span className="font-medium text-primary-600 dark:text-primary-400">#{order.orderNumber}</span>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{order.customerName}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">{order.customerRole}</p>
                        </div>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="table-cell">
                          <span className="text-gray-600 dark:text-slate-400">{order.supplierName || '-'}</span>
                        </td>
                      )}
                      <td className="table-cell">
                        <div className="text-sm">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-gray-900 dark:text-slate-100">{item.productName}</span>
                              <span className="text-gray-500 dark:text-slate-400">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{order.total} ₪</p>
                          {order.commission > 0 && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">العمولة: {order.commission} ₪</p>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Link
                            href={`/dashboard/orders/${order._id}`}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            عرض التفاصيل
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'supplier') && 
                           ['confirmed', 'processing'].includes(order.status) && (
                            <button
                              onClick={() => fulfillOrder(order._id)}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />
                              تنفيذ الطلب
                            </button>
                          )}
                          {user?.role === 'supplier' && 
                           ['processing'].includes(order.status) && (
                            <button
                              onClick={() => completeOrder(order._id, 0)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                            >
                              <Truck className="w-4 h-4 ml-1" />
                              شحن الطلب
                            </button>
                          )}
                          {user?.role === 'supplier' && 
                           ['shipped'].includes(order.status) && (
                            <button
                              onClick={() => completeOrder(order._id, 0)}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />
                              تسليم الطلب
                            </button>
                          )}
                          {user?.role === 'marketer' && 
                           ['confirmed', 'processing', 'shipped'].includes(order.status) && (
                            <button
                              onClick={() => completeOrder(order._id, order.commission || 0)}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
                            >
                              <DollarSign className="w-4 h-4 ml-1" />
                              إكمال الطلب وإضافة الأرباح
                            </button>
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