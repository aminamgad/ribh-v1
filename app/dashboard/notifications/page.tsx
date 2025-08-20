'use client';

import { useNotifications } from '@/components/providers/NotificationProvider';
import { Bell, Check, CheckCheck, ExternalLink, Info, CheckCircle, AlertTriangle, XCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, isConnected, refreshNotifications } = useNotifications();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-danger-600 dark:text-danger-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400" />;
      default:
        return <Info className="w-5 h-5 text-primary-600 dark:text-primary-400" />;
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    setSelectedNotification(notification);
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await markAllAsRead();
      toast.success('تم تحديد جميع الإشعارات كمقروءة', { duration: 2000 });
    } catch (error) {
      toast.error('خطأ في تحديث الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClick = async () => {
    setLoading(true);
    try {
      refreshNotifications();
      toast.success('تم تحديث الإشعارات', { duration: 2000 });
    } catch (error) {
      toast.error('خطأ في تحديث الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsRead(notificationId);
      toast.success('تم تحديد الإشعار كمقروء', { duration: 1500 });
    } catch (error) {
      toast.error('خطأ في تحديث الإشعار');
    }
  };

  const handleViewDetails = (notification: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata) return null;
    
    const items = [];
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined) {
        let displayValue = value;
        if (typeof value === 'number') {
          displayValue = `${value} ₪`;
        } else if (typeof value === 'boolean') {
          displayValue = value ? 'نعم' : 'لا';
        }
        items.push(
          <div key={key} className="flex justify-between py-1">
            <span className="text-gray-600 dark:text-slate-400 font-medium">{key}:</span>
            <span className="text-gray-900 dark:text-slate-100">{displayValue as any}</span>
          </div>
        );
      }
    }
    return items;
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">الإشعارات</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            {notifications.filter(n => !n.isRead).length} إشعار غير مقروء من أصل {notifications.length}
          </p>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse">
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary"
              disabled={loading}
            >
              <CheckCheck className="w-5 h-5 ml-2" />
              تحديد الكل كمقروء
            </button>
          )}
          
          <button
            onClick={handleRefreshClick}
            className="btn-primary"
            disabled={loading}
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد إشعارات</h3>
          <p className="text-gray-600 dark:text-slate-400">ستظهر الإشعارات هنا عند وصولها</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications List */}
          <div className="lg:col-span-2 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`card p-4 hover:shadow-medium transition-all cursor-pointer ${
                  !notification.isRead 
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700' 
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                } ${
                  selectedNotification?._id === notification._id 
                    ? 'ring-2 ring-primary-500 dark:ring-primary-400' 
                    : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 space-x-reverse flex-1">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                        {notification.title}
                        {!notification.isRead && (
                          <span className="inline-block w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full mr-2"></span>
                        )}
                      </h3>
                      <p className="text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                      
                      <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500 dark:text-slate-400 mt-2">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ar
                          })}
                        </span>
                        
                        {notification.actionUrl && (
                          <button
                            onClick={(e) => handleViewDetails(notification, e)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 ml-1" />
                            عرض التفاصيل
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse mr-4">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification._id, e)}
                        className="p-1 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
                        title="تحديد كمقروء"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notification Details Sidebar */}
          {selectedNotification && (
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">تفاصيل الإشعار</h3>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {getNotificationIcon(selectedNotification.type)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-slate-100">{selectedNotification.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {formatDistanceToNow(new Date(selectedNotification.createdAt), {
                          addSuffix: true,
                          locale: ar
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-slate-100 mb-2">الرسالة:</h5>
                    <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
                      {selectedNotification.message}
                    </p>
                  </div>

                  {selectedNotification.metadata && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-slate-100 mb-2">التفاصيل الإضافية:</h5>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-sm">
                        {formatMetadata(selectedNotification.metadata)}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      الحالة: {selectedNotification.isRead ? 'مقروء' : 'غير مقروء'}
                    </span>
                    
                    {selectedNotification.actionUrl && (
                      <button
                        onClick={(e) => handleViewDetails(selectedNotification, e)}
                        className="btn-primary text-sm"
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        عرض التفاصيل
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 