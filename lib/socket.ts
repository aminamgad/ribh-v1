// Socket.io helpers for Vercel deployment
// Note: Socket.io is disabled in Vercel environment

import { logger } from './logger';

interface NotificationPayload {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  [key: string]: unknown;
}

// Helper function to get Socket.io instance
export function getSocketIO(): null {
  return null;
}

// Helper function to send notification to user
export function sendNotificationToUser(userId: string, notification: NotificationPayload): void {
  // Socket.io is not available in Vercel
  logger.warn('Socket.io not available in Vercel environment', { userId });
  logger.debug('Notification for user (would be sent via Socket.io)', { userId, notification });
}

// Helper function to send notification to role
export function sendNotificationToRole(role: string, notification: NotificationPayload): void {
  // Socket.io is not available in Vercel
  logger.warn('Socket.io not available in Vercel environment', { role });
  logger.debug('Notification for role (would be sent via Socket.io)', { role, notification });
}

// Helper function to broadcast notification
export function broadcastNotification(notification: NotificationPayload): void {
  // Socket.io is not available in Vercel
  logger.warn('Socket.io not available in Vercel environment');
  logger.debug('Broadcast notification (would be sent via Socket.io)', { notification });
} 