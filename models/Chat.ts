import mongoose, { Schema, Document, Model } from 'mongoose';

// Chat Types
export enum ChatStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PENDING = 'pending'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system'
}

// TypeScript interfaces
export interface IChatMessage {
  senderId: mongoose.Types.ObjectId;
  message: string;
  type: MessageType;
  attachments?: {
    url: string;
    name: string;
    size: number;
    type: string;
  }[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface IChat extends Document, IChatMethods {
  participants: mongoose.Types.ObjectId[];
  participantRoles: {
    userId: mongoose.Types.ObjectId;
    role: string;
  }[];
  subject: string;
  status: ChatStatus;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  messages: IChatMessage[];
  lastMessage?: string;
  lastMessageAt?: Date;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  rating?: number;
  feedback?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMethods {
  addMessage(senderId: string, message: string, type?: MessageType, attachments?: any[]): Promise<IChatMessage>;
  markAsRead(userId: string): Promise<void>;
  closeChat(userId: string): Promise<void>;
  reopenChat(): Promise<void>;
  getUnreadCount(userId: string): number;
}

export interface IChatModel extends Model<IChat, {}, IChatMethods> {
  findByUser(userId: string): Promise<IChat[]>;
  findActiveChats(): Promise<IChat[]>;
  findPendingChats(): Promise<IChat[]>;
  createChat(participants: string[], subject: string, category?: string): Promise<IChat>;
  getOrCreateChat(userId: string, adminId: string, subject: string): Promise<IChat>;
}

// Message sub-schema
const chatMessageSchema = new Schema<IChatMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT
  },
  attachments: [{
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Chat schema
const chatSchema = new Schema<IChat, IChatModel, IChatMethods>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  participantRoles: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      required: true
    }
  }],
  subject: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(ChatStatus),
    default: ChatStatus.PENDING
  },
  category: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  messages: [chatMessageSchema],
  lastMessage: String,
  lastMessageAt: Date,
  closedAt: Date,
  closedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
} as any, {
  timestamps: true
});

// Indexes
chatSchema.index({ participants: 1, status: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ status: 1, priority: -1 });
chatSchema.index({ 'participantRoles.userId': 1, 'participantRoles.role': 1 });

// Compound indexes for common queries
chatSchema.index({ participants: 1, status: 1, lastMessageAt: -1 }); // For user chats sorted by last message
chatSchema.index({ status: 1, priority: -1, lastMessageAt: -1 }); // For admin chat management

// Instance methods
chatSchema.methods.addMessage = async function(
  senderId: string, 
  message: string, 
  type: MessageType = MessageType.TEXT,
  attachments?: any[]
): Promise<IChatMessage> {
  // التحقق من صحة المرفقات
  let validAttachments = [];
  if (attachments && Array.isArray(attachments)) {
    validAttachments = attachments.filter(att => 
      att && 
      typeof att === 'object' && 
      att.url && 
      att.name && 
      att.type && 
      typeof att.size === 'number'
    );
  }

  const newMessage = {
    senderId: new mongoose.Types.ObjectId(senderId),
    message,
    type,
    attachments: validAttachments.length > 0 ? validAttachments : undefined,
    isRead: false,
    createdAt: new Date()
  };

  this.messages.push(newMessage as any);
  this.lastMessage = message;
  this.lastMessageAt = new Date();
  
  // Mark chat as active if it was pending
  if (this.status === ChatStatus.PENDING) {
    this.status = ChatStatus.ACTIVE;
  }

  await this.save();
  
  // Emit socket event for real-time updates
    let io;
    try {
      io = require('@/lib/socket').getIO();
    } catch (error) {
      // Socket.io not available (e.g., on Vercel)
      if (process.env.NODE_ENV === 'development') {
        const logger = require('@/lib/logger').logger;
        logger.warn('Socket.io not available', { error });
      }
    }
  if (io) {
    this.participants.forEach(participantId => {
      if (participantId.toString() !== senderId) {
        io.to(participantId.toString()).emit('newMessage', {
          chatId: this._id,
          message: newMessage
        });
      }
    });
  }

  return this.messages[this.messages.length - 1];
};

