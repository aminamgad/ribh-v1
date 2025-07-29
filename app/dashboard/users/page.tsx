'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Search, Filter, Eye, Edit, Shield, UserCheck, UserX, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  companyName?: string;
  createdAt: string;
  lastLogin?: string;
  productCount?: number;
  orderCount?: number;
}

const roleLabels = {
  admin: 'الإدارة',
  supplier: 'المورد',
  marketer: 'المسوق',
  wholesaler: 'تاجر الجملة'
};

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  supplier: 'bg-blue-100 text-blue-800',
  marketer: 'bg-green-100 text-green-800',
  wholesaler: 'bg-purple-100 text-purple-800'
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('غير مصرح لك بالوصول لهذه الصفحة');
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`تم ${currentStatus ? 'إيقاف' : 'تفعيل'} المستخدم بنجاح`);
        fetchUsers();
      } else {
        toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
      });

      if (response.ok) {
        toast.success('تم التحقق من المستخدم بنجاح');
        fetchUsers();
      } else {
        toast.error('حدث خطأ أثناء التحقق من المستخدم');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التحقق من المستخدم');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStats = () => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const verified = users.filter(u => u.isVerified).length;
    const suppliers = users.filter(u => u.role === 'supplier').length;
    const marketers = users.filter(u => u.role === 'marketer').length;
    const wholesalers = users.filter(u => u.role === 'wholesaler').length;

    return { total, active, verified, suppliers, marketers, wholesalers };
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">غير مصرح</h3>
          <p className="text-gray-600">لا يمكنك الوصول لهذه الصفحة</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-600 mt-2">إدارة جميع المستخدمين في المنصة</p>
        </div>
        <Link
          href="/dashboard/users/new"
          className="btn-primary"
        >
          <User className="w-4 h-4 ml-2" />
          إضافة مستخدم جديد
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">إجمالي المستخدمين</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-lg">
              <UserCheck className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">نشط</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-warning-100 dark:bg-warning-900/30 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">محقق</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.verified}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">الموردين</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.suppliers}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <User className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">المسوقين</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.marketers}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">الجملة</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{stats.wholesalers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-300 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث بالاسم، البريد الإلكتروني، أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pr-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input-field"
            >
              <option value="all">جميع الأدوار</option>
              <option value="admin">الإدارة</option>
              <option value="supplier">المورد</option>
              <option value="marketer">المسوق</option>
              <option value="wholesaler">تاجر الجملة</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="card text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مستخدمين</h3>
          <p className="text-gray-600">لا توجد مستخدمين مطابقين للبحث.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">المستخدم</th>
                  <th className="table-header">معلومات الاتصال</th>
                  <th className="table-header">الدور</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">التاريخ</th>
                  <th className="table-header">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{userItem.name}</p>
                        {userItem.companyName && (
                          <p className="text-sm text-gray-500 dark:text-slate-300">{userItem.companyName}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 ml-1 text-gray-400 dark:text-slate-300" />
                          {userItem.email}
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 ml-1 text-gray-400 dark:text-slate-300" />
                          {userItem.phone}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[userItem.role as keyof typeof roleColors]}`}>
                        {roleLabels[userItem.role as keyof typeof roleLabels]}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {userItem.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                        {!userItem.isVerified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            غير محقق
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-500">
                        {new Date(userItem.createdAt).toLocaleDateString('ar-EG')}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Link
                          href={`/dashboard/users/${userItem._id}`}
                          className="text-primary-600 hover:text-primary-700"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        <Link
                          href={`/dashboard/users/${userItem._id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                          title="تعديل المستخدم"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        
                        <button
                          onClick={() => handleToggleStatus(userItem._id, userItem.isActive)}
                          className={`${userItem.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          title={userItem.isActive ? 'إيقاف المستخدم' : 'تفعيل المستخدم'}
                        >
                          {userItem.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        
                        {!userItem.isVerified && (
                          <button
                            onClick={() => handleVerifyUser(userItem._id)}
                            className="text-blue-600 hover:text-blue-700"
                            title="التحقق من المستخدم"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 