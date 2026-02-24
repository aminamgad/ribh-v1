import mongoose, { Schema, Document } from 'mongoose';
import { Message } from '@/types';

export interface MessageDocument extends Omit<Message, '_id'>, Document {}

const messageSchema = new Schema<MessageDocument>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  subject: {
    type: String,
    required: false,
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
    default: null,
    required: false
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
} as any, {
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

// Compound indexes for common queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 }); // For conversation queries
messageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 }); // For unread messages by receiver
messageSchema.index({ isApproved: 1, createdAt: -1 }); // For admin pending messages
messageSchema.index({ productId: 1, isApproved: 1 }); // For product messages

// Virtual for conversation ID (يتعامل مع receiverId الفارغ)
messageSchema.virtual('conversationId').get(function() {
  const senderStr = this.senderId?.toString?.() ?? '';
  const receiverStr = this.receiverId?.toString?.() ?? '';
  const ids = [senderStr, receiverStr].filter(Boolean).sort();
  return ids.length >= 2 ? `${ids[0]}-${ids[1]}` : senderStr || receiverStr || '';
});

// Static method to find conversations
messageSchema.statics.findConversations = function(userId: string) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId) },
          { receiverId: new mongoose.Types.ObjectId(userId) }
        ],
        receiverId: { $ne: null } // Exclude messages with null receiverId
      }
    },
    {
      $addFields: {
        conversationId: {
          $cond: {
            if: { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
            then: { 
              $concat: [
                { $toString: '$senderId' }, 
                '-', 
                { $toString: { $ifNull: ['$receiverId', ''] } }
              ] 
            },
            else: { 
              $concat: [
                { $toString: { $ifNull: ['$receiverId', ''] } }, 
                '-', 
                { $toString: '$senderId' }
              ] 
            }
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
                  { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$isRead', false] },
                  { $ne: ['$receiverId', null] }
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