'use client';

import { useNotifications } from '@/components/providers/NotificationProvider';
import { Bell, Check, CheckCheck, ExternalLink, Info, CheckCircle, AlertTriangle, XCircle, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">الإشعارات</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-slate-400 mt-1 sm:mt-2">
            {notifications.filter(n => !n.isRead).length} إشعار غير مقروء من أصل {notifications.length}
          </p>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse w-full sm:w-auto">
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
              disabled={loading}
            >
              <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
              <span className="hidden sm:inline">تحديد الكل كمقروء</span>
              <span className="sm:hidden">الكل</span>
            </button>
          )}
          
          <button
            onClick={handleRefreshClick}
            className="btn-primary text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 flex-1 sm:flex-initial"
            disabled={loading}
          >
            <span className="text-base sm:text-lg">🔄</span>
            <span className="hidden sm:inline mr-1.5">تحديث</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="card text-center py-8 sm:py-12 p-4 sm:p-6">
          <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد إشعارات</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">ستظهر الإشعارات هنا عند وصولها</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Notifications List */}
          <div className={`lg:col-span-2 space-y-2 sm:space-y-3 ${selectedNotification ? 'hidden lg:block' : 'block'}`}>
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`card p-3 sm:p-4 hover:shadow-medium transition-all cursor-pointer active:scale-[0.98] ${
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
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex items-start space-x-2 sm:space-x-3 space-x-reverse flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1.5 sm:gap-2">
                        <span className="truncate">{notification.title}</span>
                        {!notification.isRead && (
                          <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-600 dark:bg-primary-400 rounded-full flex-shrink-0"></span>
                        )}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1 line-clamp-2 text-wrap-long">{notification.message}</p>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-4 space-x-reverse text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-2">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: enUS
                          })}
                        </span>
                        
                        {notification.actionUrl && (
                          <button
                            onClick={(e) => handleViewDetails(notification, e)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center min-h-[32px] sm:min-h-[auto]"
                          >
                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                            <span className="text-xs sm:text-sm">عرض التفاصيل</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification._id, e)}
                        className="p-1.5 sm:p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 min-w-[32px] min-h-[32px] sm:min-w-[auto] sm:min-h-[auto] flex items-center justify-center"
                        title="تحديد كمقروء"
                      >
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notification Details Sidebar */}
          {selectedNotification && (
            <div className={`lg:col-span-1 ${!selectedNotification ? 'hidden' : 'block'}`}>
              <div className="card p-4 sm:p-6 sticky top-4 sm:top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">تفاصيل الإشعار</h3>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 min-w-[32px] min-h-[32px] sm:min-w-[auto] sm:min-h-[auto] flex items-center justify-center lg:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                    {getNotificationIcon(selectedNotification.type)}
                    <div>
                      <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100">{selectedNotification.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                        {formatDistanceToNow(new Date(selectedNotification.createdAt), {
                          addSuffix: true,
                          locale: enUS
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">الرسالة:</h5>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                      {selectedNotification.message}
                    </p>
                  </div>

                  {selectedNotification.metadata && (
                    <div>
                      <h5 className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 mb-1.5 sm:mb-2">التفاصيل الإضافية:</h5>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm">
                        {formatMetadata(selectedNotification.metadata)}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-600">
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                      الحالة: {selectedNotification.isRead ? 'مقروء' : 'غير مقروء'}
                    </span>
                    
                    {selectedNotification.actionUrl && (
                      <button
                        onClick={(e) => handleViewDetails(selectedNotification, e)}
                        className="btn-primary text-xs sm:text-sm min-h-[44px] w-full sm:w-auto px-4 sm:px-6"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
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