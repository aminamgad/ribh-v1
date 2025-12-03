/**
 * Unified Notification System
 * 
 * Provides a single interface for sending notifications via:
 * - Database (always saved)
 * - Socket.io (real-time, if available)
 * - Email (for offline users, optional)
 */

import { logger } from './logger';

interface NotificationData {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  expiresAt?: Date;
}

interface SendNotificationOptions {
  sendEmail?: boolean;
  sendSocket?: boolean;
}

/**
 * Send notification to a specific user
 */
export async function sendNotificationToUser(
  userId: string,
  notificationData: NotificationData,
  options: SendNotificationOptions = {}
): Promise<void> {
  // Get system settings for notification preferences
  const { settingsManager } = await import('@/lib/settings-manager');
  const settings = await settingsManager.getSettings();
  
  // Check if notifications are enabled in system settings
  const systemEmailEnabled = settings?.emailNotifications !== false;
  const systemSmsEnabled = settings?.smsNotifications !== false;
  const systemPushEnabled = settings?.pushNotifications !== false;
  
  const { sendEmail = false, sendSocket = true } = options;
  
  // Override sendEmail if system email notifications are disabled
  const shouldSendEmail = sendEmail && systemEmailEnabled;
  const shouldSendSocket = sendSocket && systemPushEnabled;

  try {
    // Always save to database FIRST (this is the most important)
    const Notification = (await import('@/models/Notification')).default;
    const savedNotification = await Notification.create({
      userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'info',
      actionUrl: notificationData.actionUrl,
      metadata: notificationData.metadata || {},
      isRead: false,
      expiresAt: notificationData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    logger.debug('Notification saved to database', {
      notificationId: savedNotification._id,
      userId
    });

    // Try to send via Socket.io if available (for real-time updates)
    if (shouldSendSocket) {
      try {
        const { getSocketIO } = await import('@/lib/socket');
        const io = getSocketIO();
        
        if (io) {
          (io as any).to(`user:${userId}`).emit('notification', {
            ...notificationData,
            _id: savedNotification._id,
            userId,
            createdAt: savedNotification.createdAt
          });
          logger.debug('Notification sent via Socket.io', { userId });
        } else {
          logger.debug('Socket.io not available, notification saved to database only', { userId });
        }
      } catch (socketError) {
        logger.warn('Error sending notification via Socket.io', { error: socketError, userId });
        // Continue - notification is already saved to database
      }
    }

    // Send email notification if requested and system/user email notifications are enabled
    if (shouldSendEmail) {
      try {
        const User = (await import('@/models/User')).default;
        const user = await User.findById(userId).select('email emailNotifications').lean();
        
        const userEmail = (user as any)?.email;
        if (user && userEmail && (user as any).emailNotifications !== false) {
          await sendEmailNotification(userEmail, notificationData);
          logger.debug('Email notification sent', { userId, email: userEmail });
        } else {
          logger.debug('Email notification skipped', { 
            userId, 
            reason: user ? 'email notifications disabled' : 'user not found' 
          });
        }
      } catch (emailError) {
        logger.warn('Error sending email notification', { error: emailError, userId });
        // Continue - notification is already saved to database
      }
    }
  } catch (error) {
    logger.error('Error sending notification', error, { userId, notificationData });
    throw error;
  }
}

/**
 * Send notification to multiple users
 */
export async function sendNotificationToUsers(
  userIds: string[],
  notificationData: NotificationData,
  options: SendNotificationOptions = {}
): Promise<void> {
  const promises = userIds.map(userId => 
    sendNotificationToUser(userId, notificationData, options).catch(error => {
      logger.warn('Failed to send notification to user', { error, userId });
      // Continue with other users even if one fails
    })
  );
  
  await Promise.all(promises);
  
  logger.info('Bulk notifications sent', {
    count: userIds.length,
    title: notificationData.title
  });
}

/**
 * Send notification to all users with a specific role
 */
export async function sendNotificationToRole(
  role: string,
  notificationData: NotificationData,
  options: SendNotificationOptions = {}
): Promise<void> {
  try {
    const User = (await import('@/models/User')).default;
    const users = await User.find({ 
      role,
      isActive: true 
    }).select('_id').lean();
    
    const userIds = users.map((user: any) => (user._id?.toString()) || String(user._id));
    
    if (userIds.length === 0) {
      logger.debug('No users found for role notification', { role });
      return;
    }
    
    await sendNotificationToUsers(userIds, notificationData, options);
    
    logger.info('Role notification sent', {
      role,
      userCount: userIds.length,
      title: notificationData.title
    });
  } catch (error) {
    logger.error('Error sending role notification', error, { role, notificationData });
    throw error;
  }
}

/**
 * Send email notification (placeholder - to be implemented with email service)
 */
async function sendEmailNotification(
  email: string,
  notificationData: NotificationData
): Promise<void> {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, just log the email that would be sent
  logger.debug('Email notification (placeholder)', {
    email,
    title: notificationData.title,
    message: notificationData.message.substring(0, 100) + '...'
  });
  
  // Example implementation with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // 
  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: notificationData.title,
  //   html: generateEmailTemplate(notificationData)
  // });
}

/**
 * Check if user is currently online (has active Socket.io connection)
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const { getSocketIO } = await import('@/lib/socket');
    const io = getSocketIO();
    
    if (!io) {
      return false;
    }
    
    // Check if user has active socket connection
    const sockets = await (io as any).in(`user:${userId}`).fetchSockets();
    return sockets.length > 0;
  } catch (error) {
    logger.debug('Error checking user online status', { error, userId });
    return false;
  }
}

