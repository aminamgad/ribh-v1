'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import toast from 'react-hot-toast';
import { usePolling } from '@/components/hooks/usePolling';
import { logger } from '@/lib/logger';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  isConnected: boolean;
  sendNotification: (notification: Notification) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastPollTimestamp, setLastPollTimestamp] = useState<string | null>(null);

  // Helper function to get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      const since = lastPollTimestamp || new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const response = await fetch(`/api/poll/notifications?since=${encodeURIComponent(since)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const newNotifications = data.data.notifications || [];
          
          // Add new notifications (avoid duplicates)
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n._id));
            const uniqueNew = newNotifications.filter((n: Notification) => !existingIds.has(n._id));
            
            if (uniqueNew.length > 0) {
              // Show toast for new notifications
              uniqueNew.forEach((notification: Notification) => {
                toast(notification.message, {
                  icon: getNotificationIcon(notification.type),
                });
              });
            }
            
            return [...uniqueNew, ...prev].slice(0, 100); // Keep only latest 100
          });
          
          setLastPollTimestamp(data.data.timestamp);
        }
      }
    } catch (error) {
      logger.error('Error fetching notifications', error);
    }
  };

  // Use polling hook for real-time updates
  const pollingEndpoint = isAuthenticated ? '/api/poll/notifications' : null;
  const { data: pollingData, error: pollingError } = usePolling<{ notifications: Notification[]; timestamp: string }>(
    pollingEndpoint,
    {
      interval: 5000, // Poll every 5 seconds
      onError: (error) => {
        logger.warn('Polling error', { error });
      },
      onSuccess: (data: any) => {
        if (data && typeof data === 'object' && 'notifications' in data) {
          const newNotifications = Array.isArray(data.notifications) ? data.notifications : [];
          
          // Add new notifications (avoid duplicates)
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n._id));
            const uniqueNew = newNotifications.filter((n: Notification) => !existingIds.has(n._id));
            
            if (uniqueNew.length > 0) {
              // Show toast for new notifications
              uniqueNew.forEach((notification: Notification) => {
                toast(notification.message, {
                  icon: getNotificationIcon(notification.type),
                });
              });
            }
            
            return [...uniqueNew, ...prev].slice(0, 100); // Keep only latest 100
          });
          
          if (data.timestamp) {
            setLastPollTimestamp(data.timestamp);
          }
        }
      }
    }
  );

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setLastPollTimestamp(null);
    }
  }, [isAuthenticated]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification._id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST'
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, isRead: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const sendNotification = (notification: Notification) => {
    // This is for testing/development purposes
    setNotifications(prev => {
      // Avoid duplicates
      if (prev.some(n => n._id === notification._id)) {
        return prev;
      }
      return [notification, ...prev].slice(0, 100);
    });
    
    // Show toast
    toast(notification.message, {
      icon: getNotificationIcon(notification.type),
    });
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isConnected = !pollingError; // Connected if no polling errors

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
    sendNotification,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 