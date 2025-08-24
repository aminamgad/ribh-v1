import mongoose, { Schema, Document } from 'mongoose';
import { Notification } from '@/types';

export interface NotificationDocument extends Omit<Notification, '_id'>, Document {}

const notificationSchema = new Schema<NotificationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'عنوان الإشعار مطلوب'],
    trim: true,
    maxlength: [100, 'عنوان الإشعار لا يمكن أن يتجاوز 100 حرف']
  },
  message: {
    type: String,
    required: [true, 'محتوى الإشعار مطلوب'],
    trim: true,
    maxlength: [500, 'محتوى الإشعار لا يمكن أن يتجاوز 500 حرف']
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    trim: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  readAt: Date,
  expiresAt: Date
} as any, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index for expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to find user notifications
notificationSchema.statics.findByUser = function(userId: string, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find unread notifications
notificationSchema.statics.findUnread = function(userId: string) {
  return this.find({ userId, isRead: false })
    .sort({ createdAt: -1 });
};

// Static method to mark as read
notificationSchema.statics.markAsRead = function(userId: string, notificationIds?: string[]) {
  const query: any = { userId, isRead: false };
  if (notificationIds) {
    query._id = { $in: notificationIds };
  }
  
  return this.updateMany(query, {
    isRead: true,
    readAt: new Date()
  });
};

// Static method to create notification
notificationSchema.statics.createNotification = function(data: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}) {
  return this.create({
    ...data,
    expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
  });
};

// Static method to create bulk notifications
notificationSchema.statics.createBulkNotifications = function(notifications: Array<{
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  metadata?: Record<string, any>;
}>) {
  const notificationsWithDefaults = notifications.map(notification => ({
    ...notification,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
  }));
  
  return this.insertMany(notificationsWithDefaults);
};

export default mongoose.models.Notification || mongoose.model<NotificationDocument>('Notification', notificationSchema); 