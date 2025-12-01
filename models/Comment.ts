import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  entityType: 'product' | 'order' | 'fulfillment';
  entityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  parentId?: mongoose.Types.ObjectId; // For nested comments/replies
  isInternal: boolean; // Internal comments only visible to supplier and admin
  attachments?: {
    url: string;
    name: string;
    type: string;
  }[];
  isRead: boolean;
  readBy?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
  entityType: {
    type: String,
    enum: ['product', 'order', 'fulfillment'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'محتوى التعليق مطلوب'],
    trim: true,
    maxlength: [2000, 'التعليق لا يمكن أن يتجاوز 2000 حرف']
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isInternal: {
    type: Boolean,
    default: true // Default to internal (only supplier and admin can see)
  },
  attachments: [{
    url: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes
commentSchema.index({ entityType: 1, entityId: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ isRead: 1 });

// Compound indexes for common queries
commentSchema.index({ entityType: 1, entityId: 1, parentId: 1, createdAt: -1 }); // For entity comments with replies
commentSchema.index({ userId: 1, isRead: 1, createdAt: -1 }); // For user unread comments
commentSchema.index({ entityType: 1, entityId: 1, isRead: 1 }); // For entity unread comments

// Virtual for replies count
commentSchema.virtual('repliesCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  count: true
});

// Static method to get comments for an entity
commentSchema.statics.getEntityComments = function(
  entityType: string,
  entityId: string,
  userId: string,
  userRole: string
) {
  // Build query based on user role
  let query: any = {
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    parentId: null // Only top-level comments
  };

  // If user is not admin or supplier, only show non-internal comments
  if (userRole !== 'admin' && userRole !== 'supplier') {
    query.isInternal = false;
  }

  return this.find(query)
    .populate('userId', 'name email role companyName avatar')
    .populate({
      path: 'readBy',
      select: 'name'
    })
    .sort({ createdAt: -1 });
};

// Static method to get replies for a comment
commentSchema.statics.getReplies = function(commentId: string) {
  return this.find({ parentId: commentId })
    .populate('userId', 'name email role companyName avatar')
    .sort({ createdAt: 1 });
};

// Instance method to mark as read
commentSchema.methods.markAsRead = function(userId: string) {
  if (!this.readBy) {
    this.readBy = [];
  }
  
  const userIdStr = userId.toString();
  if (!this.readBy.some((id: any) => id.toString() === userIdStr)) {
    this.readBy.push(userId);
    this.isRead = this.readBy.length > 0;
  }
  
  return this.save();
};

const Comment = mongoose.models.Comment || 
  mongoose.model<IComment>('Comment', commentSchema);

export default Comment;