chatSchema.methods.markAsRead = async function(userId: string): Promise<void> {
  let hasUpdates = false;
  const userIdStr = userId.toString();
  
  this.messages.forEach((message: any) => {
    // التعامل مع senderId كـ ObjectId أو كـ object مأهول
    const senderId = message.senderId?._id || message.senderId;
    const senderIdStr = senderId?.toString() || senderId?.toString?.() || String(senderId);
    
    // تحديث الرسالة إذا كانت:
    // 1. ليست من المستخدم المحدد
    // 2. لم يتم قراءتها بعد
    if (senderIdStr && senderIdStr !== userIdStr && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    await this.save();
    
    // Emit read receipt
    let io;
    try {
      io = require('@/lib/socket').getIO();
    } catch (error) {
      // Socket.io not available (e.g., on Vercel)
      if (process.env.NODE_ENV === 'development') {
        const logger = require('@/lib/logger').logger;
        logger.warn('Socket.io not available', { error });
      }
    }
    if (io) {
      this.participants.forEach(participantId => {
        if (participantId.toString() !== userId) {
          io.to(participantId.toString()).emit('messagesRead', {
            chatId: this._id,
            readBy: userId
          });
        }
      });
    }
  }
};

chatSchema.methods.closeChat = async function(userId: string): Promise<void> {
  this.status = ChatStatus.CLOSED;
  this.closedAt = new Date();
  this.closedBy = new mongoose.Types.ObjectId(userId);
  await this.save();
};

chatSchema.methods.reopenChat = async function(): Promise<void> {
  this.status = ChatStatus.ACTIVE;
  this.closedAt = undefined;
  this.closedBy = undefined;
  await this.save();
};

chatSchema.methods.getUnreadCount = function(userId: string): number {
  const userIdStr = userId.toString();
  return this.messages.filter((message: any) => {
    // التعامل مع senderId كـ ObjectId أو كـ object مأهول
    const senderId = message.senderId?._id || message.senderId;
    const senderIdStr = senderId?.toString() || senderId?.toString?.() || String(senderId);
    
    // الرسالة غير مقروءة إذا كانت:
    // 1. ليست من المستخدم المحدد
    // 2. لم يتم قراءتها بعد
    return senderIdStr && senderIdStr !== userIdStr && !message.isRead;
  }).length;
};

// Static methods
chatSchema.statics.findByUser = function(userId: string): Promise<IChat[]> {
  return this.find({ 
    participants: new mongoose.Types.ObjectId(userId) 
  })
  .populate('participants', 'name email role')
  .sort('-lastMessageAt');
};

chatSchema.statics.findActiveChats = function(): Promise<IChat[]> {
  return this.find({ status: ChatStatus.ACTIVE })
    .populate('participants', 'name email role')
    .sort('-lastMessageAt');
};

chatSchema.statics.findPendingChats = function(): Promise<IChat[]> {
  return this.find({ status: ChatStatus.PENDING })
    .populate('participants', 'name email role')
    .sort('-createdAt');
};

chatSchema.statics.createChat = async function(
  participants: string[], 
  subject: string, 
  category?: string
): Promise<IChat> {
  // Get participant roles
  const User = mongoose.model('User');
  const users = await User.find({ 
    _id: { $in: participants.map(id => new mongoose.Types.ObjectId(id)) } 
  });
  
  const participantRoles = users.map(user => ({
    userId: user._id,
    role: user.role
  }));

  return this.create({
    participants: participants.map(id => new mongoose.Types.ObjectId(id)),
    participantRoles,
    subject,
    category,
    status: ChatStatus.PENDING
  });
};

chatSchema.statics.getOrCreateChat = async function(
  userId: string, 
  adminId: string, 
  subject: string
): Promise<IChat> {
  // Check if chat already exists between these users
  const existingChat = await this.findOne({
    participants: { 
      $all: [
        new mongoose.Types.ObjectId(userId),
        new mongoose.Types.ObjectId(adminId)
      ] 
    },
    status: { $ne: ChatStatus.CLOSED }
  });

  if (existingChat) {
    return existingChat;
  }

  // Create new chat
  return this.createChat([userId, adminId], subject);
};

// Virtual for unread messages count
chatSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(message => !message.isRead).length;
});

// Create and export model
const Chat = mongoose.models.Chat || 
  mongoose.model<IChat, IChatModel>('Chat', chatSchema);

export default Chat; 