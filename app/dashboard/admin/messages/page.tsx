'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Eye, 
  User, 
  Package,
  Clock,
  Filter,
  Search,
  RotateCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
  senderId: {
    _id: string;
    name: string;
    role: string;
  };
  receiverId: {
    _id: string;
    name: string;
    role: string;
  };
  productId?: {
    _id: string;
    name: string;
    images: string[];
  };
  subject: string;
  content: string;
  isRead: boolean;
  isApproved: boolean;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/messages?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        toast.error('فشل في تحميل الرسائل');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchMessages();
    }
  }, [user, filter, fetchMessages]);

  const handleApproveMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes: adminNotes.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم اعتماد الرسالة بنجاح');
        setShowModal(false);
        setSelectedMessage(null);
        setAdminNotes('');
        fetchMessages();
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في اعتماد الرسالة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء اعتماد الرسالة');
    }
  };

  const handleRejectMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes: adminNotes.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'تم رفض الرسالة بنجاح');
        setShowModal(false);
        setSelectedMessage(null);
        setAdminNotes('');
        fetchMessages();
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في رفض الرسالة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض الرسالة');
    }
  };

  const openMessageModal = (message: Message) => {
    setSelectedMessage(message);
    setAdminNotes(message.adminNotes || '');
    setShowModal(true);
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.senderId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.receiverId.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (isApproved: boolean) => {
    if (isApproved === null || isApproved === undefined) {
      return (
        <span className="badge badge-warning">
          <Clock className="w-3 h-3 ml-1" />
          قيد المراجعة
        </span>
      );
    }
    return isApproved ? (
      <span className="badge badge-success">
        <CheckCircle className="w-3 h-3 ml-1" />
        معتمد
      </span>
    ) : (
      <span className="badge badge-danger">
        <XCircle className="w-3 h-3 ml-1" />
        مرفوض
      </span>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">غير مصرح</h2>
          <p className="text-gray-600 dark:text-slate-400">ليس لديك صلاحية للوصول لهذه الصفحة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">إدارة الرسائل</h1>
            <p className="text-gray-600 dark:text-slate-400">مراقبة وإدارة جميع الرسائل في النظام</p>
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="btn-primary"
          >
            <RotateCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="input-field"
              >
                <option value="all">جميع الرسائل</option>
                <option value="pending">قيد المراجعة</option>
                <option value="approved">معتمد</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center flex-1">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="البحث في الرسائل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-11 pl-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="mr-3 text-gray-600 dark:text-slate-400">جاري التحميل...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">لا توجد رسائل</h3>
              <p className="text-gray-600 dark:text-slate-400">لا توجد رسائل تطابق المعايير المحددة</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredMessages.map((message) => (
                <div 
                  key={message._id} 
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => openMessageModal(message)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                          {message.subject}
                        </h3>
                        {getStatusBadge(message.isApproved)}
                      </div>
                      
                      <div className="flex items-center space-x-4 space-x-reverse mb-3 text-sm text-gray-600 dark:text-slate-400">
                        <div className="flex items-center">
                          <User className="w-4 h-4 ml-1" />
                          <span>من: {message.senderId.name} ({message.senderId.role})</span>
                        </div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 ml-1" />
                          <span>إلى: {message.receiverId.name} ({message.receiverId.role})</span>
                        </div>
                        {message.productId && (
                          <div className="flex items-center">
                            <Package className="w-4 h-4 ml-1" />
                            <span>المنتج: {message.productId.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-700 dark:text-slate-300 mb-3 line-clamp-2">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                        <span>
                          {new Date(message.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {message.adminNotes && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 ml-1">
                              ملاحظات الإدارة:
                            </span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 flex-1">
                              {message.adminNotes}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 space-x-reverse mr-4">
                      <div className="btn-secondary text-sm">
                        <Eye className="w-4 h-4 ml-1" />
                        عرض التفاصيل
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  تفاصيل الرسالة
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">الموضوع</h3>
                  <p className="text-gray-700 dark:text-slate-300">{selectedMessage.subject}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">المحتوى</h3>
                  <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">المرسل</h3>
                    <p className="text-gray-700 dark:text-slate-300">
                      {selectedMessage.senderId.name} ({selectedMessage.senderId.role})
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">المستلم</h3>
                    <p className="text-gray-700 dark:text-slate-300">
                      {selectedMessage.receiverId.name} ({selectedMessage.receiverId.role})
                    </p>
                  </div>
                </div>

                {selectedMessage.productId && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">المنتج</h3>
                    <p className="text-gray-700 dark:text-slate-300">{selectedMessage.productId.name}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">ملاحظات الإدارة</h3>
                  
                  {selectedMessage.adminNotes && selectedMessage.adminNotes !== adminNotes && (
                    <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start">
                        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300 ml-1">
                          الملاحظات الحالية:
                        </span>
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 flex-1">
                          {selectedMessage.adminNotes}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="أضف ملاحظات الإدارة هنا (اختياري)..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      يمكنك إضافة ملاحظات توضيحية حول القرار
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {adminNotes.length}/500
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {selectedMessage.isApproved === null || selectedMessage.isApproved === undefined ? (
                      <>
                        <button
                          onClick={() => handleApproveMessage(selectedMessage._id)}
                          className="btn-success"
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          اعتماد
                        </button>
                        <button
                          onClick={() => handleRejectMessage(selectedMessage._id)}
                          className="btn-danger"
                        >
                          <XCircle className="w-4 h-4 ml-1" />
                          رفض
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        تم {selectedMessage.isApproved ? 'اعتماد' : 'رفض'} هذه الرسالة
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
