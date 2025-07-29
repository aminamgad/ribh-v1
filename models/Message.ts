import mongoose, { Schema, Document } from 'mongoose';
import { Message } from '@/types';

export interface MessageDocument extends Message, Document {}

const messageSchema = new Schema<MessageDocument>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  subject: {
    type: String,
    required: [true, 'موضوع الرسالة مطلوب'],
    trim: true,
    maxlength: [200, 'موضوع الرسالة لا يمكن أن يتجاوز 200 حرف']
  },
  content: {
    type: String,
    required: [true, 'محتوى الرسالة مطلوب'],
    trim: true,
    maxlength: [2000, 'محتوى الرسالة لا يمكن أن يتجاوز 2000 حرف']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'ملاحظات الإدارة لا يمكن أن تتجاوز 500 حرف']
  },
  readAt: Date,
  approvedAt: Date,
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
messageSchema.index({ senderId: 1 });
messageSchema.index({ receiverId: 1 });
messageSchema.index({ productId: 1 });
messageSchema.index({ isApproved: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for conversation ID
messageSchema.virtual('conversationId').get(function() {
  const ids = [this.senderId.toString(), this.receiverId.toString()].sort();
  return `${ids[0]}-${ids[1]}`;
});

// Static method to find conversations
messageSchema.statics.findConversations = function(userId: string) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { senderId: mongoose.Types.ObjectId(userId) },
          { receiverId: mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    {
      $addFields: {
        conversationId: {
          $cond: {
            if: { $eq: ['$senderId', mongoose.Types.ObjectId(userId)] },
            then: { $concat: ['$senderId', '-', '$receiverId'] },
            else: { $concat: ['$receiverId', '-', '$senderId'] }
          }
        }
      }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $last: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$isRead', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { 'lastMessage.createdAt': -1 } }
  ]);
};

// Static method to find messages by conversation
messageSchema.statics.findByConversation = function(userId1: string, userId2: string) {
  return this.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ]
  })
  .populate('senderId', 'name avatar')
  .populate('receiverId', 'name avatar')
  .populate('productId', 'name images')
  .sort({ createdAt: 1 });
};

// Static method to find pending messages (for admin)
messageSchema.statics.findPending = function() {
  return this.find({ isApproved: false })
    .populate('senderId', 'name role')
    .populate('receiverId', 'name role')
    .populate('productId', 'name')
    .sort({ createdAt: -1 });
};

export default mongoose.models.Message || mongoose.model<MessageDocument>('Message', messageSchema); 